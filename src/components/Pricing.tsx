'use client';
import { useState } from 'react';
import { useLang } from '@/lib/lang-context';
import { useAuth } from '@/lib/auth-context';

const PACKAGES = [
  { credits: 10, price: '0.99' },
  { credits: 50, price: '4.99' },
  { credits: 100, price: '9.99' },
];

export default function Pricing() {
  const { lang } = useLang();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);

  const packages = [
    { credits: 0, price: '0', name: lang === 'zh' ? '免费' : 'Free', type: 'free', desc: lang === 'zh' ? '3次使用' : '3 uses total', popular: false },
    ...PACKAGES.map((p, i) => ({ ...p, name: i === 0 ? 'Starter' : i === 1 ? 'Plus' : 'Pro', type: 'credit', desc: lang === 'zh' ? `${p.credits}次` : `${p.credits} uses`, popular: i === 2 })),
    { credits: 150, price: '2.99', name: lang === 'zh' ? '月卡' : 'Monthly', type: 'subscription', desc: lang === 'zh' ? '每天5次' : '5 uses/day', popular: false },
  ];

  const handleBuy = async (credits: string, price: string) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('openLogin'));
      return;
    }
    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.aiimageenhancer.xyz';
      const res = await fetch(`${API_BASE}/api/pay/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ price: parseFloat(price), credits: parseInt(credits) }),
      });
      const data = await res.json();
      if (data.approveUrl) {
        window.location.href = data.approveUrl;
      } else {
        alert('Error: ' + (data.error || 'Unknown'));
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      alert('Payment error');
      setLoading(false);
    }
  };

  return (
    <section className="py-20 px-4 bg-gray-50" id="pricing">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
          {lang === 'zh' ? '定价方案' : 'Pricing Plans'}
        </h2>
        <p className="text-center text-gray-600 mb-12">
          {lang === 'zh' ? '选择适合您的方案，解锁更多AI图片增强次数' : 'Choose the plan that works for you'}
        </p>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
          {packages.map((pkg: any) => (
            <div key={pkg.name} className={`relative bg-white rounded-2xl p-6 shadow-lg ${pkg.popular ? 'ring-2 ring-indigo-600' : ''} ${pkg.price === '0' ? 'border-2 border-dashed border-gray-300' : ''}`}>
              {pkg.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-sm px-3 py-1 rounded-full">{lang === 'zh' ? '最受欢迎' : 'Best Value'}</div>}
              <h3 className="text-lg font-bold text-gray-900 mb-1">{pkg.name}</h3>
              <p className="text-xs text-gray-500 mb-3">{pkg.desc}</p>
              <div className="mb-4">
                {pkg.price === '0' ? (
                  <span className="text-3xl font-bold">{lang === 'zh' ? '免费' : 'Free'}</span>
                ) : (
                  <span className="text-3xl font-bold">${pkg.price}{pkg.type === 'subscription' ? '/mo' : ''}</span>
                )}
              </div>
              <ul className="space-y-2 mb-6 text-sm text-gray-600">
                <li className="flex items-center gap-2">✓ {pkg.desc}</li>
                <li className="flex items-center gap-2">✓ {lang === 'zh' ? '高速处理' : 'Fast processing'}</li>
                <li className="flex items-center gap-2">✓ {lang === 'zh' ? '无水印' : 'No watermarks'}</li>
              </ul>
              <button onClick={() => pkg.type === 'free' ? window.dispatchEvent(new CustomEvent('openLogin')) : handleBuy(pkg.credits, pkg.price)} disabled={loading} className={`w-full py-3 px-4 rounded-lg font-medium transition ${pkg.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'} disabled:opacity-50`}>
                {loading ? '...' : pkg.price === '0' ? (lang === 'zh' ? '立即使用' : 'Get Started') : (lang === 'zh' ? '购买' : 'Buy Now')}
              </button>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-500 text-sm mt-8">
          {lang === 'zh' ? '支付由Paypal安全处理' : 'Payments securely processed by PayPal'}
        </p>
      </div>
    </section>
  );
}
