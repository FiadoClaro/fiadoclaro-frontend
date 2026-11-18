<script setup lang="ts">
/**
 * Pantalla 1 — Inicio de Sesión (Figma node 4-5959).
 * Izquierda: "cuaderno" con renglones y margen rojo, formulario de usuario y contraseña.
 * Derecha: foto de la bodega con toldo verde y crema, y tarjeta "El cuaderno de siempre, digital".
 *
 * Validación local con VeeValidate + Zod (campos obligatorios); el resto lo valida el backend
 * y aquí solo se muestra su mensaje (usuario no existe, contraseña incorrecta, tienda de baja...).
 */
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import HelpTip from '@/components/ui/HelpTip.vue'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { INICIO_POR_ROL, puedeEntrar } from '@/router/guard'
import isotipo from '@/assets/figma/isotipo-libreta.svg'
import checkAcento from '@/assets/figma/check-acento.svg'
import iconoLibreta from '@/assets/figma/icono-libreta-login.svg'
import iconoLibretaTarjeta from '@/assets/figma/icono-libreta-tarjeta.svg'
import fotoBodega from '@/assets/figma/login-bodega.jpg'
import iconoUsuario from '@/assets/icons/login-usuario.svg'
import iconoCandado from '@/assets/icons/login-candado.svg'
import iconoOjo from '@/assets/icons/login-ojo.svg'
import iconoFlecha from '@/assets/icons/login-flecha.svg'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const esquema = toTypedSchema(
  z.object({
    username: z.string({ required_error: 'Ingresa tu usuario' }).trim().min(1, 'Ingresa tu usuario'),
    password: z.string({ required_error: 'Ingresa tu contraseña' }).min(1, 'Ingresa tu contraseña'),
  }),
)

const { defineField, handleSubmit, errors, setFieldError, isSubmitting } = useForm({ validationSchema: esquema })
const [username, usernameAttrs] = defineField('username')
const [password, passwordAttrs] = defineField('password')

const verPassword = ref(false)
/** Mensaje general (error del backend que no es de un campo, o aviso de sesión expirada). */
const errorGeneral = ref<string | null>(auth.aviso)

const ingresar = handleSubmit(async (valores) => {
  errorGeneral.value = null
  try {
    await auth.login(valores.username, valores.password)
  } catch (e) {
    const error = e instanceof ApiError ? e : null
    const mensaje = error?.message ?? 'No se pudo iniciar sesión.'
    // El backend distingue usuario inexistente y contraseña incorrecta: se marca el campo que corresponde.
    if (error?.code === 'usuario_no_existe') setFieldError('username', mensaje)
    else if (error?.code === 'password_incorrecto') setFieldError('password', mensaje)
    else errorGeneral.value = mensaje
    return
  }

  // Volver a la página que pidió antes del login, si es de su rol; si no, a su inicio.
  const rol = auth.rol!
  const destino = typeof route.query.redirect === 'string' ? route.query.redirect : null
  if (destino && puedeEntrar(router.resolve(destino), rol)) await router.replace(destino)
  else await router.replace(INICIO_POR_ROL[rol])
})

// Rayas del toldo bodeguero (12 franjas alternadas verde / crema).
const franjas = Array.from({ length: 12 }, (_, i) => i)
</script>

