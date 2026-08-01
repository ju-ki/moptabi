'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileSection } from '@/components/mypage/ProfileSection';
import { NextTripSection } from '@/components/mypage/NextTripSection';
import { TripSummaryCards } from '@/components/mypage/TripSummaryCards';
import { UsageStatus } from '@/components/mypage/UsageStatus';
import { RecentTrips } from '@/components/mypage/RecentTrips';
import { useMypageData } from '@/hooks/use-mypage';
import LoadingState from '@/components/common/LoadingState';
import { UserLocation } from '@/components/mypage';
import { useToast } from '@/hooks/use-toast';

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
    userLocations,
    isLoading,
    error,
    postUserLocation,
    updateUserLocation,
    deleteUserLocation,
  } = useMypageData();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut({ redirectTo: '/' });
    } catch (error) {
      console.error('ログアウトに失敗しました:', error);
      toast({
        title: 'ログアウトに失敗しました',
        description: '時間をおいて再度お試しください。',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || error) {
    return <LoadingState isLoading={isLoading} error={!!error} />;
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

        {/* ユーザーお気に入り地点セクション */}
        <UserLocation
          userLocationList={userLocations}
          postUserLocation={postUserLocation}
          updateUserLocation={updateUserLocation}
          deleteUserLocation={deleteUserLocation}
        />

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
            <Button variant="outline" className="w-full" onClick={async () => handleSignOut()}>
              ログアウト
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
