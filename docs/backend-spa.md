# geo-web → backend: endpoints que necesita la SPA

Contrato para que **Andina Dispatch** (geo-web) deje `localStorage` / JWT mock y hable solo con Geo.

Hoy casi todo vive en el browser (`geo_jwt`, `geo_fleet_v2`, `geo_service_types_v1`, `geo_service_records_v1`, `geo_cost_rules_v1`, `geo_settings_v1`). El único call real es `POST /v1/parser/extract` (API key).

Superficie pedida: `/api/v1` **+** `Authorization: Bearer <JWT>` (`tenant_id` en el token).  
No mezclar `X-API-Key` en la SPA salvo que el parser no tenga alias Bearer.

Base: `http://127.0.0.1:8080`. IDs UUID. JSON snake_case. Timestamps ISO-8601 UTC. Coords `[lng, lat]`.  
Errores Andina: `{ "error": { "code", "message", "details" } }`.

Ciudades que usa la UI: `caracas` | `san_cristobal` | `cucuta` | `bogota`.

---



## 1. Mapa pantalla → API


| Pantalla / flujo               | Qué hace hoy                          | Endpoints                                                                                                       |
| ------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Login                          | JWT mock local                        | `POST /api/v1/auth/login` **falta**                                                                             |
| Recuperar contraseña           | Timeout fake                          | `POST /api/v1/auth/forgot-password` **falta**                                                                   |
| Configuración                  | Intervalo de poll en localStorage     | `GET` `PATCH /api/v1/settings` (existe; falta `city_id`)                                                        |
| Ciudades                       | Catálogo hardcode + stats locales     | Settings `city_id` + listados de drivers/services filtrados. Catálogo de centros/zonas puede seguir en el front |
| Conductores (agenda)           | CRUD + fotos + status en localStorage | CRUD `/api/v1/drivers` **incompleto** (hoy solo snapshot GPS)                                                   |
| Mapa / poll flota              | `nudgeFleet` cada N s                 | `GET /api/v1/drivers` cada `map_refresh_seconds` (existe, payload corto)                                        |
| Servicios → catálogo           | CRUD tipos en localStorage            | `/api/v1/service-types` **existe**                                                                              |
| Servicios → historial          | Listado localStorage                  | `/api/v1/services` **existe, con huecos**                                                                       |
| Dashboard wizard               | Crear pending → asignar chofer        | services + candidatos **huecos**                                                                                |
| Extraer pedido (texto/captura/audio) | `POST /v1/parser/extract`             | **existe** (API key). Alias Bearer **falta**                                                                    |
| Candidatos cercanos            | Haversine local                       | `POST /api/v1/dispatch/candidates` **falta** (sí existe `/v1` con API key)                                      |
| Costos + preview tarifa        | Reglas + `estimateFare` local         | `/api/v1/cost-rules` + `.../estimate` **existe**                                                                |
| Autocomplete A/B               | Google Places (New)                   | **no hace falta** (front)                                                                                       |
| Ruta en mapa                   | Google Directions                     | **no hace falta** (front)                                                                                       |
| WhatsApp al chofer / cliente   | `wa.me` en el cliente                 | **no hace falta** (front)                                                                                       |


---



## 2. Inventario

Leyenda: **listo** / **ampliar** / **falta**.

### Auth — **falta**


| Método | Path                           | Uso                  |
| ------ | ------------------------------ | -------------------- |
| `POST` | `/api/v1/auth/login`           | Login operador       |
| `POST` | `/api/v1/auth/forgot-password` | Recuperar contraseña |




### Settings — **ampliar**


| Método  | Path               | Uso                               |
| ------- | ------------------ | --------------------------------- |
| `GET`   | `/api/v1/settings` | Poll interval (+ `city_id`)       |
| `PATCH` | `/api/v1/settings` | Guardar intervalo y ciudad activa |




### Flota / agenda — **ampliar** (hoy solo poll GPS)


