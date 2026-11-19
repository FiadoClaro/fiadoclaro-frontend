<script setup lang="ts">
/**
 * Pantalla 5 — Registrar Cliente (Figma node 4-6098). Rol: ADMIN_TIENDA.
 *
 *  - Nuevo (/tienda/clientes/nuevo): (1) datos generales, (2) condiciones del crédito, (3) acceso al portal.
 *    A la derecha, "Resumen de Apertura" con TEM y TEA que calcula el backend, y "Reglas del Cuaderno".
 *  - Editar (/tienda/clientes/:id/editar): solo datos personales (PATCH). Las condiciones se cambian
 *    en su propia pantalla porque solo afectan compras futuras.
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import * as customers from '@/api/customers'
import { ApiError } from '@/api/http'
import FormField from '@/components/forms/FormField.vue'
import TextInput from '@/components/forms/TextInput.vue'
import { useEquivalencias } from '@/composables/useEquivalencias'
import { useTopes } from '@/composables/useTopes'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { aplicarErroresApi } from '@/utils/erroresFormulario'
import type { ClienteCreate } from '@/types/api'
import CondicionFields from './customers/CondicionFields.vue'
import ResumenApertura from './customers/ResumenApertura.vue'
import ReglasCuaderno from './customers/ReglasCuaderno.vue'
import { REGLAS_ERROR_CONDICION, condicionInicial, condicionParaBackend, esquemaCondicion, tasaParaBackend } from './customers/condicion'
import iconoNombre from '@/assets/icons/campo-nombre.svg'
import iconoDni from '@/assets/icons/campo-dni.svg'
import iconoCelular from '@/assets/icons/campo-celular-relleno.svg'
import iconoArroba from '@/assets/icons/campo-arroba-relleno.svg'
import iconoLlave from '@/assets/icons/acceso-llave.svg'
import iconoUsuario from '@/assets/icons/campo-usuario-circulo.svg'
import iconoCandado from '@/assets/icons/campo-candado-relleno.svg'
import iconoCopiar from '@/assets/icons/copiar.svg'
import iconoGuardar from '@/assets/icons/guardar.svg'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const idCliente = computed(() => (route.params.id ? Number(route.params.id) : null))
const editando = computed(() => idCliente.value !== null)

// ---------------- Reglas (backend: app/modules/customers/schemas.py) ----------------
const datos = {
  nombres: z.string().trim().min(2, 'Los nombres deben tener al menos 2 caracteres').max(80),
  apellidos: z.string().trim().min(2, 'Los apellidos deben tener al menos 2 caracteres').max(80),
  telefono: z.string().trim().min(6, 'Indica un teléfono de al menos 6 dígitos').max(20),
  correo: z.string().trim().email('El correo no es válido').or(z.literal('')),
  direccion: z.string().trim().max(200, 'La dirección no puede tener más de 200 caracteres'),
}
const esquemaNuevo = z.object({
  ...datos,
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos'),
  condicion: esquemaCondicion,
  acceso: z.object({
    username: z.string().trim().max(60),
    password: z.string().min(8, 'La contraseña provisoria debe tener al menos 8 caracteres').max(72),
  }),
})
const esquemaEditar = z.object(datos)
type Formulario = z.infer<typeof esquemaNuevo>

const { defineField, handleSubmit, errors, setFieldError, setValues, values, isSubmitting } = useForm<Formulario>({
  validationSchema: computed(() => toTypedSchema(editando.value ? esquemaEditar : esquemaNuevo)),
  initialValues: {
    nombres: '',
    apellidos: '',
    dni: '',
    telefono: '',
    correo: '',
    direccion: '',
    condicion: condicionInicial(),
    acceso: { username: '', password: '' },
  },
})

const [nombres] = defineField('nombres')
const [apellidos] = defineField('apellidos')
const [dni] = defineField('dni')
const [telefono] = defineField('telefono')
const [correo] = defineField('correo')
const [direccion] = defineField('direccion')
const [usuario] = defineField('acceso.username')
const [password] = defineField('acceso.password')

const CAMPOS = [
  'nombres', 'apellidos', 'dni', 'telefono', 'correo', 'direccion', 'acceso.username', 'acceso.password',
  'condicion.moneda', 'condicion.tasa.valor', 'condicion.tasa.capitalizacion_dias', 'condicion.tasa_mora.valor',
  'condicion.limite_credito', 'condicion.max_meses', 'condicion.dia_corte', 'condicion.hora_corte', 'condicion.dia_pago',
]
const err = (c: string) => (errors.value as Record<string, string | undefined>)[c] ?? null

// Usuario sugerido del portal: <DNI>@<dominio de la tienda> (si se deja vacío, el backend lo arma igual).
const usuarioSugerido = computed(() => `${dni.value || 'DNI'}@${auth.tienda?.dominio_portal ?? 'tienda.com'}`)

// ---------------- Equivalencias (backend) y topes BCRP ----------------
const tasaComp = computed(() => (editando.value ? null : tasaParaBackend(values.condicion.tasa)))
const tasaMora = computed(() => (editando.value ? null : tasaParaBackend(values.condicion.tasa_mora)))
const { resultado: equivComp, cargando: calculando } = useEquivalencias(tasaComp)
const { resultado: equivMora } = useEquivalencias(tasaMora)
const { vigente } = useTopes()
const topeComp = computed(() => vigente('COMPENSATORIA', values.condicion.moneda))
const topeMora = computed(() => vigente('MORATORIA', values.condicion.moneda))

// ---------------- Contraseña: ver y copiar ----------------
const verPassword = ref(false)
async function copiarPassword() {
  try {
    await navigator.clipboard.writeText(password.value ?? '')
    toast.info('Contraseña copiada. Entrégasela al vecino.')
  } catch {
    toast.error('No se pudo copiar; selecciónala y cópiala a mano.')
  }
}

// ---------------- Carga para editar ----------------
const cargando = ref(false)
const errorCarga = ref<string | null>(null)
const errorGeneral = ref<string | null>(null)

onMounted(async () => {
  if (!idCliente.value) return
  cargando.value = true
  try {
    const c = await customers.obtener(idCliente.value)
    setValues({
      nombres: c.nombres,
      apellidos: c.apellidos,
      dni: c.dni,
      telefono: c.telefono ?? '',
      correo: c.correo ?? '',
      direccion: c.direccion ?? '',
    })
  } catch (e) {
    errorCarga.value = e instanceof ApiError ? e.message : 'No se pudo cargar el cliente.'
  } finally {
    cargando.value = false
  }
})

// ---------------- Guardar ----------------
const vacioANull = (v: string | undefined) => (v && v.trim() ? v.trim() : null)

const guardar = handleSubmit(
  async (v) => {
    errorGeneral.value = null
    try {
      if (editando.value) {
        const c = await customers.actualizar(idCliente.value!, {
          nombres: v.nombres,
          apellidos: v.apellidos,
          telefono: vacioANull(v.telefono),
          correo: vacioANull(v.correo),
          direccion: vacioANull(v.direccion),
        })
        toast.exito(`Se guardaron los datos de ${c.nombres} ${c.apellidos}`)
        await router.push({ name: 'tienda-cliente', params: { id: c.id } })
      } else {
        const body: ClienteCreate = {
          nombres: v.nombres,
          apellidos: v.apellidos,
          dni: v.dni,
          telefono: vacioANull(v.telefono),
          correo: vacioANull(v.correo),
          direccion: vacioANull(v.direccion),
          condicion: condicionParaBackend(v.condicion),
          acceso: { username: vacioANull(v.acceso.username), password: v.acceso.password },
        }
        const c = await customers.crear(body)
        toast.exito(`${c.nombres} ${c.apellidos} fue registrado. Usuario del portal: ${c.usuario}`)
        await router.push({ name: 'tienda-cliente', params: { id: c.id } })
      }
    } catch (e) {
      errorGeneral.value = aplicarErroresApi(e, (c, m) => setFieldError(c as keyof Formulario, m), CAMPOS, [
        { patron: /DNI/i, campo: 'dni' },
        ...REGLAS_ERROR_CONDICION,
        { patron: /usuario/i, campo: 'acceso.username' },
      ])
      if (!errorGeneral.value) toast.error('Revisa los campos marcados en rojo.')
    }
  },
  () => toast.error('Revisa los campos marcados en rojo.'),
)

const nombreCompleto = computed(() => `${nombres.value ?? ''} ${apellidos.value ?? ''}`.trim())
</script>

<template>
  <section class="pb-8">
    <!-- Encabezado -->
    <div class="pb-6">
      <nav aria-label="Migas de pan" class="flex items-center gap-1 text-caption">
        <span class="text-on-surface-variant">Inicio</span>
        <span class="text-outline-variant" aria-hidden="true">/</span>
        <RouterLink :to="{ name: 'tienda-clientes' }" class="text-on-surface-variant hover:underline">Clientes</RouterLink>
        <span class="text-outline-variant" aria-hidden="true">/</span>
        <span class="font-semibold text-primary" aria-current="page">{{ editando ? 'Editar datos' : 'Registrar cliente' }}</span>
      </nav>
      <p class="mt-6 text-label font-bold uppercase text-on-surface-variant">Libro maestro de fiados</p>
      <h1 class="text-headline font-bold text-on-surface">{{ editando ? 'Editar Datos del Cliente' : 'Registrar Nuevo Cliente' }}</h1>
      <p class="text-body text-on-surface-variant">
        {{ editando ? 'Actualiza los datos de contacto. Para cambiar la tasa o el límite usa “Cambiar condiciones”.' : 'Configura las condiciones del fiado, límites de crédito y accesos para el vecino de la bodega.' }}
      </p>
    </div>

    <p v-if="cargando" class="rounded-card bg-white p-8 text-center text-body text-on-surface-variant shadow-xs">Cargando cliente…</p>
    <p v-else-if="errorCarga" role="alert" class="rounded-card bg-error-container p-6 text-body font-semibold text-error">{{ errorCarga }}</p>

    <form v-else class="grid gap-8 lg:grid-cols-12" novalidate @submit="guardar">
      <div class="flex flex-col gap-8 lg:col-span-8">
        <!-- ============ 1. Datos generales ============ -->
        <div class="relative overflow-hidden rounded-card bg-white p-6 shadow-xs sm:p-8">
          <span class="pointer-events-none absolute inset-y-0 left-6 w-0.5 bg-error/25" aria-hidden="true" />
          <div class="flex flex-col gap-6 pl-6">
            <div class="flex items-center gap-2">
              <span class="flex size-8 items-center justify-center rounded-control bg-surface-container text-body font-semibold text-primary">1</span>
              <div>
                <h2 class="text-body-lg font-semibold text-on-surface">Datos Generales del Vecino</h2>
                <p class="text-caption text-on-surface-variant">Información personal y de contacto para el registro vecinal</p>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <FormField v-slot="{ id, describedBy, invalid }" label="Nombres" required tono="claro" :error="err('nombres')" help="Nombres del vecino tal como figuran en su DNI.">
                <TextInput :id="id" v-model="nombres" variante="relleno" :icono="iconoNombre" :aria-describedby="describedBy" :invalid="invalid" placeholder="Rosa" autocomplete="given-name" maxlength="80" />
              </FormField>
              <FormField v-slot="{ id, describedBy, invalid }" label="Apellidos" required tono="claro" :error="err('apellidos')" help="Apellidos paterno y materno del vecino.">
                <TextInput :id="id" v-model="apellidos" variante="relleno" :icono="iconoNombre" :aria-describedby="describedBy" :invalid="invalid" placeholder="Flores Benites" autocomplete="family-name" maxlength="80" />
              </FormField>
              <FormField v-slot="{ id, describedBy, invalid }" label="DNI (8 dígitos)" required tono="claro" :error="err('dni')"
                :help="editando ? 'El DNI no se puede cambiar porque identifica al vecino y forma su usuario del portal.' : 'Documento Nacional de Identidad, 8 dígitos. No puede repetirse en la tienda y forma el usuario del portal.'">
                <TextInput :id="id" v-model="dni" variante="relleno" :icono="iconoDni" :icono-alto="12" :digitos="8" :disabled="editando" :aria-describedby="describedBy" :invalid="invalid"
                  placeholder="08765432" class="[&_input]:font-semibold [&_input]:tracking-[1.4px]" />
              </FormField>
              <FormField v-slot="{ id, describedBy, invalid }" label="Teléfono celular" required tono="claro" :error="err('telefono')" help="Celular del vecino para coordinar pagos (mínimo 6 dígitos).">
                <TextInput :id="id" v-model="telefono" variante="relleno" type="tel" :icono="iconoCelular" :icono-ancho="11.25" :icono-alto="16.5" :aria-describedby="describedBy" :invalid="invalid" placeholder="987 654 321" maxlength="20" autocomplete="tel" />
              </FormField>
              <FormField v-slot="{ id, describedBy, invalid }" label="Correo electrónico" tono="claro" :error="err('correo')" help="Correo del vecino (opcional).">
                <TextInput :id="id" v-model="correo" variante="relleno" type="email" :icono="iconoArroba" :aria-describedby="describedBy" :invalid="invalid" placeholder="rosa.flores@gmail.com" autocomplete="email" />
              </FormField>
              <FormField v-slot="{ id, describedBy, invalid }" label="Dirección" tono="claro" :error="err('direccion')" help="Dirección de la vivienda del vecino (opcional).">
                <TextInput :id="id" v-model="direccion" variante="relleno" :aria-describedby="describedBy" :invalid="invalid" placeholder="Jr. Las Flores 123" maxlength="200" autocomplete="street-address" />
              </FormField>
            </div>
          </div>
        </div>

        <template v-if="!editando">
          <!-- ============ 2. Condiciones ============ -->
          <div class="relative overflow-hidden rounded-card bg-white p-6 shadow-xs sm:p-8">
            <span class="pointer-events-none absolute inset-y-0 left-6 w-0.5 bg-error/25" aria-hidden="true" />
            <div class="flex flex-col gap-6 pl-6">
              <div class="flex items-center gap-2">
                <span class="flex size-8 items-center justify-center rounded-control bg-surface-container text-body font-semibold text-primary">2</span>
                <div>
                  <h2 class="text-body-lg font-semibold text-on-surface">Condiciones del Crédito</h2>
                  <p class="text-caption text-on-surface-variant">Moneda, tasas pactadas, periodo y límites de fiado</p>
                </div>
              </div>
              <CondicionFields :equiv-compensatoria="equivComp" :equiv-moratoria="equivMora" :tope-compensatoria="topeComp" :tope-moratoria="topeMora" />
            </div>
          </div>

          <!-- ============ 3. Acceso al portal ============ -->
          <div class="relative overflow-hidden rounded-card bg-white p-6 shadow-xs sm:p-8">
            <span class="pointer-events-none absolute inset-y-0 left-6 w-0.5 bg-error/25" aria-hidden="true" />
            <div class="flex flex-col gap-6 pl-6">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="flex size-8 items-center justify-center rounded-control bg-surface-container text-body font-semibold text-primary">3</span>
                  <div>
                    <h2 class="text-body-lg font-semibold text-on-surface">Acceso al Portal Vecinal</h2>
                    <p class="text-caption text-on-surface-variant">Permite al vecino revisar su cuaderno de deudas en línea por su celular</p>
                  </div>
                </div>
                <img :src="iconoLlave" alt="" width="19.17" height="10" />
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <FormField v-slot="{ id, describedBy, invalid }" label="Usuario de portal" tono="claro" :error="err('acceso.username')"
                  :help="`Si lo dejas vacío se arma solo con el DNI y el dominio de la tienda: ${usuarioSugerido}. Si lo escribes, debe empezar con el DNI.`">
                  <TextInput :id="id" v-model="usuario" variante="relleno" :icono="iconoUsuario" :aria-describedby="describedBy" :invalid="invalid"
                    :placeholder="usuarioSugerido" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="60" />
                </FormField>
                <FormField v-slot="{ id, describedBy, invalid }" label="Contraseña provisoria" required tono="claro" :error="err('acceso.password')"
                  help="Mínimo 8 caracteres. Entrégasela al vecino; podrá cambiarla desde su perfil en el portal.">
                  <TextInput :id="id" v-model="password" variante="relleno" :type="verPassword ? 'text' : 'password'" :icono="iconoCandado" :icono-ancho="12" :icono-alto="15.75"
                    :aria-describedby="describedBy" :invalid="invalid" autocomplete="new-password" maxlength="72" class="[&_input]:pr-16">
                    <template #derecha>
                      <button type="button" class="rounded-stamp px-1 text-caption font-semibold text-primary hover:bg-surface-high" :aria-pressed="verPassword" @click="verPassword = !verPassword">
                        {{ verPassword ? 'Ocultar' : 'Ver' }}
                      </button>
                      <button type="button" class="rounded-stamp p-1 hover:bg-surface-high" aria-label="Copiar contraseña" title="Copiar contraseña" @click="copiarPassword">
                        <img :src="iconoCopiar" alt="" width="12.75" height="15" />
                      </button>
                    </template>
                  </TextInput>
                </FormField>
              </div>
            </div>
          </div>
        </template>

        <p v-if="errorGeneral" role="alert" class="rounded-control border border-error/30 bg-error-container px-4 py-3 text-body font-semibold text-error">{{ errorGeneral }}</p>

        <!-- Acciones -->
        <div class="flex justify-end gap-4">
          <RouterLink :to="editando ? { name: 'tienda-cliente', params: { id: idCliente } } : { name: 'tienda-clientes' }"
            class="flex h-10 items-center rounded-control bg-surface-high px-8 text-body font-semibold text-on-surface transition-colors hover:bg-surface-highest">
            Cancelar
          </RouterLink>
          <button type="submit" :disabled="isSubmitting"
            class="flex h-10 items-center gap-1 rounded-control bg-primary-container px-12 text-body font-semibold text-white shadow-btn transition-colors hover:bg-primary disabled:cursor-wait disabled:opacity-70">
            <span v-if="isSubmitting" class="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
            <img v-else :src="iconoGuardar" alt="" width="15" height="15" />
            {{ isSubmitting ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar Cliente' }}
          </button>
        </div>
      </div>

      <!-- Columna derecha (solo al registrar) -->
      <aside v-if="!editando" class="flex flex-col gap-6 lg:col-span-4">
        <ResumenApertura
          :nombre="nombreCompleto"
          :dni="dni ?? ''"
          :moneda="values.condicion.moneda"
          :limite="values.condicion.limite_credito"
          :tasa="values.condicion.tasa.valor"
          :periodo-dias="values.condicion.tasa.periodo_dias"
          :tipo-tasa="values.condicion.tasa.tipo"
          :equivalencias="equivComp"
          :calculando="calculando"
          :dia-corte="values.condicion.dia_corte"
          :hora-corte="values.condicion.hora_corte"
          :dia-pago="values.condicion.dia_pago"
        />
        <ReglasCuaderno :dia-corte="values.condicion.dia_corte" :hora-corte="values.condicion.hora_corte" :dia-pago="values.condicion.dia_pago" />
      </aside>
    </form>
  </section>
</template>
