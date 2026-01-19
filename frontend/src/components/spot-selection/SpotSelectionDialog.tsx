'use client';

import React, { useState, useMemo } from 'react';
import { AlertCircle, Asterisk, Heart, History, Search } from 'lucide-react';

import { useStoreForPlanning } from '@/lib/plan';
import { Spot } from '@/types/plan';
import { setStartTimeAutomatically } from '@/lib/algorithm';
import { APP_LIMITS } from '@/data/constants';
import { isSpotsPerDayLimitReached, getLimitErrorMessage, getRemainingCount } from '@/lib/limits';
import { getActualSpotCount } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LimitDisplay } from '../common/LimitDisplay';
import GoogleSpotSearch from './GoogleSpotSearch';
import WishlistSpotSearch from './WishlistSpotSearch';
import VisitedSpotSearch from './VisitedSpotSearch';

type SpotSelectionDialogProps = {
  date: string;
};

const SpotSelectionDialog = ({ date }: SpotSelectionDialogProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { setSpots, planErrors, plans } = useStoreForPlanning();
  const { toast } = useToast();

  // 現在の日のスポット数を取得（出発地と目的地は除外）
  const currentSpotCount = useMemo(() => {
    const spots = plans.find((plan) => plan.date === date)?.spots ?? [];
    return getActualSpotCount(spots);
  }, [plans, date]);

  // 上限に達しているかチェック
  const isLimitReached = isSpotsPerDayLimitReached(currentSpotCount);
  const remainingCount = getRemainingCount(currentSpotCount, APP_LIMITS.MAX_SPOTS_PER_DAY);

  // 選択済みスポットIDを取得
  const selectedSpotIds = useMemo(() => {
    return plans.find((plan) => plan.date === date)?.spots.map((s) => s.id) ?? [];
  }, [plans, date]);

  const handleSpotSelect = (spot: Spot, isDeleted: boolean) => {
    // 削除の場合は上限チェックをスキップ
    if (!isDeleted && isLimitReached) {
      toast({
        title: '追加上限に達しています',
        description: getLimitErrorMessage('spotsPerDay'),
        variant: 'destructive',
      });
      return;
    }
    const updatedSpot = setStartTimeAutomatically(spot, plans.find((p) => p.date === date)?.spots ?? []);
    setSpots(date, updatedSpot, isDeleted);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-1">
        <div className="text-lg font-semibold text-gray-800 my-2 flex items-center space-x-2">
          <span>計画に追加するスポットを探す</span>
          <Asterisk className="text-red-500 h-4 w-4" />
        </div>
        {/* スポット数表示 */}
        <LimitDisplay
          current={currentSpotCount}
          limit={APP_LIMITS.MAX_SPOTS_PER_DAY}
          label="本日のスポット"
          size="sm"
        />
      </div>

      {planErrors[date]?.spots && <div className="text-sm text-red-600">{planErrors[date].spots}</div>}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant={'outline'} id="spot-search" role="button">
            <span>観光地を選択</span>
            <Search className="ml-2 h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>観光地を検索</DialogTitle>
            <DialogDescription>
              {/* 上限表示とメッセージ */}
              <div className="flex items-center justify-between mt-2">
                <LimitDisplay
                  current={currentSpotCount}
                  limit={APP_LIMITS.MAX_SPOTS_PER_DAY}
                  label="本日のスポット"
                  data-testid="spot-count-display"
                />
                {!isLimitReached && remainingCount <= 3 && (
                  <span className="text-yellow-600 text-sm">あと{remainingCount}件追加できます</span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {/* 上限警告 */}
          {isLimitReached && (
            <div className="my-2 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">
                本日のスポット数が上限（{APP_LIMITS.MAX_SPOTS_PER_DAY}件）に達しています。
                追加するには既存のスポットを削除してください。
              </p>
            </div>
          )}

          {/* タブ切り替え */}
          <Tabs defaultValue="google" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="google" role="tab">
                <Search className="mr-2 h-4 w-4" />
                Google検索
              </TabsTrigger>
              <TabsTrigger value="wishlist" role="tab">
                <Heart className="mr-2 h-4 w-4" />
                行きたいリスト
              </TabsTrigger>
              <TabsTrigger value="visited" role="tab">
                <History className="mr-2 h-4 w-4" />
                過去のスポット
              </TabsTrigger>
            </TabsList>

            <TabsContent value="google" className="mt-4" data-testid="google-search-form">
              <GoogleSpotSearch date={date} selectedSpotIds={selectedSpotIds} onSpotSelect={handleSpotSelect} />
            </TabsContent>

            <TabsContent value="wishlist" className="mt-4" data-testid="wishlist-content">
              <WishlistSpotSearch date={date} selectedSpotIds={selectedSpotIds} onSpotSelect={handleSpotSelect} />
            </TabsContent>

            <TabsContent value="visited" className="mt-4" data-testid="visited-content">
              <VisitedSpotSearch date={date} selectedSpotIds={selectedSpotIds} onSpotSelect={handleSpotSelect} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpotSelectionDialog;