| Método   | Path                   | Uso                                   |
| -------- | ---------------------- | ------------------------------------- |
| `GET`    | `/api/v1/drivers`      | Agenda + mapa. `?city_id=&status=&q=` |
| `POST`   | `/api/v1/drivers`      | Alta desde Conductores                |
| `GET`    | `/api/v1/drivers/{id}` | Detalle                               |
| `PATCH`  | `/api/v1/drivers/{id}` | Editar perfil / status                |
| `DELETE` | `/api/v1/drivers/{id}` | Baja                                  |




### Tipos de servicio — **listo**


| Método   | Path                         | Uso                                   |
| -------- | ---------------------------- | ------------------------------------- |
| `GET`    | `/api/v1/service-types`      | Catálogo. `?active=true` en el wizard |
| `POST`   | `/api/v1/service-types`      | Alta                                  |
| `PATCH`  | `/api/v1/service-types/{id}` | Nombre, descripción, `active`         |
| `DELETE` | `/api/v1/service-types/{id}` | Baja; `409` si hay records            |




### Servicios (historial + wizard) — **ampliar**


| Método  | Path                    | Uso                                       |
| ------- | ----------------------- | ----------------------------------------- |
| `GET`   | `/api/v1/services`      | Historial. `?status=&q=&city_id=`         |
| `POST`  | `/api/v1/services`      | Aceptar servicio (`pending` sin chofer)   |
| `GET`   | `/api/v1/services/{id}` | Detalle                                   |
| `PATCH` | `/api/v1/services/{id}` | Asignar chofer **o** completar / cancelar |




### Costos — **listo**


| Método   | Path                          | Uso                                |
| -------- | ----------------------------- | ---------------------------------- |
| `GET`    | `/api/v1/cost-rules`          | Listado                            |
| `POST`   | `/api/v1/cost-rules`          | Alta `distance` | `night`          |
| `PATCH`  | `/api/v1/cost-rules/{id}`     | Edición + enable                   |
| `DELETE` | `/api/v1/cost-rules/{id}`     | Baja                               |
| `POST`   | `/api/v1/cost-rules/estimate` | Preview Costos + tarifa del wizard |




### Parser — **listo** (`/v1`); alias Bearer **falta**


| Método | Path                     | Uso                                 |
| ------ | ------------------------ | ----------------------------------- |
| `POST` | `/api/v1/parser/extract` | Paso 1 del wizard (texto, captura o audio) |


Mientras tanto la SPA puede seguir en `POST /v1/parser/extract` + `X-API-Key`.

### Candidatos — **falta** en `/api/v1` (existe `/v1/dispatch/candidates`)


| Método | Path                          | Uso                       |
| ------ | ----------------------------- | ------------------------- |
| `POST` | `/api/v1/dispatch/candidates` | Top-N al aceptar servicio |


---



## 3. Convenciones


| Ítem       | Valor                                                                             |
| ---------- | --------------------------------------------------------------------------------- |
| Auth SPA   | `Authorization: Bearer <jwt>`                                                     |
| Claim JWT  | `tenant_id` (demo `tenant_andina_001`)                                            |
| Demo login | `operador@andina.logistic` / `demo1234`                                           |
| HTTP       | `400` validación, `401` auth, `403` tenant, `404`, `409` conflicto                |
| Poll mapa  | El **cliente** llama `GET /api/v1/drivers` cada N s. El backend **no** simula GPS |


---



## 4. Auth



### `POST /api/v1/auth/login`

```json
{ "email": "operador@andina.logistic", "password": "demo1234" }
```

`200`:

```json
{
  "token": "<jwt>",
  "tenant_id": "tenant_andina_001",
  "company": "Andina Logistics",
  "operator": "Carlos Méndez",
  "operator_email": "operador@andina.logistic"
}
```

El JWT debe incluir `tenant_id`, `sub` (email), `exp`. `401` si credenciales inválidas.

