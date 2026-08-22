import { lazy, Suspense } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
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
    mapMode,
    liveTrips,
    focusedTripId,
    setMapMode,
    focusDriver,
    focusTrip,
    takeOffline,
    pendingOffline,
    takingOffline,
    confirmTakeOffline,
    cancelTakeOffline,
    setPinFromMap,
    moveOrigin,
    moveDest,
    clearPin,
  } = useDispatchFlow()
  const liveFleet = fleet.filter((driver) => driver.status !== 'offline')
  const mapDrivers =
    mapMode === 'none'
      ? []
      : mapMode === 'live'
        ? liveTrips
            .filter((trip) => trip.driver.status !== 'offline')
            .map((trip) => trip.driver)
        : liveFleet

  return (
    <div className="flex h-full overflow-hidden bg-ink">
      <SidebarDispatch />
      <div className="relative h-full w-[70%] min-w-0">
        <Suspense
          fallback={
            <section className="flex h-full items-center justify-center text-sm text-mist">
              Cargando mapa…
            </section>
          }
        >
          <MapViewer
            drivers={mapDrivers}
            order={order}
            hoveredDriverId={hoveredDriverId}
            focusedDriverId={focusedDriverId}
            selectedDriver={selectedDriver}
            activePin={activePin}
            mode={mapMode}
            liveTrips={liveTrips}
            focusedTripId={focusedTripId}
            center={city.center}
            onModeChange={setMapMode}
            onFocusDriver={focusDriver}
            onFocusTrip={focusTrip}
            onSetPin={setPinFromMap}
            onMoveOrigin={moveOrigin}
            onMoveDest={moveDest}
            onClearPin={clearPin}
            onTakeOffline={takeOffline}
          />
        </Suspense>
      </div>
      <ConfirmDialog
        open={pendingOffline !== null}
        title="¿Sacar de servicio?"
        description={
          pendingOffline ? (
            <>
              ¿Estás seguro de que quieres sacar a{' '}
              <span className="font-semibold text-snow">{pendingOffline.name}</span> de servicio?
              Desaparecerá del mapa y no se le asignarán viajes hasta que lo reactives.
            </>
          ) : null
        }
        confirmLabel="Sí, sacar de servicio"
        busy={takingOffline}
        onCancel={cancelTakeOffline}
        onConfirm={confirmTakeOffline}
      />
    </div>
  )
}
