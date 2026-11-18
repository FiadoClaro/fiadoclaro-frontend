import type { Config } from 'tailwindcss'

/** Color de Tailwind que lee una variable CSS de src/assets/main.css y admite transparencia (bg-primary/20). */
const v = (nombre: string) => `rgb(var(--fc-${nombre}) / <alpha-value>)`

/**
 * Tokens del Figma de FiadoClaro. Los valores reales viven en src/assets/main.css (variables --fc-*);
 * aquí solo se les da nombre para usarlos como clases: bg-primary, text-on-surface-variant, rounded-card...
 */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: v('primary'),
          container: v('primary-container'),
          fixed: v('primary-fixed'),
          'fixed-dim': v('primary-fixed-dim'),
          'on-fixed-variant': v('on-primary-fixed-variant'),
          inverse: v('inverse-primary'),
        },
        'on-primary': v('on-primary'),
        surface: {
          DEFAULT: v('surface'),
          bright: v('surface-bright'),
          lowest: v('surface-container-lowest'),
          low: v('surface-container-low'),
          container: v('surface-container'),
          high: v('surface-container-high'),
          highest: v('surface-container-highest'),
          inverse: v('inverse-surface'),
        },
        'on-surface': {
          DEFAULT: v('on-surface'),
          variant: v('on-surface-variant'),
          inverse: v('inverse-on-surface'),
        },
        outline: {
          DEFAULT: v('outline'),
          variant: v('outline-variant'),
        },
        error: {
          DEFAULT: v('error'),
          container: v('error-container'),
        },
        tertiary: {
          DEFAULT: v('tertiary'),
          container: v('tertiary-container'),
          fixed: v('tertiary-fixed'),
        },
        success: {
          DEFAULT: v('success'),
          container: v('success-container'),
        },
        accent: v('accent'),
        ink: {
          DEFAULT: v('ink'),
          muted: v('ink-muted'),
          subtle: v('ink-subtle'),
        },
        line: v('line'),
        notebook: {
          margin: v('notebook-margin'),
          rule: v('notebook-rule'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Escala tipográfica del Figma: [tamaño, { interlineado, espaciado }]
      fontSize: {
        /** 10 px: "CUADERNO DIGITAL", "?" de ayuda */
        micro: ['10px', { lineHeight: '14px', letterSpacing: '0.5px' }],
        /** 11 px MAYÚSCULAS: cabeceras de tabla, sellos, etiquetas de sección */
        label: ['11px', { lineHeight: '14px', letterSpacing: '0.55px' }],
        /** 12 px: etiquetas de campos, migas de pan, chips */
        caption: ['12px', { lineHeight: '16px', letterSpacing: '0.24px' }],
        /** 14 px: texto normal, inputs, botones */
        body: ['14px', { lineHeight: '20px' }],
        /** 16 px: botones grandes, nombres en tablas */
        'body-lg': ['16px', { lineHeight: '24px' }],
        /** 20 px: título de tarjeta / sección */
        title: ['20px', { lineHeight: '28px', letterSpacing: '-0.2px' }],
        /** 24 px: título de página */
        headline: ['24px', { lineHeight: '32px', letterSpacing: '-0.6px' }],
        /** 32 px: totales destacados (resumen de compra) */
        display: ['32px', { lineHeight: '40px', letterSpacing: '-0.8px' }],
      },
      borderRadius: {
        stamp: '4px', // sellos y paginación
        control: '8px', // inputs, botones, ítems del menú
        card: '12px', // tarjetas y tablas
      },
      boxShadow: {
        xs: '0px 1px 2px 0px rgba(0, 0, 0, 0.05)', // inputs y tarjetas
        btn: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)', // botones y tablas
        float: '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 8px 10px -6px rgba(0, 0, 0, 0.1)', // login y modales
        header: '0px 1px 8px 0px rgba(0, 0, 0, 0.04)', // cabecera fija
        footer: '0px -1px 6px 0px rgba(0, 0, 0, 0.02)', // pie de página
        inset: 'inset 0px 2px 4px 0px rgba(0, 0, 0, 0.05)',
      },
      spacing: {
        sidebar: 'var(--fc-sidebar-width)',
        header: 'var(--fc-header-height)',
      },
      maxWidth: {
        content: 'var(--fc-content-max)',
      },
    },
  },
  plugins: [],
} satisfies Config
