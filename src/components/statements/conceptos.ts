/** Nombres en pantalla de los conceptos de la prelación del pago (vienen del backend como códigos). */
export const CONCEPTOS: Record<string, { titulo: string; detalle: string }> = {
  INTERES_MORATORIO: { titulo: 'Intereses moratorios', detalle: 'Por los días de atraso, sobre el total que debió pagarse' },
  INTERES_COMPENSATORIO_MORA: { titulo: 'Interés compensatorio por atraso', detalle: 'Días de atraso, tasa pactada de cada compra' },
  INTERES_COMPENSATORIO: { titulo: 'Interés compensatorio pactado', detalle: 'Desde cada compra hasta la fecha de pago' },
  CAPITAL: { titulo: 'Capital acumulado de fiados', detalle: 'Monto de las compras del listado' },
}

export function nombreConcepto(codigo: string): string {
  return CONCEPTOS[codigo]?.titulo ?? codigo.replace(/_/g, ' ').toLowerCase()
}
