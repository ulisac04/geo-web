import { Loader2, RefreshCw } from 'lucide-react'
import { useDispatchFlow } from '../context/DispatchContext'
import CandidateCard from './CandidateCard'

export default function CandidatesStep() {
  const {
    candidates,
    hoveredDriverId,
    focusedDriverId,
    selectedDriver,
    hoverDriver,
    focusDriver,
    assignDriver,
    searchError,
    searching,
    refreshCandidates,
    takeOffline,
  } = useDispatchFlow()
  const minTurns =
    candidates.length === 0
      ? 0
      : Math.min(...candidates.map((item) => item.completedToday ?? 0))

  return (
    <div className="space-y-2">
      {searchError ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-rose-200">
          {searchError}
        </p>
      ) : null}
      <button
        type="button"
        disabled={searching}
        onClick={() => void refreshCandidates()}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-ink px-3 py-1.5 text-xs font-medium text-mist transition hover:border-signal/40 hover:text-snow disabled:cursor-not-allowed disabled:opacity-40"
      >
        {searching ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
        {searching ? 'Recargando…' : 'Recargar conductores'}
      </button>
      {candidates.length === 0 ? (
        <p className="rounded-lg border border-line bg-ink px-3 py-4 text-sm text-mist">
          No hay conductores en servicio para asignar.
        </p>
      ) : (
        <>
          <p className="text-xs text-mist">
            Top {candidates.length} por ETA al punto A. A igualdad (~2 min),
            menos vueltas hoy. Incluye ocupados si, al terminar, llegan antes
            que un libre.
          </p>
          {candidates.map((driver) => (
            <CandidateCard
              key={driver.id}
              driver={driver}
              nextTurn={(driver.completedToday ?? 0) === minTurns}
              highlighted={
                hoveredDriverId === driver.id ||
                focusedDriverId === driver.id ||
                selectedDriver?.id === driver.id
              }
              onHover={hoverDriver}
              onFocus={focusDriver}
              onAssign={assignDriver}
              onTakeOffline={takeOffline}
            />
          ))}
        </>
      )}
    </div>
  )
}
