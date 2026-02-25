'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicy() {
    return (
        <div className="policy-container">
            <header className="policy-header">
                <Link href="/" className="back-btn">
                    <ChevronLeft size={20} /> 戻る
                </Link>
                <h1 className="font-heading text-2xl">プライバシーポリシー</h1>
            </header>

            <main className="policy-content">
                <section>
                    <h2>1. 個人情報の収集項目</h2>
                    <p>当アプリ（NyanCapsule）は、ユーザーの利便性向上のため、以下の情報を収集する場合があります。</p>
                    <ul>
                        <li>ペットに関する情報（名前、種類、性別、年齢）</li>
                        <li>ユーザーがアップロードした写真、動画、およびテキスト内容</li>
                        <li>Google Gemini APIの利用に必要なAPIキー（ブラウザ上のみで管理されます）</li>
                    </ul>
                </section>

                <section>
                    <h2>2. 個人情報の利用目的</h2>
                    <p>収集した情報は、以下の目的で利用されます。</p>
                    <ul>
                        <li>タイムライン上での日記の表示</li>
                        <li>AIによるペットの返信メッセージの生成</li>
                        <li>ビデオダイジェスト機能の生成</li>
                    </ul>
                </section>

                <section>
                    <h2>3. 第三者への提供について</h2>
                    <p>本アプリは、ユーザーの同意なしに個人情報を第三者に提供することはありません。ただし、AI機能の提供のためにGoogle Gemini API等の外部サービスに画像やテキストが送信される場合があります（送信されるデータについては各社のプライバシーポリシーに準じます）。</p>
                </section>

                <section>
                    <h2>4. Google AdSenseについて</h2>
                    <p>本サイトでは、第三者配信の広告サービス「Google AdSense（グーグルアドセンス）」を利用しています。広告配信事業者は、ユーザーの興味に応じた広告を表示するためにCookie（クッキー）を使用することがあります。</p>
                </section>

                <section>
                    <h2>5. 免責事項</h2>
                    <p>本アプリの利用によって生じた損害等について、開発者は一切の責任を負いません。最新の情報を提供するよう努めておりますが、正確性や完全性を保証するものではありません。</p>
                </section>
            </main>

            <style jsx>{`
        .policy-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          font-family: var(--font-body);
          color: var(--text-main);
          line-height: 1.8;
          background: var(--bg-warm);
          min-height: 100vh;
        }
        .policy-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 40px;
        }
        .back-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          color: var(--primary);
          font-weight: 800;
        }
        .policy-content section {
          margin-bottom: 30px;
        }
        h2 {
          font-size: 1.25rem;
          font-weight: 900;
          margin-bottom: 15px;
          border-left: 5px solid var(--primary);
          padding-left: 15px;
          font-family: var(--font-heading);
        }
        ul {
          padding-left: 20px;
          list-style-type: disc;
        }
      `}</style>
        </div>
    );
}
