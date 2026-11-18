/**
 * Clases compartidas por los controles de formulario, para que todos se vean igual.
 *
 * Dos variantes del Figma:
 *  - 'blanco'  (Figma 3 Registrar Tienda): fondo blanco, borde suave, 44 px de alto.
 *  - 'relleno' (Figma 5 Registrar Cliente): fondo crema con sombra interior, 42 px de alto.
 */
export type VarianteCampo = 'blanco' | 'relleno'

/** Opción de SelectInput y SegmentedToggle. */
export interface Opcion<V extends string | number> {
  value: V
  label: string
  disabled?: boolean
}

export function clasesCampo(variante: VarianteCampo, invalido: boolean): string {
  const base =
    'w-full rounded-control text-body text-on-surface placeholder:text-outline transition-colors ' +
    'focus:outline-none focus:ring-2 focus:ring-primary-container/25 ' +
    'disabled:cursor-not-allowed disabled:text-outline'
  const forma =
    variante === 'blanco'
      ? 'h-11 border bg-white shadow-xs disabled:bg-surface-low'
      : 'h-[42px] border bg-surface-low shadow-inset disabled:bg-surface-container'
  const borde = invalido
    ? 'border-error focus:border-error'
    : variante === 'blanco'
      ? 'border-outline-variant/40 focus:border-primary-container'
      : 'border-transparent focus:border-primary-container'
  return `${base} ${forma} ${borde}`
}
