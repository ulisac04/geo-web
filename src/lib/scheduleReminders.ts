import type { ServiceRecord } from '../types'
import { isScheduledPending } from './services'

const NOTIFIED_KEY = 'geo_schedule_notified_v1'
export const FOCUS_SCHEDULED_EVENT = 'geo:focus-scheduled'

function readNotified(): Set<string> {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function writeNotified(ids: Set<string>): void {
  sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids]))
}

export function recordsDueForReminder(
  records: ServiceRecord[],
  reminderMinutes: number,
  now = Date.now(),
): ServiceRecord[] {
  const windowMs = Math.max(1, reminderMinutes) * 60_000
  return records.filter((record) => {
    if (!isScheduledPending(record) || !record.scheduledAt) return false
    const at = new Date(record.scheduledAt).getTime()
    if (!Number.isFinite(at)) return false
    return at - now <= windowMs
  })
}

export function takeUnnotified(records: ServiceRecord[]): ServiceRecord[] {
  const notified = readNotified()
  const fresh = records.filter((record) => !notified.has(record.id))
  if (fresh.length === 0) return []
  for (const record of fresh) notified.add(record.id)
  writeNotified(notified)
  return fresh
}

export function playReminderTone(): void {
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return
  const ctx = new AudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 880
  gain.gain.value = 0.08
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
  osc.stop(ctx.currentTime + 0.36)
  osc.onended = () => {
    void ctx.close()
  }
}

export function showScheduleNotification(record: ServiceRecord): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const when = record.scheduledAt
    ? new Date(record.scheduledAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    : ''
  const notification = new Notification(`Servicio agendado${when ? ` · ${when}` : ''}`, {
    body: `${record.clientName || 'Cliente'} — ${record.origin}`,
    tag: `geo-scheduled-${record.id}`,
  })
  notification.onclick = () => {
    window.focus()
    window.dispatchEvent(new CustomEvent(FOCUS_SCHEDULED_EVENT, { detail: record.id }))
    notification.close()
  }
}
