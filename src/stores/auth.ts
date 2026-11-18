/**
 * Store "auth": sesión del usuario.
 *
 * Guarda el token en localStorage (para no pedir login al recargar) y en memoria el usuario
 * y, si corresponde, su tienda (para mostrar nombre y RUC en la barra lateral).
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as iam from '@/api/iam'
import { CLAVE_TOKEN } from '@/api/http'
import type { Rol, TiendaOut, UsuarioOut } from '@/types/api'
import { borrar, guardar, leer } from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(leer(CLAVE_TOKEN))
  const usuario = ref<UsuarioOut | null>(null)
  const tienda = ref<TiendaOut | null>(null)
  /** Mensaje para mostrar en el login (p. ej. "La sesión expiró, vuelve a iniciar sesión"). */
  const aviso = ref<string | null>(null)
  /** true cuando ya se intentó recuperar la sesión guardada (evita pedir /me en cada navegación). */
  const inicializado = ref(false)

  const autenticado = computed(() => token.value !== null && usuario.value !== null)
  const rol = computed(() => (usuario.value?.rol ?? null) as Rol | null)

  /** Carga la tienda del usuario; el administrador del sistema no tiene una. */
  async function cargarTienda(): Promise<void> {
    tienda.value = usuario.value?.tienda_id != null ? await iam.miTienda() : null
  }

  /** Inicia sesión con usuario y contraseña. Si falla, lanza el ApiError con el mensaje del backend. */
  async function login(username: string, password: string): Promise<void> {
    const respuesta = await iam.login(username.trim(), password)
    token.value = respuesta.access_token
    guardar(CLAVE_TOKEN, respuesta.access_token)
    usuario.value = respuesta.usuario
    aviso.value = null
    inicializado.value = true
    try {
      await cargarTienda()
    } catch {
      // Sin datos de tienda la app funciona igual; solo no se muestran en la barra lateral.
    }
  }

  /** Recupera la sesión guardada al abrir o recargar la página. */
  async function inicializar(): Promise<void> {
    if (inicializado.value) return
    inicializado.value = true
    if (!token.value) return
    try {
      usuario.value = await iam.me()
      await cargarTienda()
    } catch {
      // Token vencido o inválido: se descarta en silencio y se pide login.
      limpiar()
    }
  }

  /** Borra la sesión (memoria y localStorage). */
  function limpiar(): void {
    token.value = null
    usuario.value = null
    tienda.value = null
    borrar(CLAVE_TOKEN)
  }

  /** Cierra la sesión. Si se pasa un mensaje, se mostrará en la pantalla de login. */
  function logout(mensaje?: string): void {
    limpiar()
    aviso.value = mensaje ?? null
  }

  return { token, usuario, tienda, aviso, inicializado, autenticado, rol, login, inicializar, logout }
})
