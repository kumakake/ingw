# 手動サブスクリプション有効化機能 実装計画

## 概要
クレジットカード以外の決済（銀行振込、特別対応等）に対応するため、管理者が手動でユーザーの投稿権限を有効化できる機能を追加する。

## 採用方式
**オプション1: 別フラグ追加方式**
- `manual_subscription_enabled` フラグを追加
- 既存のStripe連携とは独立して動作
- どちらかが有効なら投稿可能（OR条件）

## 仕様
- **有効期限**: 任意（NULL = 無期限）
- **操作画面**: 既存の管理者用ライセンス一覧画面（Basic認証）
- **Stripe連携**: 影響なし（完全に独立）

---

## 実装ステップ

### Step 1: DBスキーマ変更
**ファイル**: `db/migrations/YYYYMMDD_add_manual_subscription.sql` (新規作成)

```sql
ALTER TABLE users ADD COLUMN manual_subscription_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN manual_subscription_end TIMESTAMP;
ALTER TABLE users ADD COLUMN manual_subscription_note TEXT;
```

### Step 2: Userモデル修正
**ファイル**: `src/models/User.js`

1. `hasActiveSubscription()` の修正 (行152-176)
   - 手動有効化チェックを追加（優先度高）
   - 無期限対応: `manual_subscription_end` が NULL なら常に有効

2. 新規メソッド追加:
   - `setManualSubscription(userId, endDate, note)`
   - `disableManualSubscription(userId)`

### Step 3: ライセンスコントローラ追加
**ファイル**: `src/controllers/licenseController.js`

新規メソッド:
- `setManualSubscription(req, res)` - 手動有効化設定
- `disableManualSubscription(req, res)` - 手動有効化解除

### Step 4: ライセンスルート追加
**ファイル**: `src/routes/license.js`

新規エンドポイント:
- `POST /api/license/manual-subscription` - 有効化
- `POST /api/license/manual-subscription/disable` - 解除

### Step 5: ライセンス一覧API拡張
**ファイル**: `src/controllers/licenseController.js` (getList関数)

レスポンスに追加:
- `manualSubscriptionEnabled`
- `manualSubscriptionEnd`
- `manualSubscriptionNote`

### Step 6: 管理画面UI追加
**ファイル**: `public/license.html`

1. 契約状態バッジに「手動有効」表示追加
2. 操作ボタン追加:
   - 「手動有効化」ボタン → モーダル表示
   - 「手動解除」ボタン
3. モーダルダイアログ:
   - 有効期限入力（日付ピッカー、任意）
   - 備考入力（任意）
   - 確認/キャンセルボタン

---

## 修正対象ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `db/migrations/YYYYMMDD_add_manual_subscription.sql` | 新規作成: 3カラム追加 |
| `src/models/User.js` | hasActiveSubscription修正 + 2メソッド追加 |
| `src/controllers/licenseController.js` | 2メソッド追加 + getList拡張 |
| `src/routes/license.js` | 2ルート追加 |
| `public/license.html` | UI追加（バッジ、ボタン、モーダル） |

---

## hasActiveSubscription() 修正後ロジック

```javascript
static async hasActiveSubscription(userId) {
  // 1. 手動有効化チェック（優先）
  if (manual_subscription_enabled) {
    if (!manual_subscription_end) return true;  // 無期限
    if (new Date(manual_subscription_end) > now) return true;  // 期限内
  }

  // 2. Stripeトライアルチェック（既存）
  if (subscription_status === 'trialing' && trial_end > now) return true;

  // 3. Stripeアクティブチェック（既存）
  if (subscription_status === 'active' && current_period_end > now) return true;

  return false;
}
```

---

## UI仕様

### 契約状態バッジ
| 状態 | 表示 | 色 |
|------|------|-----|
| 手動有効（期限内/無期限） | `手動有効` | 緑 |
| 手動有効（期限切れ） | `手動(期限切れ)` | 黄 |
| Stripe active | `有効` | 緑 |
| Stripe trialing | `トライアル` | 青 |
| none/canceled | `なし` | グレー |

### 操作ボタン
- 未有効化ユーザー: 「手動有効化」ボタン表示
- 手動有効化済み: 「手動解除」ボタン表示

### モーダル内容
```
[手動サブスクリプション設定]
対象ユーザー: {loginAccount}

有効期限: [日付入力] (空欄 = 無期限)
備考: [テキスト入力]

[キャンセル] [設定する]
```

---

## 注意事項
- 既存のStripe決済ユーザーには影響なし
- 手動有効化とStripe両方が有効な場合も正常動作
- マイグレーション実行後、既存ユーザーは `manual_subscription_enabled = false`
