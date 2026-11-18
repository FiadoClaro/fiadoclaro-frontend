/// <reference types="vite/client" />

// Variables de entorno que usa la app (archivo .env)
interface ImportMetaEnv {
  /** URL base de la API, p. ej. http://localhost:8000/api/v1 */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
