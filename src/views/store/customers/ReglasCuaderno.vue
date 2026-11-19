<script setup lang="ts">
/**
 * Panel "Reglas del Cuaderno" (Figma 5). Explica en palabras las reglas que aplica el backend
 * (Anexo A del enunciado). Los textos usan los días de corte y pago que se están eligiendo.
 *
 * Nota: el Figma decía "tasa diaria = tasa mensual ÷ 30", pero el sistema convierte con interés
 * compuesto (TEP = (1 + TN/m)^n − 1), así que el texto se corrigió para no explicar mal la regla.
 */
import iconoLibro from '@/assets/icons/reglas-libro.svg'
import iconoCalendario from '@/assets/icons/regla-calendario.svg'
import iconoReloj from '@/assets/icons/regla-reloj.svg'
import iconoAlerta from '@/assets/icons/regla-alerta.svg'

defineProps<{ diaCorte: number | null; horaCorte: string; diaPago: number | null }>()
</script>

<template>
  <section class="rounded-card bg-white p-6 shadow-xs" aria-labelledby="titulo-reglas">
    <div class="flex items-center gap-2 border-b border-surface-highest pb-1">
      <img :src="iconoLibro" alt="" width="20.17" height="14.67" />
      <div>
        <h2 id="titulo-reglas" class="text-body-lg font-semibold text-on-surface">Reglas del Cuaderno</h2>
        <p class="text-label font-bold text-on-surface-variant">Criterios de bodega y liquidación</p>
      </div>
    </div>
    <ul class="mt-4 flex flex-col gap-4">
      <li class="flex gap-2">
        <span class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10"><img :src="iconoCalendario" alt="" width="11.25" height="12.5" /></span>
        <div class="text-caption">
          <p class="font-semibold text-on-surface">Cómputo Comercial Estándar 360/30</p>
          <p class="text-on-surface-variant">
            Todo mes computa como 30 días y el año como 360. Una tasa nominal se convierte a efectiva con interés compuesto:
            <strong>TEP = (1 + TN/m)<sup>n</sup> − 1</strong>, capitalizando a diario si no se indica otra cosa.
          </p>
        </div>
      </li>
      <li class="flex gap-2">
        <span class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10"><img :src="iconoReloj" alt="" width="12.5" height="12.5" /></span>
        <div class="text-caption">
          <p class="font-semibold text-on-surface">Corte estricto a las {{ horaCorte || '—' }} hrs</p>
          <p class="text-on-surface-variant">
            Las compras del día {{ diaCorte ?? '—' }} desde las {{ horaCorte || '—' }} (inclusive) pasan al siguiente ciclo de facturación de la bodega.
          </p>
        </div>
      </li>
      <li class="flex gap-2">
        <span class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10"><img :src="iconoAlerta" alt="" width="13.75" height="11.88" /></span>
        <div class="text-caption">
          <p class="font-semibold text-on-surface">Interés Moratorio Automático</p>
          <p class="text-on-surface-variant">
            Si el listado no se paga hasta el día {{ diaPago ?? '—' }}, desde el día siguiente se cobra la tasa moratoria pactada sobre el total
            que debió pagarse, por cada día de atraso. No se aceptan pagos parciales.
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>
