/** Duración del lerp del pin en el tracking público (cadencia GPS activa). */
export const LIVE_DRIVER_LERP_MS = 15_000

export function lerpLngLat(
  from: [number, number],
  to: [number, number],
  t: number,
): [number, number] {
  const u = t <= 0 ? 0 : t >= 1 ? 1 : t
  return [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u]
}

export function sameLngLat(a: [number, number], b: [number, number], eps = 1e-7): boolean {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps
}
