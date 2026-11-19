/**
 * Pruebas de las pantallas de clientes con la API simulada (no tocan la base de datos).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import type { ClienteOut } from '@/types/api'
import CustomerFormView from './CustomerFormView.vue'
import CustomerConditionView from './CustomerConditionView.vue'
import CustomerListView from './CustomerListView.vue'

vi.mock('@/api/customers', () => ({
  listar: vi.fn(),
  obtener: vi.fn(),
  credito: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
  cambiarCondicion: vi.fn(),
  darDeBaja: vi.fn(),
  reactivar: vi.fn(),
}))
vi.mock('@/api/finance', () => ({
  equivalencias: vi.fn(),
  topes: vi.fn(),
}))
const api = await import('@/api/customers')
const finance = await import('@/api/finance')

const rosa: ClienteOut = {
  id: 1,
  tienda_id: 1,
  nombres: 'Rosa',
  apellidos: 'Flores Benites',
  dni: '08765432',
  telefono: '987654321',
  correo: 'rosa.flores@gmail.com',
  direccion: null,
  estado: 'ACTIVO',
  usuario: '08765432@bodegadonlucho.com',
  created_at: '2026-11-18T01:18:27Z',
  condicion: {
    moneda: 'PEN',
    tasa: { tipo: 'EFECTIVA', valor: '3.5000000', periodo_dias: 30, capitalizacion_dias: null, equivalencias: { ted_pct: '0.11', tem_pct: '3.5', tea_pct: '51.1' } },
    tasa_mora: { tipo: 'EFECTIVA', valor: '1.3000000', periodo_dias: 30, capitalizacion_dias: null, equivalencias: { ted_pct: '0.04', tem_pct: '1.3', tea_pct: '16.7' } },
    limite_credito: '800.00',
    max_meses: 3,
    dia_corte: 25,
    hora_corte: '18:00:00',
    dia_pago: 5,
  },
  resumen: {
    limite: '800.00',
    utilizado: '206.74',
    disponible: '593.26',
    porcentaje_utilizado: '25.84',
    estado_pago: 'EN_MORA',
    proximo_corte: '2026-11-25',
    proximo_pago: '2026-12-05',
    listados_pendientes: 1,
  },
}

function crearRouter() {
  const vacio = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tienda/clientes', name: 'tienda-clientes', component: CustomerListView },
      { path: '/tienda/clientes/nuevo', name: 'tienda-cliente-nuevo', component: CustomerFormView },
      { path: '/tienda/clientes/:id', name: 'tienda-cliente', component: vacio },
      { path: '/tienda/clientes/:id/editar', name: 'tienda-cliente-editar', component: CustomerFormView },
      { path: '/tienda/clientes/:id/condicion', name: 'tienda-cliente-condicion', component: CustomerConditionView },
      { path: '/tienda/compras/nueva', name: 'tienda-compra-nueva', component: vacio },
    ],
  })
}

async function montar(ruta: string, componente: object) {
  const router = crearRouter()
  await router.push(ruta)
  const w = mount(componente, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { w, router }
}

function campo(w: VueWrapper, etiqueta: string) {
  const label = w.findAll('label').find((l) => l.text().startsWith(etiqueta))
  if (!label) throw new Error(`No existe el campo "${etiqueta}"`)
  return w.get(`#${label.attributes('for')}`)
}
/** Primer botón de radio (opción de SegmentedToggle) con ese valor. */
function opcion(w: VueWrapper, valor: string) {
  return w.findAll('input[type="radio"]').find((r) => (r.element as HTMLInputElement).value === valor)!
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  document.body.innerHTML = ''
  vi.mocked(finance.equivalencias).mockResolvedValue({ ted_pct: '0.1147', tem_pct: '3.5000000000', tea_pct: '51.1068657346' })
  vi.mocked(finance.topes).mockResolvedValue([])
  vi.mocked(api.listar).mockResolvedValue({ items: [], total: 0, limit: 10, offset: 0, conteos: {} })
})

async function llenarDatos(w: VueWrapper) {
  await campo(w, 'Nombres').setValue('Rosa')
  await campo(w, 'Apellidos').setValue('Flores Benites')
  await campo(w, 'DNI').setValue('08765432')
  await campo(w, 'Teléfono celular').setValue('987654321')
  await campo(w, 'Tasa de interés compensatoria').setValue('3.5')
  await campo(w, 'Tasa moratoria').setValue('1.3')
  await campo(w, 'Límite máximo').setValue('800')
  await campo(w, 'Contraseña provisoria').setValue('Rosa2024*Lucho')
}