### `POST /api/v1/auth/forgot-password`

```json
{ "email": "operador@andina.logistic" }
```

Siempre `204` (no enumerar usuarios). El mail/admin puede ser stub.

Logout es borrar el token en el cliente. No hace falta endpoint.

---



## 5. Settings + ciudad

Hoy: `{ "map_refresh_seconds": 15 }` (`5|10|15|30|60`).

La SPA también guarda la ciudad activa. Pedido:

```json
{
  "map_refresh_seconds": 15,
  "city_id": "caracas"
}
```

`PATCH` acepta uno o ambos. `city_id` inválido → `400`.

El catálogo (nombre, centro, zonas, gazetteer) puede seguir en el front. No hace falta `GET /api/v1/cities` en el primer corte.

---



## 6. Conductores

Hay dos cosas distintas:

1. **Agenda** (página Conductores): ficha, fotos, placa, zona, notas, alta/baja.
2. **Presencia** (mapa): última GPS + `available`  `busy`  `offline`.

Hoy `GET /api/v1/drivers` solo devuelve `{ id, name, lng, lat, coords, status, updated_at }` del índice en caliente. No alcanza para la agenda.

### Modelo pedido

```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "name": "Juan Pérez",
  "phone": "584145550123",
  "vehicle_type": "motorcycle",
  "vehicle": "Moto Empire 150",
  "license_plate": "AB123CD",
  "driver_photo": "",
  "vehicle_photo": "",
  "status": "available",
  "zone": "Altamira",
  "notes": "Turno mañana",
  "city_id": "caracas",
  "lng": -66.8508,
  "lat": 10.4996,
  "coords": [-66.8508, 10.4996],
  "battery": 86,
  "updated_at": "2026-08-17T19:22:00Z"
}
```


| Campo                                       | Notas                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `name`, `phone`, `vehicle`, `vehicle_type`, `license_plate` | Obligatorios en alta. `vehicle_type`: `car` \| `motorcycle`. `vehicle` es marca/modelo |
| `driver_photo`, `vehicle_photo`             | String URL o data URL. Default `""`. Sin media service en v1            |
| `status`                                    | `available` | `busy` | `offline`                                        |
| `zone`, `notes`                             | Default `""`                                                            |
| `city_id`                                   | Ciudad de la agenda (la activa al crear)                                |
| `coords` / `lng` / `lat`                    | Última presencia. Si nunca reportó GPS: centro de la ciudad o de `zone` |
| `battery`                                   | Opcional; default `null` o `0`                                          |


`distance_m` / `eta_min` no van en el recurso: los calcula candidatos o el front.

GPS en caliente sigue siendo `POST /v1/drivers/location` (app móvil, API key). El poll de la SPA **no** mueve puntos.

### `GET /api/v1/drivers`

Query: `city_id`, `status`, `q` (name, phone, vehicle, vehicle_type, license_plate, zone).

```json
{ "items": [ { "...Driver" } ] }
```

La SPA lo llama al cargar Conductores/Dashboard y cada `map_refresh_seconds`.

### `POST /api/v1/drivers`

Alta en la ciudad activa. Status inicial típico `available`. Coords: zona o centro de ciudad.

### `PATCH /api/v1/drivers/{id}`

Campos opcionales del draft + `status`. No hace falta mover GPS desde acá.

### `DELETE /api/v1/drivers/{id}`

Saca de agenda e índice. `204`.

---



## 7. Tipos de servicio

Semilla: Traslado / Delivery (ambos aceptan carro y moto). Express existente queda `active=false`.

Cada tipo tiene `allowed_vehicle_types` (`car`, `motorcycle`). El operador lo configura en el catálogo.

Wizard: `GET /api/v1/service-types?active=true`.  
Catálogo: listado completo (activos e inactivos).

`DELETE` → `409` si hay `service_records`; la UI puede pasar a `active=false`.

