'use client';

import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// ダミー滞在時間データ
const dummyActivityData = [
  {
    userId: 'user_2abc123def456',
    userName: '山田 太郎',
    page: 'wishlist',
    pageName: '行きたいリスト',
    avgDuration: 245, // 秒
    visits: 42,
    lastVisit: '2024-12-28 14:30',
  },
  {
    userId: 'user_2abc123def456',
    userName: '山田 太郎',
    page: 'plan-create',
    pageName: 'プラン作成',
    avgDuration: 520,
    visits: 15,
    lastVisit: '2024-12-27 10:15',
  },
  {
    userId: 'user_2abc123def456',
    userName: '山田 太郎',
    page: 'plan-detail',
    pageName: 'プラン詳細',
    avgDuration: 180,
    visits: 28,
    lastVisit: '2024-12-28 16:45',
  },
  {
    userId: 'user_3bcd234efg567',
    userName: '佐藤 花子',
    page: 'wishlist',
    pageName: '行きたいリスト',
    avgDuration: 380,
    visits: 89,
    lastVisit: '2024-12-28 12:00',
  },
  {
    userId: 'user_3bcd234efg567',
    userName: '佐藤 花子',
    page: 'plan-create',
    pageName: 'プラン作成',
    avgDuration: 720,
    visits: 32,
    lastVisit: '2024-12-26 18:30',
  },
  {
    userId: 'user_3bcd234efg567',
    userName: '佐藤 花子',
    page: 'plan-detail',
    pageName: 'プラン詳細',
    avgDuration: 210,
    visits: 56,
    lastVisit: '2024-12-28 09:20',
  },
  {
    userId: 'user_4cde345fgh678',
    userName: '鈴木 一郎',
    page: 'wishlist',
    pageName: '行きたいリスト',
    avgDuration: 120,
    visits: 12,
    lastVisit: '2024-12-25 20:00',
  },
  {
    userId: 'user_4cde345fgh678',
    userName: '鈴木 一郎',
    page: 'plan-create',
    pageName: 'プラン作成',
    avgDuration: 450,
    visits: 8,
    lastVisit: '2024-12-24 15:45',
  },
  {
    userId: 'user_5def456ghi789',
    userName: '田中 美咲',
    page: 'wishlist',
    pageName: '行きたいリスト',
    avgDuration: 560,
    visits: 156,
    lastVisit: '2024-12-28 17:30',
  },
  {
    userId: 'user_5def456ghi789',
    userName: '田中 美咲',
    page: 'plan-create',
    pageName: 'プラン作成',
    avgDuration: 890,
    visits: 45,
    lastVisit: '2024-12-27 21:00',
  },
];

// 秒を分:秒形式に変換
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分${secs}秒`;
};

/**
 * ユーザー滞在時間管理コンポーネント
 */
export const UserActivity = () => {
  const [filterPage, setFilterPage] = useState<string>('all');

  const filteredData =
    filterPage === 'all' ? dummyActivityData : dummyActivityData.filter((item) => item.page === filterPage);

  // ページ別サマリー
  const pageSummary = {
    wishlist: dummyActivityData.filter((d) => d.page === 'wishlist'),
    'plan-create': dummyActivityData.filter((d) => d.page === 'plan-create'),
    'plan-detail': dummyActivityData.filter((d) => d.page === 'plan-detail'),
  };

  const calculateAvg = (data: typeof dummyActivityData) => {
    if (data.length === 0) return 0;
    return Math.round(data.reduce((sum, d) => sum + d.avgDuration, 0) / data.length);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">滞在時間管理</h2>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">行きたいリスト</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(calculateAvg(pageSummary.wishlist))}</div>
            <p className="text-xs text-muted-foreground">平均滞在時間</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">プラン作成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(calculateAvg(pageSummary['plan-create']))}</div>
            <p className="text-xs text-muted-foreground">平均滞在時間</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">プラン詳細</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(calculateAvg(pageSummary['plan-detail']))}</div>
            <p className="text-xs text-muted-foreground">平均滞在時間</p>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">ページで絞り込み:</span>
        <Select value={filterPage} onValueChange={setFilterPage}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="すべて" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="wishlist">行きたいリスト</SelectItem>
            <SelectItem value="plan-create">プラン作成</SelectItem>
            <SelectItem value="plan-detail">プラン詳細</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 詳細テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ユーザー別滞在時間</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ユーザー</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ページ</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">平均滞在時間</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">訪問回数</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">最終訪問</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={`${item.userId}-${item.page}-${index}`} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{item.userName}</div>
                      <div className="text-xs text-muted-foreground">{item.userId.substring(0, 15)}...</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{item.pageName}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">{formatDuration(item.avgDuration)}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="secondary">{item.visits}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{item.lastVisit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivity;
