'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLang } from '@/lib/lang-context';


export default function Profile() {
  const { user, loading, token } = useAuth();
  const { lang, t } = useLang();
  const [history, setHistory] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'usage' | 'payments'>('usage');
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPaymentStatus(params.get('payment'));
  }, []);

  useEffect(() => {
    if (token && !loading) {
      fetchHistory();
      fetchPayments();
    }
  }, [token, loading]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.aiimageenhancer.xyz';
      const res = await fetch(`${API_BASE}/api/auth/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setHistory(data.records || []);
    } catch (e) {
      console.error(e);
    }
    setLoadingHistory(false);
  };

  const fetchPayments = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.aiimageenhancer.xyz';
      const res = await fetch(`${API_BASE}/api/pay/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPayments(data.records || []);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* 支付状态提示 */}
      {paymentStatus === 'success' && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-center font-medium">
          🎉 {lang === 'zh' ? '支付成功！积分已到账，感谢支持！' : 'Payment successful! Credits have been added. Thank you!'}
        </div>
      )}
      {paymentStatus === 'error' && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-center font-medium">
          ❌ {lang === 'zh' ? '支付处理失败，请联系客服。' : 'Payment processing failed. Please contact support.'}
        </div>
      )}

      {/* User Info Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.email[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">{user.name || user.email}</h2>
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-indigo-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-indigo-600">{user.credits}</p>
            <p className="text-sm text-gray-600">{lang === 'zh' ? '剩余积分' : 'Credits'}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{user.plan === 'paid' ? 'Pro' : 'Free'}</p>
            <p className="text-sm text-gray-600">{lang === 'zh' ? '当前套餐' : 'Plan'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'usage' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {lang === 'zh' ? '使用记录' : 'Usage History'}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'payments' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {lang === 'zh' ? '充值记录' : 'Payment History'}
        </button>
      </div>

      {/* History List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {activeTab === 'usage' && (
          <>
            {loadingHistory ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {lang === 'zh' ? '暂无使用记录' : 'No usage history'}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{lang === 'zh' ? '时间' : 'Time'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{lang === 'zh' ? '操作' : 'Action'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">{lang === 'zh' ? '变化' : 'Change'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.created_at)}</td>
                      <td className="px-4 py-3 text-sm">
                        {lang === 'zh' ? `图片放大 ${item.scale}x` : `Image ${item.scale}x upscale`}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 text-right">-1</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === 'payments' && (
          <>
            {payments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {lang === 'zh' ? '暂无充值记录' : 'No payment history'}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{lang === 'zh' ? '时间' : 'Time'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{lang === 'zh' ? '金额' : 'Amount'}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">{lang === 'zh' ? '状态' : 'Status'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">{lang === 'zh' ? '积分' : 'Credits'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((item, i) => {
                    const isSuccess = item.status === 'completed';
                    return (
                      <tr key={i}>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.created_at)}</td>
                        <td className="px-4 py-3 text-sm">${item.amount}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {isSuccess
                              ? (lang === 'zh' ? '✓ 成功' : '✓ Success')
                              : (lang === 'zh' ? '✗ 失败' : '✗ Failed')}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${isSuccess ? 'text-green-600' : 'text-gray-400'}`}>
                          {isSuccess ? `+${item.credits}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
