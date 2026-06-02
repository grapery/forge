# Stage 1: Build Next.js static export
FROM node:22-alpine AS builder
ARG NEXT_PUBLIC_FORGE_API_URL=/forge
ENV NEXT_PUBLIC_FORGE_API_URL=$NEXT_PUBLIC_FORGE_API_URL
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/out /usr/share/nginx/html/forge
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/health || exit 1
