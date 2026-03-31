import Profile from '@/components/Profile';
import { LangProvider } from '@/lib/lang-context';

export const metadata = {
  title: 'My Profile - AI Image Enhancer',
  description: 'Manage your account, credits, and usage history.',
};

export default function ProfilePage() {
  return (
    <LangProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-16">
              <a href="/" className="text-xl font-bold text-indigo-600">← Back</a>
            </div>
          </div>
        </div>
        <Profile />
      </div>
    </LangProvider>
  );
}
