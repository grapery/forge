.PHONY: build run dev tidy lint frontend clean all docker docker-web

build:
	go build -o bin/admin ./cmd/admin/

run: build
	./bin/admin

dev:
	go run ./cmd/admin/

dev-frontend:
	cd web && npm run dev

tidy:
	go mod tidy

lint:
	golangci-lint run ./...

frontend:
	cd web && npm ci && npm run build

clean:
	rm -rf bin/
	rm -rf web/out web/.next

docker:
	docker build -t forge-admin .

docker-web:
	docker build -t forge-web ./web

all: docker docker-web
