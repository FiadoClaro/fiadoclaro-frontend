<script setup lang="ts">
/**
 * Pantalla 3 — Registrar / Editar Tienda (Figma node 4-4706). Rol: ADMIN_SISTEMA.
 *
 *  - Registrar (/admin/tiendas/nueva): datos de la tienda + administrador + credenciales de acceso.
 *    POST /stores crea la tienda y el usuario del administrador a la vez.
 *  - Editar (/admin/tiendas/:id/editar): datos de la tienda y contacto del administrador.
 *    El RUC no se cambia y el usuario/contraseña no se editan aquí (PATCH /stores/{id}).
 *
 * Validación local con Zod (mismas reglas que el backend) y, si el backend rechaza algo,
 * su mensaje se muestra junto al campo que corresponde.
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import * as stores from '@/api/stores'
import { ApiError } from '@/api/http'
import FormField from '@/components/forms/FormField.vue'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import { useToastStore } from '@/stores/toast'
import { aplicarErroresApi } from '@/utils/erroresFormulario'
import type { TiendaCreate, TiendaUpdate } from '@/types/api'
import { GIRO_OTRO, GIROS } from './giros'
import iconoRuc from '@/assets/icons/campo-ruc.svg'
import iconoTelefono from '@/assets/icons/campo-telefono.svg'
import iconoCorreo from '@/assets/icons/campo-correo.svg'
import iconoCelular from '@/assets/icons/campo-celular.svg'
import iconoArroba from '@/assets/icons/campo-arroba.svg'
import iconoPersona from '@/assets/icons/campo-persona.svg'
import iconoCandado from '@/assets/icons/campo-candado.svg'
import iconoCandadoConfirmar from '@/assets/icons/campo-candado-confirmar.svg'
import iconoOjo from '@/assets/icons/campo-ojo.svg'
import iconoNota from '@/assets/icons/nota-obligatorios.svg'
import iconoGuardar from '@/assets/icons/guardar.svg'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const idTienda = computed(() => (route.params.id ? Number(route.params.id) : null))
const editando = computed(() => idTienda.value !== null)

// ---------------- Reglas (las mismas del backend: app/modules/stores/schemas.py) ----------------
const USUARIO = /^[a-zA-Z0-9._@-]+$/
const opcional = (max: number, nombre: string) => z.string().trim().max(max, `${nombre} no puede tener más de ${max} caracteres`)
const correoOpcional = z.string().trim().email('El correo no es válido').or(z.literal(''))

const datosTienda = {
  nombre_comercial: z.string().trim().min(2, 'El nombre comercial debe tener al menos 2 caracteres').max(120),
  razon_social: z.string().trim().min(2, 'La razón social debe tener al menos 2 caracteres').max(150),
  ruc: z.string().regex(/^\d{11}$/, 'El RUC debe tener exactamente 11 dígitos'),
  giro: z.string().trim().min(2, 'Indica el giro comercial (al menos 2 caracteres)').max(40),
  telefono: opcional(20, 'El teléfono'),
  correo: correoOpcional,
  direccion: opcional(200, 'La dirección'),
}
const contactoAdmin = {
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  telefono: z.string().trim().min(6, 'El teléfono debe tener al menos 6 caracteres').max(20),
  correo: z.string().trim().email('El correo no es válido'),
}

const esquemaCrear = z.object({
  ...datosTienda,
  administrador: z
    .object({
      ...contactoAdmin,
      username: z
        .string()
        .trim()
        .min(4, 'El usuario debe tener al menos 4 caracteres')
        .max(60)
        .regex(USUARIO, 'Usa solo letras, números, punto, guion, guion bajo o @'),
      password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
      confirmacion: z.string(),
    })
    .refine((a) => a.password === a.confirmacion, { message: 'Las contraseñas no coinciden', path: ['confirmacion'] }),
})
const esquemaEditar = z.object({ ...datosTienda, administrador: z.object(contactoAdmin) })

type Formulario = z.infer<typeof esquemaCrear>

// El esquema depende del modo (crear o editar).
const { defineField, handleSubmit, errors, setFieldError, setValues, isSubmitting } = useForm<Formulario>({
  validationSchema: computed(() => toTypedSchema(editando.value ? esquemaEditar : esquemaCrear)),
  initialValues: {
    nombre_comercial: '',
    razon_social: '',
    ruc: '',
    giro: 'Bodega',
    telefono: '',
    correo: '',
    direccion: '',
    administrador: { nombre: '', telefono: '', correo: '', username: '', password: '', confirmacion: '' },
  },
})

const [nombreComercial] = defineField('nombre_comercial')
const [razonSocial] = defineField('razon_social')
const [ruc] = defineField('ruc')
const [giro] = defineField('giro')
const [telefono] = defineField('telefono')
const [correo] = defineField('correo')
const [direccion] = defineField('direccion')
const [adminNombre] = defineField('administrador.nombre')
const [adminTelefono] = defineField('administrador.telefono')
const [adminCorreo] = defineField('administrador.correo')
const [usuario] = defineField('administrador.username')
const [password] = defineField('administrador.password')
const [confirmacion] = defineField('administrador.confirmacion')

const CAMPOS = [
  'nombre_comercial', 'razon_social', 'ruc', 'giro', 'telefono', 'correo', 'direccion',
  'administrador.nombre', 'administrador.telefono', 'administrador.correo',
  'administrador.username', 'administrador.password', 'administrador.confirmacion',
] as const

// errors usa las rutas como claves ("administrador.username").
const err = (campo: (typeof CAMPOS)[number]) => (errors.value as Record<string, string | undefined>)[campo] ?? null

// ---------------- Giro: lista sugerida + "Otro" ----------------
const opcionesGiro = [...GIROS.map((g) => ({ value: g as string, label: g })), { value: GIRO_OTRO, label: 'Otro (escribir)…' }]
const giroElegido = ref<string | null>('Bodega')
function alElegirGiro(v: string | null) {
  giroElegido.value = v
  giro.value = v === GIRO_OTRO ? '' : (v ?? '')
}

// ---------------- Mostrar/ocultar contraseñas ----------------
const verPassword = ref(false)
const verConfirmacion = ref(false)

// ---------------- Carga para editar ----------------
const cargando = ref(false)
const errorCarga = ref<string | null>(null)
const errorGeneral = ref<string | null>(null)

onMounted(async () => {
  if (!idTienda.value) return
  cargando.value = true
  try {
    const t = await stores.obtener(idTienda.value)
    setValues({
      nombre_comercial: t.nombre_comercial,
      razon_social: t.razon_social,
      ruc: t.ruc,
      giro: t.giro,
      telefono: t.telefono ?? '',
      correo: t.correo ?? '',
      direccion: t.direccion ?? '',
      administrador: {
        nombre: t.administrador?.nombre ?? '',
        telefono: t.administrador?.telefono ?? '',
        correo: t.administrador?.correo ?? '',
        username: t.administrador?.username ?? '',
        password: '',
        confirmacion: '',
      },
    })
    giroElegido.value = (GIROS as readonly string[]).includes(t.giro) ? t.giro : GIRO_OTRO
  } catch (e) {
    errorCarga.value = e instanceof ApiError ? e.message : 'No se pudo cargar la tienda.'
  } finally {
    cargando.value = false
  }
})

// ---------------- Guardar ----------------
/** Texto vacío → null (el backend espera null en los campos opcionales sin dato). */
const vacioANull = (v: string | undefined) => (v && v.trim() ? v.trim() : null)

