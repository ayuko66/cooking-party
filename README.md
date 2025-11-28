# Cooking Party (クッキングパーティー)

みんなで材料を出し合い、AIシェフに「架空の料理」と「イラスト」を作ってもらうパーティーゲームです。

## 概要

- **プレイ人数**: 最大5人
- **所要時間**: 1ラウンド 約1分
- **必要なもの**: ブラウザ（PC/スマホ）

## 遊び方

1. **部屋を作る**: トップページから「新しい部屋を作る」ボタンを押します。
2. **参加する**: 表示された部屋IDを友だちに教え、みんなで参加します。
3. **ゲーム開始**: ホストが「スタート」を押すとカウントダウン開始！
4. **材料入力**: 10秒以内に思いついた材料を入力して送信します（例：「ドラゴンフルーツ」「古びた靴」「愛」など）。
5. **調理**: 制限時間が来ると、AIシェフが材料をもとに料理を創作します。
6. **完成**: 料理名、説明、イラストが発表されます。

## 技術スタック

- **フレームワーク**: Next.js (App Router)
- **スタイリング**: Tailwind CSS
- **AI**:
  - テキスト生成: Groq API (Llama 3 / Mixtral)
  - 画像生成: Stability AI API
- **インフラ**: Docker

## 環境構築 (開発者向け)

### 必要要件
- Docker / Docker Compose
- Groq API Key
- Stability AI API Key

### 起動方法

1. リポジトリをクローンします。
2. `.env` ファイルを作成し、APIキーを設定します。
   ```env
   GROQ_API_KEY=your_groq_api_key
   STABILITY_API_KEY=your_stability_api_key
   ```
3. Docker Compose で起動します。
   ```bash
   docker-compose up --build
   ```
4. ブラウザで `http://localhost:3000` にアクセスします。