---



## 8. Servicios (historial + wizard)



### Huecos vs lo implementado

El wizard es de dos pasos:

1. **Aceptar servicio** → sin chofer, `pending`
2. **Elegir conductor** → `assigned`

Hoy el `POST` exige `driver_id` y crea `assigned`. Falta `pending`, `city_id`, `notes`, y `PATCH` para asignar chofer.

### `ServiceRecord`

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "service_type_id": "11111111-1111-1111-1111-111111111111",
  "type_name": "Traslado",
  "origin": "Av. Francisco de Miranda, Altamira",
  "destination": "CC Sambil, Chacao",
  "origin_lng": -66.8531,
  "origin_lat": 10.4984,
  "dest_lng": -66.8546,
  "dest_lat": 10.4888,
  "client_name": "María González",
  "client_phone": "0412-555-0189",
  "driver_id": null,
  "driver_name": "",
  "payment_method": "Efectivo",
  "amount": 15.00,
  "currency": "USD",
  "distance_m": 980,
  "notes": "Portería 2",
  "city_id": "caracas",
  "status": "pending",
  "created_at": "2026-08-17T19:22:00Z",
  "updated_at": "2026-08-17T19:22:00Z"
}
```

`type_name` y `driver_name` los resuelve el servidor. `amount` es número (la SPA formatea `$`).

**Status:** `pending`  `assigned`  `completed`  `cancelled`

```
pending  → assigned | cancelled
assigned → completed | cancelled
completed / cancelled → no reabrir
```



### `GET /api/v1/services`


| Query              | Uso                                                                        |
| ------------------ | -------------------------------------------------------------------------- |
| `status`           | Chips del historial                                                        |
| `q`                | origin, destination, client_name, **client_phone**, driver_name, type_name |
| `city_id`          | Historial y stats de Ciudades                                              |
| `limit` / `offset` | Opcional; default devolver todo (como hoy)                                 |


Orden `created_at DESC`. `{ "items", "total" }`.

Stats Ciudades (la SPA cuenta):

- abiertos = `pending` + `assigned`
- completados / cancelados / total



### `POST /api/v1/services`

Desde **Aceptar servicio**. Requeridos: `service_type_id`, `origin`, `destination`, `amount`, `city_id`.

Sin `driver_id` → `201` `pending`.  
Con `driver_id` → `201` `assigned` (como ahora).

`distance_m` ausente → haversine o `0`. Tipo activo del tenant.

### `PATCH /api/v1/services/{id}`

Al menos un campo:

```json
{ "driver_id": "<uuid>" }
```

```json
{ "status": "completed" }
```

```json
{ "status": "cancelled" }
```


| Patch              | Desde                  | Efecto                                                 |
| ------------------ | ---------------------- | ------------------------------------------------------ |
| `driver_id`        | `pending`              | `assigned`, rellena `driver_name`, marca chofer `busy` |
| `status=cancelled` | `pending` o `assigned` | Cancela; si había chofer, vuelve `available`           |
| `status=completed` | `assigned`             | Completa; chofer `available`                           |


`409` si la transición no aplica. No editar origen/monto/tipo por este PATCH.

---



## 9. Costos

Contrato actual sirve.

Reglas combinables `distance` (`price_per_km`) y `night` (`start_hour`, `end_hour`, `surcharge_type` `percentfixed`, `surcharge_value`).

`POST /api/v1/cost-rules/estimate`:

```json
{ "distance_m": 5000, "at": "2026-08-17T19:22:00-04:00" }
```

o coords origen/destino. `at` opcional, zona `America/Caracas`.

Respuesta: `distance_m`, `distance_km`, `distance_subtotal`, `night_surcharge`, `total`, `applied_night_rules`.

Check: 5 km de día = `12.50`; 5 km 23:00 Caracas = `15.00`.

Enable/disable = `PATCH` con `{ "enabled": false }`.

---



## 10. Parser

Paso 1 del dashboard. Ya cableado:

```
POST /v1/parser/extract
X-API-Key: andina-demo-key
{ "raw_text": "..." }
{ "image_base64": "...", "mime_type": "image/png" }
{ "audio_base64": "...", "mime_type": "audio/ogg" }
```

Pedido: el mismo body en `POST /api/v1/parser/extract` con Bearer.

`200`:

```json
{
  "pickup_address": "...",
  "dropoff_address": "...",
  "customer_name": "...",
  "customer_phone": "...",
  "payment_method": "...",
  "amount": 15,
  "notes": "..."
}
```

Ausentes en `null`. `400` sin input, `429` cuota Gemini, `503` sin `GEMINI_API_KEY`.  
La SPA geocodifica A/B después (Google Places); el parser no devuelve coords.

---



## 11. Candidatos de despacho

Tras `POST /services` la SPA muestra Top-N. Hoy ranquea en el cliente.

Pedido (espejo de `/v1/dispatch/candidates`, auth JWT):

### `POST /api/v1/dispatch/candidates`

```json
{
  "pickup": { "lng": -66.8531, "lat": 10.4984 },
  "dropoff": { "lng": -66.8546, "lat": 10.4888 },
  "city_id": "caracas",
  "limit": 5,
  "service_type_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
}
```

`200`: lista con `driver_id`, `name`, `status`, `coords`, `distance_meters`, `eta_seconds`, `phone`, `vehicle_type`, `vehicle`, `license_plate`, `driver_photo`. Filtra por `allowed_vehicle_types` si se manda `service_type_id`. **No** marcar `busy`.

`404` si no hay available cerca. El operador elige y entonces `PATCH /api/v1/services/{id}` con `driver_id`.

Cercanos en el mapa (radio ~1.5 km, 4 items): la SPA puede filtrar el poll o reusar este endpoint con `limit=4`.

---



## 12. Flujo dashboard

```
POST /auth/login
GET  /settings
GET  /service-types?active=true
GET  /cost-rules
GET  /drivers?city_id=…          (poll cada N s)

