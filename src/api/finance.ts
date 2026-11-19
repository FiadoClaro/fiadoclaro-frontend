/** Endpoints financieros de apoyo (/finance). Los cálculos los hace el backend (engine.py). */
import { http } from './http'
import type { EquivalenciasOut, TasaIn, TopeOut } from '@/types/api'

/** Convierte una tasa nominal o efectiva a TED, TEM y TEA (todas en %). */
export async function equivalencias(tasa: TasaIn): Promise<EquivalenciasOut> {
  const { data } = await http.post<EquivalenciasOut>('/finance/equivalencias', tasa)
  return data
}

/** Topes de tasa del BCRP registrados (compensatoria y moratoria, por moneda y fecha de vigencia). */
export async function topes(): Promise<TopeOut[]> {
  const { data } = await http.get<TopeOut[]>('/finance/topes')
  return data
}
