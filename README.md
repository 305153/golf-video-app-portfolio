# ゴルフスイング動画ビューア（React + Supabase, PWA）

ゴルフ部のスイング動画をアップロード・閲覧するためのシンプルなWebアプリです。認証・DB・ストレージは Supabase を利用しています。

## 主な機能

- 認証: Supabase メール/パスワード
- アップロード: 100MB上限、スマホはファイル選択で簡単アップロード
- 一覧/削除: フォルダ（選手）単位で動画を表示・削除
- 再生: 再生/一時停止、シーク、音量/ミュート、時間表示（全画面は非搭載）
- 速度調整: 0.5x / 0.75x / 1x（スローモーション用途）
- スワイプ切替: スマホで横スワイプすると「前/次」の動画に移動
- モバイル最適化: iOS Safe Area 対応、縦長動画でもコントロールが隠れないUI
- 権限: 管理者は全フォルダ、一般ユーザーは担当フォルダのみ
- 管理者UX: 左にフォルダ、右に動画（モバイルはタブ）。アップロードはモーダル起動

## 技術スタック

- フロント: React + TypeScript + Vite
- 認証/DB/Storage: Supabase
- デプロイ: Vercel（推奨）

## セットアップ

1) 依存関係
```bash
npm install
```

2) 環境変数（.env）
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3) Supabase セットアップ
- `PBL_video/database.sql` をSQL Editorで実行し、`videos` テーブルとRLSを作成
- ストレージバケット `videos` を作成し、RLSを適用
- RLSポリシーを設定し、ユーザーごとに閲覧・操作できる動画を制御

4) 開発サーバー
```bash
npm run dev
```

5) ビルド / プレビュー
```bash
npm run build && npm run preview
```

6) PWA（アイコン/オフライン）
- 生成済み: `public/icons/manifest-icon-192.maskable.png`, `public/icons/manifest-icon-512.maskable.png`, `public/favicon-196.png`
- 変更方法: `public/icons/Gemini.png` を差し替え → `npm run build`

## デプロイ（Vercel）
- リポジトリを接続し、環境変数（VITE_SUPABASE_*）を設定
- SPA のため `vercel.json` の rewrite で `/index.html` にフォールバック
- 本番URLは再デプロイしても変わりません（プレビューは都度URL発行）

## iOS アプリ化（任意・Capacitor）
既存のWebをそのまま梱包する方法の概要：
```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios
npm run build
npx cap init "Swing Viewer" "com.yourcompany.swingviewer" --web-dir=dist
npx cap add ios
npx cap copy
npx cap open ios
```
Xcodeで Team/Bundle ID 設定。必要に応じて `NSPhotoLibraryUsageDescription` を Info.plist に追加。

## ディレクトリ構成
```
src/
├── components/
│   ├── Auth/
│   ├── Layout/
│   ├── Upload/
│   └── Videos/
├── contexts/
├── hooks/
├── lib/
└── types/
```

## セキュリティ
- 環境変数は必須（未設定時は起動時にエラー）
- DB/Storage は RLS でアクセス制御（管理者/選手）
- ファイル名は UUID で保存し推測を困難化

## 既知の注意点（iOS Safari）
- ステータスバー重なり: `apple-mobile-web-app-status-bar-style=black` と Safe Area 余白を適用
- 画面下部バーの重なり: `viewport-fit=cover` / `env(safe-area-inset-*)` / `100dvh` を適用
- 縦長動画でもコントロールを前面固定して操作可能