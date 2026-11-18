import { describe, expect, it } from 'vitest'
import { compararDecimales, esDecimalPositivo, limpiarDecimal, soloDigitos } from './decimalInput'

describe('esDecimalPositivo y compararDecimales', () => {
  it('reconoce montos positivos con hasta N decimales', () => {
    expect(esDecimalPositivo('4.20', 2)).toBe(true)
    expect(esDecimalPositivo('4.', 2)).toBe(true)
    expect(esDecimalPositivo('0', 2)).toBe(false)
    expect(esDecimalPositivo('0.00', 2)).toBe(false)
    expect(esDecimalPositivo('4.201', 2)).toBe(false)
    expect(esDecimalPositivo('', 2)).toBe(false)
  })
  it('compara sin float (0.1 + 0.2 no importa aquí)', () => {
    expect(compararDecimales('4.60', '4.20')).toBe(1)
    expect(compararDecimales('4.2', '4.20')).toBe(0)
    expect(compararDecimales('9.99', '10')).toBe(-1)
  })
})

describe('limpiarDecimal', () => {
  it('respeta el máximo de decimales', () => {
    expect(limpiarDecimal('12.345', 2)).toBe('12.34')
    expect(limpiarDecimal('3.123456789', 7)).toBe('3.1234567')
  })
  it('deja escribir un punto final mientras se tipea', () => {
    expect(limpiarDecimal('12.', 2)).toBe('12.')
  })
  it('acepta coma como separador decimal', () => {
    expect(limpiarDecimal('12,5', 2)).toBe('12.5')
  })
  it('quita letras, símbolos y puntos repetidos', () => {
    expect(limpiarDecimal('S/ 1a2.3.4', 2)).toBe('12.34')
  })
  it('ceros a la izquierda', () => {
    expect(limpiarDecimal('007', 2)).toBe('7')
    expect(limpiarDecimal('0.50', 2)).toBe('0.50')
    expect(limpiarDecimal('.5', 2)).toBe('0.5')
  })
  it('sin decimales permitidos descarta la parte decimal', () => {
    expect(limpiarDecimal('12.9', 0)).toBe('12')
  })
})

describe('soloDigitos', () => {
  it('deja solo números con largo máximo', () => {
    expect(soloDigitos('0876-5432x9', 8)).toBe('08765432')
  })
})
