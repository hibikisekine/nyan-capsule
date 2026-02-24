import { Inter, Outfit, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: '--font-outfit',
});

const notoJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ['400', '700', '900'],
  variable: '--font-noto-jp',
});

export const metadata = {
  title: "NyanCapsule | Pet Memory Capsule",
  description: "Capture precious moments with your pets assisted by AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${notoJP.variable}`}>
        {children}
      </body>
    </html>
  );
}
