#!/bin/sh
# アプリケーション起動スクリプト

set -e

echo "⏳ Waiting for PostgreSQL to be ready..."

# PostgreSQLが起動するまで待機
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"
echo "🚀 Starting application..."

# アプリケーションを起動
exec "$@"
