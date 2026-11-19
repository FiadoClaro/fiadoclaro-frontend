/**
 * Condiciones de crédito del cliente (enunciado, punto 3): reglas de validación, valores iniciales
 * y conversión hacia/desde lo que espera el backend (CondicionIn / CondicionOut).
 * Lo comparten el alta de cliente y la pantalla "Cambiar condiciones".
 */
import { z } from 'zod'
import type { CondicionIn, CondicionOut, TasaIn } from '@/types/api'
import { compararDecimales } from '@/utils/decimalInput'

/** Porcentaje entre 0 y 1000 con hasta 7 decimales (backend: TasaIn.valor). */
const PORCENTAJE = /^\d+(\.\d{0,7})?$/

const esquemaTasa = (nombre: string) =>
  z.object({
    tipo: z.enum(['NOMINAL', 'EFECTIVA']),
    valor: z
      .string()
      .refine((v) => PORCENTAJE.test(v), `Escribe la ${nombre} en %, con hasta 7 decimales (ej. 3.5)`)
      .refine((v) => !PORCENTAJE.test(v) || compararDecimales(v, '1000') <= 0, `La ${nombre} no puede ser mayor a 1000 %`),
    periodo_dias: z.union([z.literal(30), z.literal(360)]),
    capitalizacion_dias: z.number().int().nullable(),
  })

export const esquemaCondicion = z
  .object({
    moneda: z.enum(['PEN', 'USD']),
    tasa: esquemaTasa('tasa compensatoria'),
    tasa_mora: esquemaTasa('tasa moratoria'),
    limite_credito: z
      .string()
      .refine((v) => /^\d+(\.\d{0,2})?$/.test(v) && /[1-9]/.test(v), 'El límite de crédito debe ser mayor que 0 (máximo 2 decimales)'),
    max_meses: z.number({ invalid_type_error: 'Elige el máximo de meses' }).int().min(1).max(36),
    dia_corte: z.number({ invalid_type_error: 'Indica el día de corte (1 a 28)' }).int().min(1, 'El día debe estar entre 1 y 28').max(28, 'El día debe estar entre 1 y 28'),
    hora_corte: z.string().regex(/^\d{2}:\d{2}/, 'Indica la hora de corte'),
    dia_pago: z.number({ invalid_type_error: 'Indica el día de pago (1 a 28)' }).int().min(1, 'El día debe estar entre 1 y 28').max(28, 'El día debe estar entre 1 y 28'),
  })
  .refine((c) => c.dia_corte !== c.dia_pago, { path: ['dia_pago'], message: 'El día de pago debe ser distinto al día de corte' })

export type CondicionForm = z.infer<typeof esquemaCondicion>

/** Valores iniciales de un cliente nuevo (los del ejemplo del Figma). */
export function condicionInicial(): CondicionForm {
  return {
    moneda: 'PEN',
    tasa: { tipo: 'EFECTIVA', valor: '', periodo_dias: 30, capitalizacion_dias: null },
    tasa_mora: { tipo: 'EFECTIVA', valor: '', periodo_dias: 30, capitalizacion_dias: null },
    limite_credito: '',
    max_meses: 3,
    dia_corte: 25,
    hora_corte: '18:00',
    dia_pago: 5,
  }
}

/** Una tasa del formulario lista para el backend, o null si aún no es válida. */
export function tasaParaBackend(t: CondicionForm['tasa']): TasaIn | null {
  if (!PORCENTAJE.test(t.valor)) return null
  return {
    tipo: t.tipo,
    valor: t.valor, // texto: el backend lo lee como Decimal exacto
    periodo_dias: t.periodo_dias,
    // Solo la nominal se capitaliza; por regla del curso, diaria si no se indica.
    capitalizacion_dias: t.tipo === 'NOMINAL' ? (t.capitalizacion_dias ?? 1) : null,
  }
}

/** Formulario → CondicionIn (cuerpo de POST /customers y PUT /customers/{id}/condicion). */
export function condicionParaBackend(c: CondicionForm): CondicionIn {
  return {
    moneda: c.moneda,
    tasa: tasaParaBackend(c.tasa)!,
    tasa_mora: tasaParaBackend(c.tasa_mora)!,
    limite_credito: c.limite_credito,
    max_meses: c.max_meses,
    dia_corte: c.dia_corte,
    hora_corte: c.hora_corte.slice(0, 5),
    dia_pago: c.dia_pago,
  }
}

/** "3.5000000" → "3.5" (para que el campo se vea limpio al editar). */
export function sinCerosFinales(v: string): string {
  return v.includes('.') ? v.replace(/0+$/, '').replace(/\.$/, '') : v
}

/** CondicionOut (lo que devuelve el backend) → formulario, para "Cambiar condiciones". */
export function condicionDesdeBackend(c: CondicionOut): CondicionForm {
  const tasa = (t: CondicionOut['tasa']) => ({
    tipo: t.tipo as 'NOMINAL' | 'EFECTIVA',
    valor: sinCerosFinales(t.valor),
    periodo_dias: (t.periodo_dias === 360 ? 360 : 30) as 30 | 360,
    capitalizacion_dias: t.capitalizacion_dias,
  })
  return {
    moneda: c.moneda as 'PEN' | 'USD',
    tasa: tasa(c.tasa),
    tasa_mora: tasa(c.tasa_mora),
    limite_credito: c.limite_credito,
    max_meses: c.max_meses,
    dia_corte: c.dia_corte,
    hora_corte: c.hora_corte.slice(0, 5),
    dia_pago: c.dia_pago,
  }
}

/** Reglas para ubicar los errores de negocio del backend en el campo que corresponde. */
export const REGLAS_ERROR_CONDICION = [
  { patron: /tasa compensatoria/i, campo: 'condicion.tasa.valor' },
  { patron: /tasa moratoria/i, campo: 'condicion.tasa_mora.valor' },
  { patron: /capitalizaci[oó]n/i, campo: 'condicion.tasa.capitalizacion_dias' },
  { patron: /d[ií]a de pago/i, campo: 'condicion.dia_pago' },
]