[texto o captura]
POST /parser/extract
     → front geocodifica Places

POST /cost-rules/estimate        (A/B en el mapa)
POST /services                   (sin driver → pending)
POST /dispatch/candidates
PATCH /services/{id}             { driver_id } → assigned + busy
     → front arma wa.me
```

---



## 13. Fuera de alcance (el front lo resuelve)

- Google Places Autocomplete (New) — autocomplete / geocode
- Google Directions — polyline A→B
- WhatsApp (`wa.me`) — mensaje al chofer
- Tema claro/oscuro
- Media service de fotos (data URL en el JSON alcanza)
- Replay GPS / `track_points`
- CRUD de ciudades
- Editar un servicio ya creado (salvo status / asignación)

---



## 14. Checklist backend

**Auth**

- [ ] `POST /api/v1/auth/login`
- [ ] `POST /api/v1/auth/forgot-password`

**Settings**

- [ ] `city_id` en GET/PATCH settings

**Drivers**

- [ ] GET con perfil completo + `city_id` + filtros
- [ ] POST / PATCH / DELETE agenda
- [ ] Poll no simula GPS

**Service types** — ya está

**Services**

- [ ] `pending` + transiciones
- [ ] POST sin `driver_id`
- [ ] PATCH `driver_id` (busy) y status (liberar chofer)
- [ ] `city_id`, `notes`, `driver_id` nullable
- [ ] `q` incluye `client_phone`

**Costos** — ya está

**Parser / candidatos**

- [ ] `POST /api/v1/parser/extract` (Bearer)
- [ ] `POST /api/v1/dispatch/candidates` (Bearer)

**Docs**

- [ ] OpenAPI + `geo/docs/API.md`
- [ ] Migraciones (`service_records`, ficha de conductores, settings.city_id)