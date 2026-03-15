'use client';
import { useLang } from '@/lib/lang-context';

const icons = ['🧠', '⚡', '🎁', '🔒'];

export default function Features() {
  const { t } = useLang();
  const features = [
    { icon: icons[0], title: t('feat_1_title'), desc: t('feat_1_desc') },
    { icon: icons[1], title: t('feat_2_title'), desc: t('feat_2_desc') },
    { icon: icons[2], title: t('feat_3_title'), desc: t('feat_3_desc') },
    { icon: icons[3], title: t('feat_4_title'), desc: t('feat_4_desc') },
  ];

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{t('features_title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div key={i} className="text-center p-6 rounded-xl hover:bg-gray-50 transition">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
