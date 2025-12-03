# User Subscription System Implementation (2024-11-29)

## Overview
ユーザー認証、ライセンス発行、Stripe決済機能を実装

## New Database Tables

### users
- `id`, `login_account` (unique), `password_hash` (bcrypt)
- `email_encrypted` (pgcrypto PGP encryption)
- `stripe_customer_id`, `subscription_status`, `subscription_id`
- `subscription_plan`, `subscription_current_period_end`, `trial_end`

### email_verifications
- 新規登録時のメール認証用トークン (24時間有効)

### password_resets
- パスワードリセット用トークン (1時間有効)

### licenses (updated)
- `user_id` カラム追加 (ユーザーとライセンスの紐付け)

## New Dependencies
- `@sendgrid/mail` - メール送信
- `bcrypt` - パスワードハッシュ
- `jsonwebtoken` - JWT認証
- `stripe` - 決済

## Environment Variables (追加)
```
BASE_URL, JWT_SECRET, PGP_ENCRYPTION_KEY
SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID_MONTHLY, STRIPE_PRICE_ID_YEARLY
```

## API Routes

### User Authentication (/api/user)
- POST `/send-verification` - 登録用メール送信
- GET `/verify-email/:token` - メールトークン検証
- POST `/register` - ユーザー登録
- POST `/login` - ログイン (JWT発行)
- GET `/profile` - プロファイル取得 (要認証)
- PUT `/password` - パスワード変更 (要認証)
- PUT `/email` - メールアドレス変更 (要認証)
- POST `/request-password-reset` - パスワードリセット要求
- GET `/verify-reset-token/:token` - リセットトークン検証
- POST `/reset-password` - パスワードリセット実行

### License (/api/user)
- POST `/license/issue` - ライセンス発行 (要認証・要サブスク)
- GET `/license` - ライセンス取得 (要認証)
- POST `/license/reset-domain` - ドメインリセット (要認証)

### Payment (/api/payment)
- POST `/create-checkout-session` - Stripe Checkout開始
- POST `/billing-portal` - Stripeポータル
- GET `/subscription-status` - サブスク状態取得
- POST `/cancel-subscription` - サブスクキャンセル

### Webhook
- POST `/api/webhook/stripe` - Stripe Webhook

## Instagram API Protection
`/api/instagram/*` にライセンス+サブスクリプション検証ミドルウェア追加
- `X-License-Key` ヘッダー必須
- 有効なサブスクリプションが必要

## Frontend Pages
- `/user/login` - ログイン
- `/user/send-verification` - 新規登録メール送信
- `/user/register` - ユーザー情報登録
- `/user/forgot-password` - パスワードリセット要求
- `/user/reset-password` - パスワードリセット実行
- `/user/dashboard` - サービス管理画面

## Subscription Plans
- 月額: ¥1,000/月
- 年額: ¥10,000/年
- 両プラン共に初月無料トライアル (30日)
