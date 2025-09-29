.DEFAULT_GOAL := up
 
up:
	docker compose up --build

down:
	docker compose down

prune:
	docker compose down -v

restart: down up

build:
	docker compose build

ps:
	docker compose ps

sh:
	docker compose exec $(SERVICE) sh

clean-images:
	docker image prune -f

clean-volumes:
	docker volume prune -f

re :
	docker compose restart

