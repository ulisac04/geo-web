import { describe, expect, it } from 'vitest'
import type { Driver, OrderDraft } from '../types'
import {
  DEFAULT_DRIVER_TEMPLATE,
  buildClientMessage,
  buildDispatchMessage,
  buildDriverInviteMessage,
  clientTrackingUrl,
  renderTemplate,
  resolveWhatsAppTemplate,
} from './whatsapp'

const order: OrderDraft = {
  origin: 'Altamira',
  destination: 'Chacao',
  originCoords: null,
  destCoords: null,
  originHint: '',
  destHint: '',
  originExact: 'Torre A',
  destExact: '',
  clientName: 'María González',
  clientPhone: '04125550189',
  paymentMethod: 'Efectivo',
  amount: '15',
  notes: 'Llamar al llegar',
  serviceTypeId: '',
}

const driver: Driver = {
  id: 'd1',
  name: 'Juan Pérez',
  phone: '584145550123',
  vehicleType: 'motorcycle',
  vehicle: 'Yamaha NMAX',
  licensePlate: 'AB123CD',
  driverPhoto: '',
  vehiclePhoto: '',
  fichaPhoto: '',
  status: 'available',
  coords: [0, 0],
  battery: 100,
  distanceM: 0,
  etaMin: 0,
  notes: '',
  cityId: 'caracas',
}

describe('renderTemplate', () => {
  it('deja tokens desconocidos y omite la línea si un token conocido está vacío', () => {
    const text = renderTemplate('Hola {cliente}\nMonto: {monto}\nX {desconocido}', {
      cliente: 'Ana',
      monto: '',
    })
    expect(text).toBe('Hola Ana\nX {desconocido}')
  })

  it('colapsa líneas en blanco consecutivas', () => {
    const text = renderTemplate('A\n\n\nB', {})
    expect(text).toBe('A\n\nB')
  })
})

describe('resolveWhatsAppTemplate', () => {
  it('usa el default si la plantilla está vacía o es solo espacios', () => {
    expect(resolveWhatsAppTemplate('', DEFAULT_DRIVER_TEMPLATE)).toBe(DEFAULT_DRIVER_TEMPLATE)
    expect(resolveWhatsAppTemplate('  \n', DEFAULT_DRIVER_TEMPLATE)).toBe(DEFAULT_DRIVER_TEMPLATE)
    expect(resolveWhatsAppTemplate('Hola {conductor}', DEFAULT_DRIVER_TEMPLATE)).toBe(
      'Hola {conductor}',
    )
  })
})

describe('buildDispatchMessage', () => {
  it('usa el default actual cuando no hay plantilla guardada', () => {
    const message = buildDispatchMessage(order, driver)
    expect(message).toContain('Hola Juan Pérez, tienes un servicio asignado:')
    expect(message).toContain('📍 Recogida: Torre A')
    expect(message).not.toContain('Altamira')
    expect(message).not.toContain('Chacao')
    expect(message).not.toContain('ref. mapa')
    expect(message).toContain('👤 Cliente: María González')
    expect(message).toContain('📝 Llamar al llegar')
    expect(message).toContain('Tu Ruta · Despacho')
  })

  it('omite monto y notas vacíos', () => {
    const message = buildDispatchMessage({ ...order, amount: '', notes: '' }, driver, undefined, '')
    expect(message).not.toContain('💵')
    expect(message).not.toContain('📝')
  })

  it('aplica una plantilla personalizada', () => {
    const message = buildDispatchMessage(order, driver, undefined, 'Servicio para {cliente}')
    expect(message).toBe('Servicio para María González')
  })
})

describe('buildClientMessage', () => {
  it('incluye vehículo y placa en el default', () => {
    const message = buildClientMessage(order, driver)
    expect(message).toContain('Hola María González, tu servicio fue asignado.')
    expect(message).toContain('📍 Recogida: Torre A')
    expect(message).not.toContain('Altamira')
    expect(message).toContain('🚗 Conductor: Juan Pérez')
    expect(message).toContain('Moto · Yamaha NMAX · AB123CD')
    expect(message).toContain('Tu Ruta')
  })

  it('omite el link de seguimiento si no hay token', () => {
    const message = buildClientMessage(order, driver)
    expect(message).not.toContain('Seguí al conductor')
  })

  it('incluye el link de seguimiento cuando hay token', () => {
    const link = clientTrackingUrl('abc-123', 'https://norte.localhost')
    const message = buildClientMessage(order, driver, undefined, link)
    expect(link).toBe('https://norte.localhost/s/abc-123')
    expect(message).toContain('Seguí al conductor: https://norte.localhost/s/abc-123')
  })
})

describe('buildDriverInviteMessage', () => {
  it('incluye nombre y código para pegar en la app', () => {
    const message = buildDriverInviteMessage('Juan Pérez', 'GEO-7K2M-9QWX')
    expect(message).toContain('Juan Pérez')
    expect(message).toContain('GEO-7K2M-9QWX')
    expect(message).toContain('pega este código')
  })
})
