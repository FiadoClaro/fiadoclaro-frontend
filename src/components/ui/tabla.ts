/** Tipos de DataTable. */

export interface Columna {
  /** Campo de la fila que se muestra (o nombre del slot `cell-<key>`) */
  key: string
  /** Título de la columna (se muestra en mayúsculas) */
  label: string
  align?: 'left' | 'right' | 'center'
  /** Clases extra para las celdas de esta columna (ancho, etc.) */
  class?: string
}

/** Chip de filtro: "Al día (2)". */
export interface Chip {
  value: string
  label: string
  /** Cantidad de registros (viene de `conteos` del backend) */
  count?: number
}
