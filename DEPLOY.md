# NyanCapsule 🚀 デプロイガイド

このアプリを世界中に公開するための手順です。

## 1. 準備
- [GitHub](https://github.com/) アカウントを持っていること
- [Vercel](https://vercel.com/) アカウントを持っていること（GitHub連携がおすすめ）

## 2. GitHubへプッシュ
ターミナルで以下のコマンドを実行します。

```bash
git init
git add .
git commit -m "Initial release of NyanCapsule"
# GitHubで作成したリポジトリURLを以下に貼り付け
git remote add origin <あなたのリポジトリURL>
git push -u origin main
```

## 3. Vercelで公開
1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセスし、「Add New」→「Project」を選択。
2. 先ほど push したリポジトリを選択。
3. **Environment Variables（環境変数）** に以下を追加：
   - `NEXT_PUBLIC_GEMINI_API_KEY`: 制作中に使用しているAPIキー（任意。ユーザーに自分のキーを使わせる場合は不要）
4. 「Deploy」ボタンをクリック！

## 4. 公開後のURLをシェア
`https://nyan-capsule.vercel.app` のようなURLが発行されます。これをSNSや友人にシェアして、フィードバックをもらいましょう！🐾

---

## 🛠 今後の収益化に向けて
- **AdSense**: `app/page.js` の `footer-ad-placeholder` 部分に AdSense のタグを挿入します。
- **Premium Plan**: 将来的に「動画の保存枚数無制限」などを有料化するための Stripe 連携も検討可能です。
