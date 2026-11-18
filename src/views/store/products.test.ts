/**
 * Pruebas de las pantallas del catálogo con la API simulada (no tocan la base de datos).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import type { ProductoOut } from '@/types/api'
import ProductFormView from './ProductFormView.vue'
import ProductListView from './ProductListView.vue'

vi.mock('@/api/products', () => ({
  listar: vi.fn(),
  obtener: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
  darDeBaja: vi.fn(),
  reactivar: vi.fn(),
}))
const api = await import('@/api/products')

const arroz: ProductoOut = {
  id: 4,
  tienda_id: 1,
  nombre: 'Arroz Costeño Extra 5 kg',
  descripcion: null,
  marca: 'Costeño',
  proveedor: null,
  unidad_medida: 'Bolsa',
  imagen_url: null,
  moneda: 'PEN',
  precio_contado: '22.00',
  precio_lista_credito: '24.50',
  permite_fin_mes: true,
  permite_cuotas: true,
  max_meses: 2,
  estado: 'ACTIVO',
  created_at: '2026-11-18T01:18:27Z',
}

function crearRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tienda/productos', name: 'tienda-productos', component: ProductListView },
      { path: '/tienda/productos/nuevo', name: 'tienda-producto-nuevo', component: ProductFormView },
      { path: '/tienda/productos/:id/editar', name: 'tienda-producto-editar', component: ProductFormView },
    ],
  })
}

async function montar(ruta: string, componente: typeof ProductFormView | typeof ProductListView) {
  const router = crearRouter()
  await router.push(ruta)
  const w = mount(componente, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { w, router }
}

/** Input del campo cuya etiqueta empieza con el texto. */
function campo(w: ReturnType<typeof mount>, etiqueta: string) {
  const label = w.findAll('label').find((l) => l.text().startsWith(etiqueta))
  if (!label) throw new Error(`No existe el campo "${etiqueta}"`)
  return w.get(`#${label.attributes('for')}`)
}
/** Checkbox de una tarjeta de modalidad. */
function modalidad(w: ReturnType<typeof mount>, texto: string) {
  return w.findAll('label').find((l) => l.text().includes(texto))!.get('input[type="checkbox"]')
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  document.body.innerHTML = ''
  vi.mocked(api.listar).mockResolvedValue({ items: [], total: 0, limit: 10, offset: 0, conteos: {} })
})

describe('Registrar producto', () => {
  it('envía los precios como texto, con cuotas y máximo de meses', async () => {
    vi.mocked(api.crear).mockResolvedValue(arroz)
    const { w, router } = await montar('/tienda/productos/nuevo', ProductFormView)

    await campo(w, 'Nombre del producto').setValue('Arroz Costeño Extra 5 kg')
    await campo(w, 'Precio al contado').setValue('22')
    await campo(w, 'Precio de lista a crédito').setValue('24.50')
    expect(w.text()).toContain('+11.4%') // recargo informativo
    await modalidad(w, 'Pago en meses').setValue(true)
    await w.get('#max-meses').setValue('1') // índice de la opción "2 meses"

    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(api.crear).toHaveBeenCalled())
    await flushPromises()

    expect(api.crear).toHaveBeenCalledWith({
      nombre: 'Arroz Costeño Extra 5 kg',
      descripcion: null,
      marca: null,
      proveedor: null,
      unidad_medida: 'Unidad',
      imagen_url: null,
      moneda: 'PEN',
      precio_contado: '22',
      precio_lista_credito: '24.50',
      permite_fin_mes: true,
      permite_cuotas: true,
      max_meses: 2,
    })
    expect(router.currentRoute.value.name).toBe('tienda-productos')
  })

  it('valida las reglas del backend antes de enviar', async () => {
    const { w } = await montar('/tienda/productos/nuevo', ProductFormView)
    await campo(w, 'Nombre del producto').setValue('Leche')
    await campo(w, 'Precio al contado').setValue('4.60')
    await campo(w, 'Precio de lista a crédito').setValue('4.20')
    await modalidad(w, 'Pago único a fin de mes').setValue(false)

    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(w.text()).toContain('El precio de lista a crédito no puede ser menor al precio al contado'))
    expect(w.text()).toContain('El producto debe permitir al menos una modalidad de fiado')
    expect(api.crear).not.toHaveBeenCalled()
  })

  it('muestra en su lugar el error del backend sin campo (regla entre campos)', async () => {
    vi.mocked(api.crear).mockRejectedValue(
      new ApiError('Indica el máximo de meses cuando el producto permite cuotas', 'validacion', 422, {
        solicitud: 'Indica el máximo de meses cuando el producto permite cuotas',
      }),
    )
    const { w } = await montar('/tienda/productos/nuevo', ProductFormView)
    await campo(w, 'Nombre del producto').setValue('Arroz')
    await campo(w, 'Precio al contado').setValue('22')
    await campo(w, 'Precio de lista a crédito').setValue('24.50')
    await modalidad(w, 'Pago en meses').setValue(true)

    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(w.get('#max-meses').attributes('aria-invalid')).toBe('true'))
  })
})

describe('Editar producto', () => {
  it('carga el producto y envía PUT con el producto completo', async () => {
    vi.mocked(api.obtener).mockResolvedValue(arroz)
    vi.mocked(api.actualizar).mockResolvedValue(arroz)
    const { w } = await montar('/tienda/productos/4/editar', ProductFormView)

    expect((campo(w, 'Precio al contado').element as HTMLInputElement).value).toBe('22.00')
    await campo(w, 'Precio de lista a crédito').setValue('25.00')
    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(api.actualizar).toHaveBeenCalled())

    expect(api.actualizar).toHaveBeenCalledWith(4, expect.objectContaining({
      nombre: 'Arroz Costeño Extra 5 kg',
      unidad_medida: 'Bolsa',
      precio_contado: '22.00',
      precio_lista_credito: '25.00',
      permite_cuotas: true,
      max_meses: 2,
    }))
  })
})

describe('Lista de productos', () => {
  it('muestra conteos, precios y modalidad; filtra con el backend', async () => {
    vi.mocked(api.listar).mockResolvedValue({ items: [arroz], total: 1, limit: 10, offset: 0, conteos: { estado: { TODOS: 3, ACTIVO: 2, BAJA: 1 } } })
    const { w } = await montar('/tienda/productos', ProductListView)

    expect(w.text()).toContain('Arroz Costeño Extra 5 kg')
    expect(w.text()).toContain('S/ 24.50')
    expect(w.text()).toContain('Pago en meses (hasta 2)')
    expect(w.text()).toContain('De baja (1)')

    await w.findAll('button').find((b) => b.text().startsWith('De baja'))!.trigger('click')
    await flushPromises()
    expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'BAJA', offset: 0 }))
  })

  it('da de baja con el diálogo propio', async () => {
    vi.mocked(api.listar).mockResolvedValue({ items: [arroz], total: 1, limit: 10, offset: 0, conteos: {} })
    vi.mocked(api.darDeBaja).mockResolvedValue({ ...arroz, estado: 'BAJA' })
    const { w } = await montar('/tienda/productos', ProductListView)

    await w.get('button[aria-label="Dar de baja Arroz Costeño Extra 5 kg"]').trigger('click')
    await flushPromises()
    const dialogo = document.querySelector('[role="alertdialog"]')!
    expect(dialogo.textContent).toContain('¿Dar de baja este producto?')
    Array.from(dialogo.querySelectorAll('button')).find((b) => b.textContent?.includes('Confirmar baja'))!.click()
    await flushPromises()
    expect(api.darDeBaja).toHaveBeenCalledWith(4)
  })
})
