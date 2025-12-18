'use client';

import React, { useState, useMemo } from 'react';
import { Asterisk, Heart, History, Search } from 'lucide-react';

import { useStoreForPlanning } from '@/lib/plan';
import { Spot } from '@/types/plan';
import { setStartTimeAutomatically } from '@/lib/algorithm';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import GoogleSpotSearch from './GoogleSpotSearch';
import WishlistSpotSearch from './WishlistSpotSearch';
import VisitedSpotSearch from './VisitedSpotSearch';

type SpotSelectionDialogProps = {
  date: string;
};

const SpotSelectionDialog = ({ date }: SpotSelectionDialogProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { setSpots, planErrors, plans } = useStoreForPlanning();

  // 選択済みスポットIDを取得
  const selectedSpotIds = useMemo(() => {
    return plans.find((plan) => plan.date === date)?.spots.map((s) => s.id) ?? [];
  }, [plans, date]);

  const handleSpotSelect = (spot: Spot, isDeleted: boolean) => {
    const updatedSpot = setStartTimeAutomatically(spot, plans.find((p) => p.date === date)?.spots ?? []);
    setSpots(date, updatedSpot, isDeleted);
  };

  return (
    <div>
      <div className="flex items-center gap-1">
        <div className="text-lg font-semibold text-gray-800 my-2 flex items-center space-x-2">
          <span>計画に追加するスポットを探す</span>
          <Asterisk className="text-red-500 h-4 w-4" />
        </div>
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
          </DialogHeader>

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