const guardar = handleSubmit(async (v) => {
  errorGeneral.value = null
  try {
    if (editando.value) {
      const body: TiendaUpdate = {
        nombre_comercial: v.nombre_comercial,
        razon_social: v.razon_social,
        giro: v.giro,
        telefono: vacioANull(v.telefono),
        correo: vacioANull(v.correo),
        direccion: vacioANull(v.direccion),
        administrador: { nombre: v.administrador.nombre, telefono: v.administrador.telefono, correo: v.administrador.correo },
      }
      const t = await stores.actualizar(idTienda.value!, body)
      toast.exito(`Se guardaron los cambios de ${t.nombre_comercial}`)
    } else {
      const body: TiendaCreate = {
        nombre_comercial: v.nombre_comercial,
        razon_social: v.razon_social,
        ruc: v.ruc,
        giro: v.giro,
        telefono: vacioANull(v.telefono),
        correo: vacioANull(v.correo),
        direccion: vacioANull(v.direccion),
        administrador: {
          nombre: v.administrador.nombre,
          telefono: v.administrador.telefono,
          correo: v.administrador.correo,
          username: v.administrador.username,
          password: v.administrador.password,
        },
      }
      const t = await stores.crear(body)
      toast.exito(`${t.nombre_comercial} fue registrada. Su administrador ya puede ingresar como "${t.administrador?.username}".`)
    }
    await router.push({ name: 'admin-tiendas' })
  } catch (e) {
    // Los errores del backend van junto a su campo; los demás, en el aviso general.
    errorGeneral.value = aplicarErroresApi(e, (c, m) => setFieldError(c as (typeof CAMPOS)[number], m), [...CAMPOS], [
      { patron: /RUC/i, campo: 'ruc' },
      { patron: /usuario/i, campo: 'administrador.username' },
    ])
    if (!errorGeneral.value) toast.error('Revisa los campos marcados en rojo.')
  }
}, () => toast.error('Revisa los campos marcados en rojo.'))

