# Generic multi-stage Dockerfile shared by every app in this monorepo.
# Select which app to build/run with --build-arg APP_NAME=<app>, e.g.:
#   docker build --build-arg APP_NAME=auth-service -t backend-auth-service .
# docker-compose.yml does this for you per service — see build.args below there.

FROM node:20-alpine AS builder
ARG APP_NAME
WORKDIR /app
COPY package*.json ./
RUN npm install --prefer-offline
COPY . .
RUN npx nest build ${APP_NAME}
# Prune dev deps here so the already-built native addons are kept intact
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime
ARG APP_NAME
ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=production
WORKDIR /app
# Copy pruned node_modules from builder — avoids re-running npm ci on Alpine
# without build tools, which breaks packages with native addons (bcrypt, etc.)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

CMD ["sh", "-c", "node dist/apps/${APP_NAME}/main"]
