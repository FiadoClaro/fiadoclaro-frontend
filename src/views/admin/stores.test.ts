/**
 * Pruebas de las pantallas de tiendas con la API simulada (no tocan la base de datos):
 * qué envía el formulario, cómo muestra los errores del backend y el flujo de baja/alta.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import type { TiendaOut } from '@/types/api'
import StoreFormView from './StoreFormView.vue'
import StoreListView from './StoreListView.vue'

vi.mock('@/api/stores', () => ({
  listar: vi.fn(),
  obtener: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
  darDeBaja: vi.fn(),
  reactivar: vi.fn(),
}))
const api = await import('@/api/stores')

const tienda: TiendaOut = {
  id: 1,
  nombre_comercial: 'Bodega Don Lucho',
  razon_social: 'Comercializadora Morales e Hijos S.A.C.',
  giro: 'Bodega',
  ruc: '20554892101',
  estado: 'ACTIVA',
  direccion: 'Av. Brasil 1234',
  telefono: '(01) 263-8890',
  correo: 'contacto@bodegadonlucho.pe',
  created_at: '2026-11-18T01:18:27Z',
  updated_at: '2026-11-18T01:18:27Z',
  fecha_baja: null,
  dominio_portal: 'bodegadonlucho.com',
  administrador: { id: 2, username: 'dlucho', nombre: 'Luis Morales Vega', telefono: '984512870', correo: 'lucho@gmail.com', activo: true, ultimo_acceso: null },
}

function crearRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/tiendas', name: 'admin-tiendas', component: StoreListView },
      { path: '/admin/tiendas/nueva', name: 'admin-tienda-nueva', component: StoreFormView },
      { path: '/admin/tiendas/:id/editar', name: 'admin-tienda-editar', component: StoreFormView },
    ],
  })
}

async function montar(ruta: string, componente: typeof StoreFormView | typeof StoreListView) {
  const router = crearRouter()
  await router.push(ruta)
  const w = mount(componente, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { w, router }
}

/** Escribe en el campo cuya etiqueta contiene el texto. */
async function escribir(w: ReturnType<typeof mount>, etiqueta: string, valor: string) {
  const label = w.findAll('label').find((l) => l.text().startsWith(etiqueta))
  if (!label) throw new Error(`No existe el campo "${etiqueta}"`)
  await w.get(`#${label.attributes('for')}`).setValue(valor)
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  document.body.innerHTML = ''
})

describe('Registrar tienda', () => {
  async function llenarFormulario(w: ReturnType<typeof mount>) {
    await escribir(w, 'Nombre comercial', 'Frutería La Chacarera')
    await escribir(w, 'Razón social', 'Chacarera E.I.R.L.')
    await escribir(w, 'RUC', '20601234567')
    await escribir(w, 'Nombre completo del administrador', 'Carmela Soto')
    await escribir(w, 'Teléfono celular personal', '987654321')
    await escribir(w, 'Correo electrónico personal', 'carmela@gmail.com')
    await escribir(w, 'Usuario de acceso', 'chacarera')
    await escribir(w, 'Contraseña inicial', 'Clave2026*')
    await escribir(w, 'Confirmación de contraseña', 'Clave2026*')
  }

  it('envía la tienda con su administrador (sin la confirmación) y vuelve a la lista', async () => {
    vi.mocked(api.crear).mockResolvedValue({ ...tienda, nombre_comercial: 'Frutería La Chacarera' })
    vi.mocked(api.listar).mockResolvedValue({ items: [], total: 0, limit: 10, offset: 0, conteos: {} })
    const { w, router } = await montar('/admin/tiendas/nueva', StoreFormView)

    await llenarFormulario(w)
    await w.get('form').trigger('submit')
    // La validación de VeeValidate es asíncrona: esperamos a que se envíe.
    await vi.waitFor(() => expect(api.crear).toHaveBeenCalled())
    await flushPromises()

    expect(api.crear).toHaveBeenCalledWith({
      nombre_comercial: 'Frutería La Chacarera',
      razon_social: 'Chacarera E.I.R.L.',
      ruc: '20601234567',
      giro: 'Bodega',
      telefono: null,
      correo: null,
      direccion: null,
      administrador: { nombre: 'Carmela Soto', telefono: '987654321', correo: 'carmela@gmail.com', username: 'chacarera', password: 'Clave2026*' },
    })
    expect(router.currentRoute.value.name).toBe('admin-tiendas')
  })

  it('no envía si faltan datos o las contraseñas no coinciden', async () => {
    const { w } = await montar('/admin/tiendas/nueva', StoreFormView)
    await llenarFormulario(w)
    await escribir(w, 'Confirmación de contraseña', 'Otra2026*')
    await escribir(w, 'RUC', '123')
    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(w.text()).toContain('Las contraseñas no coinciden'))

    expect(api.crear).not.toHaveBeenCalled()
    expect(w.text()).toContain('El RUC debe tener exactamente 11 dígitos')
  })

  it('muestra junto al RUC el error del backend cuando ya existe', async () => {
    vi.mocked(api.crear).mockRejectedValue(new ApiError('Ya existe una tienda con RUC 20601234567', 'conflicto', 409))
    const { w } = await montar('/admin/tiendas/nueva', StoreFormView)
    await llenarFormulario(w)
    await w.get('form').trigger('submit')

    const labelRuc = w.findAll('label').find((l) => l.text().startsWith('RUC'))!
    const input = w.get(`#${labelRuc.attributes('for')}`)
    await vi.waitFor(() => expect(input.attributes('aria-invalid')).toBe('true'))
    expect(w.text()).toContain('Ya existe una tienda con RUC 20601234567')
  })
})

