# ESS — Employee Self-Service (monorepo)
hello world

Two independent apps in one repo:

```
ess/
├── frontend/        # React + Vite SPA  (src/, public/, vite/tailwind/tsconfig)
├── backend/         # Express + Prisma API  (server.js, src/ [MVC], api/, lib/, prisma/)
├── deploy/          # docker-compose.yml (CI entrypoint) + host nginx config
├── ecosystem.config.cjs   # PM2 (non-Docker host deploy)
└── Jenkinsfile      # CI/CD pipeline
```

Frontend and backend are fully separate: each has its own `package.json` and
`node_modules`. They communicate only over HTTP (`/api`, `/socket.io`, `/uploads`).

## Local development

```sh
# Backend (port 3001) — needs backend/.env (DATABASE_URL, JWT_SECRET, SMTP_*, MINIO_*)
cd backend
npm install            # runs `prisma generate` (postinstall)
npm run server         # node server.js → http://localhost:3001

# Frontend (port 8082) — needs frontend/.env (VITE_API_URL, VITE_PUBLIC_URL)
cd frontend
npm install
npm run dev            # Vite dev server, proxies /api + /uploads → localhost:3001
```

`.env` files are gitignored. Copy from your secret store; the production secret
lives at the repo-root `.env.production` (injected by CI).

## Backend scripts (`cd backend`)

- `npm run server` — start the API (`node server.js`)
- `npm run seed` — seed the database (`node prisma/seed.js`)
- `npm run generate` — regenerate the Prisma client

## Frontend scripts (`cd frontend`)

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run lint` / `npm run test`

## Production (Docker)

CI builds two images from `deploy/docker-compose.yml`:

- `ess-backend` — `backend/Dockerfile`, runs `node server.js` on 3001.
- `ess-frontend` — `frontend/Dockerfile`, nginx serving the SPA and proxying
  `/api`, `/socket.io`, `/uploads` to `ess-backend:3001` (see `frontend/nginx.conf`).
  Published on `8090:80`; a host nginx (`deploy/nginx/`) terminates TLS in front.

```sh
docker compose -f deploy/docker-compose.yml -p ess build
docker compose -f deploy/docker-compose.yml -p ess up -d
# DB migrations (additive):
docker compose -f deploy/docker-compose.yml -p ess run --rm ess-backend npx prisma migrate deploy
```

Jenkins (`Jenkinsfile`) automates build → migrate → deploy → health checks on push.

## PM2 (non-Docker host)

`pm2 start ecosystem.config.cjs` runs `employee-be` (from `backend/`) and
`employee-fe` (`vite preview` from `frontend/`).
