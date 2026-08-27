import type { Driver, VehicleType } from '../types'
import { fromLatLng, toLatLng } from './mapsConfig'

export const ORDER_PIN_ORIGIN = '#198754'
export const ORDER_PIN_DEST = '#ef4444'

export const DRIVER_PIN_SIZE_MIN = 14
export const DRIVER_PIN_SIZE_MAX = 38
export const DRIVER_PIN_SIZE_STEP = 4
export const DRIVER_PIN_SIZE_DEFAULT = 22
const DRIVER_PIN_SIZE_KEY = 'geo.driverPinSize'

export function readStoredDriverPinSize(): number {
  try {
    const n = Number(localStorage.getItem(DRIVER_PIN_SIZE_KEY))
    if (!Number.isFinite(n)) return DRIVER_PIN_SIZE_DEFAULT
    const snapped =
      DRIVER_PIN_SIZE_MIN +
      Math.round((n - DRIVER_PIN_SIZE_MIN) / DRIVER_PIN_SIZE_STEP) * DRIVER_PIN_SIZE_STEP
    return Math.min(DRIVER_PIN_SIZE_MAX, Math.max(DRIVER_PIN_SIZE_MIN, snapped))
  } catch {
    return DRIVER_PIN_SIZE_DEFAULT
  }
}

export function storeDriverPinSize(size: number) {
  try {
    localStorage.setItem(DRIVER_PIN_SIZE_KEY, String(size))
  } catch {
    /* quota / private mode */
  }
}

export type MapPinMarker = google.maps.OverlayView & {
  position: google.maps.LatLng | google.maps.LatLngLiteral | null
  content: HTMLElement
  addEventListener: (type: string, listener: EventListener, options?: AddEventListenerOptions) => void
  getPosition: () => google.maps.LatLng
}

export function removeMarker(marker: MapPinMarker | null) {
  marker?.setMap(null)
}

export function setMarkerLngLat(marker: MapPinMarker, coords: [number, number]) {
  marker.position = toLatLng(coords)
}

export function markerLngLat(marker: MapPinMarker): [number, number] | null {
  return fromLatLng(marker.position)
}

export function togglePinActive(marker: MapPinMarker, active: boolean) {
  const el = marker.content
  if (el instanceof HTMLElement) el.classList.toggle('is-active', active)
}

export function createOrderPinElement(color: string, draggable: boolean): HTMLDivElement {
  const el = document.createElement('div')
  el.className = `order-pin${draggable ? '' : ' is-static'}`
  el.innerHTML = `<svg viewBox="0 0 24 32" width="28" height="36"><path d="M12 0C6.5 0 2 4.4 2 9.8c0 7.2 10 22.2 10 22.2s10-15 10-22.2C22 4.4 17.5 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.4"/><circle cx="12" cy="10" r="3.4" fill="var(--pin-hole)"/></svg>`
  el.addEventListener('click', (event) => event.stopPropagation())
  return el
}

export function createDriverPinElement(
  driver: Driver,
  {
    hovered = false,
    focused = false,
    size = DRIVER_PIN_SIZE_DEFAULT,
  }: { hovered?: boolean; focused?: boolean; size?: number } = {},
): HTMLDivElement {
  const pin = document.createElement('div')
  const accent = focused ? ' focused' : hovered ? ' highlighted' : ''
  pin.className = `driver-pin ${driver.status}${accent}`
  pin.style.setProperty('--driver-pin-size', `${size}px`)

  const label = document.createElement('div')
  label.className = 'driver-marker-label'
  const name = document.createElement('strong')
  name.textContent = driver.name
  label.append(name)
  if (driver.licensePlate) {
    const plate = document.createElement('span')
    plate.textContent = driver.licensePlate
    label.append(plate)
  }

  const face = document.createElement('div')
  face.className = 'driver-marker'
  if (driver.driverPhoto) {
    const img = document.createElement('img')
    img.src = driver.driverPhoto
    img.alt = driver.name
    face.append(img)
  } else {
    face.append(createVehicleIconElement(driver.vehicleType))
  }

  pin.append(label, face)
  return pin
}

export function createDriverPopup(
  driver: Driver,
  onTakeOffline: () => void,
  onClose: () => void,
): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'driver-popup'

  const head = document.createElement('div')
  head.className = 'driver-popup-head'

  const title = document.createElement('div')
  title.className = 'driver-popup-title'

  const name = document.createElement('strong')
  name.textContent = driver.name
  title.append(name)

  const meta = document.createElement('span')
  meta.className = 'popup-muted'
  const statusLabel =
    driver.status === 'busy'
      ? 'En un servicio'
      : driver.status === 'offline'
        ? 'Fuera de servicio'
        : 'Disponible'
  meta.textContent = driver.licensePlate ? `${driver.licensePlate} · ${statusLabel}` : statusLabel
  title.append(meta)

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'driver-popup-close'
  close.setAttribute('aria-label', 'Cerrar')
  close.innerHTML =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
  close.addEventListener('click', (event) => {
    event.stopPropagation()
    onClose()
  })

  head.append(title, close)
  wrap.append(head)

  if (driver.status !== 'offline') {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'driver-popup-offline'
    button.innerHTML =
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v10"/><path d="M8.5 4.6a8 8 0 1 0 7 0"/></svg>'
    const action = document.createElement('span')
    action.textContent = 'Sacar de servicio'
    button.append(action)
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      onTakeOffline()
    })
    wrap.append(button)
  }

  return wrap
}

export function createAdvancedMarker({
  map,
  coords,
  content,
  title,
  draggable = false,
  zIndex,
}: {
  map: google.maps.Map
  coords: [number, number]
  content: HTMLElement
  title?: string
  draggable?: boolean
  zIndex?: number
}): MapPinMarker {
  return new (getHtmlMapMarkerClass())({
    map,
    coords,
    content,
    title,
    draggable,
    zIndex,
  })
}

