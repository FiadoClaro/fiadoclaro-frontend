import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import FormField from './FormField.vue'

afterEach(() => vi.restoreAllMocks())

/** Monta un FormField con un <input> conectado por el slot. */
function montar(props: { label: string; help: string; required?: boolean; error?: string }) {
  return mount(FormField, {
    props,
    attachTo: document.body, // necesario para que isVisible() evalúe los estilos
    slots: {
      default: (s: { id: string; describedBy: string }) => h('input', { id: s.id, 'aria-describedby': s.describedBy }),
    },
  })
}

describe('FormField', () => {
  it('falla sin la prop "help" (la ayuda es obligatoria en todos los campos)', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Si alguien quita `help`, TypeScript lo marca como error (lo comprueba `npm run build`).
    // @ts-expect-error -- falta la prop obligatoria "help"
    mount(FormField, { props: { label: 'RUC' } })

    // Y en tiempo de ejecución Vue avisa que falta la prop obligatoria.
    const mensajes = aviso.mock.calls.map((c) => String(c[0]))
    expect(mensajes.some((m) => m.includes('Missing required prop: "help"'))).toBe(true)
  })

  it('muestra la etiqueta, el asterisco y el botón "?" conectado al texto de ayuda', async () => {
    const w = montar({ label: 'RUC', help: 'Registro Único de Contribuyentes de 11 dígitos.', required: true })

    const label = w.get('label')
    const input = w.get('input')
    expect(label.text()).toContain('RUC')
    expect(label.text()).toContain('*')
    expect(label.attributes('for')).toBe(input.attributes('id'))

    // La ayuda existe en el DOM (para lectores de pantalla) pero empieza oculta.
    const boton = w.get('button[aria-label="Ayuda: RUC"]')
    const idAyuda = boton.attributes('aria-describedby')!
    const ayuda = w.get(`#${idAyuda}`)
    expect(ayuda.text()).toContain('11 dígitos')
    expect(ayuda.isVisible()).toBe(false)
    expect(input.attributes('aria-describedby')).toContain(idAyuda)

    // Se abre con el foco del teclado y con un clic/toque.
    await boton.trigger('focus')
    expect(ayuda.isVisible()).toBe(true)
    await boton.trigger('blur')
    expect(ayuda.isVisible()).toBe(false)
    await boton.trigger('click')
    expect(ayuda.isVisible()).toBe(true)
    expect(boton.attributes('aria-expanded')).toBe('true')
  })

  it('muestra el error y lo enlaza al control', () => {
    const w = montar({ label: 'DNI', help: 'DNI de 8 dígitos.', error: 'El DNI debe tener 8 dígitos' })
    const error = w.get('[role="alert"]')
    expect(error.text()).toBe('El DNI debe tener 8 dígitos')
    expect(w.get('input').attributes('aria-describedby')).toContain(error.attributes('id'))
  })
})
