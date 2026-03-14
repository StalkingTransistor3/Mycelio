FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN npm install --workspace=packages/shared --workspace=packages/api
COPY packages/shared/ packages/shared/
COPY packages/api/ packages/api/
RUN npm run build -w packages/shared && npm run build -w packages/api

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package.json ./
COPY --from=builder /app/packages/shared/dist ./node_modules/@mycelio/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@mycelio/shared/
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/index.js"]
