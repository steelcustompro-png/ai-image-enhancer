import type { Metadata } from 'next';
import { LangProvider } from '@/lib/lang-context';
import { AuthProvider } from '@/lib/auth-context';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://aiimageenhancer.xyz'),
  title: {
    default: 'AI Image Enhancer - Super Resolution & Upscale Your Photos',
    template: '%s | AI Image Enhancer'
  },
  description: 'Enhance your images with AI-powered super resolution. Upscale photos by 2x or 4x without quality loss. Free to start, secure payment via PayPal.',
  keywords: ['AI image enhancer', 'image upscale', 'photo enhancement', 'super resolution', 'AI upscaling', 'image quality improvement', 'photo upscaler', 'enhance photo quality', 'AI photo editor', 'free image enhancer'],
  authors: [{ name: 'AI Image Enhancer' }],
  creator: 'AI Image Enhancer',
  publisher: 'AI Image Enhancer',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://aiimageenhancer.xyz',
    siteName: 'AI Image Enhancer',
    title: 'AI Image Enhancer - Super Resolution & Upscale Your Photos',
    description: 'Enhance your images with AI-powered super resolution. Upscale photos by 2x or 4x without quality loss.',
    images: [
      {
        url: 'https://aiimageenhancer.xyz/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI Image Enhancer - Upscale Your Photos'
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Image Enhancer - Super Resolution & Upscale Your Photos',
    description: 'Enhance your images with AI-powered super resolution. Upscale photos by 2x or 4x without quality loss.',
    images: ['https://aiimageenhancer.xyz/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://aiimageenhancer.xyz',
    languages: {
      'en': 'https://aiimageenhancer.xyz',
      'zh': 'https://aiimageenhancer.xyz?lang=zh',
    },
  },
  category: 'technology',
  classification: 'AI Image Processing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        <script
          async
          defer
          crossOrigin="anonymous"
          src="https://connect.facebook.net/en_US/sdk.js"
          dangerouslySetInnerHTML={{
            __html: `
              window.fbAsyncInit = function() {
                FB.init({
                  appId: '123456789',
                  cookie: true,
                  xfbml: true,
                  version: 'v18.0'
                });
              };
            `
          }}
        ></script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "AI Image Enhancer",
              "description": "Enhance your images with AI-powered super resolution. Upscale photos by 2x or 4x without quality loss.",
              "url": "https://aiimageenhancer.xyz",
              "applicationCategory": "GraphicsApplication",
              "operatingSystem": "All",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "AI-powered image enhancement",
                "2x and 4x upscaling",
                "Free daily uses",
                "Secure PayPal payment",
                "No watermarks"
              ]
            })
          }}
        />
      </head>
      <body>
        <LangProvider>
          <AuthProvider>
            <Header />
            {children}
            <Footer />
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
