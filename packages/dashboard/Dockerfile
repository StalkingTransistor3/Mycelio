FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY packages/dashboard/package.json packages/dashboard/
RUN npm install --workspace=packages/shared --workspace=packages/dashboard
COPY packages/shared/ packages/shared/
COPY packages/dashboard/ packages/dashboard/
RUN npm run build -w packages/shared && npm run build -w packages/dashboard

FROM nginx:alpine
COPY --from=builder /app/packages/dashboard/dist /usr/share/nginx/html
COPY packages/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