describe('Editar tienda', () => {
  it('carga los datos, bloquea el RUC, oculta las credenciales y envía PATCH', async () => {
    vi.mocked(api.obtener).mockResolvedValue(tienda)
    vi.mocked(api.actualizar).mockResolvedValue(tienda)
    vi.mocked(api.listar).mockResolvedValue({ items: [], total: 0, limit: 10, offset: 0, conteos: {} })
    const { w } = await montar('/admin/tiendas/1/editar', StoreFormView)

    const labelRuc = w.findAll('label').find((l) => l.text().startsWith('RUC'))!
    expect(w.get(`#${labelRuc.attributes('for')}`).attributes('disabled')).toBeDefined()
    expect(w.text()).not.toContain('Credenciales de Acceso')

    await escribir(w, 'Teléfono celular personal', '999888777')
    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(api.actualizar).toHaveBeenCalled())

    expect(api.actualizar).toHaveBeenCalledWith(1, expect.objectContaining({
      nombre_comercial: 'Bodega Don Lucho',
      administrador: { nombre: 'Luis Morales Vega', telefono: '999888777', correo: 'lucho@gmail.com' },
    }))
    expect(vi.mocked(api.actualizar).mock.calls[0]![1]).not.toHaveProperty('ruc')
  })
})

describe('Lista de tiendas', () => {
  const pagina = (items: TiendaOut[]) => ({
    items,
    total: items.length,
    limit: 10,
    offset: 0,
    conteos: { estado: { ACTIVA: 1, BAJA: 1 }, giro: { Bodega: 1, Bazar: 1 } },
  })
  const deBaja: TiendaOut = { ...tienda, id: 6, nombre_comercial: 'Bazar Novedades Lili', ruc: '10234567891', giro: 'Bazar', estado: 'BAJA' }

  it('muestra los conteos y las filas que da el backend', async () => {
    vi.mocked(api.listar).mockResolvedValue(pagina([tienda, deBaja]))
    const { w } = await montar('/admin/tiendas', StoreListView)
    expect(api.listar).toHaveBeenCalledWith({ q: '', estado: undefined, giro: undefined, limit: 10, offset: 0 })
    expect(w.text()).toContain('(1 activa, 1 de baja)')
    expect(w.text()).toContain('Bodega Don Lucho')
    expect(w.text()).toContain('Todos los giros (2)')
  })

  it('da de baja con confirmación propia (sin confirm del navegador)', async () => {
    const confirmNativo = vi.spyOn(window, 'confirm')
    vi.mocked(api.listar).mockResolvedValue(pagina([tienda, deBaja]))
    vi.mocked(api.darDeBaja).mockResolvedValue({ ...tienda, estado: 'BAJA' })
    const { w } = await montar('/admin/tiendas', StoreListView)

    await w.get('button[aria-label="Dar de baja Bodega Don Lucho"]').trigger('click')
    await flushPromises()
    const dialogo = document.querySelector('[role="alertdialog"]')!
    expect(dialogo.textContent).toContain('¿Dar de baja esta tienda?')

    const confirmar = Array.from(dialogo.querySelectorAll('button')).find((b) => b.textContent?.includes('Confirmar baja'))!
    confirmar.click()
    await flushPromises()

    expect(api.darDeBaja).toHaveBeenCalledWith(1)
    expect(confirmNativo).not.toHaveBeenCalled()
    expect(api.listar).toHaveBeenCalledTimes(2) // recarga la lista
  })

  it('si el backend rechaza la reactivación, muestra su mensaje en el diálogo', async () => {
    vi.mocked(api.listar).mockResolvedValue(pagina([tienda, deBaja]))
    vi.mocked(api.reactivar).mockRejectedValue(new ApiError('La tienda ya está activa', 'sin_cambios', 422))
    const { w } = await montar('/admin/tiendas', StoreListView)

    await w.get('button[aria-label="Reactivar Bazar Novedades Lili"]').trigger('click')
    await flushPromises()
    const dialogo = document.querySelector('[role="alertdialog"]')!
    Array.from(dialogo.querySelectorAll('button')).find((b) => b.textContent?.includes('Reactivar tienda'))!.click()
    await flushPromises()

    expect(document.querySelector('[role="alertdialog"]')!.textContent).toContain('La tienda ya está activa')
  })
})
