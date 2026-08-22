import type { Driver, VehicleType } from '../types'
import { fromLatLng, toLatLng } from './mapsConfig'

export const ORDER_PIN_ORIGIN = '#198754'
export const ORDER_PIN_DEST = '#ef4444'

export function removeMarker(marker: google.maps.marker.AdvancedMarkerElement | null) {
  if (!marker) return
  marker.map = null
}

export function setMarkerLngLat(
  marker: google.maps.marker.AdvancedMarkerElement,
  coords: [number, number],
) {
  marker.position = toLatLng(coords)
}

export function markerLngLat(
  marker: google.maps.marker.AdvancedMarkerElement,
): [number, number] | null {
  return fromLatLng(marker.position)
}

export function togglePinActive(
  marker: google.maps.marker.AdvancedMarkerElement,
  active: boolean,
) {
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
  { hovered = false, focused = false }: { hovered?: boolean; focused?: boolean } = {},
): HTMLDivElement {
  const pin = document.createElement('div')
  const accent = focused ? ' focused' : hovered ? ' highlighted' : ''
  pin.className = `driver-pin ${driver.status}${accent}`

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

export function createDriverPopup(driver: Driver, onTakeOffline: () => void): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'driver-popup'

  const name = document.createElement('strong')
  name.textContent = driver.name
  wrap.append(name)

  if (driver.licensePlate) {
    const plate = document.createElement('span')
    plate.className = 'popup-muted'
    plate.textContent = driver.licensePlate
    wrap.append(plate)
  }

  const status = document.createElement('span')
  status.className = 'popup-muted'
  status.textContent =
    driver.status === 'busy'
      ? 'Ocupado'
      : driver.status === 'offline'
        ? 'Fuera de servicio'
        : 'Disponible'
  wrap.append(status)

  if (driver.status !== 'offline') {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'driver-popup-offline'
    button.textContent = 'Fuera de servicio'
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
}): google.maps.marker.AdvancedMarkerElement {
  return new google.maps.marker.AdvancedMarkerElement({
    map,
    position: toLatLng(coords),
    content,
    title,
    gmpDraggable: draggable,
    gmpClickable: true,
    zIndex,
  })
}

function createVehicleIconElement(vehicleType: VehicleType): HTMLSpanElement {
  const icon = document.createElement('span')
  icon.className = 'driver-marker-icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.innerHTML =
    vehicleType === 'motorcycle'
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h3"/></svg>`
      : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`
  return icon
}
