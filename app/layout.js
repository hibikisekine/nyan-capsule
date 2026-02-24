import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata = {
  title: "NyanCapsule | 猫との思い出カプセル",
  description: "猫ちゃんとの日々の思い出を動画と日記で残す、AIチャット・ダイジェストアプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NyanCapsule",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#fff9f2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className={outfit.className}>{children}</body>
    </html>
  );
}
