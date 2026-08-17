# Andina Dispatch

SPA de despacho logístico (React + Vite + TypeScript).

## Levantar la app

Requisito: Node.js 20+.

```bash
npm install
npm run dev
```

Abre [http://localhost:5173/](http://localhost:5173/).

Demo: `operador@andina.logistic` / `demo1234`

## Parser de pedidos (dashboard)

`/dashboard` llama a Geo `POST /v1/parser/extract` (Gemini). Copia `.env.example` a `.env`:

```
VITE_API_URL=http://127.0.0.1:8080
VITE_API_KEY=andina-demo-key
```

El API debe estar arriba con `GEMINI_API_KEY`. Vite hay que reiniciarlo si cambias el `.env`.

## Otros comandos

```bash
npm run build    # build de producción
npm run preview  # servir el build
npm run lint     # oxlint
```
