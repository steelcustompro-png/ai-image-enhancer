'use client';
import { useState, useRef, useCallback } from 'react';
import { useLang } from '@/lib/lang-context';
import { useAuth } from '@/lib/auth-context';

export default function Hero() {
  const { t } = useLang();
  const { token, usage, refreshUsage } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [scale, setScale] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return;
    if (f.size > 10 * 1024 * 1024) return;
    setFile(f);
    setResult('');
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleEnhance = async () => {
    if (!file) return;
    setLoading(true);
    setProgress('Uploading & enhancing...');
    try {
      // Convert file to base64
      const imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.aiimageenhancer.xyz';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiBase}/api/enhance`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: imageBase64, scale }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResult(url);
      await refreshUsage();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Enhancement failed. Please try again.');
    }
    setLoading(false);
    setProgress('');
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result;
    a.download = `enhanced-${scale}x-${file?.name || 'image.png'}`;
    a.click();
  };

  const reset = () => {
    setFile(null);
    setPreview('');
    setResult('');
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{t('hero_title')}</h1>
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="text-sm text-gray-500">⭐⭐⭐⭐⭐ </span>
          <span className="text-sm text-gray-500">4.8 (10,000+ reviews) </span>
        </div>
        <p className="text-lg text-gray-600 mb-10">{t('hero_subtitle')}</p>

        <div className="flex items-center justify-center gap-8 mb-8 text-sm text-gray-500">
          <span>✅ {t('step_1')}</span>
          <span>→</span>
          <span>✨ {t('step_2')}</span>
          <span>→</span>
          <span>⬇️ {t('step_3')}</span>
        </div>
        <p className="text-sm text-gray-400 mb-6">{t('step_hint')}</p>

        {!file ? (
          <div
            className={`border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all ${
              dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <div className="text-5xl mb-4">🖼️</div>
            <p className="text-lg font-semibold text-gray-700">{t('upload_title')}</p>
            <p className="text-gray-500 mt-1">{t('upload_or')}</p>
            <p className="text-sm text-gray-400 mt-3">{t('upload_hint')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Scale selector */}
            {!result && (
              <div className="flex items-center justify-center gap-4">
                <span className="text-sm font-medium text-gray-700">{t('scale_label')}:</span>
                {[2, 4].map((s) => (
                  <button key={s} onClick={() => setScale(s)}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                      scale === s
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-indigo-400'
                    }`}>
                    {s === 2 ? t('scale_2x') : t('scale_4x')}
                  </button>
                ))}
              </div>
            )}

            {/* Image preview */}
            <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Close / remove image button */}
              {!loading && (
                <button onClick={reset}
                  className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                  aria-label="Remove image">
                  ✕
                </button>
              )}
              {result ? (
                <div className="grid grid-cols-2 gap-0">
                  <div className="relative">
                    <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">{t('preview_before')}</div>
                    <img src={preview} alt="Before" className="w-full h-auto" />
                  </div>
                  <div className="relative">
                    <div className="absolute top-3 left-3 bg-indigo-600 text-white text-xs px-2 py-1 rounded">{t('preview_after')}</div>
                    <img src={result} alt="After" className="w-full h-auto" />
                  </div>
                </div>
              ) : (
                <img src={preview} alt="Preview" className="w-full h-auto max-h-96 object-contain p-4" />
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-4">
              {!result ? (
                <button onClick={handleEnhance} disabled={loading}
                  className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-200">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      {progress || t('btn_enhancing')}
                    </span>
                  ) : t('btn_enhance')}
                </button>
              ) : (
                <>
                  <button onClick={handleDownload}
                    className="px-8 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200">
                    {t('btn_download')}
                  </button>
                  <button onClick={reset}
                    className="px-8 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition">
                    {t('btn_new')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
