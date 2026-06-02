# Stage 1: Build Go binary
FROM golang:1.25.5-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
ENV GOPROXY=https://goproxy.cn,direct
RUN go mod download

COPY internal/ internal/
COPY cmd/ cmd/

RUN CGO_ENABLED=0 go build -o /admin ./cmd/admin/

# Stage 2: Minimal runtime
FROM alpine:3.20
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk --no-cache add ca-certificates tzdata wget
COPY --from=builder /admin /usr/local/bin/admin

EXPOSE 9010
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9010/health | grep -q ok || exit 1
ENTRYPOINT ["admin"]
