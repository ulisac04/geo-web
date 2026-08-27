import { useEffect, useMemo, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import type { HeatmapPoint } from '../lib/reports'
import { hasGoogleMapsKey } from '../lib/mapsConfig'
import GoogleMapFrame from './GoogleMapFrame'

const ORIGIN_CORE = 'rgba(52, 211, 153, 0.55)'
const ORIGIN_EDGE = 'rgba(52, 211, 153, 0)'
const DEST_CORE = 'rgba(251, 191, 36, 0.55)'
const DEST_EDGE = 'rgba(251, 191, 36, 0)'
const RADIUS_PX = 42

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

    onAdd() {
      const div = document.createElement('div')
      div.style.position = 'absolute'
      div.style.pointerEvents = 'none'
      const canvas = document.createElement('canvas')
      div.appendChild(canvas)
      this.div = div
      this.canvas = canvas
      this.getPanes()?.overlayLayer.appendChild(div)
    }

    draw() {
      const projection = this.getProjection()
      const map = this.getMap()
      const div = this.div
      const canvas = this.canvas
      if (!projection || !map || !div || !canvas) return
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
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'
      paintPoints(ctx, projection, sw, ne, destPoints, DEST_CORE, DEST_EDGE)
      paintPoints(ctx, projection, sw, ne, originPoints, ORIGIN_CORE, ORIGIN_EDGE)
    }

    onRemove() {
      this.div?.remove()
      this.div = null
      this.canvas = null
    }
  }

  return new HeatCanvasOverlay()
}

function paintPoints(
  ctx: CanvasRenderingContext2D,
  projection: google.maps.MapCanvasProjection,
  sw: google.maps.Point,
  ne: google.maps.Point,
  points: HeatmapPoint[],
  core: string,
  edge: string,
) {
  for (const point of points) {
    const pixel = projection.fromLatLngToDivPixel(new google.maps.LatLng(point.lat, point.lng))
    if (!pixel) continue
    const x = pixel.x - sw.x
    const y = pixel.y - ne.y
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, RADIUS_PX)
    gradient.addColorStop(0, core)
    gradient.addColorStop(1, edge)
    ctx.fillStyle = gradient
    ctx.fillRect(x - RADIUS_PX, y - RADIUS_PX, RADIUS_PX * 2, RADIUS_PX * 2)
  }
}
