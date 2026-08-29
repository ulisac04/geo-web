# Tu Ruta

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

## Marca por subdominio

`VITE_APP_BASE_HOST` es el host canónico del SPA (sin slug). Si el hostname es `{slug}.{ese host}` — por ejemplo `norte.localhost` con `VITE_APP_BASE_HOST=localhost` — el login pide `GET /api/v1/public/branding?host=…` y pinta logo, nombre y colores de esa empresa.

En producción, un wildcard `*.tudominio.com` debe servir **el mismo SPA**. El panel de plataforma (`/admin`) no hereda la paleta del tenant. En local puedes probar con `/etc/hosts`:

```
127.0.0.1 norte.localhost
```

## Qué pega contra Geo

Ya no hay flota/servicios/costos en `localStorage`. El poll del mapa **no** mueve puntos: lee `GET /api/v1/drivers`.

| Pantalla | API |
|----------|-----|
| Login / recuperar | `POST /api/v1/auth/login`, `forgot-password` |
| Configuración / ciudad | `GET` `PATCH /api/v1/settings` |
| Agenda + mapa | CRUD + poll `GET /api/v1/drivers` |
| Catálogo / historial | `/api/v1/service-types`, `/api/v1/services` |
| Costos + tarifa | `/api/v1/cost-rules` + `.../estimate` |
| Extraer pedido | `POST /api/v1/parser/extract` (OpenAI; Gemini backup; `503` si no hay proveedor) |
| Candidatos al aceptar | `POST /api/v1/dispatch/candidates` |
| Ofrecer chofer | `PATCH /api/v1/services/{id}` `{ driver_id }` → `assigned` |

Sigue en el browser: Google Maps (pines/rutas), Places Autocomplete, Directions, WhatsApp (`wa.me`), tema.

En Google Cloud activa **Maps JavaScript API**, **Places API (New)** y **Directions API**. Pon la key en `VITE_GOOGLE_MAPS_API_KEY` (referrer `http://localhost:5173/*`). Un Map ID vectorial va en `VITE_GOOGLE_MAPS_MAP_ID` (`DEMO_MAP_ID` sirve en local). Sin key el mapa muestra un aviso y no arranca.

## Asignación híbrida

Wizard: crear `pending` → ofrecer candidato (`assigned`) → el chofer acepta en la app **o** el operador confirma (`en_route`). El operador marca **En viaje** y **Finalizar**.

Al pulsar **Ofrecer**:

1. `PATCH` del servicio (Geo deja `assigned`, marca al chofer `busy` y manda **push FCM** a **geo-mobile** si hay token).
2. Pasa al paso 4. **No** abre WhatsApp.

Paso 4 (oferta):

- Conteo de minutos y segundos desde que se ofreció.
- **Confirmar que lo tomó** — `assigned` → `en_route` si el chofer no pulsó Aceptar.
- **Reasignar** — otro candidato mientras siga en oferta (o si rechazó).
- **WhatsApp conductor** — copia y abre el chat del chofer (solo si lo pulsas).
- **WhatsApp cliente** — copia un mensaje con conductor / teléfono / vehículo / placa y abre el chat del cliente. Deshabilitado si no hay teléfono.

El API **no** envía WhatsApp (no hay Cloud API). Sin Firebase en Geo, el `PATCH` igual ofrece; solo falta el push.

Cerrar el viaje (`in_progress` / `completed` / `cancelled`) es solo el operador (lista live o historial).

La API **no siembra conductores**. Crea fichas en Agenda. Para GPS en vivo y para el push, **geo-mobile** debe usar el **mismo UUID** de esa ficha y tenant `andina`.

## Otros comandos

```bash
npm run build    # build de producción
npm run preview  # servir el build
npm run lint     # oxlint
```

## Publicar / actualizar el front (S3 + CloudFront)

La SPA de producción **no** vive en la EC2: Terraform (repo **geo**, `deploy/terraform`) crea un bucket S3 (`geo-frontend-prod-…`) y una distribución CloudFront que sirve `dist/` y proxyea `/api/*` y `/v1/*` a la API.

Actualizar el front es: build local → `aws s3 sync` → invalidar CloudFront. **No** hace falta `terraform apply` salvo que hayas cambiado `.tf`.

### Por qué una distribución sale Free y la otra Pay-as-you-go

En la consola de CloudFront, **Pricing plan** no es “gratis vs de pago” del mismo producto:

| | Tu Ruta (`geo-frontend-prod-…`) | CV (`isaac-ramirez.com`) |
|---|---|---|
| Plan | **Pay-as-you-go** | **Free** (plan plano $0/mes) |
| Cómo se creó | Terraform `aws_cloudfront_distribution` | Consola, sitio estático simple |
| Orígenes | S3 **y** EC2 (rutas `/api/*`, `/v1/*`, …) | Solo S3 |
| Dominio | `d….cloudfront.net` | CNAME propio |

El plan **Free** es un paquete fijo (una distribución sencilla, cupos bajos, WAF/DNS incluidos, sin extras). Terraform crea la distribución **clásica**: varios orígenes, comportamientos de caché y métodos HTTP hacia la API. Eso va en **Pay-as-you-go**.

Pay-as-you-go **sigue teniendo cuota siempre gratis** en la cuenta (del orden de 1 TB de transferencia y 10 M de peticiones al mes). Con tráfico de demo casi no factura CloudFront; lo que cuesta es sobre todo la EC2. No hace falta (ni conviene) pasar Tu Ruta al plan Free: perderías el proxy a la API.

### Requisitos

- AWS CLI autenticada (`aws sts get-caller-identity`).
- Estado de Terraform en `~/geo/deploy/terraform` (los outputs del apply).
- `.env.production` en este repo con la URL de CloudFront (las `VITE_*` se **hornean** en el build).

### 1. IDs desde Terraform

```bash
cd ~/geo/deploy/terraform
echo "URL  $(terraform output -raw app_url)"
echo "HOST $(terraform output -raw cloudfront_domain_name)"
echo "S3   $(terraform output -raw frontend_s3_bucket)"
echo "CF   $(terraform output -raw cloudfront_distribution_id)"
```

### 2. `.env.production`

```env
VITE_API_URL=https://<cloudfront_domain_name>
VITE_APP_BASE_HOST=<cloudfront_domain_name>
VITE_GOOGLE_MAPS_API_KEY=tu_clave
VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
```

`VITE_API_URL` lleva `https://`. `VITE_APP_BASE_HOST` es solo el host (sin esquema). Si cambias estas vars, hay que volver a `npm run build`.

Restringe la key de Google Maps por HTTP referrer a ese host de CloudFront (y a `localhost:5173` en local).

### 3. Build, sync e invalidación

```bash
cd ~/geo-web
git pull
npm install
npm run build

aws s3 sync dist/ s3://$(cd ~/geo/deploy/terraform && terraform output -raw frontend_s3_bucket) --delete

aws cloudfront create-invalidation \
  --distribution-id $(cd ~/geo/deploy/terraform && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

`--delete` deja el bucket igual que `dist/` (quita JS viejos). La invalidación tarda 1–2 min; recarga forzada en el navegador. Abre `terraform output -raw app_url`.

Comprobar API por el mismo CDN: `curl -sS "$(cd ~/geo/deploy/terraform && terraform output -raw app_url)/health"`.

### Qué no tocar

- `terraform apply` solo si cambiaste infra (`.tf`).
- No subas `dist/` a mano a otro bucket ni a la distribución **Free** del CV.
- Si la SPA llama a `localhost`, el build no usó `.env.production` con el host de CloudFront: corrige, `npm run build` y vuelve a sync.

## Claves Demo
