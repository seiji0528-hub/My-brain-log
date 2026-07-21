# My Brain Log

思考ログを「1カード＝1思考」で蓄積し、AIが関連付け・整形・（将来的に）意味検索してくれる
個人用の「第二の脳」アプリです。本リポジトリはフェーズ1（MVP）の実装です。

## 推奨技術スタック

| レイヤー | 選定 | 理由 |
|---|---|---|
| フレームワーク | **Next.js 14 (App Router)** | フロントとAPI Route（サーバー）を1つのプロジェクトで完結でき、Vercelに無料でデプロイ可能。GitHub管理もシンプル。 |
| スタイリング | **Tailwind CSS** | レスポンシブ対応のユーティリティが豊富で、モバイルファーストの実装がしやすい。 |
| データ保存（フェーズ1） | **ブラウザ localStorage** | サーバーやDBのセットアップなしで即動く。個人利用のMVPとしては十分。 |
| データ保存（フェーズ2以降の候補） | **Supabase (Postgres + pgvector)** | 無料枠があり、`pgvector`拡張でEmbeddingをそのままDBに保存・類似検索できる。複数端末での同期が必要になったら移行。 |
| AI（文章整形・タグ抽出） | **Gemini API（gemini-2.5-flash）** | 構造化出力（`responseSchema`）でJSONを直接受け取れるため、パースが安定する。 |
| AI（意味検索・フェーズ2） | **Gemini Embedding API（text-embedding-004）** | テキストをベクトル化し、コサイン類似度で「言葉が一致しなくても意味が近いカード」を検索できる。 |

すべてサーバーサイド（API Route）経由でGemini APIキーを扱うため、キーがブラウザに露出しません。

## セットアップ

```bash
npm install
cp .env.local.example .env.local
# .env.local に Google AI Studio (https://aistudio.google.com/app/apikey) で取得した
# GEMINI_API_KEY を設定する
npm run dev
```

`http://localhost:3000` を開くと動作します。スマホ実機で確認する場合は同一Wi-Fi内で
`npm run dev -- -H 0.0.0.0` として、PCのローカルIPにスマホからアクセスしてください。

## フェーズ1（今回の実装）でできること

- **①カード作成＋AI自動整形**：雑に書いた文章を `/api/format` 経由でGemini APIに投げ、
  タイトル・整形済み本文・おすすめタグをJSONで受け取ってフォームに反映（`app/api/format/route.js`）。
- **②関連カード表示**：カードを開いたとき、共通タグ数＋簡易的な共通キーワード数でスコアリングし、
  関連度の高いカードを自動表示（`lib/storage.js` の `findRelatedCards`）。
- **タグ検索・キーワード検索**：タグチップのタップ絞り込みと、テキストの部分一致検索。
- **スマホファーストUI**：`viewport-fit=cover` とセーフエリア対応、44px以上のタップ領域、
  横スクロール禁止、下から出るボトムシート型の入力フォーム。

データは端末のlocalStorageに保存されるため、**別ブラウザ・別端末とは同期しません**（フェーズ1の割り切り）。

## フェーズ2（意味検索）の実装方針

`app/api/embed/route.js` に、Gemini Embedding APIを叩くだけのスタブを用意してあります。
UIにはまだ接続していません。以下の手順で組み込めます。

1. カード保存時、`body`（本文）を `/api/embed` に渡してベクトル（`number[]`）を取得し、
   カードオブジェクトに `embedding` として保存する。
2. 検索ボックスに何か入力されたら、そのクエリ文字列も同様にベクトル化する。
3. 全カードの `embedding` とクエリのベクトルとの
   [コサイン類似度](https://ja.wikipedia.org/wiki/コサイン類似度)（`route.js` に実装済みの
   `cosineSimilarity` を流用可）を計算し、スコア上位を「意味検索の結果」として表示する。
4. カード数が数百件を超えて重くなってきたら、Supabaseの `pgvector` に移行し、
   SQLの `ORDER BY embedding <=> query_embedding` で検索する形にスケールさせる。

キーワード検索（現状の実装）と意味検索は排他ではなく、両方の結果をマージして
「完全一致は上に、意味的に近いものはその下に」といったハイブリッド検索にするのがおすすめです。

## ディレクトリ構成

```
app/
  page.js              # メイン画面（カード一覧・検索・関連表示）
  layout.js            # ルートレイアウト（viewport設定）
  globals.css          # フォント・セーフエリア等のグローバルCSS
  api/
    format/route.js    # フェーズ1: Gemini APIで文章整形
    embed/route.js     # フェーズ2用スタブ: Embedding取得
components/
  CardForm.js          # カード作成ボトムシート（AI整形ボタン含む）
  CardItem.js          # カード1枚の表示
  RelatedCards.js       # 関連カードパネル
  SearchBar.js         # 検索窓＋タグフィルタ
  TagChip.js           # タグチップ（色はタグ名から自動決定）
lib/
  storage.js           # localStorage CRUD＋関連カードのスコアリング
  tagColor.js          # タグ→色の決定ロジック
  aiClient.js          # /api/format を呼ぶだけのクライアントヘルパー
```

## 次にやると良さそうなこと

- フェーズ2の意味検索の組み込み（上記参照）
- カードの編集機能（現状は削除のみ）
- Supabase等への移行によるマルチデバイス同期
- 週次・月次で「よく出てくるタグ」を振り返るダッシュボード
