# Etapa 1: Compilación con Node 22 LTS
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit
COPY . .
RUN npm run build -- --configuration=production

# Etapa 2: Servidor Web Nginx
FROM nginx:1.25-alpine
COPY --from=builder /app/dist/plantillas-frontend-v17/browser /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
