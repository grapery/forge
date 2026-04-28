.PHONY: build run dev tidy lint frontend clean all

frontend:
	cd web && npm ci && npm run build
	rm -rf internal/frontend/dist
	cp -r web/out internal/frontend/dist

build:
	go build -o bin/admin ./cmd/admin/

all: frontend build

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

clean:
	rm -rf bin/
	rm -rf internal/frontend/dist
	rm -rf web/out web/.next

docker:
	docker build -t forge-admin .
