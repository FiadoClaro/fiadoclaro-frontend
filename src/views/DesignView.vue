<script setup lang="ts">
/**
 * /design — Catálogo visual del sistema de diseño (solo en desarrollo).
 * Sirve para comparar los tokens de main.css / tailwind.config.ts con el Figma.
 * En la fase 3 aquí se agregan los componentes base (FormField, DataTable, sellos...).
 */
import isotipo from '@/assets/figma/isotipo-libreta.svg'
import checkAcento from '@/assets/figma/check-acento.svg'
import logoPng from '@/assets/figma/logo-fiadoclaro.png'
import { formatDate, formatDateTime, formatMoney, formatRate } from '@/utils/format'
import ComponentsDemo from './design/ComponentsDemo.vue'

interface Muestra {
  clase: string // clase de Tailwind
  nombre: string // token
  hex: string
  uso: string
  textoClaro?: boolean // si el texto encima debe ser blanco
}

const grupos: { titulo: string; colores: Muestra[] }[] = [
  {
    titulo: 'Marca',
    colores: [
      { clase: 'bg-primary', nombre: 'primary', hex: '#005C55', uso: 'Barra lateral, marca, enlace activo', textoClaro: true },
      { clase: 'bg-primary-container', nombre: 'primary-container', hex: '#0F766E', uso: 'Botón principal, ítem activo', textoClaro: true },
      { clase: 'bg-primary-fixed', nombre: 'primary-fixed', hex: '#ABEFE8', uso: 'Sello AL DÍA, avatar' },
      { clase: 'bg-primary-fixed-dim', nombre: 'primary-fixed-dim', hex: '#80D5CB', uso: 'Subtítulos del menú' },
      { clase: 'bg-primary-on-fixed-variant', nombre: 'primary-on-fixed-variant', hex: '#266D68', uso: 'Número de paso', textoClaro: true },
      { clase: 'bg-primary-inverse', nombre: 'primary-inverse', hex: '#A3FAEF', uso: '"LIBRO DE CUENTAS"' },
      { clase: 'bg-accent', nombre: 'accent', hex: '#F59E0B', uso: 'Check dorado del logo' },
    ],
  },
  {
    titulo: 'Superficies (papel)',
    colores: [
      { clase: 'bg-surface', nombre: 'surface', hex: '#FAF7F2', uso: 'Fondo de la app' },
      { clase: 'bg-surface-bright', nombre: 'surface-bright', hex: '#FCF9F4', uso: 'Fondo del login' },
      { clase: 'bg-surface-lowest', nombre: 'surface-lowest', hex: '#FFFFFF', uso: 'Tarjetas e inputs' },
      { clase: 'bg-surface-low', nombre: 'surface-low', hex: '#F6F3EE', uso: 'Buscador, pie de tabla' },
      { clase: 'bg-surface-container', nombre: 'surface-container', hex: '#F0EDE9', uso: 'Cabecera de tabla' },
      { clase: 'bg-surface-high', nombre: 'surface-high', hex: '#EBE8E3', uso: 'Chips, botón Cancelar' },
      { clase: 'bg-surface-highest', nombre: 'surface-highest', hex: '#E5E2DD', uso: 'Botón "?", sello DE BAJA' },
      { clase: 'bg-surface-inverse', nombre: 'surface-inverse', hex: '#31302D', uso: 'Tooltip de ayuda', textoClaro: true },
    ],
  },
  {
    titulo: 'Texto y bordes',
    colores: [
      { clase: 'bg-on-surface', nombre: 'on-surface', hex: '#1C1C19', uso: 'Texto principal', textoClaro: true },
      { clase: 'bg-on-surface-variant', nombre: 'on-surface-variant', hex: '#3E4947', uso: 'Texto secundario', textoClaro: true },
      { clase: 'bg-outline', nombre: 'outline', hex: '#6E7977', uso: 'Deshabilitado', textoClaro: true },
      { clase: 'bg-outline-variant', nombre: 'outline-variant', hex: '#BDC9C6', uso: 'Bordes (al 40 %)' },
      { clase: 'bg-on-surface-inverse', nombre: 'on-surface-inverse', hex: '#F3F0EB', uso: 'Texto en tooltip y menú' },
      { clase: 'bg-ink', nombre: 'ink', hex: '#1E293B', uso: 'Títulos del login', textoClaro: true },
      { clase: 'bg-ink-muted', nombre: 'ink-muted', hex: '#475569', uso: 'Texto tarjeta login', textoClaro: true },
      { clase: 'bg-line', nombre: 'line', hex: '#E2E8F0', uso: 'Bordes del login' },
    ],
  },
  {
    titulo: 'Estados',
    colores: [
      { clase: 'bg-error', nombre: 'error', hex: '#BA1A1A', uso: 'EN MORA, obligatorio, salir', textoClaro: true },
      { clase: 'bg-error-container', nombre: 'error-container', hex: '#FFDAD6', uso: 'Fondo sello EN MORA' },
      { clase: 'bg-tertiary', nombre: 'tertiary', hex: '#734700', uso: 'Crédito alto (texto)', textoClaro: true },
      { clase: 'bg-tertiary-container', nombre: 'tertiary-container', hex: '#945D00', uso: 'Crédito alto (barra)', textoClaro: true },
      { clase: 'bg-tertiary-fixed', nombre: 'tertiary-fixed', hex: '#FFDDB8', uso: 'Avisos ámbar' },
      { clase: 'bg-success', nombre: 'success', hex: '#16A34A', uso: 'Validación correcta', textoClaro: true },
      { clase: 'bg-success-container', nombre: 'success-container', hex: '#DCFCE7', uso: 'Fondo validación' },
      { clase: 'bg-notebook-margin', nombre: 'notebook-margin', hex: '#FCA5A5', uso: 'Margen rojo del cuaderno' },
    ],
  },
]

