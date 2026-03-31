'use client';
import { useState } from 'react';
import { useLang } from '@/lib/lang-context';

export default function FAQ() {
  const { lang } = useLang();
  const [open, setOpen] = useState<number | null>(null);
  
  const faqs = lang === 'zh' ? [
    { q: '什么是 AI 图片增强器？', a: 'AI 图片增强器是一款免费在线工具，使用人工智能放大和增强照片。可将分辨率提升 2 倍或 4 倍，同时保持清晰度。' },
    { q: '支持哪些图片格式？', a: '支持 JPG、PNG 和 WebP 格式，最大文件大小为 10MB。' },
    { q: '真的免费吗？', a: '是的！每天都有免费增强次数。如需更多使用次数，可以购买实惠的积分包。' },
    { q: 'AI 增强是如何工作的？', a: '我们使用 Real-ESRGAN，这是一个在数百万张图片上训练的先进 AI 模型，能够智能放大和恢复照片细节。' },
    { q: '如何购买积分？', a: '登录后，在定价页面选择适合您的套餐，通过 PayPal 安全支付。' },
    { q: '积分会过期吗？', a: '购买的积分不会过期，您可以随时使用。' },
    { q: '处理图片需要多长时间？', a: '通常只需几秒钟即可完成，取决于图片大小和网络速度。' },
    { q: '我的图片会被保存吗？', a: '不会。处理完成后图片会立即从服务器删除，我们不会存储您的任何图片。' },
  ] : [
    { q: 'What is AI Image Enhancer?', a: 'AI Image Enhancer is a free online tool that uses artificial intelligence to upscale and enhance your photos. It can increase resolution by 2x or 4x while maintaining clarity.' },
    { q: 'What image formats are supported?', a: 'We support JPG, PNG, and WebP formats. Maximum file size is 10MB.' },
    { q: 'Is it really free?', a: 'Yes! You get free enhancements every day. For more usage, you can purchase affordable credit packs.' },
    { q: 'How does the AI enhancement work?', a: 'We use Real-ESRGAN, a state-of-the-art AI model trained on millions of images to intelligently upscale and restore photo details.' },
    { q: 'How do I purchase credits?', a: 'After signing in, choose a plan on the Pricing page and pay securely via PayPal.' },
    { q: 'Do credits expire?', a: 'No, purchased credits never expire. You can use them anytime.' },
    { q: 'How long does processing take?', a: 'Usually just a few seconds, depending on image size and network speed.' },
    { q: 'Are my images stored?', a: 'No. Images are deleted immediately after processing. We never store your photos.' },
  ];

  return (
    <section className="py-16 px-4 bg-gray-50" id="faq">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">
          {lang === 'zh' ? '常见问题' : 'Frequently Asked Questions'}
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition">
                <span className="font-medium text-gray-900">{faq.q}</span>
                <svg className={`w-5 h-5 text-gray-500 transition-transform ${open === i ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open === i && <div className="px-6 pb-4 text-gray-600 text-sm">{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
