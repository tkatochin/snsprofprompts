# かとちんのSNSプロフィール用プロンプト

GitHub Pages 用の静的サイトです。`tkatochin` の公開 Gist 一覧から、ファイル名が `snsprof-*.prompt` のものを抽出して一覧表示します。

## 仕様

- タイトル表示: Gist の `description` を表示（未設定時はファイル名を表示）
- 並び順: Gist の更新日時（`updated_at`）が新しい順
- クリック動作: 対象ファイルの Raw テキスト全文をクリップボードにコピー
- 通知: 画面上部に「{タイトル}のプロンプトをコピーしました」を表示（フェードイン後、2秒でフェードアウト）
- 自動コピー: URL 末尾に `#gist-id` を付けると一致する項目を自動コピー

## ローカル確認

このリポジトリをローカルサーバーで開いて確認してください。例えば:

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。

## GitHub Pages 公開手順

1. このリポジトリを GitHub に push
2. GitHub のリポジトリ設定で Pages を開く
3. Source を `Deploy from a branch` に設定
4. Branch を `main`（または公開対象ブランチ）/`/(root)` に設定
5. 数分待って公開URLにアクセス

## 使い方

- 通常アクセス: 一覧からタイトルをクリックしてコピー
- 自動コピー: `https://<ユーザー名>.github.io/<リポジトリ名>/#<gist-id>`

例:

```text
https://tkatochin.github.io/snsprofprompts/#0123456789abcdef0123456789abcdef
```

## 補足

- クリップボードAPIが使えない場合はフォールバック方式でコピーします。
- Gist API の仕様やレート制限により、取得失敗時は画面にエラー表示します。
