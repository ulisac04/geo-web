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
    takeOffline,
  } = useDispatchFlow()

  if (candidates.length === 0) {
    return (
      <div className="space-y-2">
        {searchError ? (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-rose-200">
            {searchError}
          </p>
        ) : null}
        <p className="rounded-lg border border-line bg-ink px-3 py-4 text-sm text-mist">
          No hay conductores en servicio para asignar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {searchError ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-rose-200">
          {searchError}
        </p>
      ) : null}
      <p className="text-xs text-mist">
        Top {candidates.length} más cercanos al punto de recogida, aunque estén lejos.
      </p>
      {candidates.map((driver) => (
        <CandidateCard
          key={driver.id}
          driver={driver}
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
    </div>
  )
}
