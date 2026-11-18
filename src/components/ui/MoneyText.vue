<script setup lang="ts">
/**
 * Muestra un monto que llega del backend como texto: <MoneyText valor="1234.5" /> → "S/ 1,234.50".
 * Usa números de ancho fijo (tabular-nums) para que las columnas queden alineadas.
 */
import { computed } from 'vue'
import { formatMoney } from '@/utils/format'

const props = withDefaults(defineProps<{ valor: string | null | undefined; moneda?: string }>(), { moneda: 'PEN' })

const texto = computed(() => formatMoney(props.valor, props.moneda))
</script>

<template>
  <span class="whitespace-nowrap tabular-nums">{{ texto }}</span>
</template>
