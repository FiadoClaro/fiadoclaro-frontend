<script setup lang="ts">
/**
 * Pantalla 7 — Registrar / Editar Producto o Servicio (Figma node 4-6626). Rol: ADMIN_TIENDA.
 *
 *  - Registrar: POST /products.  Editar: PUT /products/{id} con el producto COMPLETO.
 *  - Reglas (las mismas del backend): al menos una modalidad de fiado; si permite meses, el máximo
 *    de meses es obligatorio (1 a 36); el precio a crédito no puede ser menor al de contado.
 *  - El recargo "+x %" es solo informativo (no se envía).
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import * as products from '@/api/products'
import { ApiError } from '@/api/http'
import FormField from '@/components/forms/FormField.vue'
import TextInput from '@/components/forms/TextInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import SegmentedToggle from '@/components/forms/SegmentedToggle.vue'
import DecimalInput from '@/components/forms/DecimalInput.vue'
import HelpTip from '@/components/ui/HelpTip.vue'
import ProductThumb from '@/components/ui/ProductThumb.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { aplicarErroresApi } from '@/utils/erroresFormulario'
import { compararDecimales, esDecimalPositivo } from '@/utils/decimalInput'
import { recargoPorcentaje } from '@/utils/recargo'
import type { ProductoCreate } from '@/types/api'
import { UNIDAD_OTRA, UNIDADES } from './unidades'
import iconoFicha from '@/assets/icons/ficha-catalogo.svg'
import iconoImagen from '@/assets/icons/imagen-link.svg'
import iconoMaxMeses from '@/assets/icons/max-meses.svg'
import iconoGuardar from '@/assets/icons/guardar.svg'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const idProducto = computed(() => (route.params.id ? Number(route.params.id) : null))
const editando = computed(() => idProducto.value !== null)

// ---------------- Reglas (backend: app/modules/products/schemas.py) ----------------
const texto = (max: number, nombre: string) => z.string().trim().max(max, `${nombre} no puede tener más de ${max} caracteres`)
const monto = (nombre: string) =>
  z.string().refine((v) => esDecimalPositivo(v, 2), `${nombre} debe ser mayor que 0 (máximo 2 decimales)`)

const esquema = z
  .object({
    nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
    descripcion: texto(300, 'La descripción'),
    marca: texto(60, 'La marca'),
    proveedor: texto(120, 'El proveedor'),
    unidad_medida: z.string().trim().min(1, 'Indica la unidad de medida').max(20, 'La unidad no puede tener más de 20 caracteres'),
    imagen_url: texto(500, 'El enlace').refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'El enlace debe empezar con http:// o https://'),
    moneda: z.enum(['PEN', 'USD']),
    precio_contado: monto('El precio al contado'),
    precio_lista_credito: monto('El precio de lista a crédito'),
    permite_fin_mes: z.boolean(),
    permite_cuotas: z.boolean(),
    max_meses: z.number().int().min(1).max(36).nullable(),
  })
  .superRefine((v, ctx) => {
    if (!v.permite_fin_mes && !v.permite_cuotas) {
      ctx.addIssue({ code: 'custom', path: ['permite_cuotas'], message: 'El producto debe permitir al menos una modalidad de fiado' })
    }
    if (v.permite_cuotas && !v.max_meses) {
      ctx.addIssue({ code: 'custom', path: ['max_meses'], message: 'Indica el máximo de meses cuando el producto permite cuotas' })
    }
    if (esDecimalPositivo(v.precio_contado, 2) && esDecimalPositivo(v.precio_lista_credito, 2) && compararDecimales(v.precio_lista_credito, v.precio_contado) < 0) {
      ctx.addIssue({ code: 'custom', path: ['precio_lista_credito'], message: 'El precio de lista a crédito no puede ser menor al precio al contado' })
    }
  })

type Formulario = z.infer<typeof esquema>

const { defineField, handleSubmit, errors, setFieldError, setValues, isSubmitting } = useForm<Formulario>({
  validationSchema: toTypedSchema(esquema),
  initialValues: {
    nombre: '',
    descripcion: '',
    marca: '',
    proveedor: '',
    unidad_medida: 'Unidad',
    imagen_url: '',
    moneda: 'PEN',
    precio_contado: '',
    precio_lista_credito: '',
    permite_fin_mes: true,
    permite_cuotas: false,
    max_meses: null,
  },
})

const [nombre] = defineField('nombre')
const [descripcion] = defineField('descripcion')
const [marca] = defineField('marca')
const [proveedor] = defineField('proveedor')
const [unidad] = defineField('unidad_medida')
const [imagen] = defineField('imagen_url')
const [moneda] = defineField('moneda')
const [contado] = defineField('precio_contado')
const [credito] = defineField('precio_lista_credito')
const [finMes] = defineField('permite_fin_mes')
const [cuotas] = defineField('permite_cuotas')
const [maxMeses] = defineField('max_meses')

const CAMPOS = [
  'nombre', 'descripcion', 'marca', 'proveedor', 'unidad_medida', 'imagen_url', 'moneda',
  'precio_contado', 'precio_lista_credito', 'permite_fin_mes', 'permite_cuotas', 'max_meses',
] as const
const err = (c: (typeof CAMPOS)[number]) => (errors.value as Record<string, string | undefined>)[c] ?? null

// ---------------- Unidad de medida: lista + "Otra" ----------------
const opcionesUnidad = [...UNIDADES.map((u) => ({ value: u as string, label: u })), { value: UNIDAD_OTRA, label: 'Otra (escribir)…' }]
const unidadElegida = ref<string | null>('Unidad')
function alElegirUnidad(v: string | null) {
  unidadElegida.value = v
  unidad.value = v === UNIDAD_OTRA ? '' : (v ?? '')
}

const opcionesMeses = Array.from({ length: 36 }, (_, i) => ({ value: i + 1, label: `${i + 1} ${i === 0 ? 'mes' : 'meses'}` }))
const simbolo = computed(() => (moneda.value === 'USD' ? 'US$' : 'S/'))
const recargo = computed(() => recargoPorcentaje(contado.value, credito.value))

// Al activar "Pago en meses" se propone 3 meses; al quitarlo, el máximo se borra (el backend lo guarda como null).
function alternarCuotas(v: boolean) {
  cuotas.value = v
  maxMeses.value = v ? (maxMeses.value ?? 3) : null
}

// ---------------- Carga para editar ----------------
const cargando = ref(false)
const errorCarga = ref<string | null>(null)
const errorGeneral = ref<string | null>(null)

onMounted(async () => {
  if (!idProducto.value) return
  cargando.value = true
  try {
    const p = await products.obtener(idProducto.value)
    setValues({
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      marca: p.marca ?? '',
      proveedor: p.proveedor ?? '',
      unidad_medida: p.unidad_medida,
      imagen_url: p.imagen_url ?? '',
      moneda: p.moneda ?? 'PEN',
      precio_contado: p.precio_contado,
      precio_lista_credito: p.precio_lista_credito,
      permite_fin_mes: p.permite_fin_mes ?? true,
      permite_cuotas: p.permite_cuotas ?? false,
      max_meses: p.max_meses ?? null,
    })
    unidadElegida.value = (UNIDADES as readonly string[]).includes(p.unidad_medida) ? p.unidad_medida : UNIDAD_OTRA
  } catch (e) {
    errorCarga.value = e instanceof ApiError ? e.message : 'No se pudo cargar el producto.'
  } finally {
    cargando.value = false
  }
})

// ---------------- Guardar ----------------
const vacioANull = (v: string) => (v.trim() ? v.trim() : null)

const guardar = handleSubmit(
  async (v) => {
    errorGeneral.value = null
    const body: ProductoCreate = {
      nombre: v.nombre,
      descripcion: vacioANull(v.descripcion),
      marca: vacioANull(v.marca),
      proveedor: vacioANull(v.proveedor),
      unidad_medida: v.unidad_medida,
      imagen_url: vacioANull(v.imagen_url),
      moneda: v.moneda,
      precio_contado: v.precio_contado, // texto: el backend lo lee como Decimal exacto
      precio_lista_credito: v.precio_lista_credito,
      permite_fin_mes: v.permite_fin_mes,
      permite_cuotas: v.permite_cuotas,
      max_meses: v.permite_cuotas ? v.max_meses : null,
    }
    try {
      const p = editando.value ? await products.actualizar(idProducto.value!, body) : await products.crear(body)
      toast.exito(editando.value ? `Se guardaron los cambios de ${p.nombre}` : `${p.nombre} se agregó al catálogo`)
      await router.push({ name: 'tienda-productos' })
    } catch (e) {
      errorGeneral.value = aplicarErroresApi(e, (c, m) => setFieldError(c as (typeof CAMPOS)[number], m), [...CAMPOS], [
        { patron: /modalidad/i, campo: 'permite_cuotas' },
        { patron: /m[aá]ximo de meses/i, campo: 'max_meses' },
        { patron: /precio de lista/i, campo: 'precio_lista_credito' },
      ])
      if (!errorGeneral.value) toast.error('Revisa los campos marcados en rojo.')
    }
  },
  () => toast.error('Revisa los campos marcados en rojo.'),
)
</script>

<template>
  <section class="pb-8">
    <!-- Encabezado -->
    <div class="pb-6">
      <nav aria-label="Migas de pan" class="flex items-center gap-1 text-caption">
        <span class="text-on-surface-variant">Inicio</span>
        <span class="text-outline-variant" aria-hidden="true">/</span>
        <RouterLink :to="{ name: 'tienda-productos' }" class="text-on-surface-variant hover:underline">Productos</RouterLink>
        <span class="text-outline-variant" aria-hidden="true">/</span>
        <span class="font-semibold text-primary" aria-current="page">{{ editando ? 'Editar producto' : 'Registrar producto' }}</span>
      </nav>
      <h1 class="mt-1 text-headline font-bold text-on-surface">{{ editando ? 'Editar Producto' : 'Registrar Producto' }}</h1>
      <p class="mt-0.5 text-body text-on-surface-variant">
        {{ editando ? 'Los cambios de precio solo afectan a las compras nuevas.' : 'Agrega un nuevo artículo al catálogo para compras al contado o fiadas' }}
      </p>
    </div>

    <p v-if="cargando" class="rounded-card bg-white p-8 text-center text-body text-on-surface-variant shadow-xs">Cargando producto…</p>
    <p v-else-if="errorCarga" role="alert" class="rounded-card bg-error-container p-6 text-body font-semibold text-error">{{ errorCarga }}</p>

    <form v-else class="relative overflow-hidden rounded-card bg-white shadow-btn" novalidate @submit="guardar">
      <!-- Margen rojo del cuaderno -->
      <span class="pointer-events-none absolute inset-y-0 left-4 w-px bg-notebook-margin" aria-hidden="true" />

      <!-- Cabecera de la ficha -->
      <div class="flex items-center gap-2 border-b border-surface-highest/50 bg-surface-low/60 px-8 pb-4 pt-6">
        <img :src="iconoFicha" alt="" width="18" height="18" />
        <div>
          <p class="text-body-lg font-semibold text-on-surface">Ficha de Catálogo Contable</p>
          <p class="text-caption text-on-surface-variant">Sección {{ auth.tienda?.giro ?? 'Bodega' }}</p>
        </div>
      </div>

      <div class="flex flex-col gap-6 p-8">
        <!-- ============ 1. Identificación ============ -->
        <fieldset class="flex flex-col gap-4">
          <legend class="mb-4 flex w-full items-center gap-1 text-label font-bold uppercase text-primary">
            1. Identificación del producto <span class="h-px flex-1 bg-surface-highest/70" aria-hidden="true" />
          </legend>
          <FormField v-slot="{ id, describedBy, invalid }" label="Nombre del producto o servicio" required :error="err('nombre')"
            help="Nombre con el que aparece en el registro de compras y en el estado de cuenta del vecino, ej. Leche Gloria Azul 400g.">
            <TextInput :id="id" v-model="nombre" :aria-describedby="describedBy" :invalid="invalid" placeholder="Leche Gloria Azul 400g" maxlength="120" />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" label="Descripción" :error="err('descripcion')"
            help="Detalle opcional para distinguir el producto (presentación, tamaño, sabor). Máximo 300 caracteres.">
            <TextInput :id="id" v-model="descripcion" :aria-describedby="describedBy" :invalid="invalid" placeholder="Leche evaporada entera, lata de 400 g" maxlength="300" />
          </FormField>
          <div class="grid gap-4 md:grid-cols-2">
            <FormField v-slot="{ id, describedBy, invalid }" label="Marca" :error="err('marca')" help="Marca comercial del producto (opcional), ej. Gloria.">
              <TextInput :id="id" v-model="marca" :aria-describedby="describedBy" :invalid="invalid" placeholder="Gloria" maxlength="60" />
            </FormField>
            <FormField v-slot="{ id, describedBy, invalid }" label="Proveedor (si es necesario)" :error="err('proveedor')"
              help="Empresa o distribuidor que te vende el producto (opcional). Sirve para buscarlo en el catálogo.">
              <TextInput :id="id" v-model="proveedor" :aria-describedby="describedBy" :invalid="invalid" placeholder="Gloria S.A." maxlength="120" />
            </FormField>
            <FormField v-slot="{ id, describedBy, invalid }" label="Unidad de medida" required :error="err('unidad_medida')"
              help="Cómo se vende: por unidad, por kilo, por litro… En la compra la cantidad admite decimales (ej. 1.5 kg). Si no está, elige “Otra”.">
              <div class="flex flex-col gap-2">
                <SelectInput :id="id" :model-value="unidadElegida" :options="opcionesUnidad" :aria-describedby="describedBy"
                  :invalid="invalid && unidadElegida !== UNIDAD_OTRA" @update:model-value="alElegirUnidad" />
                <TextInput v-if="unidadElegida === UNIDAD_OTRA" v-model="unidad" :aria-describedby="describedBy" :invalid="invalid"
                  aria-label="Unidad de medida (otra)" placeholder="Ej. Botella 1.5 L" maxlength="20" />
              </div>
            </FormField>
            <FormField v-slot="{ id, describedBy, invalid }" label="Imagen del producto" :error="err('imagen_url')"
              help="Pega el enlace (URL) de una foto del producto, ej. https://…/leche.jpg. Es opcional; se muestra en el catálogo.">
              <div class="flex items-center gap-4 rounded-card bg-surface-low p-2">
                <ProductThumb :src="imagen" :nombre="nombre || 'Producto'" :tamano="64" />
                <div class="min-w-0 flex-1">
                  <p class="mb-1 flex items-center gap-1 text-caption font-semibold text-primary">
                    <img :src="iconoImagen" alt="" width="16.5" height="12" /> Ingresa link a imagen
                  </p>
                  <TextInput :id="id" v-model="imagen" :aria-describedby="describedBy" :invalid="invalid" type="url" placeholder="https://…" maxlength="500" />
                </div>
              </div>
            </FormField>
          </div>
        </fieldset>

        <!-- ============ 2. Precios y cobro ============ -->
        <fieldset class="flex flex-col gap-4 pt-1">
          <legend class="mb-4 flex w-full items-center gap-1 text-label font-bold uppercase text-primary">
            2. Estructura de precios y cobro <span class="h-px flex-1 bg-surface-highest/70" aria-hidden="true" />
          </legend>

          <FormField v-slot="{ labelId, describedBy }" label="Moneda de los precios" required help="Moneda en la que se venden y se fían este producto. El fiado se registra en la moneda de la línea de crédito del cliente." class="md:max-w-xs">
            <SegmentedToggle v-model="moneda" :labelledby="labelId" :describedby="describedBy" :options="[{ value: 'PEN', label: 'Soles (S/)' }, { value: 'USD', label: 'Dólares ($)' }]" />
          </FormField>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-card bg-surface-low p-4">
              <FormField v-slot="{ id, describedBy, invalid }" label="Precio al contado" required :error="err('precio_contado')" hint="Cobro en mostrador"
                help="Precio de venta pagando en efectivo en el momento. Máximo 2 decimales, ej. 4.20.">
                <DecimalInput :id="id" v-model="contado" :decimales="2" :prefijo="simbolo" :aria-describedby="describedBy" :invalid="invalid"
                  placeholder="0.00" class="[&_input]:h-11 [&_input]:text-left [&_input]:text-[28px] [&_input]:font-bold [&_input]:tracking-[-0.56px]" />
              </FormField>
            </div>
            <div class="rounded-card bg-primary/5 p-4">
              <FormField v-slot="{ id, describedBy, invalid }" label="Precio de lista a crédito" required :error="err('precio_lista_credito')"
                help="Precio cuando el vecino lo lleva fiado. No puede ser menor al precio al contado. Los intereses se calculan aparte, según la tasa pactada con cada cliente.">
                <DecimalInput :id="id" v-model="credito" :decimales="2" :prefijo="simbolo" :aria-describedby="describedBy" :invalid="invalid"
                  placeholder="0.00" class="[&_input]:h-11 [&_input]:text-left [&_input]:text-[28px] [&_input]:font-bold [&_input]:tracking-[-0.56px] [&_input]:text-primary" />
              </FormField>
              <p class="mt-1 flex items-center justify-between text-caption text-primary">
                Recargo fiado integrado
                <span v-if="recargo" class="rounded-stamp bg-primary/10 px-2 py-0.5 text-label font-bold" title="Dato informativo: no se guarda">
                  {{ recargo.startsWith('-') ? '' : '+' }}{{ recargo }}%
                </span>
              </p>
            </div>
          </div>

          <!-- Modalidad de fiado -->
          <div class="flex flex-col gap-4 rounded-card bg-surface-low p-4" role="group" aria-labelledby="titulo-modalidad" aria-describedby="error-modalidad">
            <div class="flex items-center justify-between">
              <p id="titulo-modalidad" class="text-body font-semibold tracking-[0.14px] text-on-surface">
                Modalidad de venta para fiado <span class="text-error" aria-hidden="true">*</span>
              </p>
              <HelpTip campo="Modalidad de venta para fiado" texto="Cómo puede pagarse este producto cuando se fía. Puedes marcar una o las dos. Debe haber al menos una." />
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label :class="finMes ? 'border-2 border-primary p-[18px]' : 'border border-transparent p-[19px]'"
                class="flex cursor-pointer items-start gap-2 rounded-control bg-white shadow-xs has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-container">
                <input :checked="finMes" type="checkbox" class="mt-1 size-[13px] accent-primary" @change="finMes = ($event.target as HTMLInputElement).checked" />
                <span>
                  <span class="block text-body font-semibold tracking-[0.14px]">Pago único a fin de mes</span>
                  <span class="block text-caption text-on-surface-variant">Cancelación íntegra en la fecha de pago del ciclo.</span>
                </span>
              </label>
              <label :class="cuotas ? 'border-2 border-primary p-[18px]' : 'border border-transparent p-[19px]'"
                class="flex cursor-pointer items-start gap-2 rounded-control bg-white shadow-xs has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-container">
                <input :checked="cuotas" type="checkbox" class="mt-1 size-[13px] accent-primary" @change="alternarCuotas(($event.target as HTMLInputElement).checked)" />
                <span>
                  <span class="block text-body font-semibold tracking-[0.14px]">Pago en meses</span>
                  <span class="block text-caption text-on-surface-variant">Fraccionado en cuotas fijas bajo convención 360/30.</span>
                </span>
              </label>
            </div>
            <p v-if="err('permite_cuotas')" id="error-modalidad" role="alert" class="text-caption text-error">{{ err('permite_cuotas') }}</p>

            <!-- Máximo de meses (solo si permite meses) -->
            <div v-if="cuotas" class="flex flex-col gap-3 rounded-control border border-primary/20 bg-surface-high p-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-2">
                <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-container">
                  <img :src="iconoMaxMeses" alt="" width="13.5" height="15" />
                </span>
                <div>
                  <p class="flex items-center gap-1.5">
                    <label for="max-meses" class="text-body font-semibold tracking-[0.14px]">Máximo de meses permitido</label>
                    <span class="text-error" aria-hidden="true">*</span>
                    <HelpTip campo="Máximo de meses permitido" texto="Plazo tope (1 a 36 meses) que se le puede dar al cliente al comprar este producto en cuotas. El cliente además tiene su propio máximo." />
                  </p>
                  <p class="text-caption text-on-surface-variant">Plazo tope para el cliente al comprar este producto</p>
                </div>
              </div>
              <div class="w-full sm:w-44">
                <SelectInput id="max-meses" v-model="maxMeses" :options="opcionesMeses" :invalid="!!err('max_meses')" class="[&_select]:h-10 [&_select]:text-body-lg [&_select]:font-semibold" />
              </div>
            </div>
            <p v-if="cuotas && err('max_meses')" role="alert" class="text-caption text-error">{{ err('max_meses') }}</p>
          </div>
        </fieldset>

        <p v-if="errorGeneral" role="alert" class="rounded-control border border-error/30 bg-error-container px-4 py-3 text-body font-semibold text-error">{{ errorGeneral }}</p>

        <!-- Acciones -->
        <div class="flex justify-end gap-4 border-t border-surface-highest/40 pt-4">
          <RouterLink :to="{ name: 'tienda-productos' }" class="flex h-10 items-center rounded-control bg-surface-container px-6 text-body font-semibold text-on-surface transition-colors hover:bg-surface-high">
            Cancelar
          </RouterLink>
          <button type="submit" :disabled="isSubmitting"
            class="flex h-10 items-center gap-1 rounded-control bg-primary-container px-8 text-body font-semibold text-white shadow-btn transition-colors hover:bg-primary disabled:cursor-wait disabled:opacity-70">
            <span v-if="isSubmitting" class="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
            <img v-else :src="iconoGuardar" alt="" width="13.5" height="13.5" />
            {{ isSubmitting ? 'Guardando…' : 'Guardar Producto' }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>