<template>
  <div class="min-h-screen bg-surface-bright">
    <!-- 1. Cabecera superior -->
    <header class="flex h-header items-center justify-center border-b border-line bg-surface px-4 shadow-xs sm:px-8">
      <div class="flex w-full max-w-content items-center gap-3">
        <div class="relative flex size-10 items-center justify-center rounded-control bg-primary-container shadow-xs">
          <img :src="isotipo" alt="" width="24" height="24" />
          <span class="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-accent ring-2 ring-surface">
            <img :src="checkAcento" alt="" width="10" height="10" />
          </span>
        </div>
        <div>
          <p class="text-[19px] font-bold leading-[23.75px] tracking-[-0.475px] text-primary">FiadoClaro</p>
          <p class="text-micro font-bold uppercase leading-[10px] text-ink-subtle">Cuaderno digital</p>
        </div>
      </div>
    </header>

    <!-- 2. Contenido: tarjeta dividida en cuaderno (izquierda) y foto (derecha) -->
    <main class="flex justify-center p-4 sm:p-6">
      <div
        class="flex w-full max-w-content overflow-hidden rounded-card border border-surface-high bg-white shadow-float lg:min-h-[680px]"
      >
        <!-- Izquierda: cuaderno de cuentas -->
        <section class="bg-notebook relative w-full p-8 lg:w-[480px] lg:shrink-0">
          <span class="absolute inset-y-0 left-7 w-[1.5px] bg-notebook-margin/50" aria-hidden="true" />

          <div class="relative pl-6">
            <!-- Identidad -->
            <div class="flex items-center gap-2 pb-5">
              <span class="flex size-9 items-center justify-center rounded-control bg-primary-container shadow-xs">
                <img :src="iconoLibreta" alt="" width="18.33" height="13.33" />
              </span>
              <div>
                <p class="text-body-lg font-bold tracking-[-0.4px] text-primary">FiadoClaro</p>
                <p class="text-label font-bold uppercase text-outline">Libreta mercantil</p>
              </div>
            </div>

            <!-- Título -->
            <div class="pb-4">
              <h1 class="text-headline font-bold tracking-[-0.36px] text-ink">Ingresa a tu cuenta</h1>
              <p class="mt-1 text-body text-on-surface-variant">Aquí llevamos las cuentas claras.</p>
            </div>

            <!-- Aviso general (error del backend o sesión expirada) -->
            <p
              v-if="errorGeneral"
              role="alert"
              class="mb-4 rounded-control border border-error/30 bg-error-container px-3 py-2 text-caption font-semibold text-error"
            >
              {{ errorGeneral }}
            </p>

            <!-- Formulario -->
            <form class="flex flex-col gap-3.5" novalidate @submit="ingresar">
              <!-- Usuario -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between">
                  <label for="login-usuario" class="text-body font-semibold tracking-[0.14px] text-ink">Usuario</label>
                  <HelpTip
                    campo="Usuario"
                    titulo="Usuario de acceso"
                    texto="Administradores: el usuario que les dio el sistema (ej. dlucho). Vecinos: su DNI y el dominio de la tienda, ej. 08765432@bodegadonlucho.com."
                  />
                </div>
                <div class="relative">
                  <img :src="iconoUsuario" alt="" width="16.67" height="16.67" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-usuario"
                    v-model="username"
                    v-bind="usernameAttrs"
                    type="text"
                    autocomplete="username"
                    autocapitalize="none"
                    spellcheck="false"
                    placeholder="dlucho o 08765432@bodegadonlucho.com"
                    :aria-invalid="!!errors.username"
                    :aria-describedby="errors.username ? 'login-usuario-error' : undefined"
                    :class="errors.username ? 'border-error' : 'border-line'"
                    class="w-full rounded-control border bg-white py-[11px] pl-[41px] pr-[13px] text-body text-on-surface shadow-xs placeholder:text-outline focus:border-primary-container focus:outline-none focus:ring-2 focus:ring-primary-container/20"
                  />
                </div>
                <p v-if="errors.username" id="login-usuario-error" class="text-caption text-error">{{ errors.username }}</p>
              </div>

              <!-- Contraseña -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between">
                  <label for="login-password" class="text-body font-semibold tracking-[0.14px] text-ink">Contraseña</label>
                  <HelpTip
                    campo="Contraseña"
                    titulo="Contraseña"
                    texto="La que te entregó el sistema o la tienda (distingue mayúsculas y minúsculas). Puedes cambiarla luego desde Mi perfil."
                  />
                </div>
                <div class="relative">
                  <img :src="iconoCandado" alt="" width="13.33" height="17.5" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    v-model="password"
                    v-bind="passwordAttrs"
                    :type="verPassword ? 'text' : 'password'"
                    autocomplete="current-password"
                    :aria-invalid="!!errors.password"
                    :aria-describedby="errors.password ? 'login-password-error' : undefined"
                    :class="errors.password ? 'border-error' : 'border-line'"
                    class="w-full rounded-control border bg-white px-[41px] py-[11px] text-body text-on-surface shadow-xs focus:border-primary-container focus:outline-none focus:ring-2 focus:ring-primary-container/20"
                  />
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 flex items-center rounded-r-control px-3"
                    :aria-label="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                    :aria-pressed="verPassword"
                    @click="verPassword = !verPassword"
                  >
                    <img :src="iconoOjo" alt="" width="18.33" height="12.5" :class="verPassword ? 'opacity-100' : 'opacity-70'" />
                  </button>
                </div>
                <p v-if="errors.password" id="login-password-error" class="text-caption text-error">{{ errors.password }}</p>
              </div>

              <!-- Ingresar -->
              <div class="pt-1">
                <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="flex w-full items-center justify-center gap-1 rounded-control bg-primary-container px-4 py-3 text-body font-semibold tracking-[0.14px] text-white shadow-btn transition-colors hover:bg-primary disabled:cursor-wait disabled:opacity-70"
                >
                  {{ isSubmitting ? 'Ingresando…' : 'Ingresar' }}
                  <img v-if="!isSubmitting" :src="iconoFlecha" alt="" width="12" height="12" />
                </button>
              </div>
            </form>
          </div>
        </section>

        <!-- Derecha: foto cálida de la bodega (solo en pantallas anchas) -->
        <section class="relative hidden flex-1 overflow-hidden bg-surface-low lg:block" aria-hidden="true">
          <!-- Foto con degradado oscuro -->
          <div class="absolute inset-x-0 bottom-[36.5px] top-10">
            <img :src="fotoBodega" alt="" class="absolute inset-0 size-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
            <!-- Tarjeta flotante -->
            <div class="absolute inset-x-0 bottom-6 flex justify-center px-6">
              <div class="flex w-full max-w-[448px] gap-3.5 rounded-card border border-white/40 bg-white/95 p-[17px] shadow-float backdrop-blur-[6px]">
                <span class="flex size-12 shrink-0 items-center justify-center rounded-control bg-primary-container shadow-btn">
                  <img :src="iconoLibretaTarjeta" alt="" width="23.83" height="17.33" />
                </span>
                <div>
                  <p class="text-[15px] font-bold leading-[22.5px] text-ink">El cuaderno de siempre, digital</p>
                  <p class="mt-0.5 text-caption leading-[19.5px] tracking-normal text-ink-muted">
                    Registro confiable de fiados, abonos diarios y cuentas claras entre el bodeguero y sus vecinos.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <!-- Toldo bodeguero verde y crema -->
          <div class="absolute inset-x-0 top-0 flex h-10 shadow-xs">
            <span v-for="i in franjas" :key="i" :class="i % 2 === 0 ? 'bg-primary-container' : 'bg-surface'" class="h-full flex-1" />
          </div>
          <!-- Pie oscuro (regla comercial) -->
          <div class="absolute inset-x-0 bottom-0 h-[37px] bg-ink" />
        </section>
      </div>
    </main>
  </div>
</template>
