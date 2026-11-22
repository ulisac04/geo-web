import { describe, expect, it } from 'vitest'
import { readablePlaceLabel } from './geocode'

describe('readablePlaceLabel', () => {
  it('no usa el plus code como nombre del lugar', () => {
    expect(
      readablePlaceLabel('QQ8C+C44, Barrio Obrero, San Cristóbal, Táchira, Venezuela'),
    ).toBe('Barrio Obrero')
  })

  it('prefiere la calle cuando el geocoder la trae', () => {
    expect(
      readablePlaceLabel('QQ8C+C44, Calle 5, San Cristóbal', [
        { long_name: 'QQ8C+C44', types: ['plus_code'] },
        { long_name: 'Calle 5', types: ['route'] },
        { long_name: '12', types: ['street_number'] },
      ]),
    ).toBe('Calle 5 12')
  })
})
