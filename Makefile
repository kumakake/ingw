.PHONY: help build up down restart logs shell db-shell clean

help: ## このヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Dockerイメージをビルド
	docker-compose build

up: ## サービスを起動
	docker-compose up -d
	@echo "✅ サービスが起動しました"
	@echo "📱 アプリケーション: http://localhost:3000"
	@echo "🗄️  PostgreSQL: localhost:5432"

down: ## サービスを停止
	docker-compose down

restart: ## サービスを再起動
	docker-compose restart

logs: ## ログを表示（全サービス）
	docker-compose logs -f

logs-app: ## アプリケーションのログを表示
	docker-compose logs -f app

logs-db: ## データベースのログを表示
	docker-compose logs -f db

shell: ## アプリケーションコンテナにシェルで入る
	docker-compose exec app sh

db-shell: ## PostgreSQLに接続
	docker-compose exec db psql -U postgres -d instagram_oauth

db-reset: ## データベースをリセット（データ削除）
	docker-compose down -v
	docker-compose up -d
	@echo "⚠️  データベースがリセットされました"

clean: ## すべてのコンテナ、イメージ、ボリュームを削除
	docker-compose down -v --rmi all
	@echo "🧹 クリーンアップ完了"

dev: ## 開発環境を起動（ログ表示）
	docker-compose up

status: ## サービスの状態を確認
	docker-compose ps