const titulo = computed(() => (editando.value ? 'Editar Tienda' : 'Registrar Nueva Tienda'))
</script>

<template>
  <section class="pb-8">
    <!-- Encabezado -->
    <div class="pb-6">
      <nav aria-label="Migas de pan" class="flex items-center gap-1 text-caption">
        <RouterLink :to="{ name: 'admin-tiendas' }" class="text-on-surface-variant hover:underline">Inicio</RouterLink>
        <span class="text-outline-variant" aria-hidden="true">/</span>
        <RouterLink :to="{ name: 'admin-tiendas' }" class="text-on-surface-variant hover:underline">Tiendas</RouterLink>
        <span class="text-outline-variant" aria-hidden="true">/</span>
        <span class="font-semibold text-primary" aria-current="page">{{ editando ? 'Editar tienda' : 'Registrar tienda' }}</span>
      </nav>
      <h1 class="mt-4 text-headline font-bold text-on-surface">{{ titulo }}</h1>
      <p class="mt-0.5 text-body text-on-surface-variant">
        {{ editando ? 'Actualiza los datos del comercio y el contacto de su administrador. El RUC no se puede cambiar.' : 'Ingresa los datos del comercio y de su administrador responsable' }}
      </p>
    </div>

    <p v-if="cargando" class="rounded-card bg-white p-8 text-center text-body text-on-surface-variant shadow-xs">Cargando datos de la tienda…</p>
    <p v-else-if="errorCarga" role="alert" class="rounded-card bg-error-container p-6 text-body font-semibold text-error">{{ errorCarga }}</p>

    <form v-else class="flex flex-col gap-8" novalidate @submit="guardar">
      <!-- ============ 1. Datos de la tienda ============ -->
      <div class="overflow-hidden rounded-card bg-white shadow-xs">
        <div class="flex items-center gap-2 bg-surface-low/40 px-8 py-4">
          <span class="flex size-7 items-center justify-center rounded-full bg-primary-container text-caption font-semibold text-white shadow-xs">1</span>
          <div>
            <h2 class="text-title font-semibold text-on-surface">Datos de la Tienda</h2>
            <p class="text-label font-bold text-on-surface-variant">Información fiscal y radicación física de la sede</p>
          </div>
        </div>
        <div class="grid gap-4 px-8 pb-8 pt-6 md:grid-cols-2">
          <FormField v-slot="{ id, describedBy, invalid }" label="Nombre comercial" required :error="err('nombre_comercial')"
            help="Nombre con el que los vecinos conocen el negocio. Se usa también para armar el usuario del portal de sus clientes (ej. bodegadonlucho.com).">
            <TextInput :id="id" v-model="nombreComercial" :aria-describedby="describedBy" :invalid="invalid" placeholder="Bodega Don Lucho" autocomplete="organization" />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" label="Razón social" required :error="err('razon_social')"
            help="Nombre legal registrado en SUNAT, tal como figura en la ficha RUC (ej. Comercializadora Morales e Hijos S.A.C.).">
            <TextInput :id="id" v-model="razonSocial" :aria-describedby="describedBy" :invalid="invalid" placeholder="Comercializadora Morales e Hijos S.A.C." />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" :label="editando ? 'RUC (no editable)' : 'RUC (11 dígitos)'" required :error="err('ruc')"
            help-title="Número de RUC" help="Registro Único de Contribuyentes activo y habido en SUNAT. Son 11 dígitos, ej. 20554892101. Una vez registrado no se puede cambiar.">
            <TextInput :id="id" v-model="ruc" :aria-describedby="describedBy" :invalid="invalid" :digitos="11" :disabled="editando"
              :icono="iconoRuc" placeholder="20554892101" class="font-semibold" />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" label="Giro comercial" required :error="err('giro')"
            help="Tipo de negocio de la tienda. Si no está en la lista, elige “Otro” y escríbelo.">
            <div class="flex flex-col gap-2">
              <SelectInput :id="id" :model-value="giroElegido" :options="opcionesGiro" :aria-describedby="describedBy" :invalid="invalid && giroElegido !== GIRO_OTRO"
                @update:model-value="alElegirGiro" />
              <TextInput v-if="giroElegido === GIRO_OTRO" v-model="giro" :aria-describedby="describedBy" :invalid="invalid" aria-label="Giro comercial (otro)" placeholder="Ej. Juguería" maxlength="40" />
            </div>
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" label="Teléfono fijo / celular de la tienda" :error="err('telefono')"
            help="Número de contacto del negocio (opcional). Puede incluir código de ciudad, ej. (01) 263-8890.">
            <TextInput :id="id" v-model="telefono" :aria-describedby="describedBy" :invalid="invalid" type="tel" :icono="iconoTelefono" :icono-ancho="13.5" :icono-alto="13.5" placeholder="(01) 263-8890" maxlength="20" autocomplete="tel" />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" label="Correo de la tienda" :error="err('correo')"
            help="Correo del negocio para avisos (opcional), ej. contacto@bodegadonlucho.pe.">
            <TextInput :id="id" v-model="correo" :aria-describedby="describedBy" :invalid="invalid" type="email" :icono="iconoCorreo" :icono-alto="12" placeholder="contacto@bodegadonlucho.pe" autocomplete="email" />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" label="Dirección" :error="err('direccion')" class="md:col-span-2"
            help="Dirección física de la sede (opcional), ej. Av. Brasil 1234, Jesús María.">
            <TextInput :id="id" v-model="direccion" :aria-describedby="describedBy" :invalid="invalid" placeholder="Av. Brasil 1234" maxlength="200" autocomplete="street-address" />
          </FormField>
        </div>
      </div>

      <!-- ============ 2. Administrador ============ -->
      <div class="overflow-hidden rounded-card bg-white shadow-xs">
        <div class="flex items-center gap-2 bg-surface-low/40 px-8 py-4">
          <span class="flex size-7 items-center justify-center rounded-full bg-primary-fixed text-caption font-semibold text-primary-on-fixed-variant shadow-xs">2</span>
          <div>
            <h2 class="text-title font-semibold text-on-surface">Administrador / Representante del Negocio</h2>
            <p class="text-label font-bold text-on-surface-variant">Persona natural titular o encargada legal</p>
          </div>
        </div>
        <div class="grid gap-4 px-8 pb-8 pt-6 md:grid-cols-2">
          <FormField v-slot="{ id, describedBy, invalid }" label="Nombre completo del administrador" required :error="err('administrador.nombre')" class="md:col-span-2"
            help="Nombres y apellidos de la persona que administrará la tienda en FiadoClaro.">
            <TextInput :id="id" v-model="adminNombre" :aria-describedby="describedBy" :invalid="invalid" :icono="iconoPersona" placeholder="Luis Morales Vega" autocomplete="name" class="md:max-w-md" />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" label="Teléfono celular personal" required :error="err('administrador.telefono')"
            help="Celular del administrador para contactarlo (mínimo 6 dígitos), ej. 984 512 870.">
            <TextInput :id="id" v-model="adminTelefono" :aria-describedby="describedBy" :invalid="invalid" type="tel" :icono="iconoCelular" :icono-ancho="11.25" :icono-alto="16.5" placeholder="984 512 870" maxlength="20" autocomplete="tel" />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" label="Correo electrónico personal" required :error="err('administrador.correo')"
            help="Correo personal del administrador, ej. lucho.morales@gmail.com.">
            <TextInput :id="id" v-model="adminCorreo" :aria-describedby="describedBy" :invalid="invalid" type="email" :icono="iconoArroba" placeholder="lucho.morales@gmail.com" autocomplete="email" />
          </FormField>
        </div>
      </div>

      <!-- ============ 3. Credenciales (solo al registrar) ============ -->
      <div v-if="!editando" class="overflow-hidden rounded-card bg-white shadow-xs">
        <div class="flex items-center gap-2 bg-surface-low/40 px-8 py-4">
          <span class="flex size-7 items-center justify-center rounded-full bg-surface-highest text-caption font-semibold text-on-surface shadow-xs">3</span>
          <div>
            <h2 class="text-title font-semibold text-on-surface">Credenciales de Acceso</h2>
            <p class="text-label font-bold text-on-surface-variant">Parámetros de autenticación para el Cuaderno Digital</p>
          </div>
        </div>
        <div class="grid gap-4 px-8 pb-8 pt-6 md:grid-cols-2">
          <FormField v-slot="{ id, describedBy, invalid }" label="Usuario de acceso al sistema" required :error="err('administrador.username')" class="md:col-span-2"
            help="Con este usuario el administrador inicia sesión. De 4 a 60 caracteres: letras, números, punto, guion, guion bajo o @ (ej. donlucho_admin). Debe ser único.">
            <TextInput :id="id" v-model="usuario" :aria-describedby="describedBy" :invalid="invalid" :icono="iconoPersona" placeholder="donlucho_admin"
              autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="60" class="md:max-w-md" />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" label="Contraseña inicial" required :error="err('administrador.password')"
            help="Contraseña provisional de al menos 8 caracteres. Entrégasela al administrador; podrá cambiarla desde Mi perfil.">
            <TextInput :id="id" v-model="password" :aria-describedby="describedBy" :invalid="invalid" :type="verPassword ? 'text' : 'password'"
              :icono="iconoCandado" :icono-ancho="12" :icono-alto="15.75" autocomplete="new-password" maxlength="72">
              <template #derecha>
                <button type="button" class="rounded-stamp p-1 hover:bg-surface-high" :aria-label="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" :aria-pressed="verPassword" @click="verPassword = !verPassword">
                  <img :src="iconoOjo" alt="" width="16.5" height="11.25" :class="verPassword ? '' : 'opacity-60'" />
                </button>
              </template>
            </TextInput>
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" label="Confirmación de contraseña" required :error="err('administrador.confirmacion')"
            help="Escribe otra vez la contraseña inicial para evitar errores de tipeo.">
            <TextInput :id="id" v-model="confirmacion" :aria-describedby="describedBy" :invalid="invalid" :type="verConfirmacion ? 'text' : 'password'"
              :icono="iconoCandadoConfirmar" autocomplete="new-password" maxlength="72">
              <template #derecha>
                <button type="button" class="rounded-stamp p-1 hover:bg-surface-high" :aria-label="verConfirmacion ? 'Ocultar confirmación' : 'Mostrar confirmación'" :aria-pressed="verConfirmacion" @click="verConfirmacion = !verConfirmacion">
                  <img :src="iconoOjo" alt="" width="16.5" height="11.25" :class="verConfirmacion ? '' : 'opacity-60'" />
                </button>
              </template>
            </TextInput>
          </FormField>
        </div>
      </div>

      <!-- Aviso general (errores del backend que no son de un campo) -->
      <p v-if="errorGeneral" role="alert" class="rounded-control border border-error/30 bg-error-container px-4 py-3 text-body font-semibold text-error">
        {{ errorGeneral }}
      </p>

      <!-- ============ Barra de acciones ============ -->
      <div class="flex flex-col gap-4 rounded-card bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <p class="flex items-center gap-1 text-caption text-on-surface-variant">
          <img :src="iconoNota" alt="" width="15" height="13.5" />
          Todos los campos con (<span class="text-error">*</span>) son obligatorios.
        </p>
        <div class="flex gap-4">
          <RouterLink :to="{ name: 'admin-tiendas' }" class="rounded-control bg-surface-high px-6 py-2.5 text-body-lg font-semibold text-primary shadow-xs transition-colors hover:bg-surface-highest">
            Cancelar
          </RouterLink>
          <button type="submit" :disabled="isSubmitting"
            class="flex items-center gap-1 rounded-control bg-primary-container px-8 py-2.5 text-body-lg font-semibold text-white shadow-btn transition-colors hover:bg-primary disabled:cursor-wait disabled:opacity-70">
            <span v-if="isSubmitting" class="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
            <img v-else :src="iconoGuardar" alt="" width="13.5" height="13.5" />
            {{ isSubmitting ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar Tienda' }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>
