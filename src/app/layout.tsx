import type { Metadata } from "next";
import { Big_Shoulders_Display, Public_Sans } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});

const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Tiger Bus 調度系統",
  description: "巴士調度派遣管理系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${display.variable} ${body.variable}`}>
        {children}
      </body>
    </html>
  );
}
