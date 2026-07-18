# Insights Plus for GitHub Projects

[English](README.md)

![CI](https://img.shields.io/github/actions/workflow/status/wozaki/insights-plus-for-github-projects/ci.yml) ![Release](https://img.shields.io/github/v/release/wozaki/insights-plus-for-github-projects) [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/eeadfjedbkhpjbccolcfbhflfckmfcmj?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/insights-plus-for-github/eeadfjedbkhpjbccolcfbhflfckmfcmj?utm_source=github&utm_medium=readme&utm_campaign=badge) [![License](https://img.shields.io/github/license/wozaki/insights-plus-for-github-projects)](LICENSE) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/wozaki/insights-plus-for-github-projects)

GitHub Projects にベロシティ予測や完了予定日の算出などのインサイトを追加する Chrome 拡張機能です。

## インストール

Chrome Web Store からインストール（推奨）

<a href="https://chromewebstore.google.com/detail/insights-plus-for-github/eeadfjedbkhpjbccolcfbhflfckmfcmj?utm_source=github&utm_medium=readme&utm_campaign=install_button">
  <img src="https://developer.chrome.com/static/docs/webstore/branding/image/YT2Grfi9vEBa2wAPzhWa.png" alt="Available in the Chrome Web Store" width="400">
</a>

<details>
<summary>その他のインストール方法</summary>

### リリースからインストール

1. [Releases](https://github.com/wozaki/insights-plus-for-github-projects/releases) ページにアクセスする
2. 最新の `.zip` ファイルをダウンロードする
3. zip ファイルを解凍する
4. Chrome で `chrome://extensions/` を開く
5. 右上の「デベロッパー モード」を有効にする
6. 「パッケージ化されていない拡張機能を読み込む」をクリックする
7. 解凍したフォルダを選択する

### 開発者モードでインストール

1. このリポジトリをクローンまたはダウンロードする
2. 依存関係をインストールする: `pnpm install`
3. 開発モードを実行する: `pnpm run dev`
4. 拡張機能が読み込まれた状態で Chrome が自動的に開く

### 本番ビルドからインストール

1. `pnpm run build` を実行する
2. Chrome で `chrome://extensions/` を開く
3. 右上の「デベロッパー モード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」をクリックする
5. `.output/chrome-mv3` フォルダを選択する

</details>

## 機能

### 1. バーンアップチャートの拡張

GitHub Projects のバーンアップチャートに、ベロシティ分析と完了予測を追加します。

- 📈 **現在のベロシティ表示**: 過去のデータから算出した現在のベロシティの傾きを破線で表示
- 🎯 **理想のベロシティ表示**: 締切までに完了するために必要な理想のベロシティを実線で表示
- 📅 **完了予測日**: 現在のベロシティを維持した場合の完了予測日を表示
- 📊 **統計パネル**: 合計見積もり、完了済み見積もり、完了率を表示

<img src="docs/images/screenshot-Burnup-Predictor.png" alt="Burn-up Chart Enhancement" width="700">

### 2. 複数イテレーションにまたがる平均ベロシティの算出

棒グラフ・カラムチャートにおいて、複数イテレーションにまたがる平均ベロシティを算出して表示します。

<img src="docs/images/screenshot-Velocity-Calculator.png" alt="Average Velocity Calculation" width="700">

## 使い方

### 1. バーンアップチャートの拡張

#### GitHub Insights の設定

以下の設定でチャートを構成してください。

| 設定 | 値 |
|---------|-------|
| Layout | Stacked area |
| X-axis | Time |
| Y-axis | Count of items または Sum of field（推奨: Story points 用の Number フィールドを使った Sum of field） |
| Date range | Custom range（推奨: 観測開始日からリリース目標日 + 1ヶ月まで） |

#### 使用手順

1. GitHub Project の Insights ページ（`/insights`）を開く
2. バーンアップチャートが表示されると、拡張機能が自動的に有効化される
3. チャートの下に統計パネルが表示される
4. ベロシティ予測ラインがチャートに重ねて表示される

締切日はグラフの X 軸の終端から自動的に取得されます。

### 2. 平均ベロシティの算出

#### GitHub Insights の設定

以下の設定でチャートを構成してください。

| 設定 | 値 |
|---------|-------|
| Layout | Bar, Column, Stacked bar, または Stacked column |
| X-axis | Iteration フィールドタイプのカスタムフィールド |
| Y-axis | Count of items または Sum of field（推奨: Story points 用の Number フィールドを使った Sum of field） |

#### 使用手順

1. GitHub Project の Insights ページ（`/insights`）を開く
2. X 軸に Iteration を設定した棒グラフ・カラムチャートが表示されると、拡張機能が自動的に平均ベロシティを算出する
3. 平均ベロシティがチャート上に表示される

## 開発

### 依存関係のインストール

```bash
pnpm install
```

### 開発（HMR 有効）

Hot Module Replacement 付きの開発サーバーを起動します。

```bash
pnpm run dev
```

これにより以下が行われます。
- `http://localhost:3000` で開発サーバーを起動
- 拡張機能を読み込んだ状態で Chrome を自動的に開く
- **変更時に拡張機能を自動リロード**

Firefox 向けの開発の場合:

```bash
pnpm run dev:firefox
```

#### 開発環境のカスタマイズ

開発サーバー起動時のブラウザの挙動をカスタマイズできます。プロジェクトルートに `.env.local` ファイルを作成し、以下の環境変数を設定してください。

1. サンプルファイルをコピーする:
   ```bash
   cp env.example .env.local
   ```

2. `.env.local` を編集し、以下の変数を設定する:

`.env.local` ファイルは `.gitignore` に含まれており、Git にコミットされません。テンプレートとして `env.example` ファイルを参照してください。

### 本番用ビルド

```bash
pnpm run build
```

Firefox 向け:

```bash
pnpm run build:firefox
```

### 配布パッケージの作成

```bash
pnpm wxt zip
```

### リリース

新しいリリースを作成するには、[Actions タブ](../../actions/workflows/bump-version.yml) から **Bump Version** ワークフローを実行します（または `gh workflow run bump-version.yml -f version=1.2.3`）。その際、新しいバージョン番号を入力してください。

これにより、以下が自動的に行われます。
- `package.json` の `version` フィールドを更新し、`main` にコミット
- **Release** ワークフローをトリガーし、以下を実行:
  - git タグを作成（例: `v1.2.3`）
  - 拡張機能をビルド
  - ビルドした `.zip` ファイルを添えて GitHub Release を作成
  - Chrome Web Store にビルドを送信

タグが既に存在する場合、リリースワークフローはリリースをスキップします。

<details>
<summary>手動での代替方法</summary>

自分自身でバージョンアップをプッシュしてリリースをトリガーすることもできます。

1. `package.json` の `version` フィールドを更新する
2. `main` ブランチにコミットしてプッシュする

これにより同じ Release ワークフローがトリガーされます。

</details>


### 技術スタック

- [WXT](https://wxt.dev/) - Next-gen Web Extension Framework
- TypeScript
- Vite（WXT 経由）
