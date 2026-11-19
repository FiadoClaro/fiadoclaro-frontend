/**
 * Rutas de FiadoClaro.
 *
 * Cada rol tiene su layout (barra lateral + cabecera + pie) y sus rutas hijas:
 *   /admin/...   ADMIN_SISTEMA → AdminLayout
 *   /tienda/...  ADMIN_TIENDA  → StoreLayout
 *   /portal/...  CLIENTE       → CustomerLayout
 * Las páginas que se construyen en fases siguientes usan PlaceholderView por ahora.
 *
 * meta de cada ruta:
 *   publico  → se ve sin sesión (login)
 *   rol      → rol que puede entrar (en la ruta padre del layout)
 *   titulo   → título en la cabecera y en la pestaña del navegador
 *   seccion  → texto de la miga de pan en la cabecera de la tienda ("Operaciones", "Mi cuenta")
 *   fase     → fase del plan en la que se construye la página (solo para los marcadores)
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import type { Rol } from '@/types/api'
import { useAuthStore } from '@/stores/auth'
import { decidirNavegacion, INICIO_POR_ROL } from './guard'

declare module 'vue-router' {
  interface RouteMeta {
    publico?: boolean
    rol?: Rol
    titulo?: string
    seccion?: string
    fase?: number
  }
}

const Placeholder = () => import('@/views/PlaceholderView.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { publico: true, titulo: 'Inicio de sesión' },
  },

  // ---------------- Administrador del sistema ----------------
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { rol: 'ADMIN_SISTEMA' },
    children: [
      { path: '', redirect: INICIO_POR_ROL.ADMIN_SISTEMA },
      { path: 'tiendas', name: 'admin-tiendas', component: () => import('@/views/admin/StoreListView.vue'), meta: { titulo: 'Administración de Tiendas' } },
      { path: 'tiendas/nueva', name: 'admin-tienda-nueva', component: () => import('@/views/admin/StoreFormView.vue'), meta: { titulo: 'Registrar Tienda' } },
      {
        path: 'tiendas/:id(\\d+)/editar',
        name: 'admin-tienda-editar',
        component: () => import('@/views/admin/StoreFormView.vue'),
        meta: { titulo: 'Editar Tienda' },
      },
      { path: 'perfil', name: 'admin-perfil', component: Placeholder, meta: { titulo: 'Mi perfil', fase: 9 } },
      { path: 'perfil/contrasena', name: 'admin-contrasena', component: Placeholder, meta: { titulo: 'Cambiar contraseña', fase: 9 } },
    ],
  },

  // ---------------- Administrador de tienda ----------------
  {
    path: '/tienda',
    component: () => import('@/layouts/StoreLayout.vue'),
    meta: { rol: 'ADMIN_TIENDA', seccion: 'Operaciones' },
    children: [
      { path: '', redirect: INICIO_POR_ROL.ADMIN_TIENDA },
      { path: 'clientes', name: 'tienda-clientes', component: () => import('@/views/store/CustomerListView.vue'), meta: { titulo: 'Clientes' } },
      { path: 'clientes/nuevo', name: 'tienda-cliente-nuevo', component: () => import('@/views/store/CustomerFormView.vue'), meta: { titulo: 'Registrar Cliente' } },
      { path: 'clientes/:id(\\d+)', name: 'tienda-cliente', component: () => import('@/views/store/CustomerDetailView.vue'), meta: { titulo: 'Detalle del Cliente' } },
      {
        path: 'clientes/:id(\\d+)/editar',
        name: 'tienda-cliente-editar',
        component: () => import('@/views/store/CustomerFormView.vue'),
        meta: { titulo: 'Editar Cliente' },
      },
      {
        path: 'clientes/:id(\\d+)/condicion',
        name: 'tienda-cliente-condicion',
        component: () => import('@/views/store/CustomerConditionView.vue'),
        meta: { titulo: 'Cambiar condiciones' },
      },
      { path: 'productos', name: 'tienda-productos', component: () => import('@/views/store/ProductListView.vue'), meta: { titulo: 'Productos y servicios' } },
      { path: 'productos/nuevo', name: 'tienda-producto-nuevo', component: () => import('@/views/store/ProductFormView.vue'), meta: { titulo: 'Registrar Producto' } },
      {
        path: 'productos/:id(\\d+)/editar',
        name: 'tienda-producto-editar',
        component: () => import('@/views/store/ProductFormView.vue'),
        meta: { titulo: 'Editar Producto' },
      },
      { path: 'compras', name: 'tienda-compras', component: () => import('@/views/store/PurchaseListView.vue'), meta: { titulo: 'Compras' } },
      { path: 'compras/nueva', name: 'tienda-compra-nueva', component: () => import('@/views/store/PurchaseNewView.vue'), meta: { titulo: 'Registrar compra' } },
      { path: 'compras/:id(\\d+)', name: 'tienda-compra', component: () => import('@/views/store/PurchaseDetailView.vue'), meta: { titulo: 'Cronograma de Pagos' } },
      { path: 'pagos/nuevo', name: 'tienda-pago-nuevo', component: Placeholder, meta: { titulo: 'Registrar pago', fase: 8 } },
      { path: 'listados', name: 'tienda-listados', component: Placeholder, meta: { titulo: 'Listado de pago', fase: 8 } },
      { path: 'listados/:id', name: 'tienda-listado', component: Placeholder, meta: { titulo: 'Listado de pago', fase: 8 } },
      { path: 'mi-tienda', name: 'tienda-mi-tienda', component: Placeholder, meta: { titulo: 'Mi tienda', seccion: 'Mi cuenta', fase: 9 } },
      { path: 'perfil', name: 'tienda-perfil', component: Placeholder, meta: { titulo: 'Mi perfil', seccion: 'Mi cuenta', fase: 9 } },
      { path: 'perfil/contrasena', name: 'tienda-contrasena', component: Placeholder, meta: { titulo: 'Cambiar contraseña', seccion: 'Mi cuenta', fase: 9 } },
    ],
  },

  // ---------------- Cliente (vecino) ----------------
  {
    path: '/portal',
    component: () => import('@/layouts/CustomerLayout.vue'),
    meta: { rol: 'CLIENTE' },
    children: [
      { path: '', name: 'portal', component: Placeholder, meta: { titulo: 'Mi estado de cuenta', fase: 9 } },
      { path: 'compras', name: 'portal-compras', component: Placeholder, meta: { titulo: 'Mis compras', fase: 9 } },
      { path: 'compras/:id', name: 'portal-compra', component: Placeholder, meta: { titulo: 'Cronograma de Pagos', fase: 9 } },
      { path: 'listados', name: 'portal-listados', component: Placeholder, meta: { titulo: 'Mis listados de pago', fase: 9 } },
      { path: 'listados/:id', name: 'portal-listado', component: Placeholder, meta: { titulo: 'Listado de pago', fase: 9 } },
      { path: 'perfil', name: 'portal-perfil', component: Placeholder, meta: { titulo: 'Mi perfil', fase: 9 } },
      { path: 'perfil/contrasena', name: 'portal-contrasena', component: Placeholder, meta: { titulo: 'Cambiar contraseña', fase: 9 } },
    ],
  },

  // La raíz y cualquier ruta desconocida: la guarda decide (login o inicio del rol).
  { path: '/', name: 'raiz', component: Placeholder },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

// Catálogo del sistema de diseño: solo en desarrollo.
if (import.meta.env.DEV) {
  routes.unshift({
    path: '/design',
    name: 'design',
    component: () => import('@/views/DesignView.vue'),
    meta: { publico: true, titulo: 'Sistema de diseño' },
  })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Guarda global: recupera la sesión guardada (una sola vez) y aplica las reglas de acceso.
router.beforeEach(async (to) => {
  if (to.name === 'design') return true
  const auth = useAuthStore()
  await auth.inicializar()
  const decision = decidirNavegacion(to, { autenticado: auth.autenticado, rol: auth.rol })
  // La raíz no es una página: con sesión lleva al inicio del rol.
  if (decision === true && to.name === 'raiz' && auth.rol) return INICIO_POR_ROL[auth.rol]
  return decision
})

// Título de la pestaña del navegador.
router.afterEach((to) => {
  document.title = to.meta.titulo ? `${to.meta.titulo} · FiadoClaro` : 'FiadoClaro'
})

export default router
