<script setup lang="ts">
/**
 * Campos de "Condiciones del Crédito" (Figma 5, tarjeta 2): moneda, tasa compensatoria y moratoria
 * (nominal/efectiva, mensual/anual, capitalización), límite, plazo máximo, corte y pago.
 *
 * Se conecta al formulario del componente padre (VeeValidate) con los nombres "condicion.*",
 * así lo usan el alta de cliente y la pantalla "Cambiar condiciones".
 * Las equivalencias (TEM, TEA) las calcula el backend; el padre las pasa por props.
 */
import { computed, watch } from 'vue'
import { useField } from 'vee-validate'
import FormField from '@/components/forms/FormField.vue'
import SegmentedToggle from '@/components/forms/SegmentedToggle.vue'
import RateInput from '@/components/forms/RateInput.vue'
import MoneyInput from '@/components/forms/MoneyInput.vue'
import SelectInput from '@/components/forms/SelectInput.vue'
import DayInput from '@/components/forms/DayInput.vue'
import TimeInput from '@/components/forms/TimeInput.vue'
import type { EquivalenciasOut, TopeOut } from '@/types/api'
import { compararDecimales } from '@/utils/decimalInput'
import { formatRate } from '@/utils/format'
import iconoCapitalizacion from '@/assets/icons/capitalizacion.svg'
import iconoPlazo from '@/assets/icons/campo-plazo.svg'
import iconoDiaPago from '@/assets/icons/campo-dia-pago.svg'

const props = defineProps<{
  equivCompensatoria: EquivalenciasOut | null
  equivMoratoria: EquivalenciasOut | null
  topeCompensatoria: TopeOut | null
  topeMoratoria: TopeOut | null
}>()

// Cada campo se enlaza al formulario del padre por su ruta.
const moneda = useField<'PEN' | 'USD'>('condicion.moneda')
const tipo = useField<'NOMINAL' | 'EFECTIVA'>('condicion.tasa.tipo')
const valor = useField<string>('condicion.tasa.valor')
const periodo = useField<30 | 360>('condicion.tasa.periodo_dias')
const capitalizacion = useField<number | null>('condicion.tasa.capitalizacion_dias')
const tipoMora = useField<'NOMINAL' | 'EFECTIVA'>('condicion.tasa_mora.tipo')
const valorMora = useField<string>('condicion.tasa_mora.valor')
const periodoMora = useField<30 | 360>('condicion.tasa_mora.periodo_dias')
const capitalizacionMora = useField<number | null>('condicion.tasa_mora.capitalizacion_dias')
const limite = useField<string>('condicion.limite_credito')
const maxMeses = useField<number | null>('condicion.max_meses')
const diaCorte = useField<number | null>('condicion.dia_corte')
const horaCorte = useField<string>('condicion.hora_corte')
const diaPago = useField<number | null>('condicion.dia_pago')

// Como en el Figma, un solo "Periodo de la tasa" vale para ambas tasas.
watch(periodo.value, (p) => (periodoMora.value.value = p))
// La capitalización solo existe para tasas nominales (diaria por defecto, regla del curso).
watch(tipo.value, (t) => (capitalizacion.value.value = t === 'NOMINAL' ? (capitalizacion.value.value ?? 1) : null))
watch(tipoMora.value, (t) => (capitalizacionMora.value.value = t === 'NOMINAL' ? (capitalizacionMora.value.value ?? 1) : null))

const nombrePeriodo = computed(() => (periodo.value.value === 360 ? 'anual' : 'mensual'))

const opcionesMoneda = [
  { value: 'PEN' as const, label: 'Soles (S/)' },
  { value: 'USD' as const, label: 'Dólares ($)' },
]
const opcionesPeriodo = [
  { value: 30 as const, label: 'Mensual' },
  { value: 360 as const, label: 'Anual' },
]
const opcionesTipo = [
  { value: 'NOMINAL' as const, label: 'Nominal' },
  { value: 'EFECTIVA' as const, label: 'Efectiva' },
]
const opcionesCapitalizacion = [
  { value: 1, label: 'Diaria' },
  { value: 15, label: 'Quincenal' },
  { value: 30, label: 'Mensual' },
]
const opcionesMeses = Array.from({ length: 36 }, (_, i) => ({ value: i + 1, label: `${i + 1} ${i === 0 ? 'mes' : 'meses'} (${(i + 1) * 30} días)` }))

