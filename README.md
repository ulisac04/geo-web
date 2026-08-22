# Andina Dispatch

SPA de despacho logístico (React + Vite + TypeScript). Habla con Geo en `/api/v1` con **JWT**.

Requisito: Node.js 20+ y la API **geo** en `http://127.0.0.1:8080` (`cargo run -p api`).

Repos hermanos: **geo** (API) · **geo-mobile** (app conductor).

## Levantar

```bash
cp -n .env.example .env   # VITE_API_URL y VITE_GOOGLE_MAPS_API_KEY
npm install
npm run dev
```

Abre [http://localhost:5173/](http://localhost:5173/).

| | |
|---|---|
| Demo | `operador@andina.logistic` / `demo1234` |
| Tenant | `tenant_andina_001` |
| Auth | `POST /api/v1/auth/login` → `Authorization: Bearer <jwt>` |

Vite hay que reiniciarlo si cambias el `.env`. Si tenías sesión mock antigua, cierra sesión y vuelve a entrar.

## Qué pega contra Geo

Ya no hay flota/servicios/costos en `localStorage`. El poll del mapa **no** mueve puntos: lee `GET /api/v1/drivers`.

| Pantalla | API |
|----------|-----|
| Login / recuperar | `POST /api/v1/auth/login`, `forgot-password` |
| Configuración / ciudad | `GET` `PATCH /api/v1/settings` |
| Agenda + mapa | CRUD + poll `GET /api/v1/drivers` |
| Catálogo / historial | `/api/v1/service-types`, `/api/v1/services` |
| Costos + tarifa | `/api/v1/cost-rules` + `.../estimate` |
| Extraer pedido | `POST /api/v1/parser/extract` (Gemini; `503` sin `GEMINI_API_KEY` en Geo) |
| Candidatos al aceptar | `POST /api/v1/dispatch/candidates` |
| Asignar chofer | `PATCH /api/v1/services/{id}` `{ driver_id, status: en_route }` |

Sigue en el browser: Google Maps (pines/rutas), Places Autocomplete, Directions, WhatsApp (`wa.me`), tema.

En Google Cloud activa **Maps JavaScript API**, **Places API (New)** y **Directions API**. Pon la key en `VITE_GOOGLE_MAPS_API_KEY` (referrer `http://localhost:5173/*`). Un Map ID vectorial va en `VITE_GOOGLE_MAPS_MAP_ID` (`DEMO_MAP_ID` sirve en local). Sin key el mapa muestra un aviso y no arranca.

## Asignación híbrida

Wizard: crear `pending` → elegir candidato → `en_route`.

Al pulsar **Asignar Conductor**:

1. `PATCH` del servicio (Geo marca al chofer `busy` y manda **push FCM** a **geo-mobile** si hay token).
2. Se copia el mensaje de despacho al portapapeles.
3. Se abre WhatsApp del **conductor** (`wa.me`) con ese texto.

Paso 4 (confirmación):

- **WhatsApp conductor** — vuelve a copiar y abrir el chat del chofer.
- **WhatsApp cliente** — copia un mensaje con conductor / teléfono / vehículo / placa y abre el chat del cliente. Deshabilitado si no hay teléfono.

El API **no** envía WhatsApp (no hay Cloud API). Sin Firebase en Geo, el `PATCH` igual asigna; solo falta el push.

El backend también acepta `in_progress` / `completed` / `cancelled`.

La API **no siembra conductores**. Crea fichas en Agenda. Para GPS en vivo y para el push, **geo-mobile** debe usar el **mismo UUID** de esa ficha y tenant `andina`.

## Otros comandos

```bash
npm run build    # build de producción
npm run preview  # servir el build
npm run lint     # oxlint
```
