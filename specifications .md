# 機能仕様書
実装済みの挙動に合わせたMVP仕様。最小構成・最小コストを前提とする。

# 概要
- 目的：複数人で材料を出し合い、生成AIが「架空の料理」と「イラスト」を作ってくれるブラウザゲーム
- 対象：URL共有で招待されたメンバーのみ
- 言語：日本語のみ対応

# プレイルール
- 部屋ID：4桁英数字（大文字）。新規作成時に発行し、URLで共有。
- 参加人数：最大5名。先着順で、最初に参加したプレイヤーがホストとして扱われる。
- フェーズ：`LOBBY` → `COUNTDOWN`（30秒） → `COOKING` → `RESULT`
- 材料：
  - COUNTDOWN中のみ受け付け
  - 合計20個まで
  - 1件あたり10文字以内（サーバ側で検証。入力欄は20文字だが10文字が上限）
- タイマー：ホストが開始すると30秒カウントダウン。0秒になるとホスト端末が自動で `/api/rooms/cook` を叩きCOOKINGへ。

# ゲームフロー
1. トップで「新しい部屋を作る」を押すと部屋IDが発行され `/room/:roomId` に遷移。
2. URLを共有し、参加者はニックネームを入力して入室（最大5名）。最初の参加者がホスト。
3. ホストのみ「ゲームスタート！」ボタンが表示され、押下で `COUNTDOWN` に遷移し `countdownEndTime = now + 30s` を保存。
4. COUNTDOWN中に各プレイヤーが材料を送信（20件・10文字上限）。フェーズ不一致/上限超過は追加されない。
5. カウントダウン0秒でホストが `/api/rooms/cook` を自動実行し、`COOKING` → `RESULT` へ。AI生成失敗時はフォールバック結果を保存。
6. RESULT画面で料理名・説明・画像・使用材料を表示。「もう一度遊ぶ」でトップへ戻る。

# 画面要点
- トップ：部屋ID入力（4桁）＋参加ボタン、新規部屋作成ボタン。
- ロビー：部屋IDと参加者一覧、URLコピー/QR共有。ホストのみ「ゲームスタート！」。
- COUNTDOWN：30秒タイマー、材料入力欄、現在の材料数表示。
- COOKING：調理中表示。
- RESULT：料理名・画像・説明・使用材料を表示し、トップに戻るボタンを表示。

# API仕様（実装済みエンドポイント）
- `POST /api/rooms/create` … 部屋を作成し `{ roomId }`（4桁英数字）を返す。
- `POST /api/rooms/join` … `{ roomId, nickname }`。phase=LOBBY かつ定員未満で `{ player }` を返す。無効ID/定員超過/フェーズ不一致は400、未設定ストアは503。
- `POST /api/rooms/start` … `{ roomId }`。phase=LOBBY のとき `COUNTDOWN` にし、`countdownEndTime = now + 30s` を保存。
- `POST /api/rooms/submit` … `{ roomId, playerId, text }`。phase=COUNTDOWN かつ材料<20 かつ10文字以内で追加。失敗時は400。
- `GET /api/rooms/state?roomId=...&sinceVersion=...` … 部屋状態を返却。sinceVersion 以降変化なしなら204。404/503を返す場合あり。
- `POST /api/rooms/cook` … `{ roomId, isDev? }`。phase=COUNTDOWN のときだけ処理。`isDev=true` ならAI呼び出しをスキップし固定レスポンス（デバッグカレーDX）を保存。通常は Groq で料理名/説明を生成し、Gemini で画像を生成。失敗時はフォールバック結果で RESULT に遷移。

# AI生成仕様
- テキスト：Groq (Llama 3.3 70B)。材料をすべて踏まえ、少なくとも2個を説明文に含める。JSONで料理名（20文字以内）と説明（50〜100文字程度）を返す。
- 画像：Google Gemini 2.5 Flash Image。料理名・説明・材料要約を渡し、ポップなイラストを生成。失敗やキー未設定時はプレースホルダーURLを返す。

# ストレージ / 非機能
- ストア：Redis優先。`REDIS_URL` 未設定かつ Vercel 以外ではメモリストアにフォールバック。Vercel では Redis 必須。未設定時は503を返す。
- TTL：部屋データの既定TTLは6時間（`ROOM_TTL_SECONDS` で変更可）。
- ポーリング：クライアントはフェーズに応じて約0.8〜2.5秒間隔で `GET /api/rooms/state` をポーリング。204応答に対応し、失敗時は指数バックオフ。

# 開発者向けモード (Dev Mode)
- 有効化：URLパラメータ `?dev=true` または `?dec=true` を付与すると sessionStorage に保存され、タブを閉じるまで継続。
- 表示：画面右下に「DEVモード中」バッジを常時表示。
- 挙動：`/api/rooms/cook` に `isDev: true` を渡してAI呼び出しをスキップし、固定レスポンスを即時保存。
