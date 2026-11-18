/**
 * Cliente HTTP de la app (Axios) para hablar con el backend de FiadoClaro.
 *
 * - Usa VITE_API_URL como base (p. ej. http://localhost:8000/api/v1).
 * - Agrega el token de la sesión: `Authorization: Bearer <token>`.
 * - Convierte cualquier error en un ApiError { message, code, status, fields } con el mensaje del backend.
 * - Si el backend responde 401 (sesión vencida o token inválido), avisa a quien se haya suscrito
 *   con `alExpirarSesion` (el store de auth cierra sesión y el router lleva a /login).
 */
import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { ApiErrorBody } from '@/types/api'
import { leer } from '@/utils/storage'

/** Clave de localStorage donde se guarda el token. */
export const CLAVE_TOKEN = 'fiadoclaro.token'

/** Error de la API ya traducido a lo que necesita la interfaz. */
export class ApiError extends Error {
  /** Código estable del backend, p. ej. "password_incorrecto", "tasa_supera_tope", "validacion". */
  readonly code: string
  /** Código HTTP (0 si no hubo respuesta, p. ej. backend apagado). */
  readonly status: number
  /** Errores por campo: { username: "El usuario es obligatorio" }. */
  readonly fields: Record<string, string>
  /** Datos extra que algunos errores traen (p. ej. montos al exceder el crédito). */
  readonly datos?: unknown

  constructor(message: string, code: string, status: number, fields: Record<string, string> = {}, datos?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.fields = fields
    this.datos = datos
  }
}

/** Forma en que el backend describe cada campo inválido (ver app/core/errors.py → mensaje_validacion). */
interface ErrorDeCampo {
  campo?: string
  mensaje?: string
}

/** Pasa cualquier error de Axios a ApiError, usando siempre el mensaje que da el backend. */
export function aApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (!(error instanceof AxiosError)) {
    return new ApiError('Ocurrió un error inesperado en la aplicación.', 'error_cliente', 0)
  }
  if (!error.response) {
    return new ApiError(
      'No se pudo conectar con el servidor. Revisa tu conexión o que el backend esté encendido.',
      'sin_conexion',
      0,
    )
  }

  const { status, data } = error.response as { status: number; data: Partial<ApiErrorBody> & { errores?: ErrorDeCampo[] } }
  const fields: Record<string, string> = {}

  // Errores de validación: el backend manda una lista `errores` con { campo, mensaje } en español.
  if (Array.isArray(data?.errores)) {
    for (const e of data.errores) {
      if (e.campo && e.mensaje && !fields[e.campo]) fields[e.campo] = e.mensaje
    }
  }

  // `detail` es texto en los errores de negocio; si viniera como lista (validación cruda de FastAPI) usamos el primero.
  let message = 'Ocurrió un error en el servidor.'
  if (typeof data?.detail === 'string') message = data.detail
  else if (Array.isArray(data?.detail) && data.detail[0]?.msg) message = data.detail[0].msg

  return new ApiError(message, data?.code ?? `http_${status}`, status, fields, data?.datos)
}

// ---------------------------------------------------------------------------

type ManejadorSesionExpirada = (mensaje: string) => void
let manejadorSesionExpirada: ManejadorSesionExpirada | null = null

/** Registra qué hacer cuando el backend dice que la sesión ya no es válida (401). */
export function alExpirarSesion(manejador: ManejadorSesionExpirada): void {
  manejadorSesionExpirada = manejador
}

/** Instancia de Axios que usan todos los módulos de src/api. */
export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 20000,
})

// Antes de cada petición: agrega el token si hay sesión.
http.interceptors.request.use((config) => {
  const token = leer(CLAVE_TOKEN)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Después de cada respuesta: traduce errores y maneja la sesión vencida.
http.interceptors.response.use(
  (respuesta) => respuesta,
  (error: unknown) => {
    const apiError = aApiError(error)
    // El 401 del propio login significa "contraseña incorrecta", no "sesión vencida".
    const esLogin = error instanceof AxiosError && error.config?.url?.includes('/iam/login')
    if (apiError.status === 401 && !esLogin && manejadorSesionExpirada) {
      manejadorSesionExpirada(apiError.message)
    }
    return Promise.reject(apiError)
  },
)
