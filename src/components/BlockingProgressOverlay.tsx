import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'

const PHASES = [
  {
    after: 0,
    title: 'Extrayendo datos con IA',
    detail: 'Estamos leyendo el mensaje del cliente.',
  },
  {
    after: 8,
    title: 'Identificando el viaje',
    detail: 'Origen, destino y datos del cliente. Esto puede tardar.',
  },
  {
    after: 20,
    title: 'Sigue procesando',
    detail: 'No toques nada: al terminar pasamos a Puntos.',
  },
  {
    after: 40,
    title: 'Todavía trabajando',
    detail: 'La IA a veces tarda más. Si pasa de un minuto, revisa la conexión.',
  },
] as const

interface BlockingProgressOverlayProps {
  open: boolean
  onCancel: () => void
}

export default function BlockingProgressOverlay({ open, onCancel }: BlockingProgressOverlayProps) {
  const [elapsed, setElapsed] = useState(0)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!open) {
      setElapsed(0)
      setConfirming(false)
      return
    }

    setElapsed(0)
    setConfirming(false)
    const id = window.setInterval(() => {
      setElapsed((seconds) => seconds + 1)
    }, 1000)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.clearInterval(id)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) return null

  const phase = [...PHASES].reverse().find((item) => elapsed >= item.after) ?? PHASES[0]

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/80 px-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-busy={!confirming}
      aria-labelledby={confirming ? 'extract-cancel-title' : 'extract-overlay-title'}
      aria-describedby={confirming ? 'extract-cancel-detail' : 'extract-overlay-detail'}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel px-6 py-8 text-center shadow-xl">
        {confirming ? (
          <>
            <h2 id="extract-cancel-title" className="text-base font-semibold text-snow">
              ¿Cancelar la extracción?
            </h2>
            <p id="extract-cancel-detail" className="mt-2 text-sm leading-relaxed text-mist">
              Esto puede tardar, pero si cancelas ahora no se rellenarán los datos. ¿Seguro que
              quieres cancelar?
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg bg-signal py-2.5 text-sm font-semibold text-on-signal hover:bg-emerald-300"
              >
                Seguir esperando
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-line bg-ink py-2.5 text-sm font-medium text-mist hover:border-rose-400/40 hover:text-rose-200"
              >
                Sí, cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-signal/15">
              <Loader2 className="size-7 animate-spin text-signal" />
            </div>
            <h2 id="extract-overlay-title" className="mt-4 text-base font-semibold text-snow">
              {phase.title}
            </h2>
            <p id="extract-overlay-detail" className="mt-2 text-sm leading-relaxed text-mist">
              {phase.detail}
            </p>
            <p className="mt-4 font-mono text-sm tabular-nums text-signal" aria-live="polite">
              {formatElapsed(elapsed)}
            </p>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-6 text-xs text-mist hover:text-snow"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

function formatElapsed(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(1, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
