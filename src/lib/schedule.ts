export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function defaultScheduleLocal(minutesAhead = 60): string {
  const date = new Date(Date.now() + minutesAhead * 60_000)
  date.setSeconds(0, 0)
  return toDatetimeLocalValue(date.toISOString())
}

export function formatScheduleWhen(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isScheduleDue(iso: string, now = Date.now()): boolean {
  const at = new Date(iso).getTime()
  return Number.isFinite(at) && at <= now
}
