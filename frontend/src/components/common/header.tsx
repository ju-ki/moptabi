'use client';
import { signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { MenuIcon } from 'lucide-react';
import useSWR from 'swr';
import { useState } from 'react';

import { useFetcher } from '@/hooks/use-fetcher';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import Notification from '../Notification';

// ユーザー情報の型定義
interface UserData {
  status: number;
  user: {
    id: string;
    role: 'ADMIN' | 'USER' | 'GUEST';
  };
}

const Header = () => {
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const { getFetcher, isSessionLoading, isAuthenticated } = useFetcher();
  const { toast } = useToast();

  // ログアウト処理（本番環境での問題を回避）
  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('ログアウトに失敗しました:', error);
      toast({
        title: 'ログアウトに失敗しました',
        description: '時間をおいて再度お試しください。',
        variant: 'destructive',
      });
    }
  };

  // ユーザー情報を取得（roleを含む）
  const { data: userData } = useSWR<UserData>(
    isAuthenticated && !isSessionLoading ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth` : null,
    getFetcher,
  );

  // ADMINロールかどうかをチェック
  const isAdmin = userData?.user.role === 'ADMIN';

  return (
    <header className="flex h-16 w-full items-center justify-between px-4 md:px-6 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center space-x-3">
        <Link href="/" className="mr-6 flex items-center gap-2" prefetch={false}>
          <Image src="/logo.svg" alt="MopTabi Logo" width={32} height={32} />
          <span className="text-xl md:text-xl lg:text-2xl font-semibold text-gray-800">モプタビ</span>
        </Link>
      </div>

      <div className="hidden lg:flex items-center space-x-6">
        {isAuthenticated && (
          <>
            {/* ADMINの場合のみ管理画面リンクを表示 */}
            {isAdmin && (
              <Link href="/admin" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
                管理画面
              </Link>
            )}
            <Link href="/wishlist" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              行きたいリスト
            </Link>
            <Link
              href="/plan/create"
              className="text-sm font-medium hover:underline underline-offset-4"
              prefetch={false}
            >
              プラン作成
            </Link>
            <Link href="/plan/list" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              プラン一覧
            </Link>
            <Link href="/mypage" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              マイページ
            </Link>
            <Notification />
            <Button onClick={handleSignOut}>ログアウト</Button>
          </>
        )}
        {!isAuthenticated && !isSessionLoading && (
          <Button onClick={async () => await signIn('google', { redirectTo: '/mypage' })}>ログイン</Button>
        )}
      </div>

      <div className="ml-auto flex items-center space-x-4 lg:hidden">
        {isAuthenticated && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <SheetTitle className="sr-only">ハンバーガーメニュー</SheetTitle>
                <SheetDescription className="sr-only">ハンバーガーメニュー</SheetDescription>
                <MenuIcon className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="grid gap-6 p-6">
                {/* モバイルメニューでもADMINの場合のみ管理画面リンクを表示 */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsSheetOpen(false)}
                    className="text-sm font-medium hover:underline underline-offset-4"
                    prefetch={false}
                  >
                    管理画面
                  </Link>
                )}
                <Link
                  href="/wishlist"
                  onClick={() => setIsSheetOpen(false)}
                  className="text-sm font-medium hover:underline underline-offset-4"
                  prefetch={false}
                >
                  行きたいリスト
                </Link>
                <Link
                  href="/"
                  onClick={() => setIsSheetOpen(false)}
                  className="text-sm font-medium hover:underline underline-offset-4"
                  prefetch={false}
                >
                  トップへ
                </Link>
                <Link
                  href="/plan/create"
                  onClick={() => setIsSheetOpen(false)}
                  className="text-sm font-medium hover:underline underline-offset-4"
                  prefetch={false}
                >
                  プラン作成
                </Link>
                <Link
                  href="/plan/list"
                  onClick={() => setIsSheetOpen(false)}
                  className="text-sm font-medium hover:underline underline-offset-4"
                  prefetch={false}
                >
                  プラン一覧
                </Link>
                <Link
                  href="/mypage"
                  onClick={() => setIsSheetOpen(false)}
                  className="text-sm font-medium hover:underline underline-offset-4"
                  prefetch={false}
                >
                  マイページ
                </Link>
                <button
                  onClick={async () => {
                    setIsSheetOpen(false);
                    await handleSignOut();
                  }}
                  className="text-sm font-medium hover:underline underline-offset-4 text-left"
                >
                  ログアウト
                </button>
              </div>
            </SheetContent>
          </Sheet>
        )}
        {!isAuthenticated && !isSessionLoading && (
          <Button onClick={async () => await signIn('google', { redirectTo: '/mypage' })}>ログイン</Button>
        )}
      </div>
    </header>
  );
};

export default Header;
