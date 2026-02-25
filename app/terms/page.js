'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TermsOfService() {
    return (
        <div className="policy-container">
            <header className="policy-header">
                <Link href="/" className="back-btn">
                    <ChevronLeft size={20} /> 戻る
                </Link>
                <h1 className="font-heading text-2xl">利用規約</h1>
            </header>

            <main className="policy-content">
                <section>
                    <h2>1. はじめに</h2>
                    <p>NyanCapsule（以下、「本アプリ」）の利用規約（以下、「本規約」）は、本アプリの利用者（以下、「ユーザー」）と開発者との間の権利義務関係を定めるものです。</p>
                </section>

                <section>
                    <h2>2. サービスの内容</h2>
                    <p>本アプリは、ペットの日記記録、AIによるリアクション生成、およびビデオダイジェスト生成機能を提供するものです。</p>
                </section>

                <section>
                    <h2>3. 禁止事項</h2>
                    <p>ユーザーは、本アプリの利用にあたり、以下の行為を行ってはなりません。</p>
                    <ul>
                        <li>公序良俗に反するコンテンツの投稿</li>
                        <li>不正なアクセスやシステムの破壊行為</li>
                        <li>他のユーザーの情報を不当に収集する行為</li>
                        <li>その他、開発者が不適切と判断する行為</li>
                    </ul>
                </section>

                <section>
                    <h2>4. 権利帰属</h2>
                    <p>本アプリに関する知的財産権等は開発者に帰属します。ユーザーが投稿した写真やテキストの著作権はユーザーに帰属しますが、本アプリ内での表示に必要な範囲で利用を許諾するものとします。</p>
                </section>

                <section>
                    <h2>5. 本規約の変更</h2>
                    <p>開発者は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。</p>
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
