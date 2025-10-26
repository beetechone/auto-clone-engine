SHELL := /bin/bash
.PHONY: init up down logs open test test-coverage e2e stripe_webhook clean help

help:
	@echo "Available commands:"
	@echo "  make init          - Initialize .env.local from .env.example"
	@echo "  make up            - Start all services with docker-compose"
	@echo "  make down          - Stop all services and remove volumes"
	@echo "  make logs          - Follow logs from all services"
	@echo "  make open          - Open all service URLs in browser"
	@echo "  make test          - Run unit tests"
	@echo "  make test-coverage - Run unit tests with coverage report"
	@echo "  make e2e           - Run end-to-end tests"
	@echo "  make stripe_webhook - Start Stripe webhook forwarding"
	@echo "  make clean         - Remove build artifacts and cache"

init:
	cp -n .env.example .env.local || true
	@echo "Initialized .env.local (edit secrets as needed)."

up:
	@make init
	docker compose up -d --build
	@echo "✅ Services started!"
	@echo "Web http://localhost:3000 | Admin http://localhost:3001 | API http://localhost:8000/docs"

down:
	docker compose down -v

logs:
	docker compose logs -f --tail=100

open:
	python -c "import webbrowser as w; [w.open(u) for u in ['http://localhost:3000','http://localhost:3001','http://localhost:8000/docs','http://localhost:8025','http://localhost:9001']]"

test:
	pytest -q

test-coverage:
	pytest --cov=apps.api.src --cov-report=html --cov-report=term
	@echo "Coverage report generated in coverage/html/index.html"

e2e:
	npx playwright install --with-deps chromium
	npx playwright test tests/e2e/compare/compare.spec.ts

stripe_webhook:
	stripe listen --forward-to localhost:8000/billing/webhook

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "coverage" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "playwright-report" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Cleaned build artifacts"
