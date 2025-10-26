SHELL := /bin/bash
.PHONY: init up down logs open test e2e stripe_webhook

init:
	cp -n .env.example .env.local || true
	@echo "Initialized .env.local (edit secrets as needed)."

up:
	@make init
	docker compose up -d --build
	@echo "Web http://localhost:3000 | Admin http://localhost:3001 | API http://localhost:8000/docs"

down:
	docker compose down -v

logs:
	docker compose logs -f --tail=100

open:
	python -c "import webbrowser as w; [w.open(u) for u in ['http://localhost:3000','http://localhost:3001','http://localhost:8000/docs','http://localhost:8025','http://localhost:9001']]"

test:
	pytest -q || true

e2e:
	npx playwright install --with-deps && npx playwright test tests/e2e/compare/compare.spec.ts || true

stripe_webhook:
	stripe listen --forward-to localhost:8000/billing/webhook
