import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lucid — DeFi Portfolio Explainer",
  description:
    "AI-powered DeFi portfolio analysis. Paste a wallet, get plain English insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-[#F5F0E8]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
