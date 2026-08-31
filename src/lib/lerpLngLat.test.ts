import { describe, expect, it } from 'vitest'
import { lerpLngLat, sameLngLat } from './lerpLngLat'

describe('lerpLngLat', () => {
  it('interpola de forma lineal', () => {
    expect(lerpLngLat([-66, 10], [-65, 11], 0)).toEqual([-66, 10])
    expect(lerpLngLat([-66, 10], [-65, 11], 1)).toEqual([-65, 11])
    expect(lerpLngLat([-66, 10], [-64, 12], 0.5)).toEqual([-65, 11])
  })

  it('recorta t fuera de [0, 1]', () => {
    expect(lerpLngLat([0, 0], [10, 10], -1)).toEqual([0, 0])
    expect(lerpLngLat([0, 0], [10, 10], 2)).toEqual([10, 10])
  })
})

describe('sameLngLat', () => {
  it('compara con holgura', () => {
    expect(sameLngLat([1, 2], [1, 2])).toBe(true)
    expect(sameLngLat([1, 2], [1.00000001, 2])).toBe(true)
    expect(sameLngLat([1, 2], [1.01, 2])).toBe(false)
  })
})
