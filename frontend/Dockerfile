# Frontend image — build context is frontend/ (set in deploy/docker-compose.yml).
# Builds the Vite SPA and serves it with nginx, proxying /api, /socket.io and
# /uploads to the ess-backend container (see nginx.conf).

# Build stage
FROM node:22 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
