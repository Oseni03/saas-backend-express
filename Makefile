.PHONY: dev stop db-migrate db-seed test lint format typecheck

dev:
	docker compose up --build

stop:
	docker compose down

db-migrate:
	npx prisma migrate deploy

db-migrate-dev:
	npx prisma migrate dev

db-seed:
	npm run db:seed

db-studio:
	npx prisma studio

test:
	npm run test

test-watch:
	npm run test:watch

test-coverage:
	npm run test:coverage

lint:
	npm run lint

format:
	npm run format

typecheck:
	npm run typecheck

check: lint typecheck

build:
	npm run build

paystack:
	npx paystack-cli listen --forward-to localhost:4000/api/v1/billing/webhooks/paystack
