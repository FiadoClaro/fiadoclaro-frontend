/**
 * Store "toast": mensajes breves de éxito o error que aparecen en la esquina y se van solos.
 * Uso desde cualquier vista:
 *   const toast = useToastStore()
 *   toast.exito('Tienda registrada')
 *   toast.error(error.message)   // mensaje que vino del backend
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type TipoToast = 'exito' | 'error' | 'info'

export interface Toast {
  id: number
  tipo: TipoToast
  mensaje: string
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let siguienteId = 1

  function cerrar(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  /** Muestra un mensaje. Los errores duran más para que dé tiempo de leerlos. */
  function mostrar(tipo: TipoToast, mensaje: string, duracionMs = tipo === 'error' ? 7000 : 4000) {
    const id = siguienteId++
    toasts.value.push({ id, tipo, mensaje })
    if (toasts.value.length > 4) toasts.value.shift() // como máximo 4 a la vez
    setTimeout(() => cerrar(id), duracionMs)
    return id
  }

  return {
    toasts,
    cerrar,
    mostrar,
    exito: (mensaje: string) => mostrar('exito', mensaje),
    error: (mensaje: string) => mostrar('error', mensaje),
    info: (mensaje: string) => mostrar('info', mensaje),
  }
})
