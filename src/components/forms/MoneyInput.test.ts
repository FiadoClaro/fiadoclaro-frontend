import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MoneyInput from './MoneyInput.vue'
import RateInput from './RateInput.vue'

/** Escribe en el input y devuelve lo que quedó en pantalla y lo que se emitió con v-model. */
async function escribir(w: ReturnType<typeof mount>, texto: string) {
  const input = w.get('input')
  await input.setValue(texto)
  const emitidos = w.emitted('update:modelValue') ?? []
  return { enPantalla: (input.element as HTMLInputElement).value, emitido: emitidos.at(-1)?.[0] }
}

describe('MoneyInput', () => {
  it('no acepta más de 2 decimales', async () => {
    const w = mount(MoneyInput, { props: { modelValue: '' } })
    const r = await escribir(w, '800.125')
    expect(r.emitido).toBe('800.12')
    expect(r.enPantalla).toBe('800.12')
  })

  it('el valor se mantiene como texto (no se convierte a number)', async () => {
    const w = mount(MoneyInput, { props: { modelValue: '' } })
    const r = await escribir(w, '1234.50')
    expect(r.emitido).toBe('1234.50')
    expect(typeof r.emitido).toBe('string')
  })

  it('ignora letras y acepta coma decimal', async () => {
    const w = mount(MoneyInput, { props: { modelValue: '' } })
    expect((await escribir(w, 'S/ 12,5x')).emitido).toBe('12.5')
  })

  it('muestra el prefijo de la moneda', () => {
    expect(mount(MoneyInput, { props: { modelValue: '', moneda: 'PEN' } }).text()).toContain('S/')
    expect(mount(MoneyInput, { props: { modelValue: '', moneda: 'USD' } }).text()).toContain('US$')
  })
})

describe('RateInput', () => {
  it('acepta hasta 7 decimales y muestra el %', async () => {
    const w = mount(RateInput, { props: { modelValue: '', periodo: 'mensual' } })
    expect((await escribir(w, '3.123456789')).emitido).toBe('3.1234567')
    expect(w.text()).toContain('% mensual')
  })
})
