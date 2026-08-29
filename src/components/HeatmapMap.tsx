import { useEffect, useMemo, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import type { HeatmapPoint } from '../lib/reports'
import { hasGoogleMapsKey } from '../lib/mapsConfig'
import GoogleMapFrame from './GoogleMapFrame'

type HeatStop = [offset: number, r: number, g: number, b: number, a: number]

/** Frío → caliente, sin blanco: el núcleo denso se lee rojo, no quemado. */
const ORIGIN_STOPS: HeatStop[] = [
  [0, 67, 56, 202, 0],
  [0.18, 59, 130, 246, 70],
  [0.42, 34, 211, 238, 110],
  [0.62, 250, 204, 21, 140],
  [0.82, 249, 115, 22, 175],
  [1, 220, 38, 38, 200],
]

/** Cian → violeta, para distinguirlo de orígenes. */
const DEST_STOPS: HeatStop[] = [
  [0, 8, 145, 178, 0],
  [0.2, 6, 182, 212, 70],
  [0.45, 99, 102, 241, 120],
  [0.72, 139, 92, 246, 155],
  [1, 168, 85, 247, 190],
]

const originPalette = buildPalette(ORIGIN_STOPS)
const destPalette = buildPalette(DEST_STOPS)

export default function HeatmapMap({
  center,
  points,
}: {
  center: [number, number]
  points: HeatmapPoint[]
}) {
  if (!hasGoogleMapsKey()) {
    return <GoogleMapFrame id="reports-heatmap" center={center} className="h-full min-h-[240px] w-full" />
  }

  return (
    <GoogleMapFrame id="reports-heatmap" center={center} className="h-full min-h-[240px] w-full">
      <HeatmapController center={center} points={points} />
    </GoogleMapFrame>
  )
}

function HeatmapController({
  center,
  points,
}: {
  center: [number, number]
  points: HeatmapPoint[]
}) {
  const map = useMap('reports-heatmap')
  const fitKeyRef = useRef('')
  const originPoints = useMemo(
    () => points.filter((point) => point.kind === 'origin'),
    [points],
  )
  const destPoints = useMemo(
    () => points.filter((point) => point.kind === 'destination'),
    [points],
  )

  useEffect(() => {
    if (!map) return
    const overlay = createHeatOverlay(originPoints, destPoints)
    overlay.setMap(map)
    return () => overlay.setMap(null)
  }, [destPoints, map, originPoints])

  useEffect(() => {
    if (!map) return
    if (points.length === 0) {
      map.setCenter({ lat: center[1], lng: center[0] })
      map.setZoom(13.2)
      fitKeyRef.current = ''
      return
    }
    const key = `${points.length}:${points[0].lat}:${points[0].lng}:${points[points.length - 1].lat}`
    if (fitKeyRef.current === key) return
    fitKeyRef.current = key
    const bounds = new google.maps.LatLngBounds()
    for (const point of points) {
      bounds.extend({ lat: point.lat, lng: point.lng })
    }
    map.fitBounds(bounds, 48)
  }, [center, map, points])

  return null
}

function createHeatOverlay(
  originPoints: HeatmapPoint[],
  destPoints: HeatmapPoint[],
): google.maps.OverlayView {
  class HeatCanvasOverlay extends google.maps.OverlayView {
    private div: HTMLDivElement | null = null
    private canvas: HTMLCanvasElement | null = null
    private work: HTMLCanvasElement | null = null

    onAdd() {
      const div = document.createElement('div')
      div.style.position = 'absolute'
      div.style.pointerEvents = 'none'
      const canvas = document.createElement('canvas')
      div.appendChild(canvas)
      this.div = div
      this.canvas = canvas
      this.work = document.createElement('canvas')
      this.getPanes()?.overlayLayer.appendChild(div)
    }

    draw() {
      const projection = this.getProjection()
      const map = this.getMap()
      const div = this.div
      const canvas = this.canvas
      const work = this.work
      if (!projection || !map || !div || !canvas || !work) return
      if (!('getBounds' in map)) return
      const bounds = map.getBounds()
      if (!bounds) return
      const sw = projection.fromLatLngToDivPixel(bounds.getSouthWest())
      const ne = projection.fromLatLngToDivPixel(bounds.getNorthEast())
      if (!sw || !ne) return
      const width = Math.max(1, ne.x - sw.x)
      const height = Math.max(1, sw.y - ne.y)
      div.style.left = `${sw.x}px`
      div.style.top = `${ne.y}px`
      div.style.width = `${width}px`
      div.style.height = `${height}px`
      const dpr = window.devicePixelRatio || 1
      const bufW = Math.round(width * dpr)
      const bufH = Math.round(height * dpr)
      canvas.width = bufW
      canvas.height = bufH
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      work.width = bufW
      work.height = bufH
      const ctx = canvas.getContext('2d')
      const workCtx = work.getContext('2d', { willReadFrequently: true })
      if (!ctx || !workCtx) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, bufW, bufH)
      const zoom = map.getZoom() ?? 13
      const radius = radiusPx(zoom)
      paintLayer(workCtx, ctx, projection, sw, ne, dpr, destPoints, destPalette, radius)
      paintLayer(workCtx, ctx, projection, sw, ne, dpr, originPoints, originPalette, radius)

    }

    onRemove() {
      this.div?.remove()
      this.div = null
      this.canvas = null
      this.work = null
    }
  }

  return new HeatCanvasOverlay()
}

