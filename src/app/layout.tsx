import type { Metadata } from "next";
import "./globals.css";
import { DevModeProvider } from "@/components/dev-mode-provider";
import { Suspense } from "react";

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
      <body>
        <Suspense>
          <DevModeProvider>
            {children}
          </DevModeProvider>
        </Suspense>
      </body>
    </html>
  );
}
