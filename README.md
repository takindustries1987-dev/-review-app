# レビューアプリ 仕様書

> 🍽️ 欧風料理店向け Google Maps レビュー生成アプリ

---

## 📌 アプリの概要

このアプリは、お客様が**タグを選ぶだけ**で、AIが自然な口コミを自動生成するツールです。

### できること
1. お客様がスマホでタグ（良かった点・普通・気になった点）を選択
2. AIが選択されたタグをもとに、リアルな口コミ文章を生成
3. ワンタップでコピー → Google Maps に投稿

### 特徴
- 🌍 **5言語対応**: 日本語・英語・簡体中・繁体中・韓国語
- 🎭 **3つの文体**: 短文（塩対応）・口語（LINE風）・丁寧（真面目）がランダムで出力
- 🚫 **ポエム禁止**: 「味のシンフォニー」のような大げさな表現は出ません

---

## 🔗 連携の仕組み

```
[お客様のスマホ]
       ↓ タグを選んで「生成」ボタン
[Next.js アプリ (Cloudflare Workers)]
       ↓ タグ情報を送信
[OpenAI API (GPT-4o-mini)]
       ↓ レビュー文章を生成
[Next.js アプリ]
       ↓ 生成完了時にログを記録
[Google Apps Script → スプレッドシート (UsageLogs)]
```

### 技術スタック
| 役割 | 技術 |
|------|------|
| フロントエンド | Next.js 15 + React |
| ホスティング | Cloudflare Workers |
| AI生成 | OpenAI GPT-4o-mini |
| データ管理 | Google Spreadsheet |
| ログ記録 | Google Apps Script (GAS) |

---

## 🔑 重要な環境変数

### ローカル開発用: `.dev.vars`
### 本番環境: `wrangler.jsonc` の `vars` セクション

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `OPENAI_API_KEY` | OpenAI の API キー | `sk-proj-xxxxx...` |
| `NEXT_PUBLIC_SHEET_URL` | スプレッドシートの公開CSV URL | `https://docs.google.com/spreadsheets/d/e/xxxxx/pub?output=csv` |
| `NEXT_PUBLIC_CATEGORY_TAGS_SHEET_GID` | CategoryTags シートの GID | `1709518251` |
| `USAGE_LOG_WEBHOOK_URL` | GAS ウェブアプリの URL | `https://script.google.com/macros/s/xxxxx/exec` |

### 確認場所
- **OpenAI API キー**: https://platform.openai.com/api-keys
- **スプレッドシート GID**: シートを開いた時の URL の `#gid=` の後の数字
- **GAS URL**: Apps Script → デプロイ → デプロイを管理 → ウェブアプリ URL

---

## 📊 スプレッドシートの構造

### 1️⃣ フォームの回答シート（例: `フォームの回答 4`）

店舗データを管理するマスターシート。

| 列 | 内容 | 例 |
|----|------|-----|
| A | タイムスタンプ | 2025/12/23 14:56:53 |
| B | Place ID | ChIJ-_SLCI... |
| C | 店舗ID | tablier |
| D | 店名・会社名 | 欧風料理タブリエ |
| E | 業態 | レストラン |
| F | 作成通知先メール | example@gmail.com |
| G | アプリURL | https://review-app.hgjllc.workers.dev/?id=tablier |
| H | 送信ステータス | 送信済み 2025/12/23 15:00:00 |

### 2️⃣ CategoryTags シート

タグのマスターデータ。カテゴリごとに選べるタグを定義。

| 列 | 内容 |
|----|------|
| Category | 業態（レストラン、居酒屋など） |
| TagName_ja | 日本語タグ名 |
| TagName_en | 英語タグ名 |
| Context | AIへのヒント（表に出ない） |

### 3️⃣ UsageLogs シート

レビュー生成のログを自動記録。

| 列 | 内容 |
|----|------|
| Timestamp | 生成日時 |
| StoreName | 店舗名 |
| Language | 言語 |
| Cost | 概算コスト（円） |
| TokenCount | トークン数 |

---

## 🛠️ もし動かなくなったら

### ✅ チェックリスト

#### 1. レビューが生成されない
- [ ] **OpenAI の残高を確認**: https://platform.openai.com/usage
  - 残高が 0 になっていないか？
- [ ] **API キーが有効か確認**: https://platform.openai.com/api-keys
  - 期限切れ・削除されていないか？

#### 2. 店舗データが表示されない
- [ ] **スプレッドシートの公開設定を確認**
  - ファイル → 共有 → 「ウェブに公開」が有効か？
- [ ] **GID が正しいか確認**
  - `wrangler.jsonc` の `NEXT_PUBLIC_CATEGORY_TAGS_SHEET_GID` がシートの GID と一致しているか？

#### 3. ログが記録されない（UsageLogs）
- [ ] **GAS のデプロイを確認**
  - Apps Script → デプロイ → デプロイを管理 → 「アクティブ」なデプロイがあるか？
- [ ] **GAS の実行権限を確認**
  - 「ウェブアプリ」→ アクセスできるユーザーが「全員」になっているか？

#### 4. フォーム送信時のメールが届かない
- [ ] **トリガーが設定されているか確認**
  - Apps Script → トリガー（⏰）→ `onFormSubmit` があるか？
- [ ] **シート名が正しいか確認**
  - コード内の `getSheetByName('フォームの回答 4')` が実際のシート名と一致しているか？
- [ ] **実行ログを確認**
  - Apps Script → 実行数（📋）→ エラーが出ていないか？

---

## 🚀 デプロイ方法

### 本番環境へのデプロイ

```bash
npm run deploy
```

これだけで Cloudflare Workers にデプロイされます。

### URL
- **本番**: https://review-app.hgjllc.workers.dev/?id=店舗ID

---

## 📁 ファイル構成（重要なものだけ）

```
review-app/
├── app/
│   ├── page.tsx          # メインUI（タグ選択・レビュー表示）
│   ├── globals.css       # デザイン（Modern Euro-Dining テーマ）
│   └── api/
│       ├── generate/route.ts  # ★ OpenAI連携・レビュー生成
│       └── store/route.ts     # 店舗データ取得
├── lib/
│   └── store-data.ts     # スプレッドシートからデータ取得
├── wrangler.jsonc        # Cloudflare設定・環境変数
└── .dev.vars             # ローカル開発用の環境変数
```

---

## 📞 サポート

何か問題があれば、以下を確認してください：

1. **Cloudflare ダッシュボード**: https://dash.cloudflare.com/
   - Workers のログを確認
2. **OpenAI ダッシュボード**: https://platform.openai.com/
   - API使用量・残高を確認
3. **Google Apps Script**: スプレッドシート → 拡張機能 → Apps Script
   - 実行ログを確認

---

*最終更新: 2025年12月23日*
