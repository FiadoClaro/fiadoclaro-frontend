<script setup lang="ts">
/** Botón "Cerrar sesión" de la cabecera (rojo, como en el Figma). */
import { useRouter } from 'vue-router'
import icono from '@/assets/icons/cerrar-sesion.svg'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function salir() {
  auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <button
    type="button"
    class="flex items-center gap-1 rounded-control px-2 py-1.5 text-caption font-semibold text-error transition-colors hover:bg-error-container/50"
    @click="salir"
  >
    <img :src="icono" alt="" width="13.5" height="13.5" />
    <span class="hidden sm:inline">Cerrar sesión</span>
    <span class="sr-only sm:hidden">Cerrar sesión</span>
  </button>
</template>