const tipografia = [
  { clase: 'text-display font-bold', token: 'display · 32/40 · Bold', ejemplo: 'S/ 63.80' },
  { clase: 'text-headline font-bold', token: 'headline · 24/32 · Bold', ejemplo: 'Cartera de Clientes Frecuentes' },
  { clase: 'text-title font-semibold', token: 'title · 20/28 · SemiBold', ejemplo: 'Datos de la Tienda' },
  { clase: 'text-body-lg font-semibold', token: 'body-lg · 16/24 · SemiBold', ejemplo: 'Guardar Tienda' },
  { clase: 'text-body', token: 'body · 14/20 · Regular', ejemplo: 'Aquí llevamos las cuentas claras.' },
  { clase: 'text-body font-semibold', token: 'body · 14/20 · SemiBold', ejemplo: 'Ingresar' },
  { clase: 'text-caption font-semibold', token: 'caption · 12/16 · SemiBold', ejemplo: 'Nombre comercial' },
  { clase: 'text-caption', token: 'caption · 12/16 · Regular', ejemplo: 'Inicio / Tiendas / Registrar tienda' },
  { clase: 'text-label font-bold uppercase', token: 'label · 11/14 · Bold · MAYÚSC.', ejemplo: 'Crédito utilizado' },
  { clase: 'text-micro font-bold uppercase', token: 'micro · 10/14 · Bold · MAYÚSC.', ejemplo: 'Cuaderno digital' },
]

const pesos = [
  { clase: 'font-normal', nombre: 'Regular 400' },
  { clase: 'font-medium', nombre: 'Medium 500' },
  { clase: 'font-semibold', nombre: 'SemiBold 600' },
  { clase: 'font-bold', nombre: 'Bold 700' },
]

const radios = [
  { clase: 'rounded-stamp', nombre: 'stamp · 4px', uso: 'Sellos, paginación' },
  { clase: 'rounded-control', nombre: 'control · 8px', uso: 'Inputs, botones, menú' },
  { clase: 'rounded-card', nombre: 'card · 12px', uso: 'Tarjetas, tablas' },
  { clase: 'rounded-full', nombre: 'full', uso: 'Chips, "?", avatares' },
]

