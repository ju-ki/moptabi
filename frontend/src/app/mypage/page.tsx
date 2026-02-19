'use client';

import { signOut } from 'next-auth/react';
import { LogOut, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileSection } from '@/components/mypage/ProfileSection';
import { NextTripSection } from '@/components/mypage/NextTripSection';
import { TripSummaryCards } from '@/components/mypage/TripSummaryCards';
import { UsageStatus } from '@/components/mypage/UsageStatus';
import { RecentTrips } from '@/components/mypage/RecentTrips';
import { useMypageData } from '@/hooks/use-mypage';

/**
 * マイページ
 * ユーザーの旅の活動状況を可視化し、次の旅へのモチベーションを高めるダッシュボード
 */
export default function MyPage() {
  const {
    nextTrip,
    visitedCount,
    wishlistCount,
    totalTripDays,
    planCount,
    planLimit,
    wishlistLimit,
    wishlistTotalCount,
    recentTrips,
    isLoading,
    error,
  } = useMypageData();

  // ローディング状態
  if (isLoading) {
    return (
      <div
        className="container mx-auto px-4 py-8 max-w-2xl flex flex-col items-center justify-center min-h-[50vh]"
        data-testid="mypage-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl" data-testid="mypage-error">
        <h1 className="text-2xl font-bold mb-6">マイページ</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">データの取得に失敗しました</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              再読み込み
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">マイページ</h1>

      <div className="space-y-6">
        {/* プロフィールセクション */}
        <Card>
          <CardContent className="pt-6">
            <ProfileSection />
          </CardContent>
        </Card>

        {/* 次の旅セクション */}
        <NextTripSection nextTrip={nextTrip} wishlistCount={wishlistCount} />

        {/* 旅のサマリーカード */}
        <TripSummaryCards visitedCount={visitedCount} wishlistCount={wishlistCount} totalTripDays={totalTripDays} />

        {/* 利用状況 */}
        <UsageStatus
          planCount={planCount}
          planLimit={planLimit}
          wishlistCount={wishlistTotalCount}
          wishlistLimit={wishlistLimit}
        />

        {/* 最近の旅 */}
        <RecentTrips trips={recentTrips} />

        {/* アカウントセクション */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <LogOut className="h-5 w-5 text-gray-500" />
              アカウント
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => signOut()}>
              ログアウト
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
