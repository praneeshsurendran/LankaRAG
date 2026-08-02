/**
 * app/layout.tsx — Root layout for LankaRAG Next.js app.
 *
 * Includes:
 *   - Google Fonts: Inter (body) + Outfit (display/headings)
 *   - Metadata for SEO
 *   - Global CSS
 */

import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LankaRAG — AI Travel Guide for Sri Lanka",
  description:
    "Discover Sri Lanka's best beaches, waterfalls, temples, historical sites, and national parks using multimodal AI. Powered by PostgreSQL, Pinecone, CLIP, and Google Gemini.",
  keywords: [
    "Sri Lanka",
    "tourism",
    "travel guide",
    "AI",
    "RAG",
    "Gemini",
    "Pinecone",
    "beaches",
    "waterfalls",
    "temples",
  ],
  authors: [{ name: "LankaRAG" }],
  openGraph: {
    title: "LankaRAG — AI Travel Guide for Sri Lanka",
    description: "Multimodal RAG-powered travel assistant for Sri Lanka tourism",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌴</text></svg>" />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
