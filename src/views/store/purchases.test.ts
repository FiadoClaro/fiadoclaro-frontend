/**
 * Pruebas de "Registrar compra" y del cronograma con la API simulada (no tocan la base de datos).
 * Las respuestas simuladas son las que dio el backend real para Rosa (cliente 1) y el Arroz (producto 4).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import type { ClienteOut, ProductoOut, SimulacionOut } from '@/types/api'
import PurchaseNewView from './PurchaseNewView.vue'
import CronogramaPagos from '@/components/purchases/CronogramaPagos.vue'

vi.mock('@/api/customers', () => ({ listar: vi.fn(), obtener: vi.fn(), credito: vi.fn() }))
vi.mock('@/api/products', () => ({ listar: vi.fn() }))
vi.mock('@/api/purchases', () => ({ simular: vi.fn(), registrar: vi.fn(), listar: vi.fn(), obtener: vi.fn() }))
const customers = await import('@/api/customers')
const products = await import('@/api/products')
const purchases = await import('@/api/purchases')

const rosa = {
  id: 1, tienda_id: 1, nombres: 'Rosa', apellidos: 'Flores Benites', dni: '08765432', estado: 'ACTIVO', usuario: 'x', created_at: '2026-11-18T01:18:27Z',
  condicion: {
    moneda: 'PEN', limite_credito: '800.00', max_meses: 3, dia_corte: 25, hora_corte: '18:00:00', dia_pago: 5,
    tasa: { tipo: 'EFECTIVA', valor: '3.5000000', periodo_dias: 30, capitalizacion_dias: null, equivalencias: { ted_pct: '0', tem_pct: '3.5', tea_pct: '51.1' } },
    tasa_mora: { tipo: 'EFECTIVA', valor: '1.3000000', periodo_dias: 30, capitalizacion_dias: null, equivalencias: { ted_pct: '0', tem_pct: '1.3', tea_pct: '16.7' } },
  },
  resumen: { limite: '800.00', utilizado: '206.74', disponible: '593.26', porcentaje_utilizado: '25.84', estado_pago: 'EN_MORA', proximo_corte: '2026-11-25', proximo_pago: '2026-12-05', listados_pendientes: 1 },
} as ClienteOut

const arroz = {
  id: 4, tienda_id: 1, nombre: 'Arroz Costeño Extra 5 kg', unidad_medida: 'Bolsa 5 kg', moneda: 'PEN', precio_contado: '22.00', precio_lista_credito: '24.50',
  permite_fin_mes: true, permite_cuotas: true, max_meses: 3, estado: 'ACTIVO', created_at: '2026-11-18T01:18:27Z',
} as ProductoOut
const pollo = { ...arroz, id: 1, nombre: 'Pollo fresco eviscerado', precio_lista_credito: '10.50', permite_cuotas: false, max_meses: null } as ProductoOut

const simCuotas: SimulacionOut = {
  cliente_id: 1, modalidad: 'CUOTAS', num_cuotas: 3, moneda: 'PEN', fecha_hora: '2026-11-18T18:59:20-05:00',
  fecha_corte: '2026-11-25', fecha_pago: '2026-12-05', dias_gracia: 17,
  detalles: [{ producto_id: 4, descripcion: 'Arroz Costeño Extra 5 kg', cantidad: '1', precio_unitario: '24.50', subtotal: '24.50' }],
  monto_total: '24.50',
  tasa: { tipo: 'EFECTIVA', valor: '3.5000000', periodo_dias: 30, capitalizacion_dias: null, tem_pct: '3.5000000000', tea_pct: '51.1068657346' },
  interes_total: '2.24', monto_capitalizado: '24.98', valor_cuota: '8.92', total_a_pagar: '26.74', tcea_pct: '50.8293835446',
  cronograma: [
    { numero: 1, fecha_vencimiento: '2027-01-05', saldo_inicial: '24.98', interes: '0.87', amortizacion: '8.05', cuota: '8.92', saldo_final: '16.93', estado: 'PENDIENTE' },
    { numero: 2, fecha_vencimiento: '2027-02-05', saldo_inicial: '16.93', interes: '0.59', amortizacion: '8.33', cuota: '8.92', saldo_final: '8.60', estado: 'PENDIENTE' },
    { numero: 3, fecha_vencimiento: '2027-03-05', saldo_inicial: '8.60', interes: '0.30', amortizacion: '8.60', cuota: '8.90', saldo_final: '0.00', estado: 'PENDIENTE' },
  ],
  credito_disponible_antes: '593.26', credito_disponible_despues: '568.76', excede_credito: false, deficit: '0.00', mensaje: null,
}

function crearRouter() {
  const vacio = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tienda/compras/nueva', name: 'tienda-compra-nueva', component: PurchaseNewView },
      { path: '/tienda/compras', name: 'tienda-compras', component: vacio },
      { path: '/tienda/compras/:id', name: 'tienda-compra', component: vacio },
    ],
  })
}

async function montar(ruta = '/tienda/compras/nueva') {
  const router = crearRouter()
  await router.push(ruta)
  const w = mount(PurchaseNewView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { w, router }
}

/** Escribe en un buscador y elige el resultado cuyo texto empieza con `opcion`. */
async function elegirEn(w: VueWrapper, placeholder: string, texto: string, opcion: string) {
  const input = w.get(`input[placeholder^="${placeholder}"]`)
  await input.trigger('focus')
  await input.setValue(texto)
  await vi.waitFor(() => expect(w.findAll('[role="option"]').some((o) => o.text().startsWith(opcion))).toBe(true))
  await w.findAll('[role="option"]').find((o) => o.text().startsWith(opcion))!.trigger('mousedown')
  await flushPromises()
}

