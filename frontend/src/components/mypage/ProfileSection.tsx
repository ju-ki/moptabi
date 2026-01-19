'use client';

import { useUser } from '@clerk/nextjs';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * プロフィールセクションコンポーネント
 * ユーザーのアイコン、名前、メールアドレスを表示
 */
export function ProfileSection() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-4 animate-pulse">
        <div className="h-16 w-16 rounded-full bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const userName = user?.fullName || user?.firstName || 'ユーザー';
  const userEmail = user?.primaryEmailAddress?.emailAddress || '';
  const userImageUrl = user?.imageUrl || '';

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16">
        <AvatarImage src={userImageUrl} alt="ユーザーアイコン" />
        <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div>
        <h2 className="text-xl font-bold text-gray-900">{userName}</h2>
        {userEmail && <p className="text-sm text-gray-500">{userEmail}</p>}
      </div>
    </div>
  );
}
