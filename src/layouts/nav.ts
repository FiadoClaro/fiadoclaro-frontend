/** Tipos del menú lateral. Cada layout arma sus secciones con estos tipos. */

export interface ItemMenu {
  /** Texto del enlace */
  texto: string
  /** Ruta a la que lleva */
  to: string
  /** Ícono (SVG importado de src/assets/icons) */
  icono: string
  /** Tamaño del ícono tal como está en el Figma, en px */
  ancho: number
  alto: number
  /** true = solo se marca activo en la ruta exacta (por defecto también en sus subrutas) */
  exacto?: boolean
}

export interface SeccionMenu {
  /** Título de la sección en mayúsculas ("OPERACIONES CUADERNO") */
  titulo: string
  items: ItemMenu[]
}

/** ¿El ítem corresponde a la ruta actual? */
export function estaActivo(item: ItemMenu, rutaActual: string): boolean {
  if (item.exacto) return rutaActual === item.to
  return rutaActual === item.to || rutaActual.startsWith(item.to + '/')
}

/** Iniciales para el avatar: "Rosa Flores Benites" → "RF". */
export function iniciales(nombre: string | null | undefined): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  return partes.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?'
}
