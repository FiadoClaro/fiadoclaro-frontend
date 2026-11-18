import { describe, expect, it } from 'vitest'
import { recargoPorcentaje } from './recargo'

describe('recargoPorcentaje (solo informativo)', () => {
  it('calcula el recargo del Figma: 4.20 → 4.60 = +9.5 %', () => {
    expect(recargoPorcentaje('4.20', '4.60')).toBe('9.5')
  })
  it('redondea a 1 decimal (half up)', () => {
    expect(recargoPorcentaje('22.00', '24.50')).toBe('11.4') // 11.3636...
    expect(recargoPorcentaje('9.80', '10.50')).toBe('7.1') // 7.142...
  })
  it('sin recargo', () => {
    expect(recargoPorcentaje('5', '5')).toBe('0.0')
  })
  it('sin datos válidos no muestra nada', () => {
    expect(recargoPorcentaje('', '4.60')).toBeNull()
    expect(recargoPorcentaje('0', '4.60')).toBeNull()
    expect(recargoPorcentaje('abc', '4.60')).toBeNull()
  })
})
