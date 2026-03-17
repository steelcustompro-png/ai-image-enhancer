'use client';
import { LangProvider } from '@/lib/lang-context';
import { AuthProvider } from '@/lib/auth-context';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <LangProvider>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <Hero />
          <Features />
          <FAQ />
          <Footer />
        </div>
      </AuthProvider>
    </LangProvider>
  );
}
