# CSV Select

CSVをブラウザで読み込み、選択した行から指定列だけをCSVとしてダウンロードするHonoXアプリです。Cloudflare Workersへデプロイできます。CSVデータはブラウザ内だけで処理し、サーバーには送信しません。

## 公開URL

https://csv-select.shingo1551.workers.dev

## 出力列の設定

`app/routes/index.tsx` の `OUTPUT_COLUMNS` に、入力CSVのヘッダーと完全一致する列名を設定してください。配列に記載した列だけがダウンロードされます。

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
