import { useDispatchFlow } from '../context/DispatchContext'
import CandidateCard from './CandidateCard'

export default function CandidatesStep() {
  const { candidates, hoveredDriverId, hoverDriver, assignDriver } = useDispatchFlow()

  if (candidates.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-ink px-3 py-4 text-sm text-mist">
        No hay conductores disponibles cerca del origen.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-mist">
        Top {candidates.length} candidatos por distancia al punto de recogida.
      </p>
      {candidates.map((driver) => (
        <CandidateCard
          key={driver.id}
          driver={driver}
          highlighted={hoveredDriverId === driver.id}
          onHover={hoverDriver}
          onAssign={assignDriver}
        />
      ))}
    </div>
  )
}
