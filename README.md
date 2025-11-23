# Instagram OAuth Service

WordPress連携用のInstagram OAuth認証サービス。Instagram Business AccountのIG_USER_IDを取得し、WordPressからの投稿機能を実現するためのバックエンドサービスです。

## 機能

- Facebook OAuth 2.0による認証
- Instagram Business Account の IG_USER_ID 取得
- 長期アクセストークン（60日間有効）の管理
- 複数Instagramアカウントの管理
- WordPress および外部サービスからのAPI呼び出し対応

## 技術スタック

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **APIs**: Facebook Graph API v18.0
- **Frontend**: シンプルなHTML（認証UI）

## セットアップ

### 🐳 Docker Compose を使う場合（推奨）

#### 1. 環境変数の設定

```bash
cp .env.docker .env
```

`.env` ファイルを編集して、Meta App の情報を設定：

```env
FACEBOOK_APP_ID=your_actual_app_id
FACEBOOK_APP_SECRET=your_actual_app_secret
```

#### 2. Docker Compose でサービスを起動

```bash
# サービスをビルドして起動
docker-compose up -d

# または Makefile を使用
make up
```

データベースは自動的に初期化されます。

#### 3. アクセス確認

- アプリケーション: http://localhost:3000
- PostgreSQL: localhost:5432

#### 便利なコマンド（Makefile）

```bash
make help          # ヘルプを表示
make up            # サービスを起動
make down          # サービスを停止
make logs          # ログを表示
make logs-app      # アプリのログのみ表示
make shell         # アプリコンテナに入る
make db-shell      # PostgreSQLに接続
make db-reset      # データベースをリセット
make restart       # サービスを再起動
```

---

### 💻 ローカル環境で直接実行する場合

#### 1. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集して、以下の情報を設定：

```env
# Meta App情報
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
REDIRECT_URI=http://localhost:3000/auth/callback

# データベース接続
DB_HOST=localhost
DB_PORT=5432
DB_NAME=instagram_oauth
DB_USER=postgres
DB_PASSWORD=your_password

# CORS設定
ALLOWED_ORIGINS=http://localhost:3000,https://your-wordpress-site.com
```

### 2. データベースの作成

```bash
# PostgreSQLにログイン
psql -U postgres

# データベースを作成
CREATE DATABASE instagram_oauth;
\q
```

### 3. スキーマの初期化

```bash
psql -U postgres -d instagram_oauth -f db/schema.sql
```

または：

```bash
npm run db:init
```

### 4. 依存関係のインストール

```bash
npm install
```

### 5. サーバーの起動

```bash
# 本番モード
npm start

# 開発モード（nodemon）
npm run dev
```

サーバーは `http://localhost:3000` で起動します。

## 使い方

### Webインターフェース経由

1. ブラウザで `http://localhost:3000` にアクセス
2. 「Instagram認証を開始」ボタンをクリック
3. Facebookでログイン
4. アプリの権限を許可
5. IG_USER_ID と関連情報が表示されます

### API経由（WordPressなど）

#### Facebook User IDでIG_USER_IDを取得

```bash
GET /api/instagram/user/:facebookUserId
```

レスポンス例：
```json
{
  "success": true,
  "data": {
    "instagramUserId": "17841405793187218",
    "facebookPageId": "123456789",
    "instagramUsername": "your_username",
    "facebookPageName": "Your Page",
    "tokenExpiresAt": "2024-03-21T10:30:00.000Z"
  }
}
```

#### Facebook Page IDでIG_USER_IDを取得

```bash
GET /api/instagram/page/:facebookPageId
```

#### 全ユーザーを取得

```bash
GET /api/instagram/users
```

## プロジェクト構造

```
instagram-oauth/
├── src/
│   ├── config/
│   │   └── database.js          # PostgreSQL接続設定
│   ├── models/
│   │   └── InstagramUser.js     # データベースモデル
│   ├── services/
│   │   └── instagramService.js  # Instagram OAuth ロジック
│   ├── controllers/
│   │   ├── authController.js    # 認証コントローラー
│   │   └── apiController.js     # API コントローラー
│   ├── routes/
│   │   ├── auth.js              # 認証ルート
│   │   └── api.js               # APIルート
│   └── app.js                   # Express アプリケーション
├── public/
│   └── index.html               # フロントエンド UI
├── db/
│   └── schema.sql               # データベーススキーマ
├── .env.example
├── package.json
└── README.md
```

## Meta App の設定

Meta Developer Consoleで以下を設定してください：

1. **有効なOAuthリダイレクトURI**:
   - `http://localhost:3000/auth/callback` （開発環境）
   - `https://your-domain.com/auth/callback` （本番環境）

2. **必要な権限**:
   - `pages_show_list`
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_manage_metadata`

3. **製品**: Facebook Login、Instagram Graph API

## トラブルシューティング

### "No Instagram Business Accounts found"

- FacebookページがInstagram Business Accountにリンクされているか確認
- Instagramアカウントが「ビジネスアカウント」に変換されているか確認
- Meta Developer Consoleでアプリの権限を確認

### データベース接続エラー

- PostgreSQLが起動しているか確認
- `.env` の接続情報が正しいか確認
- データベースが作成されているか確認

### トークンの有効期限切れ

長期アクセストークンは60日間有効です。有効期限が切れた場合は再認証が必要です。

## ライセンス

ISC
