'use client';

import { Users, MapPin, Calendar } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsType } from '@/models/admin';

/**
 * 管理画面ダッシュボード
 * システム全体のサマリーを表示
 */
export const Dashboard = ({ stats }: { stats: StatsType }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">ダッシュボード</h2>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総ユーザー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              今月のアクティブユーザー数: {stats.activeUserCountFromLastMonth}人
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総プラン数</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tripStats.totalPlans}</div>
            <p className="text-xs text-muted-foreground">今月: {stats.tripStats.planIncreaseFromLastMonth}件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">行きたいリスト総数</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.wishlistStats.totalWishlist}</div>
            <p className="text-xs text-muted-foreground">今月: {stats.wishlistStats.wishlistIncreaseFromLastMonth}件</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
