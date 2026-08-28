import { describe, expect, it } from 'vitest'
import {
  convertFromUsd,
  formatClientAmount,
  formatDispatchAmount,
  formatMoney,
  localAmountsFromUsd,
} from './money'

const rates = { usdToCop: 4000, usdToVes: 300.0333333 }

describe('convertFromUsd', () => {
  it('convierte con dos decimales', () => {
    expect(convertFromUsd('10', rates.usdToVes)).toBe(formatMoney(10 * rates.usdToVes))
    expect(convertFromUsd('10', rates.usdToCop)).toBe(formatMoney(40000))
  })
})

describe('localAmountsFromUsd', () => {
  it('recalcula COP y VES al cambiar el USD', () => {
    const first = localAmountsFromUsd('10', rates)
    const rounded = { ...first, amountVes: '3.000' }
    expect(rounded.amountVes).toBe('3.000')
    expect(localAmountsFromUsd('11', rates).amountVes).toBe(formatMoney(11 * rates.usdToVes))
    expect(localAmountsFromUsd('11', rates).amountCop).not.toBe(rounded.amountCop)
  })
})

describe('formatDispatchAmount', () => {
  it('respeta el VES redondeado sin cambiar el USD', () => {
    const text = formatDispatchAmount({
      amount: '10',
      amountCop: formatMoney(40000),
      amountVes: '3.000',
    })
    expect(text).toContain('💵 USD 10,00')
    expect(text).toContain('🇻🇪 VES 3.000')
    expect(text).not.toContain(formatMoney(10 * rates.usdToVes))
  })
})

describe('formatClientAmount', () => {
  it('usa solo la moneda de cobro', () => {
    const draft = {
      amount: '10',
      amountCop: '40.000',
      amountVes: '3.000',
      chargeCurrency: 'VES' as const,
    }
    expect(formatClientAmount(draft)).toBe('🇻🇪 VES 3.000')
    expect(formatClientAmount({ ...draft, chargeCurrency: 'COP' })).toBe('🇨🇴 COP 40.000')
    expect(formatClientAmount({ ...draft, chargeCurrency: 'USD' })).toBe('💵 USD 10,00')
  })
})
