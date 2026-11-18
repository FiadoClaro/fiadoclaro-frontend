import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { alExpirarSesion } from './api/http'
import { useAuthStore } from './stores/auth'
import './assets/main.css'

// Punto de entrada: crea la app de Vue con Pinia (estado) y Vue Router (rutas).
const app = createApp(App)
app.use(createPinia())
app.use(router)

// Si el backend responde 401 (sesión vencida o token inválido): cerrar sesión y volver al login
// mostrando el mensaje del backend.
alExpirarSesion((mensaje) => {
  const auth = useAuthStore()
  if (!auth.token) return // ya se cerró (varias peticiones pueden fallar a la vez)
  auth.logout(mensaje)
  const actual = router.currentRoute.value
  router.replace({ name: 'login', query: actual.meta.publico ? {} : { redirect: actual.fullPath } })
})

app.mount('#app')
