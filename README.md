# Avatar Puppet

1枚のキャラクター画像をアップロードすると、表情・ポーズ・セリフをボタンで操作できる Web アプリ。

キャラが呼吸し、笑い、手を振り、話しかけてくる。  
ブラウザだけで動く。スマホにも対応（PWA）。

## デモ

> **https://goroyattemiyo.github.io/avatar-puppet/**

## できること

- PNG / JPEG / WebP 画像をアップロードしてキャラを差し替え
- 表情ボタン（😐😊😠😲😢）でスムーズに表情が変化
- ポーズボタン（🧍👋🙇🤞）で体が動く
- セリフボタンで吹き出し表示 + 表情連動
- 操作していない間もキャラが呼吸している（idle モーション）
- スマホのホーム画面に追加するとフルスクリーンアプリとして動作

## セットアップ

```bash
git clone https://github.com/あなたのユーザー名/avatar-puppet.git
cd avatar-puppet
npm install
npm run dev
ブラウザで http://localhost:5173 を開く。

ビルド & デプロイ
Copynpm run build
dist/ が生成される。GitHub Pages へは push するだけで自動デプロイ（GitHub Actions 設定済み）。

自分のキャラを使う
Midjourney / Nano Banana 等でキャラ画像を生成
アプリ上部の「画像を選択」から画像をアップロード
パーツ定義を調整したい場合は src/presets.ts の PARTS を編集
技術スタック
要素	選定
描画	PixiJS v8
言語	TypeScript
ビルド	Vite
PWA	vite-plugin-pwa
ホスティング	GitHub Pages
依存	pixi.js のみ
プロジェクト構成
avatar-puppet/
├── src/
│   ├── main.ts        # 全ロジック (~350行)
│   └── presets.ts     # パーツ・表情・ポーズ・セリフ定義 (~150行)
├── public/
│   ├── sample.png     # サンプルキャラ画像
│   ├── icon-192.png   # PWA アイコン
│   └── icon-512.png
├── index.html         # UI + スタイル
├── package.json
├── tsconfig.json
├── vite.config.ts
└── docs/
    └── DESIGN.md      # 設計書
ロードマップ
Stage	内容	状態
A (MVP)	画像アップ・表情・ポーズ・セリフ・PWA	🔨 開発中
B	GUI パーツエディタ・N-Sprite アトラス取込	📋 計画
C	メッシュ頂点変形・ボーンスキニング	📋 計画
D	LLM 対話・TTS 音声	💭 構想
ライセンス
MIT
