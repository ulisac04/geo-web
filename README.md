# Andina Dispatch

SPA de despacho logístico (React + Vite + TypeScript). Habla con Geo en `/api/v1` con **JWT**.

Requisito: Node.js 20+ y la API **geo** en `http://127.0.0.1:8080` (`cargo run -p api`).

## Levantar

```bash
cp -n .env.example .env   # VITE_API_URL=http://127.0.0.1:8080
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

Sigue en el browser: autocomplete Photon, ruta OSRM, WhatsApp (`wa.me`), tema.

Wizard: crear `pending` → asignar chofer `en_route`. El backend también acepta `in_progress` / `completed` / `cancelled`.

La API **no siembra conductores**. Crea fichas en Agenda. Para GPS en vivo, la app **geo-mobile** debe pinguear con el **mismo UUID** de esa ficha y tenant `andina`.

## Otros comandos

```bash
npm run build    # build de producción
npm run preview  # servir el build
npm run lint     # oxlint
```
