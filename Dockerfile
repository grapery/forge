# Stage 1: Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build Go binary with embedded frontend
FROM golang:1.25.5-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY internal/ internal/
COPY cmd/ cmd/

# Copy built frontend into embed directory
RUN mkdir -p internal/frontend/dist
COPY --from=frontend /app/web/out internal/frontend/dist

RUN CGO_ENABLED=0 go build -o /admin ./cmd/admin/

# Stage 3: Minimal runtime
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /admin /usr/local/bin/admin

EXPOSE 9010
ENTRYPOINT ["admin"]
