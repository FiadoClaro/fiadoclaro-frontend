/**
 * Pruebas de listados de pago y pagos con la API simulada (no tocan la base de datos).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import type { CotizacionOut, EstadoCuentaOut } from '@/types/api'
import PaymentNewView from './PaymentNewView.vue'
import StatementListView from './StatementListView.vue'
import ListadoDetalle from '@/components/statements/ListadoDetalle.vue'
import { hoyLima } from '@/utils/format'

vi.mock('@/api/statements', () => ({ generar: vi.fn(), listar: vi.fn(), obtener: vi.fn() }))
vi.mock('@/api/payments', () => ({ cotizar: vi.fn(), registrar: vi.fn(), listar: vi.fn(), obtener: vi.fn() }))
vi.mock('@/api/customers', () => ({ listar: vi.fn() }))
const statements = await import('@/api/statements')
const payments = await import('@/api/payments')
const customers = await import('@/api/customers')

const listado: EstadoCuentaOut = {
  id: 3, cliente_id: 1, cliente: 'Rosa Flores Benites', dni: '08765432', fecha_corte: '2026-10-25', fecha_pago: '2026-11-05', moneda: 'PEN',
  total_a_pagar: '310.27', estado: 'PENDIENTE', vencido: true,
  items: [
    { tipo: 'COMPRA_FIN_MES', compra_id: 142, fecha_compra: '2026-10-01T15:00:00Z', descripcion: 'Arroz Costeño 5kg', cuota: null, fecha_vencimiento: '2026-11-05', capital: '120.00', interes: '5.32', dias_interes: 38, mora: '0.00', total: '125.32' },
    { tipo: 'CUOTA', compra_id: 150, fecha_compra: '2026-10-10T15:00:00Z', descripcion: 'Pack abarrotes', cuota: '1/3', fecha_vencimiento: '2026-11-05', capital: '180.00', interes: '4.95', dias_interes: null, mora: '0.00', total: '184.95' },
    { tipo: 'INTERES_MORA', compra_id: null, fecha_compra: null, descripcion: 'Intereses por mora', cuota: null, fecha_vencimiento: '2026-11-05', capital: '0.00', interes: '0.00', dias_interes: 5, mora: '4.33', total: '4.33' },
  ],
  total_capital: '300.00', total_interes: '10.27', fecha_consulta: '2026-11-10', dias_mora: 5,
  interes_moratorio: '4.33', interes_compensatorio_mora: '1.78', total_exigible: '316.38',
}

const cotizacion = (fecha: string, total: string): CotizacionOut => ({
  estado_cuenta_id: 3, fecha_pago_pactada: '2026-11-05', fecha_pago: fecha, dias_mora: 5,
  interes_moratorio: '4.33', interes_compensatorio_mora: '1.78', interes_compensatorio: '10.27', capital: '300.00', total_exigible: total,
  prelacion: [
    { orden: 1, concepto: 'INTERES_MORATORIO', exigible: '4.33', imputado: '4.33', saldo: '0.00' },
    { orden: 2, concepto: 'INTERES_COMPENSATORIO_MORA', exigible: '1.78', imputado: '1.78', saldo: '0.00' },
    { orden: 3, concepto: 'INTERES_COMPENSATORIO', exigible: '10.27', imputado: '10.27', saldo: '0.00' },
    { orden: 4, concepto: 'CAPITAL', exigible: '300.00', imputado: '300.00', saldo: '0.00' },
  ],
})

function crearRouter() {
  const vacio = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tienda/pagos/nuevo', name: 'tienda-pago-nuevo', component: PaymentNewView },
      { path: '/tienda/listados', name: 'tienda-listados', component: StatementListView },
      { path: '/tienda/listados/:id', name: 'tienda-listado', component: vacio },
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

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  document.body.innerHTML = ''
  vi.mocked(customers.listar).mockResolvedValue({ items: [], total: 0, limit: 200, offset: 0 })
  vi.mocked(statements.obtener).mockResolvedValue(listado)
})

describe('Registrar pago', () => {
  it('cotiza a hoy, muestra la deuda y la imputación por prelación, con el monto bloqueado', async () => {
    vi.mocked(payments.cotizar).mockResolvedValue(cotizacion(hoyLima(), '316.38'))
    const { w } = await montar('/tienda/pagos/nuevo?listado=3', PaymentNewView)

    expect(payments.cotizar).toHaveBeenCalledWith(3, hoyLima())
    expect(w.text()).toContain('5 días retraso')
    expect(w.text()).toContain('S/ 316.38')
    const filas = w.findAll('tbody tr')
    expect(filas.map((f) => f.text())).toEqual([
      expect.stringContaining('Intereses moratorios'),
      expect.stringContaining('compensatorio por atraso'),
      expect.stringContaining('compensatorio pactado'),
      expect.stringContaining('Capital'),
    ])
    const monto = w.findAll('input').find((i) => i.attributes('readonly') !== undefined)!
    expect(monto.attributes('readonly')).toBeDefined() // no se puede editar
  })

  it('al cambiar la fecha vuelve a cotizar con esa fecha', async () => {
    vi.mocked(payments.cotizar).mockResolvedValue(cotizacion(hoyLima(), '316.38'))
    const { w } = await montar('/tienda/pagos/nuevo?listado=3', PaymentNewView)
    vi.mocked(payments.cotizar).mockResolvedValue(cotizacion('2026-11-08', '313.10'))
    await w.get('input[type="date"]').setValue('2026-11-08')
    await vi.waitFor(() => expect(payments.cotizar).toHaveBeenLastCalledWith(3, '2026-11-08'))
    await vi.waitFor(() => expect(w.text()).toContain('Registrar Pago (S/ 313.10)'))
  })

  it('registra con el monto exacto de la cotización y muestra el comprobante', async () => {
    vi.mocked(payments.cotizar).mockResolvedValue(cotizacion(hoyLima(), '316.38'))
    vi.mocked(payments.registrar).mockResolvedValue({
      id: 21, estado_cuenta_id: 3, cliente_id: 1, fecha_pago: hoyLima(), dias_mora: 5, monto_total: '316.38',
      imputacion: cotizacion(hoyLima(), '316.38').prelacion, created_at: '2026-11-10T15:00:00Z',
    })
    const { w } = await montar('/tienda/pagos/nuevo?listado=3', PaymentNewView)
    await w.findAll('button').find((b) => b.text().startsWith('Registrar Pago'))!.trigger('click')
    await flushPromises()

    expect(payments.registrar).toHaveBeenCalledWith({ estado_cuenta_id: 3, fecha_pago: hoyLima(), monto: '316.38' })
    expect(w.text()).toContain('Comprobante de pago #21')
    expect(w.text()).toContain('Total pagado')
  })

  it('si el backend dice que el monto ya no es el exigible, vuelve a cotizar y avisa', async () => {
    vi.mocked(payments.cotizar).mockResolvedValue(cotizacion(hoyLima(), '316.38'))
    vi.mocked(payments.registrar).mockRejectedValue(new ApiError('No se aceptan pagos parciales: el total exigible es 317.02', 'monto_distinto_al_exigible', 422))
    const { w } = await montar('/tienda/pagos/nuevo?listado=3', PaymentNewView)
    vi.mocked(payments.cotizar).mockResolvedValue(cotizacion(hoyLima(), '317.02'))

    await w.findAll('button').find((b) => b.text().startsWith('Registrar Pago'))!.trigger('click')
    await flushPromises()
    expect(payments.cotizar).toHaveBeenCalledTimes(2)
    expect(w.text()).toContain('Registrar Pago (S/ 317.02)')
    expect(w.text()).toContain('No se aceptan pagos parciales')
  })
})

describe('Listado de pago', () => {
  it('separa la mora de las compras y muestra las cuotas como "1/3"', () => {
    const w = mount(ListadoDetalle, { props: { listado, tiendaNombre: 'Bodega Don Lucho' } })
    const filas = w.findAll('tbody tr')
    expect(filas).toHaveLength(2) // la mora no va en la tabla de compras
    expect(filas[1]!.text()).toContain('cuota 1/3')
    expect(w.text()).toContain('Intereses por mora')
    expect(w.text()).toContain('5 días')
    expect(w.text()).toContain('S/ 316.38') // total exigible (backend)
  })
})

describe('Listados', () => {
  it('genera el corte y muestra generados y omitidos con su motivo', async () => {
    vi.mocked(statements.listar).mockResolvedValue({ items: [listado], total: 1, limit: 10, offset: 0, conteos: { estado: { PENDIENTE: 1 } } })
    vi.mocked(customers.listar).mockResolvedValue({ items: [{ id: 2, nombres: 'Carlos', apellidos: 'Mendoza' } as never], total: 1, limit: 200, offset: 0 })
    vi.mocked(statements.generar).mockResolvedValue({
      fecha_corte: '2026-11-25',
      generados: [{ ...listado, id: 9 }],
      omitidos: [{ cliente_id: 2, motivo: 'Su día de corte es el 15' }],
    })
    const { w } = await montar('/tienda/listados', StatementListView)

    expect(w.text()).toContain('Vencido') // sello VENCIDO en la fila pendiente vencida
    await w.findAll('button').find((b) => b.text().includes('Generar listados del corte'))!.trigger('click')
    await flushPromises()
    expect(statements.generar).toHaveBeenCalledWith(hoyLima())
    expect(w.text()).toContain('Generados (1)')
    expect(w.text()).toContain('Carlos Mendoza: Su día de corte es el 15')
  })
})
