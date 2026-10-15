# Backend image — build context is backend/ (set in deploy/docker-compose.yml).
# Single stage: prisma CLI must stay in the image because the Jenkins
# "Migrate DB" stage runs `npx prisma migrate deploy` inside this container.

FROM node:22-slim
WORKDIR /app

# openssl: required by Prisma; wget: used by Jenkins health checks
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl wget \
    && rm -rf /var/lib/apt/lists/*

# Install deps first so this layer caches across code-only changes.
# prisma generate (postinstall) needs the schema + config present.
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server.js"]
