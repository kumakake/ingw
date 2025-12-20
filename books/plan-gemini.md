# Instagram AI投稿機能 実装計画

## 概要

このバックエンドにInstagram投稿機能とGemini AIによるコンテンツ加工機能を追加する。

**現状**: OAuth認証 + トークン管理のみ
**目標**: WordPress → API → AI加工 → Instagram投稿

## アーキテクチャ変更

```
WordPress                    このバックエンド                 外部サービス
─────────                    ────────────────                 ────────────
記事作成
    │
    ▼
POST /api/post/instagram ──────▶ validateLicenseAndSubscription
    │                                    │
    │ {title, body, imageUrl}            ▼
    │                              geminiService
    │                              ├─ 本文要約
    │                              └─ タイトル配置提案
    │                                    │
    │                                    ▼
    │                              imageService (sharp)
    │                              └─ タイトルオーバーレイ
    │                                    │
    │                                    ▼
    │                              instagramPostService
    │                              └─ Graph API投稿
    │                                    │
    ◀────────────────────────────────────┘
  結果返却
```

## 新規ファイル構成

```
src/
├── services/
│   ├── geminiService.js         # 【新規】Gemini API連携
│   ├── imageService.js          # 【新規】画像加工 (sharp)
│   └── instagramPostService.js  # 【新規】Instagram投稿
├── controllers/
│   └── postController.js        # 【新規】投稿APIコントローラー
├── routes/
│   └── post.js                  # 【新規】投稿ルート
└── models/
    └── PostHistory.js           # 【新規】投稿履歴モデル

db/
└── migrations/
    └── XXX_create_post_history.sql  # 【新規】履歴テーブル
```

## APIエンドポイント

### POST /api/post/instagram
Instagram投稿実行（AI加工オプション付き）

**リクエスト**:
```json
{
  "facebookPageId": "string",
  "imageUrl": "string (公開URL)",
  "content": {
    "title": "記事タイトル",
    "body": "記事本文"
  },
  "options": {
    "useAI": true,
    "addTitleToImage": true
  }
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "instagramMediaId": "...",
    "permalink": "https://instagram.com/p/...",
    "caption": "AI生成キャプション"
  }
}
```

### POST /api/post/preview
投稿プレビュー（実際に投稿せずAI加工結果を確認）

### GET /api/post/history
投稿履歴取得

## 依存パッケージ

```bash
npm install @google/generative-ai sharp
```

## 環境変数追加

```env
GEMINI_API_KEY=your_gemini_api_key
```

## データベース追加

```sql
CREATE TABLE post_history (
    id SERIAL PRIMARY KEY,
    license_id INTEGER REFERENCES licenses(id),
    facebook_page_id VARCHAR(255) NOT NULL,
    instagram_media_id VARCHAR(255) NOT NULL,
    wordpress_post_id VARCHAR(255),
    caption TEXT,
    image_url TEXT,
    permalink TEXT,
    ai_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 実装フェーズ

### Phase 1: Instagram投稿サービス
- `instagramPostService.js` - Graph API投稿処理
- コンテナ作成 → 待機 → 公開のフロー実装

### Phase 2: Gemini連携
- `geminiService.js` - テキスト要約 + 画像配置提案
- プロンプト設計

### Phase 3: 画像処理
- `imageService.js` - sharpでタイトルオーバーレイ
- SVGテキスト合成

### Phase 4: API統合
- `postController.js` + `routes/post.js`
- 既存ミドルウェア（validateLicenseAndSubscription）適用

### Phase 5: 履歴・エラー処理
- `PostHistory.js` モデル
- リトライ処理、エラーコード整備

## 修正対象の既存ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/app.js` | 新規ルート登録 |
| `src/routes/api.js` | ミドルウェアのexport追加 |
| `db/schema.sql` | post_historyテーブル追加 |

## 重要な制約

1. **Instagram Graph API制限**: 24時間で25投稿まで
2. **画像URL**: 公開URLが必要（ローカルファイル不可）
3. **キャプション**: 最大2,200文字
4. **画像サイズ**: 320px〜1440px

## 決定事項

- **画像処理**: sharp でテキストオーバーレイ（高速・低コスト）
- **画像保存**: Cloudflare R2（S3互換・転送料無料）

## 追加の環境変数

```env
# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=instagram-images
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

## 追加依存パッケージ

```bash
npm install @aws-sdk/client-s3  # R2はS3互換API
```
