import { lazy, Suspense } from 'react'
import SidebarDispatch from '../components/SidebarDispatch'
import { DispatchProvider, useDispatchFlow } from '../context/DispatchContext'
import { useSettings } from '../context/SettingsContext'

const MapViewer = lazy(() => import('../components/MapViewer'))

export default function DashboardPage() {
  return (
    <DispatchProvider>
      <DashboardLayout />
    </DispatchProvider>
  )
}

function DashboardLayout() {
  const { city } = useSettings()
  const {
    fleet,
    order,
    hoveredDriverId,
    focusedDriverId,
    selectedDriver,
    activePin,
    setPinFromMap,
    moveOrigin,
    moveDest,
  } = useDispatchFlow()
  const liveFleet = fleet.filter((driver) => driver.status !== 'offline')

  return (
    <div className="flex h-full overflow-hidden bg-ink">
      <SidebarDispatch />
      <Suspense
        fallback={
          <section className="flex w-[70%] items-center justify-center text-sm text-mist">
            Cargando mapa…
          </section>
        }
      >
        <MapViewer
          drivers={liveFleet}
          order={order}
          hoveredDriverId={hoveredDriverId}
          focusedDriverId={focusedDriverId}
          selectedDriver={selectedDriver}
          activePin={activePin}
          center={city.center}
          onSetPin={setPinFromMap}
          onMoveOrigin={moveOrigin}
          onMoveDest={moveDest}
        />
      </Suspense>
    </div>
  )
}