async function agregar(w: VueWrapper, producto: string, cantidad: string) {
  await elegirEn(w, 'Leche', producto, producto)
  const labelCant = w.findAll('label').find((l) => l.text().startsWith('Cantidad'))!
  await w.get(`#${labelCant.attributes('for')}`).setValue(cantidad)
  await w.findAll('button').find((b) => b.text().includes('Agregar ítem'))!.trigger('click')
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  document.body.innerHTML = ''
  vi.mocked(customers.listar).mockResolvedValue({ items: [rosa], total: 1, limit: 8, offset: 0 })
  vi.mocked(customers.credito).mockResolvedValue(rosa.resumen)
  vi.mocked(products.listar).mockImplementation(async () => ({ items: [arroz, pollo], total: 2, limit: 8, offset: 0 }))
})

describe('Registrar compra', () => {
  it('simula con el backend en cada cambio y pinta su respuesta (sin calcular)', async () => {
    vi.mocked(purchases.simular).mockResolvedValue(simCuotas)
    const { w } = await montar()

    await elegirEn(w, 'DNI o nombre', 'rosa', 'Rosa Flores Benites')
    expect(customers.credito).toHaveBeenCalledWith(1)
    expect(w.text()).toContain('S/ 593.26') // disponible real

    await agregar(w, 'Arroz', '1')
    await w.findAll('input[type="radio"]').find((r) => (r.element as HTMLInputElement).value === 'CUOTAS')!.setValue(true)

    await vi.waitFor(() =>
      expect(purchases.simular).toHaveBeenLastCalledWith({
        cliente_id: 1,
        items: [{ producto_id: 4, cantidad: '1' }],
        modalidad: 'CUOTAS',
        num_cuotas: 3,
        fecha_hora: null,
      }),
    )
    await vi.waitFor(() => expect(w.text()).toContain('S/ 26.74')) // total a pagar del backend
    expect(w.text()).toContain('S/ 8.92 / mes')
    expect(w.text()).toContain('Compra dentro del límite')
    expect(w.text()).toContain('S/ 568.76') // remanente tras compra
    expect(w.text()).toContain('Máximo permitido: 3 meses')
  })

  it('si el carrito tiene un producto sin cuotas, "En cuotas" queda deshabilitado', async () => {
    vi.mocked(purchases.simular).mockResolvedValue({ ...simCuotas, modalidad: 'FIN_MES' })
    const { w } = await montar()
    await elegirEn(w, 'DNI o nombre', 'rosa', 'Rosa Flores Benites')
    await agregar(w, 'Pollo', '2')
    const cuotas = w.findAll('input[type="radio"]').find((r) => (r.element as HTMLInputElement).value === 'CUOTAS')!
    expect((cuotas.element as HTMLInputElement).disabled).toBe(true)
  })

  it('si excede el crédito, muestra el bloqueo con el mensaje del backend y no deja registrar', async () => {
    vi.mocked(purchases.simular).mockResolvedValue({
      ...simCuotas, modalidad: 'FIN_MES', monto_total: '735.00', excede_credito: true, deficit: '141.74', credito_disponible_despues: '-141.74',
      mensaje: 'La compra (S/ 735.00) excede el crédito disponible del cliente (S/ 593.26) en S/ 141.74. No se puede registrar.',
    })
    const { w } = await montar()
    await elegirEn(w, 'DNI o nombre', 'rosa', 'Rosa Flores Benites')
    await agregar(w, 'Arroz', '30')

    await vi.waitFor(() => expect(w.text()).toContain('Exceso de crédito bloqueado'))
    expect(w.text()).toContain('excede el crédito disponible del cliente (S/ 593.26) en S/ 141.74')
    expect(w.text()).toContain('Déficit: S/ 141.74')
    const boton = w.findAll('button').find((b) => b.text().includes('Registrar Compra'))!
    expect(boton.attributes('disabled')).toBeDefined()
  })

  it('si el plazo excede el máximo, muestra el error del backend', async () => {
    vi.mocked(purchases.simular).mockRejectedValue(new ApiError('El máximo permitido para esta compra es 3 meses', 'excede_plazo', 422))
    const { w } = await montar()
    await elegirEn(w, 'DNI o nombre', 'rosa', 'Rosa Flores Benites')
    await agregar(w, 'Arroz', '1')
    await vi.waitFor(() => expect(w.text()).toContain('El máximo permitido para esta compra es 3 meses'))
    expect(w.text()).toContain('Reduce el número de cuotas')
  })

  it('registra la compra y va al cronograma', async () => {
    vi.mocked(purchases.simular).mockResolvedValue(simCuotas)
    vi.mocked(purchases.registrar).mockResolvedValue({ ...simCuotas, id: 9, estado: 'VIGENTE', registrado_por: 2 })
    vi.mocked(customers.obtener).mockResolvedValue(rosa)
    const { w, router } = await montar('/tienda/compras/nueva?cliente=1') // preseleccionado desde el detalle del cliente

    expect(w.text()).toContain('Rosa Flores Benites')
    await agregar(w, 'Arroz', '1')
    const boton = () => w.findAll('button').find((b) => b.text().includes('Registrar Compra'))!
    await vi.waitFor(() => expect(boton().attributes('disabled')).toBeUndefined())
    await boton().trigger('click')
    await flushPromises()

    expect(purchases.registrar).toHaveBeenCalledWith(expect.objectContaining({ cliente_id: 1, items: [{ producto_id: 4, cantidad: '1' }] }))
    expect(router.currentRoute.value.fullPath).toBe('/tienda/compras/9')
  })
})

describe('Cronograma de pagos', () => {
  it('muestra las filas y totales tal como los da el backend', () => {
    const w = mount(CronogramaPagos, { props: { compra: simCuotas, clienteNombre: 'Rosa Flores Benites', clienteDni: '08765432' } })
    const filas = w.findAll('tbody tr')
    expect(filas).toHaveLength(3)
    expect(filas[2]!.text()).toContain('S/ 8.90') // la última cuota ajusta el redondeo
    const total = w.get('tfoot').text()
    expect(total).toContain('S/ 2.24') // interés total (incluye gracia)
    expect(total).toContain('S/ 24.98') // amortización = monto capitalizado
    expect(total).toContain('S/ 26.74') // total a pagar
    expect(w.text()).toContain('Días de gracia: 17')
    expect(w.text()).toContain('50.8294 %') // TCEA
  })
})