describe('Registrar cliente', () => {
  it('pide las equivalencias al backend (no las calcula) y las muestra', async () => {
    const { w } = await montar('/tienda/clientes/nuevo', CustomerFormView)
    await campo(w, 'Tasa de interés compensatoria').setValue('3.5')
    await vi.waitFor(() => expect(finance.equivalencias).toHaveBeenCalledWith({ tipo: 'EFECTIVA', valor: '3.5', periodo_dias: 30, capitalizacion_dias: null }))
    await vi.waitFor(() => expect(w.text()).toContain('TEA 51.1069 %'))
  })

  it('envía el cliente con sus condiciones y acceso, y va a su detalle', async () => {
    vi.mocked(api.crear).mockResolvedValue(rosa)
    const { w, router } = await montar('/tienda/clientes/nuevo', CustomerFormView)
    await llenarDatos(w)

    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(api.crear).toHaveBeenCalled())
    await flushPromises()

    expect(api.crear).toHaveBeenCalledWith({
      nombres: 'Rosa',
      apellidos: 'Flores Benites',
      dni: '08765432',
      telefono: '987654321',
      correo: null,
      direccion: null,
      condicion: {
        moneda: 'PEN',
        tasa: { tipo: 'EFECTIVA', valor: '3.5', periodo_dias: 30, capitalizacion_dias: null },
        tasa_mora: { tipo: 'EFECTIVA', valor: '1.3', periodo_dias: 30, capitalizacion_dias: null },
        limite_credito: '800',
        max_meses: 3,
        dia_corte: 25,
        hora_corte: '18:00',
        dia_pago: 5,
      },
      acceso: { username: null, password: 'Rosa2024*Lucho' },
    })
    expect(router.currentRoute.value.fullPath).toBe('/tienda/clientes/1')
  })

  it('con tasa nominal anual envía la capitalización diaria por defecto', async () => {
    vi.mocked(api.crear).mockResolvedValue(rosa)
    const { w } = await montar('/tienda/clientes/nuevo', CustomerFormView)
    await llenarDatos(w)
    await opcion(w, 'NOMINAL').setValue(true)
    await opcion(w, '360').setValue(true)
    expect(w.text()).toContain('Capitalización de la tasa nominal')

    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(api.crear).toHaveBeenCalled())
    const body = vi.mocked(api.crear).mock.calls[0]![0]
    expect(body.condicion.tasa).toEqual({ tipo: 'NOMINAL', valor: '3.5', periodo_dias: 360, capitalizacion_dias: 1 })
    expect(body.condicion.tasa_mora.periodo_dias).toBe(360) // un solo "Periodo de la tasa" para ambas
  })

  it('no envía si el día de pago es igual al de corte', async () => {
    const { w } = await montar('/tienda/clientes/nuevo', CustomerFormView)
    await llenarDatos(w)
    await campo(w, 'Día de vencimiento').setValue('25')
    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(w.text()).toContain('El día de pago debe ser distinto al día de corte'))
    expect(api.crear).not.toHaveBeenCalled()
  })

  it('si la TEA supera el tope BCRP, marca la tasa con el mensaje del backend', async () => {
    const mensaje = 'La tasa compensatoria equivale a una TEA de 150.0000000 %, que supera el tope vigente de 114.68 %'
    vi.mocked(api.crear).mockRejectedValue(new ApiError(mensaje, 'tasa_supera_tope', 422))
    const { w } = await montar('/tienda/clientes/nuevo', CustomerFormView)
    await llenarDatos(w)
    await w.get('form').trigger('submit')

    const tasa = campo(w, 'Tasa de interés compensatoria')
    await vi.waitFor(() => expect(tasa.attributes('aria-invalid')).toBe('true'))
    expect(w.text()).toContain(mensaje)
  })
})

describe('Cambiar condiciones', () => {
  it('carga la condición actual, avisa que solo afecta compras futuras y envía PUT', async () => {
    vi.mocked(api.obtener).mockResolvedValue(rosa)
    vi.mocked(api.cambiarCondicion).mockResolvedValue(rosa)
    const { w } = await montar('/tienda/clientes/1/condicion', CustomerConditionView)

    expect(w.text()).toContain('Solo afecta compras futuras')
    expect((campo(w, 'Tasa de interés compensatoria').element as HTMLInputElement).value).toBe('3.5')
    await campo(w, 'Límite máximo').setValue('1000')

    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(api.cambiarCondicion).toHaveBeenCalled())
    expect(api.cambiarCondicion).toHaveBeenCalledWith(1, expect.objectContaining({ limite_credito: '1000', hora_corte: '18:00', dia_corte: 25, dia_pago: 5 }))
  })
})

describe('Cartera de clientes', () => {
  it('muestra conteos, sello de estado de pago y crédito utilizado', async () => {
    vi.mocked(api.listar).mockResolvedValue({ items: [rosa], total: 1, limit: 10, offset: 0, conteos: { estado: { TODOS: 1, ACTIVO: 1, BAJA: 0, AL_DIA: 0, EN_MORA: 1 } } })
    const { w } = await montar('/tienda/clientes', CustomerListView)
    expect(w.text()).toContain('En mora (1)')
    expect(w.text()).toContain('Rosa Flores Benites')
    expect(w.text()).toContain('S/ 206.74')
    expect(w.text()).toContain('25.84%')
    expect(w.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('25.84')

    await w.findAll('button').find((b) => b.text().startsWith('En mora'))!.trigger('click')
    await flushPromises()
    expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'EN_MORA' }))
  })

  it('si el cliente tiene deuda, la baja muestra el mensaje del backend en el diálogo', async () => {
    vi.mocked(api.listar).mockResolvedValue({ items: [rosa], total: 1, limit: 10, offset: 0, conteos: {} })
    vi.mocked(api.darDeBaja).mockRejectedValue(new ApiError('No se puede dar de baja a un cliente con deuda pendiente', 'error_negocio', 422))
    const { w } = await montar('/tienda/clientes', CustomerListView)

    await w.get('button[aria-label="Dar de baja a Rosa Flores Benites"]').trigger('click')
    await flushPromises()
    const dialogo = document.querySelector('[role="alertdialog"]')!
    Array.from(dialogo.querySelectorAll('button')).find((b) => b.textContent?.includes('Confirmar baja'))!.click()
    await flushPromises()
    expect(document.querySelector('[role="alertdialog"]')!.textContent).toContain('No se puede dar de baja a un cliente con deuda pendiente')
  })
})
