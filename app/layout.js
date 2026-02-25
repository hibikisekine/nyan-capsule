import { Varela_Round, Nunito_Sans } from "next/font/google";
import "./globals.css";

const varela = Varela_Round({
  weight: '400',
  subsets: ["latin"],
  variable: '--font-varela',
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: '--font-nunito',
});

export const metadata = {
  title: {
    default: "NyanCapsule | 大切なペットとの思い出をAIと共に残す",
    template: "%s | NyanCapsule"
  },
  description: "NyanCapsuleは、愛猫や愛犬との日常をAIの力で特別な思い出に変えるペット日記アプリです。写真や動画をアップロードして、ペットの「心の声」をAIが生成します。",
  keywords: ["ペット日記", "AI日記", "猫", "犬", "ペットメモリー", "Remotion", "Gemini API"],
  authors: [{ name: "NyanCapsule Team" }],
  creator: "NyanCapsule",
  publisher: "NyanCapsule",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "NyanCapsule | ペットとの思い出を形にする",
    description: "AIがペットの気持ちを代弁する、全く新しいペット日記体験。",
    url: "https://nyan-capsule.vercel.app",
    siteName: "NyanCapsule",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NyanCapsule | ペットとの思い出を形にする",
    description: "AIがペットの気持ちを代弁する、全く新しいペット日記体験。",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className={`${varela.variable} ${nunito.variable}`}>
        {children}
      </body>
    </html>
  );
}
