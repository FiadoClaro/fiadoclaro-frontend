import { describe, expect, it } from 'vitest'
import {
  SIN_VALOR,
  formatDate,
  formatDateTime,
  formatMoney,
  formatRate,
  formatTime,
  redondearTexto,
} from './format'

describe('redondearTexto (half up, sin float)', () => {
  it('redondea hacia arriba desde 5', () => {
    expect(redondearTexto('108.445', 2)).toBe('108.45')
    expect(redondearTexto('108.444', 2)).toBe('108.44')
    expect(redondearTexto('0.005', 2)).toBe('0.01')
  })
  it('lleva el acarreo a la parte entera', () => {
    expect(redondearTexto('999.995', 2)).toBe('1000.00')
  })
  it('completa con ceros', () => {
    expect(redondearTexto('7', 2)).toBe('7.00')
    expect(redondearTexto('.5', 2)).toBe('0.50')
  })
  it('redondea negativos alejándose del cero, como el backend', () => {
    expect(redondearTexto('-2.345', 2)).toBe('-2.35')
    expect(redondearTexto('-0.001', 2)).toBe('0.00')
  })
  it('no pierde precisión con montos grandes (donde un float fallaría)', () => {
    expect(redondearTexto('12345678901234567.895', 2)).toBe('12345678901234567.90')
  })
  it('rechaza texto que no es número', () => {
    expect(redondearTexto('abc', 2)).toBeNull()
    expect(redondearTexto('', 2)).toBeNull()
  })
})

describe('formatMoney', () => {
  it('soles con separador de miles y 2 decimales', () => {
    expect(formatMoney('1234.56')).toBe('S/ 1,234.56')
    expect(formatMoney('1234567.5', 'PEN')).toBe('S/ 1,234,567.50')
    expect(formatMoney('0')).toBe('S/ 0.00')
  })
  it('dólares', () => {
    expect(formatMoney('99', 'USD')).toBe('US$ 99.00')
  })
  it('negativos', () => {
    expect(formatMoney('-8.5')).toBe('-S/ 8.50')
  })
  it('redondea half up', () => {
    expect(formatMoney('108.445')).toBe('S/ 108.45')
  })
  it('sin valor', () => {
    expect(formatMoney(null)).toBe(SIN_VALOR)
    expect(formatMoney(undefined)).toBe(SIN_VALOR)
    expect(formatMoney('no')).toBe(SIN_VALOR)
  })
})

describe('formatRate', () => {
  it('2 decimales por defecto', () => {
    expect(formatRate('3.5000000')).toBe('3.50 %')
    expect(formatRate('114.68')).toBe('114.68 %')
  })
  it('más decimales cuando se piden (hasta 7)', () => {
    expect(formatRate('3.5123456', 7)).toBe('3.5123456 %')
    expect(formatRate('51.1069', 4)).toBe('51.1069 %')
  })
  it('redondea half up', () => {
    expect(formatRate('2.005')).toBe('2.01 %')
  })
  it('sin valor', () => {
    expect(formatRate(null)).toBe(SIN_VALOR)
  })
})

describe('fechas en America/Lima', () => {
  it('una fecha sola no se mueve de día', () => {
    expect(formatDate('2026-11-30')).toBe('30/11/2026')
  })
  it('una fecha-hora UTC se pasa a hora de Lima (UTC-5)', () => {
    // 03:00 UTC del 30 = 22:00 del 29 en Lima
    expect(formatDate('2026-11-30T03:00:00Z')).toBe('29/11/2026')
    expect(formatDateTime('2026-11-30T03:00:00Z')).toBe('29/11/2026 22:00')
  })
  it('respeta el desplazamiento que envía el backend', () => {
    expect(formatDateTime('2026-11-18T13:05:00-05:00')).toBe('18/11/2026 13:05')
  })
  it('hora de corte', () => {
    expect(formatTime('20:00:00')).toBe('20:00')
  })
  it('sin valor o inválida', () => {
    expect(formatDate(null)).toBe(SIN_VALOR)
    expect(formatDateTime('no es fecha')).toBe(SIN_VALOR)
    expect(formatTime(undefined)).toBe(SIN_VALOR)
  })
})
