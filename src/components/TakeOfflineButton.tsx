import { PowerOff } from 'lucide-react'

interface TakeOfflineButtonProps {
  driverName: string
  onClick: () => void | Promise<void>
  compact?: boolean
}

export default function TakeOfflineButton({
  driverName,
  onClick,
  compact = false,
}: TakeOfflineButtonProps) {
  return (
    <button
      type="button"
      title={`Sacar a ${driverName} del mapa`}
      onClick={(event) => {
        event.stopPropagation()
        void onClick()
      }}
      className={
        compact
          ? 'rounded-md px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-danger/15'
          : 'inline-flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-danger/20'
      }
    >
      {compact ? null : <PowerOff className="size-3.5" />}
      Fuera de servicio
    </button>
  )
}
