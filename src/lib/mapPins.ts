import type { Driver } from '../types'
import { fromLatLng, toLatLng } from './mapsConfig'

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
  el.style.transform = 'translate(-50%, -100%)'
  el.innerHTML = `<svg viewBox="0 0 24 32" width="28" height="36"><path d="M12 0C6.5 0 2 4.4 2 9.8c0 7.2 10 22.2 10 22.2s10-15 10-22.2C22 4.4 17.5 0 12 0z" fill="${color}"/><circle cx="12" cy="10" r="3.4" fill="var(--pin-hole)"/></svg>`
  el.addEventListener('click', (event) => event.stopPropagation())
  return el
}

export function createDriverPinElement(driver: Driver, highlighted: boolean): HTMLDivElement {
  const pin = document.createElement('div')
  pin.className = `driver-pin ${driver.status}${highlighted ? ' highlighted' : ''}`
  pin.style.transform = 'translate(-50%, -50%)'

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
    const initials = document.createElement('span')
    initials.className = 'driver-marker-initials'
    initials.textContent = driverInitials(driver.name)
    face.append(initials)
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

function driverInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
