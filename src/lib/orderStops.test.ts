import { describe, expect, it } from 'vitest'
import { formatStopLabel, isPlusCode, withoutPlusCodes } from './orderStops'

describe('códigos de mapa', () => {
  it('reconoce un plus code y deja una calle', () => {
    expect(isPlusCode('QQ8C+C44')).toBe(true)
    expect(isPlusCode('QQ57+4FC')).toBe(true)
    expect(isPlusCode('Calle 5')).toBe(false)
  })

  it('al guardar el servicio no mezcla el código con el punto', () => {
    expect(formatStopLabel('QQ8C+C44', 'Torre A')).toBe('Torre A')
    expect(formatStopLabel('Barrio Obrero', 'Torre A')).toBe('Barrio Obrero · Torre A')
  })

  it('limpia un texto que ya venía con el código', () => {
    expect(withoutPlusCodes('QQ8C+C44 · a')).toBe('a')
    expect(withoutPlusCodes('QQ57+4FC : b')).toBe('b')
    expect(withoutPlusCodes('QQ8C+C44')).toBe('')
  })
})
