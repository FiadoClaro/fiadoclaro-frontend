import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

/**
 * Rutas de la aplicación.
 * Fase 1: solo existe /design (catálogo visual), y únicamente en desarrollo.
 * Login, guardas por rol y layouts llegan en la fase 2.
 */
const routes: RouteRecordRaw[] = []

if (import.meta.env.DEV) {
  routes.push(
    { path: '/design', name: 'design', component: () => import('@/views/DesignView.vue') },
    // Mientras no haya login, la raíz lleva al catálogo de diseño.
    { path: '/', redirect: '/design' },
  )
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