const sombras = [
  { clase: 'shadow-xs', nombre: 'xs', uso: 'Inputs, tarjetas' },
  { clase: 'shadow-btn', nombre: 'btn', uso: 'Botones, tablas' },
  { clase: 'shadow-float', nombre: 'float', uso: 'Login, modales' },
  { clase: 'shadow-header', nombre: 'header', uso: 'Cabecera fija' },
]

// Ejemplos de utils/format.ts con valores tal como llegan del backend (texto).
const formatos = [
  { entrada: 'formatMoney("1234.5")', salida: formatMoney('1234.5') },
  { entrada: 'formatMoney("99", "USD")', salida: formatMoney('99', 'USD') },
  { entrada: 'formatRate("3.5000000")', salida: formatRate('3.5000000') },
  { entrada: 'formatRate("114.6800000", 7)', salida: formatRate('114.6800000', 7) },
  { entrada: 'formatDate("2026-11-30")', salida: formatDate('2026-11-30') },
  { entrada: 'formatDateTime("2026-11-30T03:00:00Z")', salida: formatDateTime('2026-11-30T03:00:00Z') },
]
</script>

<template>
  <div class="min-h-screen bg-surface">
    <!-- Cabecera con el logo del Figma (pantalla 1) -->
    <header class="sticky top-0 z-10 flex h-header items-center border-b border-line bg-surface px-4 shadow-xs sm:px-8">
      <div class="flex items-center gap-3">
        <div class="relative flex size-10 items-center justify-center rounded-control bg-primary-container shadow-xs">
          <img :src="isotipo" alt="" width="24" height="24" />
          <span class="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-accent ring-2 ring-surface">
            <img :src="checkAcento" alt="" width="10" height="10" />
          </span>
        </div>
        <div>
          <p class="text-[19px] font-bold leading-[23.75px] tracking-[-0.475px] text-primary">FiadoClaro</p>
          <p class="text-micro font-bold uppercase text-ink-subtle">Sistema de diseño</p>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-content space-y-10 px-4 py-8 sm:px-8">
      <section>
        <h1 class="text-headline font-bold">Sistema de diseño</h1>
        <p class="mt-1 text-body text-on-surface-variant">
          Tokens extraídos del Figma (pantallas 1, 3, 4b y 8). Valores en
          <code class="rounded-stamp bg-surface-high px-1">src/assets/main.css</code> y nombres en
          <code class="rounded-stamp bg-surface-high px-1">tailwind.config.ts</code>.
        </p>
      </section>

      <!-- Paleta -->
      <section v-for="grupo in grupos" :key="grupo.titulo" class="space-y-3">
        <h2 class="text-title font-semibold">{{ grupo.titulo }}</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div v-for="c in grupo.colores" :key="c.nombre" class="overflow-hidden rounded-card bg-surface-lowest shadow-xs">
            <div
              :class="[c.clase, c.textoClaro ? 'text-white' : 'text-on-surface']"
              class="flex h-20 items-end border-b border-outline-variant/40 p-2 text-caption font-semibold"
            >
              {{ c.hex }}
            </div>
            <div class="p-3">
              <p class="truncate text-caption font-semibold">{{ c.nombre }}</p>
              <p class="text-caption text-on-surface-variant">{{ c.uso }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Tipografía -->
      <section class="space-y-3">
        <h2 class="text-title font-semibold">Tipografía · Inter</h2>
        <div class="divide-y divide-surface-container overflow-hidden rounded-card bg-surface-lowest shadow-xs">
          <div v-for="t in tipografia" :key="t.token" class="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6">
            <span class="w-60 shrink-0 text-caption text-on-surface-variant">{{ t.token }}</span>
            <span :class="t.clase" class="min-w-0 break-words">{{ t.ejemplo }}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-3">
          <span v-for="p in pesos" :key="p.nombre" :class="p.clase" class="rounded-control bg-surface-lowest px-4 py-2 text-body-lg shadow-xs">
            Aa · {{ p.nombre }}
          </span>
        </div>
      </section>

      <!-- Radios y sombras -->
      <section class="grid gap-8 md:grid-cols-2">
        <div class="space-y-3">
          <h2 class="text-title font-semibold">Radios</h2>
          <div class="grid grid-cols-2 gap-3">
            <div v-for="r in radios" :key="r.nombre" class="flex items-center gap-3">
              <div :class="r.clase" class="size-14 shrink-0 bg-primary-container" />
              <div>
                <p class="text-caption font-semibold">{{ r.nombre }}</p>
                <p class="text-caption text-on-surface-variant">{{ r.uso }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <h2 class="text-title font-semibold">Sombras</h2>
          <div class="grid grid-cols-2 gap-4">
            <div v-for="s in sombras" :key="s.nombre" :class="s.clase" class="rounded-card bg-surface-lowest p-4">
              <p class="text-caption font-semibold">{{ s.nombre }}</p>
              <p class="text-caption text-on-surface-variant">{{ s.uso }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Muestra de piezas del Figma armadas solo con tokens (los componentes reales llegan en la fase 3) -->
      <section class="space-y-3">
        <h2 class="text-title font-semibold">Vista previa con tokens</h2>
        <div class="flex flex-wrap items-center gap-4 rounded-card bg-surface-lowest p-6 shadow-xs">
          <button type="button" class="rounded-control bg-primary-container px-4 py-3 text-body font-semibold tracking-[0.14px] text-on-primary shadow-btn">
            Ingresar →
          </button>
          <button type="button" class="rounded-control bg-surface-high px-6 py-2.5 text-body-lg font-semibold text-primary shadow-xs">
            Cancelar
          </button>
          <span class="rounded-full bg-primary px-4 py-1.5 text-caption font-semibold text-white">Todos (4)</span>
          <span class="rounded-full bg-surface-high px-4 py-1.5 text-caption font-semibold">Al día (2)</span>
          <span class="-rotate-1 rounded-stamp border border-primary bg-primary-fixed px-2.5 py-0.5 text-label font-bold uppercase text-primary shadow-xs">Al día</span>
          <span class="rotate-1 rounded-stamp border border-error bg-error-container px-2.5 py-0.5 text-label font-bold uppercase text-error shadow-xs">En mora</span>
          <span class="rotate-2 rounded-stamp border border-outline bg-surface-highest px-2.5 py-0.5 text-label font-bold uppercase text-on-surface-variant shadow-xs">De baja</span>
          <span class="flex size-4 items-center justify-center rounded-full bg-surface-highest text-micro font-bold text-on-surface-variant">?</span>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="bg-notebook relative h-28 overflow-hidden rounded-card border border-surface-high">
            <span class="absolute inset-y-0 left-7 w-[1.5px] bg-notebook-margin/50" />
            <p class="p-4 pl-12 text-caption text-on-surface-variant">Fondo de cuaderno del login (<code>.bg-notebook</code>)</p>
          </div>
          <div class="flex items-center gap-3 rounded-card bg-primary p-4">
            <img :src="logoPng" alt="" width="32" height="32" />
            <div>
              <p class="text-body-lg font-semibold tracking-[-0.4px] text-white">FiadoClaro</p>
              <p class="text-label font-bold uppercase text-primary-inverse">Libro de cuentas</p>
            </div>
          </div>
        </div>
      </section>

      <!-- utils/format.ts -->
      <section class="space-y-3">
        <h2 class="text-title font-semibold">Formatos (utils/format.ts)</h2>
        <div class="overflow-x-auto rounded-card bg-surface-lowest shadow-xs">
          <table class="w-full text-left text-body">
            <thead class="bg-surface-container text-label font-semibold uppercase text-on-surface-variant">
              <tr>
                <th class="px-4 py-3">Llamada</th>
                <th class="px-4 py-3 text-right">Resultado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in formatos" :key="f.entrada" class="border-t border-surface-container">
                <td class="px-4 py-3 font-mono text-caption">{{ f.entrada }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ f.salida }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Fase 3: componentes base -->
      <ComponentsDemo />
    </main>
  </div>
</template>