function paintLayer(
  workCtx: CanvasRenderingContext2D,
  outCtx: CanvasRenderingContext2D,
  projection: google.maps.MapCanvasProjection,
  sw: google.maps.Point,
  ne: google.maps.Point,
  dpr: number,
  points: HeatmapPoint[],
  palette: Uint8ClampedArray,
  radiusCss: number,
) {
  if (points.length === 0) return
  const bufW = workCtx.canvas.width
  const bufH = workCtx.canvas.height
  workCtx.setTransform(1, 0, 0, 1, 0, 0)
  workCtx.clearRect(0, 0, bufW, bufH)
  workCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  workCtx.globalCompositeOperation = 'lighter'
  const radius = radiusCss
  for (const point of points) {
    const pixel = projection.fromLatLngToDivPixel(new google.maps.LatLng(point.lat, point.lng))
    if (!pixel) continue
    const x = pixel.x - sw.x
    const y = pixel.y - ne.y
    const gradient = workCtx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, 'rgba(0,0,0,0.16)')
    gradient.addColorStop(0.4, 'rgba(0,0,0,0.06)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    workCtx.fillStyle = gradient
    workCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  }
  workCtx.setTransform(1, 0, 0, 1, 0, 0)
  workCtx.globalCompositeOperation = 'source-over'
  colorize(workCtx, palette, intensityCap(points.length))
  outCtx.drawImage(workCtx.canvas, 0, 0)
}

function intensityCap(count: number): number {
  return 200 + Math.min(200, Math.sqrt(count) * 7)
}

function colorize(ctx: CanvasRenderingContext2D, palette: Uint8ClampedArray, cap: number) {
  const { width, height } = ctx.canvas
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  const scale = 255 / cap
  for (let i = 0; i < data.length; i += 4) {
    const raw = data[i + 3]
    if (raw === 0) {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      continue
    }
    const t = Math.min(255, Math.round(raw * scale))
    const p = t * 4
    data[i] = palette[p]
    data[i + 1] = palette[p + 1]
    data[i + 2] = palette[p + 2]
    data[i + 3] = palette[p + 3]
  }
  ctx.putImageData(image, 0, 0)
}

function buildPalette(stops: HeatStop[]): Uint8ClampedArray {
  const palette = new Uint8ClampedArray(256 * 4)
  let cursor = 0
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    while (cursor < stops.length - 2 && t > stops[cursor + 1][0]) cursor += 1
    const a = stops[cursor]
    const b = stops[cursor + 1]
    const span = b[0] - a[0] || 1
    const u = Math.min(1, Math.max(0, (t - a[0]) / span))
    const o = i * 4
    palette[o] = Math.round(a[1] + (b[1] - a[1]) * u)
    palette[o + 1] = Math.round(a[2] + (b[2] - a[2]) * u)
    palette[o + 2] = Math.round(a[3] + (b[3] - a[3]) * u)
    palette[o + 3] = Math.round(a[4] + (b[4] - a[4]) * u)
  }
  return palette
}

function radiusPx(zoom: number): number {
  return Math.round(Math.max(10, Math.min(28, 10 + (zoom - 11) * 3)))
}
