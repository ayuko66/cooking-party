import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cooking Party",
  description: "AIシェフと料理を作ろう",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
