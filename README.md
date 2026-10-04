# CSV Select

CSVをブラウザで読み込み、ヘッダーとデータを確認しながら出力する列を選んでCSVをダウンロードするHonoXアプリです。Cloudflare Workersへデプロイできます。CSVデータはブラウザ内だけで処理し、サーバーには送信しません。

## 公開URL

https://csv-select.shingo1551.workers.dev

## 出力列の設定

`app/routes/index.tsx` の `OUTPUT_COLUMNS` に、初期状態で選択する列名を設定できます。アップロード後は画面で出力列を変更できます。

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
