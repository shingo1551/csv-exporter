# CSV Select

CSVをブラウザで読み込み、先頭3行を見ながら出力列を選び、必要なデータ行だけCSVとしてダウンロードするHonoXアプリです。Cloudflare Workersへデプロイできます。CSVデータはブラウザ内だけで処理し、サーバーには送信しません。

## 公開URL

https://csv-select.shingo1551.workers.dev

## 出力列の選択

CSVをアップロードすると、ヘッダーごとにチェックボックスと先頭3行のプレビューが表示されます。列を選択すると、その列を使ったデータ行の一覧が下に表示され、チェックした行と列がダウンロードされます。列の選択は名前を付けてブラウザーの `localStorage` に保存でき、次回読み込めます。CSVの行データは保存しません。

## version 表示

フッター右下に `v0.1.0+<git hash>` 形式のビルド情報を表示します。ビルド時点で未コミットの変更がある場合は `-dirty` が付きます。git 情報はビルド時に自動で埋め込まれるため、手動での更新は不要です。コミットしてからビルド・デプロイすると、そのコミットのハッシュが表示されます。

## 開発

```sh
npm install
npm run dev
```

## Cloudflare Workersへデプロイ

```sh
npm run deploy
```

初回は `wrangler.jsonc` の Worker 名を設定し、`wrangler login` でログインしてください。
