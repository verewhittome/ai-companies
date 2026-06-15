# Shared production container for all Toska API products.
# Build from repo root. Set env SERVICE=<product> (e.g. langdetect) to choose
# which service starts, so one image serves every product.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 8080
USER node
# SERVICE selects the product entrypoint at runtime.
CMD ["sh", "-c", "node dist/${SERVICE:-webextract}/server.js"]