type HtmlMapMarkerOptions = {
  map: google.maps.Map
  coords: [number, number]
  content: HTMLElement
  title?: string
  draggable?: boolean
  zIndex?: number
}

type HtmlMapMarkerCtor = new (options: HtmlMapMarkerOptions) => MapPinMarker

let HtmlMapMarkerClass: HtmlMapMarkerCtor | null = null

function getHtmlMapMarkerClass(): HtmlMapMarkerCtor {
  if (HtmlMapMarkerClass) return HtmlMapMarkerClass

  class HtmlMapMarker extends google.maps.OverlayView {
    private latLng: google.maps.LatLng
    private node: HTMLElement
    private draggable: boolean
    private zIndexValue: number
    private dragging = false
    private moved = false
    private savedGestures: string | null = null
    private contentListeners: Array<[string, EventListener]> = []

    constructor(options: HtmlMapMarkerOptions) {
      super()
      this.latLng = new google.maps.LatLng(toLatLng(options.coords))
      this.node = options.content
      this.draggable = options.draggable ?? false
      this.zIndexValue = options.zIndex ?? 0
      this.styleNode()
      if (options.title) this.node.title = options.title
      this.bindNode()
      this.setMap(options.map)
    }

    get content(): HTMLElement {
      return this.node
    }

    set content(node: HTMLElement) {
      if (node === this.node) return
      const parent = this.node.parentNode
      const prev = this.node
      this.unbindNode()
      this.node = node
      this.styleNode()
      this.bindNode()
      parent?.replaceChild(this.node, prev)
    }

  get position(): google.maps.LatLng {
    return this.latLng
  }

  set position(value: google.maps.LatLng | google.maps.LatLngLiteral | null) {
    if (!value) return
    this.latLng = value instanceof google.maps.LatLng ? value : new google.maps.LatLng(value)
    this.draw()
  }

  getPosition(): google.maps.LatLng {
    return this.latLng
  }

  addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions) {
    this.node.addEventListener(type, listener, options)
  }

  onAdd() {
    this.getPanes()?.overlayMouseTarget.appendChild(this.node)
  }

  draw() {
    const projection = this.getProjection()
    if (!projection) return
    const point = projection.fromLatLngToDivPixel(this.latLng)
    if (!point) return
    this.node.style.left = `${point.x}px`
    this.node.style.top = `${point.y}px`
    this.node.style.zIndex = String(this.zIndexValue)
  }

  onRemove() {
    this.unbindNode()
    this.node.remove()
  }

  private styleNode() {
    this.node.style.position = 'absolute'
    this.node.style.transform = 'translate(-50%, -100%)'
    this.node.style.cursor = this.draggable ? 'grab' : 'pointer'
    this.node.style.pointerEvents = 'auto'
  }

  private bindNode() {
    const onClick = (event: Event) => {
      event.stopPropagation()
      if (this.moved) return
      google.maps.event.trigger(this, 'click')
    }
    const onPointerDown = (event: Event) => {
      if (!this.draggable || !(event instanceof PointerEvent) || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      this.dragging = true
      this.moved = false
      this.node.style.cursor = 'grabbing'
      this.node.setPointerCapture(event.pointerId)
      const map = this.getMap() as google.maps.Map | null
      if (map) {
        this.savedGestures = map.get('gestureHandling') as string
        map.setOptions({ gestureHandling: 'none' })
      }
      google.maps.event.trigger(this, 'dragstart')
    }
    const onPointerMove = (event: Event) => {
      if (!this.dragging || !(event instanceof PointerEvent)) return
      const projection = this.getProjection()
      const map = this.getMap() as google.maps.Map | null
      if (!projection || !map) return
      this.moved = true
      const rect = map.getDiv().getBoundingClientRect()
      const latLng = projection.fromContainerPixelToLatLng(
        new google.maps.Point(event.clientX - rect.left, event.clientY - rect.top),
      )
      if (latLng) this.position = latLng
      google.maps.event.trigger(this, 'drag')
    }
    const onPointerUp = (event: Event) => {
      if (!this.dragging) return
      this.dragging = false
      this.node.style.cursor = 'grab'
      if (event instanceof PointerEvent) {
        try {
          this.node.releasePointerCapture(event.pointerId)
        } catch {
          /* already released */
        }
      }
      const map = this.getMap() as google.maps.Map | null
      if (map) map.setOptions({ gestureHandling: this.savedGestures ?? 'greedy' })
      google.maps.event.trigger(this, 'dragend')
      window.setTimeout(() => {
        this.moved = false
      }, 0)
    }
    const listeners: Array<[string, EventListener]> = [
      ['click', onClick],
      ['pointerdown', onPointerDown],
      ['pointermove', onPointerMove],
      ['pointerup', onPointerUp],
      ['pointercancel', onPointerUp],
    ]
    for (const [type, listener] of listeners) {
      this.node.addEventListener(type, listener)
      this.contentListeners.push([type, listener])
    }
  }

  private unbindNode() {
    for (const [type, listener] of this.contentListeners) {
      this.node.removeEventListener(type, listener)
    }
    this.contentListeners = []
  }
  }

  HtmlMapMarkerClass = HtmlMapMarker as unknown as HtmlMapMarkerCtor
  return HtmlMapMarkerClass
}

function createVehicleIconElement(vehicleType: VehicleType): HTMLSpanElement {
  const icon = document.createElement('span')
  icon.className = 'driver-marker-icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.innerHTML =
    vehicleType === 'motorcycle'
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h3"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`
  return icon
}
