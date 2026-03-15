import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Image Enhancer - Upscale & Enhance Photos Online Free",
  description: "Free AI-powered image upscaler. Enhance photo quality, increase resolution by 2x or 4x. No watermarks, fast processing, privacy-first.",
  keywords: "ai image enhancer, ai image upscaler, enhance image quality, upscale image free, ai photo enhancer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
