'use client';

import { useSession } from 'next-auth/react';
import useSWR from 'swr';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFetcher } from '@/hooks/use-fetcher';

// ユーザー情報の型定義
interface UserData {
  status: number;
  user: {
    id: string;
    role: 'ADMIN' | 'USER' | 'GUEST';
    name: string;
    image: string;
    email: string;
  };
}

/**
 * プロフィールセクションコンポーネント
 * ユーザーのアイコン、名前、メールアドレスを表示
 */
export function ProfileSection() {
  const { data: session, status } = useSession();
  const { getFetcher } = useFetcher();
  const { data: userData, isLoading } = useSWR<UserData>(
    session ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth` : null,
    getFetcher,
  );
  if (isLoading) {
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

  const userName = userData?.user.name || 'ユーザー';
  const userEmail = userData?.user.email || '';
  const userImageUrl = userData?.user.image || '';

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
