'use client';
import { useLang } from '@/lib/lang-context';

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="bg-white border-t border-gray-200 py-8 px-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500">{t('footer_copy')}</p>
        <div className="flex gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-gray-700 transition">{t('footer_privacy')}</a>
          <a href="#" className="hover:text-gray-700 transition">{t('footer_terms')}</a>
          <a href="#" className="hover:text-gray-700 transition">{t('footer_contact')}</a>
        </div>
      </div>
    </footer>
  );
}
