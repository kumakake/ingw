# Docker Compose ガイド

## 🚀 クイックスタート

### 1. 環境設定

```bash
# .env.docker を .env にコピー
cp .env.docker .env

# Meta App の情報を設定
nano .env  # または vim, code など
```

必須の設定項目：
```env
FACEBOOK_APP_ID=your_actual_app_id
FACEBOOK_APP_SECRET=your_actual_app_secret
```

### 2. サービス起動

```bash
# サービスをビルドして起動
docker-compose up -d

# または Makefile を使用（推奨）
make up
```

### 3. 動作確認

- **アプリケーション**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **ヘルスチェック**: http://localhost:3000/health

## 📋 Makefile コマンド一覧

```bash
make help          # ヘルプを表示
make build         # イメージをビルド
make up            # サービスを起動（バックグラウンド）
make down          # サービスを停止
make restart       # サービスを再起動
make logs          # 全サービスのログを表示
make logs-app      # アプリケーションのログのみ表示
make logs-db       # データベースのログのみ表示
make shell         # アプリコンテナにシェルで入る
make db-shell      # PostgreSQLに接続
make db-reset      # データベースをリセット（全データ削除）
make clean         # すべてのコンテナ、イメージ、ボリュームを削除
make dev           # 開発モードで起動（ログ表示）
make status        # サービスの状態を確認
```

## 🏗️ Docker 構成

### サービス

#### app (Node.js アプリケーション)
- **イメージ**: カスタム（Dockerfile）
- **ポート**: 3000
- **ボリューム**:
  - `./src:/app/src` - ソースコードのホットリロード
  - `./public:/app/public` - フロントエンドのホットリロード
- **依存**: db サービス

#### db (PostgreSQL)
- **イメージ**: postgres:15-alpine
- **ポート**: 5432
- **ボリューム**:
  - `postgres_data` - データの永続化
  - `./db/schema.sql` - 初期化スクリプト
- **ヘルスチェック**: 10秒ごとに接続確認

### ネットワーク

サービス間は Docker の内部ネットワークで通信します：
- アプリ → データベース: `db:5432`

## 🔧 開発ワークフロー

### コードの変更

ソースコードを編集すると、nodemon が自動的にアプリケーションを再起動します：

```bash
# src/ 配下のファイルを編集
nano src/services/instagramService.js

# ログで再起動を確認
make logs-app
```

### データベース操作

```bash
# PostgreSQLに接続
make db-shell

# または直接
docker-compose exec db psql -U postgres -d instagram_oauth
```

SQLコマンド例：
```sql
-- テーブル確認
\dt

-- データ確認
SELECT * FROM instagram_users;

-- データ削除
DELETE FROM instagram_users WHERE id = 1;
```

### データベースリセット

```bash
# 全データを削除して再初期化
make db-reset
```

⚠️ **注意**: このコマンドは全データを削除します。

### ログの確認

```bash
# 全サービスのログ
make logs

# アプリのログのみ
make logs-app

# リアルタイムでログを追跡
docker-compose logs -f app
```

## 🐛 トラブルシューティング

### ポートが既に使用されている

```bash
# ポート 3000 が使用中の場合
lsof -i :3000
kill -9 <PID>

# または .env でポートを変更
PORT=3001
```

### データベース接続エラー

```bash
# データベースの状態を確認
docker-compose ps db

# データベースのログを確認
make logs-db

# ヘルスチェックを確認
docker-compose ps
```

### イメージの再ビルドが必要

```bash
# 依存関係を変更した場合
docker-compose up -d --build

# または
make build
make up
```

### 完全なクリーンアップ

```bash
# すべてを削除して最初からやり直す
make clean

# 再度セットアップ
make build
make up
```

## 📊 本番環境への展開

### 環境変数の設定

本番環境用の `.env` を作成：

```env
NODE_ENV=production
PORT=3000
FACEBOOK_APP_ID=your_production_app_id
FACEBOOK_APP_SECRET=your_production_app_secret
REDIRECT_URI=https://your-domain.com/auth/callback
DB_PASSWORD=strong_random_password
ALLOWED_ORIGINS=https://your-wordpress-site.com,https://your-domain.com
```

### docker-compose.override.yml

本番環境用のオーバーライド：

```yaml
version: '3.8'

services:
  app:
    restart: always
    command: npm start  # 本番モード

  db:
    restart: always
```

### セキュリティ設定

1. **強力なパスワード**: `DB_PASSWORD` を変更
2. **CORS設定**: `ALLOWED_ORIGINS` を本番ドメインのみに制限
3. **HTTPS**: リバースプロキシ（nginx）の設定
4. **ファイアウォール**: 必要なポートのみ開放

## 💡 Tips

### コンテナに入る

```bash
# アプリコンテナ
make shell

# データベースコンテナ
docker-compose exec db sh
```

### npm パッケージの追加

```bash
# コンテナ内で実行
make shell
npm install <package-name>

# または外部から
docker-compose exec app npm install <package-name>

# イメージを再ビルド
make build
make restart
```

### データのバックアップ

```bash
# PostgreSQLダンプ
docker-compose exec db pg_dump -U postgres instagram_oauth > backup.sql

# リストア
docker-compose exec -T db psql -U postgres instagram_oauth < backup.sql
```

## 🔗 関連ドキュメント

- [README.md](README.md) - プロジェクト概要
- [CLAUDE.md](CLAUDE.md) - 開発ガイド
- [docker-compose.yml](docker-compose.yml) - サービス定義
- [Dockerfile](Dockerfile) - イメージビルド設定