/** Aviso si la TEA (calculada por el backend) supera el tope BCRP. El backend lo valida igual al guardar. */
function superaTope(eq: EquivalenciasOut | null, tope: TopeOut | null): boolean {
  return !!eq && !!tope && compararDecimales(eq.tea_pct, tope.tea_maxima) > 0
}
const avisoTope = computed(() => superaTope(props.equivCompensatoria, props.topeCompensatoria))
const avisoTopeMora = computed(() => superaTope(props.equivMoratoria, props.topeMoratoria))
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Moneda y periodo -->
    <div class="grid gap-4 rounded-control bg-surface-low/70 p-4 sm:grid-cols-2">
      <FormField v-slot="{ labelId, describedBy }" label="Moneda del crédito" required tono="claro" :error="moneda.errorMessage.value"
        help="Moneda en la que se otorga la línea de crédito, se registran las compras y se cobran los pagos. El tope BCRP depende de la moneda.">
        <SegmentedToggle v-model="moneda.value.value" :options="opcionesMoneda" :labelledby="labelId" :describedby="describedBy" />
      </FormField>
      <FormField v-slot="{ labelId, describedBy }" label="Periodo de la tasa" required tono="claro"
        help="Si las tasas pactadas son mensuales (30 días) o anuales (360 días), según el año comercial del curso.">
        <SegmentedToggle v-model="periodo.value.value" :options="opcionesPeriodo" :labelledby="labelId" :describedby="describedBy" />
      </FormField>
    </div>

    <!-- Tasa compensatoria -->
    <div class="flex flex-col gap-4 rounded-control bg-surface-low/70 p-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-slot="{ id, describedBy, invalid }" label="Tasa de interés compensatoria pactada (%)" required tono="claro"
          help-title="Ayuda tasa pactada" :error="valor.errorMessage.value"
          help="Es el interés compensatorio convenido con el cliente por el financiamiento en bodega. Escribe el porcentaje: 3.5 = 3.5 %. Su TEA no puede superar el tope del BCRP.">
          <RateInput :id="id" v-model="valor.value.value" :periodo="nombrePeriodo" variante="blanco" :aria-describedby="describedBy" :invalid="invalid" />
        </FormField>
        <FormField v-slot="{ labelId, describedBy }" label="Tipo de tasa" tono="claro"
          help="Efectiva: ya incluye la capitalización. Nominal: se convierte a efectiva con la capitalización elegida (TEP = (1 + TN/m)^n − 1).">
          <SegmentedToggle v-model="tipo.value.value" :options="opcionesTipo" :labelledby="labelId" :describedby="describedBy" />
        </FormField>
      </div>
      <p class="text-caption text-on-surface-variant" aria-live="polite">
        <template v-if="equivCompensatoria">
          Equivale a <strong class="text-primary">TEM {{ formatRate(equivCompensatoria.tem_pct, 4) }}</strong> ·
          <strong class="text-primary">TEA {{ formatRate(equivCompensatoria.tea_pct, 4) }}</strong>
        </template>
        <template v-else>Escribe la tasa para ver su TEM y TEA.</template>
        <template v-if="topeCompensatoria"> · Tope BCRP vigente: {{ formatRate(topeCompensatoria.tea_maxima) }} TEA</template>
      </p>
      <p v-if="avisoTope" role="alert" class="rounded-control bg-error-container px-3 py-2 text-caption font-semibold text-error">
        La TEA supera el tope vigente del BCRP. El sistema no permitirá guardar esta tasa.
      </p>
      <div v-if="tipo.value.value === 'NOMINAL'" class="border-t border-surface-highest pt-3">
        <FormField v-slot="{ id, describedBy, invalid }" label="Capitalización de la tasa nominal" tono="claro" :error="capitalizacion.errorMessage.value"
          help="Cada cuántos días se suman los intereses al capital. Por regla del curso, si no se indica, es diaria.">
          <div class="flex items-center gap-2">
            <img :src="iconoCapitalizacion" alt="" width="12" height="16.5" />
            <SelectInput :id="id" v-model="capitalizacion.value.value" :options="opcionesCapitalizacion" variante="blanco" :aria-describedby="describedBy" :invalid="invalid" class="sm:max-w-60" />
          </div>
        </FormField>
      </div>
    </div>

    <!-- Tasa moratoria -->
    <div class="flex flex-col gap-4 rounded-control bg-surface-low/70 p-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-slot="{ id, describedBy, invalid }" label="Tasa moratoria (%)" required tono="claro" :error="valorMora.errorMessage.value"
          help="Interés adicional que se cobra por los días de atraso sobre el total que debió pagarse. Por norma no puede superar el tope moratorio del BCRP.">
          <RateInput :id="id" v-model="valorMora.value.value" :periodo="nombrePeriodo" variante="blanco" :aria-describedby="describedBy" :invalid="invalid" />
        </FormField>
        <FormField v-slot="{ labelId, describedBy }" label="Cálculo de mora" tono="claro"
          help="Si la tasa moratoria pactada es nominal o efectiva (misma regla que la compensatoria).">
          <SegmentedToggle v-model="tipoMora.value.value" :options="opcionesTipo" :labelledby="labelId" :describedby="describedBy" />
        </FormField>
      </div>
      <div v-if="tipoMora.value.value === 'NOMINAL'">
        <FormField v-slot="{ id, describedBy }" label="Capitalización de la tasa moratoria" tono="claro"
          help="Cada cuántos días se capitaliza la tasa moratoria nominal. Diaria por defecto.">
          <SelectInput :id="id" v-model="capitalizacionMora.value.value" :options="opcionesCapitalizacion" variante="blanco" :aria-describedby="describedBy" class="sm:max-w-60" />
        </FormField>
      </div>
      <p class="text-caption text-on-surface-variant" aria-live="polite">
        <template v-if="equivMoratoria">
          Equivale a <strong class="text-primary">TEM {{ formatRate(equivMoratoria.tem_pct, 4) }}</strong> ·
          <strong class="text-primary">TEA {{ formatRate(equivMoratoria.tea_pct, 4) }}</strong>
        </template>
        <template v-else>Escribe la tasa moratoria para ver su TEM y TEA.</template>
        <template v-if="topeMoratoria"> · Tope BCRP vigente: {{ formatRate(topeMoratoria.tea_maxima) }} TEA</template>
      </p>
      <p v-if="avisoTopeMora" role="alert" class="rounded-control bg-error-container px-3 py-2 text-caption font-semibold text-error">
        La TEA moratoria supera el tope vigente del BCRP. El sistema no permitirá guardar esta tasa.
      </p>
    </div>

    <!-- Límites y plazos -->
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField v-slot="{ id, describedBy, invalid }" label="Límite máximo de fiado / crédito" required tono="claro" :error="limite.errorMessage.value"
        help="Monto máximo que el vecino puede deber a la vez (capital pendiente). No se permiten compras que lo excedan.">
        <MoneyInput :id="id" v-model="limite.value.value" :moneda="moneda.value.value" variante="relleno" :aria-describedby="describedBy" :invalid="invalid" />
      </FormField>
      <FormField v-slot="{ id, describedBy, invalid }" label="Plazo máximo de financiamiento" required tono="claro" :error="maxMeses.errorMessage.value"
        help="Máximo de cuotas mensuales (1 a 36) que se le permite a este cliente. Cada producto tiene además su propio máximo.">
        <SelectInput :id="id" v-model="maxMeses.value.value" :options="opcionesMeses" variante="relleno" :icono="iconoPlazo" :icono-ancho="15.75" :icono-alto="16.5"
          :aria-describedby="describedBy" :invalid="invalid" />
      </FormField>
      <FormField v-slot="{ id, describedBy, invalid }" label="Día y hora de corte contable" required tono="claro" :error="diaCorte.errorMessage.value ?? horaCorte.errorMessage.value"
        help="Las compras hechas antes de este día y hora entran al listado de pago del mes; las posteriores (incluida la hora exacta) pasan al ciclo siguiente. Día de 1 a 28.">
        <div class="flex gap-2">
          <DayInput :id="id" v-model="diaCorte.value.value" :aria-describedby="describedBy" :invalid="invalid" aria-label="Día de corte" />
          <TimeInput v-model="horaCorte.value.value" :aria-describedby="describedBy" :invalid="!!horaCorte.errorMessage.value" aria-label="Hora de corte" />
        </div>
      </FormField>
      <FormField v-slot="{ id, describedBy, invalid }" label="Día de vencimiento / pago mensual" required tono="claro" :error="diaPago.errorMessage.value"
        help="Día del mes en que el vecino se compromete a pagar su listado (1 a 28, distinto al día de corte). Desde el día siguiente corre la mora.">
        <DayInput :id="id" v-model="diaPago.value.value" sufijo="de cada mes" :icono="iconoDiaPago" :aria-describedby="describedBy" :invalid="invalid" />
      </FormField>
    </div>
  </div>
</template>
