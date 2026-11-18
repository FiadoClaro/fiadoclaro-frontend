/**
 * Unidades de medida sugeridas para el catálogo. El backend acepta cualquier texto
 * (1 a 20 caracteres), así que con "Otro" se puede escribir una distinta.
 */
export const UNIDADES = [
  'Unidad',
  'Kilo (kg)',
  'Litro (L)',
  'Paquete',
  'Bolsa',
  'Lata',
  'Botella',
  'Caja',
  'Docena',
  'Servicio',
] as const

export const UNIDAD_OTRA = '__otra__'
