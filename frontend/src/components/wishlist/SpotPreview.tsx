import React, { useEffect, useState } from 'react';
import { ChevronDown, Clock, Link, MapPin, Plus, Star } from 'lucide-react';
import Image from 'next/image';

import { useWishlistStore } from '@/store/wishlist/wishlistStore';
import { placeTypeMap } from '@/data/constants';
import { useToast } from '@/hooks/use-toast';
import { WishlistType } from '@/types/wishlist';
import { useFetchWishlist } from '@/hooks/use-wishlist';

import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface SpotPreviewProps {
  onBack: () => void;
}

const SpotPreview: React.FC<SpotPreviewProps> = ({ onBack }) => {
  const { toast } = useToast();
  const wishlistStore = useWishlistStore();
  const spot = wishlistStore.getSelectedSpot();
  const [isAlreadyAdded, setIsAlreadyAdded] = useState<boolean>(false);
  const { postWishlist } = useFetchWishlist();
  const [memo, setMemo] = useState('');
  const [priority, setPriority] = useState<number>(3);

  useEffect(() => {
    if (spot?.id) {
      setIsAlreadyAdded(wishlistStore.isAlreadyAddedWishlist(spot.id));
    }
  });

  const getDayName = (day: number): string => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[day];
  };

  const formatTime = (hour: number, minute: number): string => {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const formatOpeningHours = (
    periods: google.maps.places.OpeningHoursPeriod[] | null,
  ): string | { day: string; hours: string }[] => {
    if (!periods || periods.length === 0) return '営業時間情報なし';

    if (periods.length === 1 && !periods[0].close) {
      return '24時間営業';
    }

    const hoursByDay: Record<number, string[]> = {};
    periods.forEach((period) => {
      const day = period.open.day;
      const openTime = formatTime(period.open.hour, period.open.minute);
      const closeTime = period.close ? formatTime(period.close.hour, period.close.minute) : '24:00';

      if (!hoursByDay[day]) {
        hoursByDay[day] = [];
      }
      hoursByDay[day].push(`${openTime}-${closeTime}`);
    });

    const sortedDays = Object.keys(hoursByDay).sort((a, b) => Number(a) - Number(b));

    return sortedDays.map((day) => ({
      day: getDayName(Number(day)),
      hours: hoursByDay[Number(day)].join(', '),
    }));
  };

  if (!spot) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
        <MapPin size={48} className="mb-4 sm:w-16 sm:h-16" />
        <div>
          <p className="text-base sm:text-lg font-medium mb-2">スポットを選択してください</p>
          <p className="text-sm text-center">左側の検索結果からスポットを選択すると</p>
          <p className="text-sm text-center">詳細情報が表示されます</p>
        </div>
      </div>
    );
  }

  const handleAddWishlist = async () => {
    if (spot) {
      const targetWishlist: WishlistType = {
        spotId: spot.id,
        spot: {
          id: spot.id,
          meta: {
            id: spot.id,
            spotId: spot.id,
            name: spot.location.name || '',
            latitude: spot.location.lat,
            longitude: spot.location.lng,
            image: spot.image,
            rating: spot.rating ?? 0,
            categories: spot.category,
            description: spot.description,
          },
        },
        memo: memo,
        priority: priority,
        visited: 0,
        visitedAt: null,
      };
      try {
        postWishlist(targetWishlist).then((response) => {
          if (response.ok) {
            wishlistStore.addWishlist(targetWishlist);
            wishlistStore.setSelectedSpot(null);
            // 初期化
            setMemo('');
            setPriority(3);
            toast({
              title: 'スポットが行きたいリストに追加されました',
              description: '行きたいリストにスポットの追加に成功しました。',
              variant: 'success',
            });
          } else {
            throw new Error('スポットの追加に失敗しました');
          }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast({ title: 'スポットの追加に失敗しました', description: errorMessage, variant: 'destructive' });
      }
    }
  };

  return (
    <>
      {/* Mobile Back Button */}
      <div className="lg:hidden p-4 border-b">
        <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
          <ChevronDown size={20} className="rotate-90" />
          <span className="text-sm font-medium">検索結果に戻る</span>
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="relative h-48 sm:h-64 md:h-80 bg-gray-100">
          <Image src={spot.image || '/placeholder.jpg'} alt={spot.location.name || ''} fill className="object-cover" />
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{spot.location.name}</h3>
            <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Star size={18} className="fill-yellow-400 text-yellow-400 sm:w-5 sm:h-5" />
                <span className="text-base sm:text-lg font-semibold">{spot.rating}</span>
                <span className="text-xs sm:text-sm text-gray-500">({spot.ratingCount}件のレビュー)</span>
              </div>
              {spot.category?.slice(0, 2).map((t: string) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  {placeTypeMap[t] ?? 'その他'}
                </Badge>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-gray-600">
                <MapPin size={16} className="mt-1 flex-shrink-0" />
                <span className="text-sm">{spot.address}</span>
              </div>
              {spot.url && spot.url !== '' && (
                <div className="flex items-start gap-2 text-gray-600">
                  <Link size={16} className="mt-1 flex-shrink-0" />
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={spot.url}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    外部サイトへ
                  </a>
                </div>
              )}
            </div>
          </div>

          {spot.regularOpeningHours && (
            <div className="space-y-2 p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock size={16} className="mt-1 flex-shrink-0 text-gray-600" />
                <div className="flex-1">
                  <span className="font-semibold text-gray-900 text-sm">営業時間</span>
                  <div className="mt-2 space-y-1">
                    {(() => {
                      const hours = formatOpeningHours(spot.regularOpeningHours.periods);
                      if (typeof hours === 'string') {
                        return <div className="text-sm text-gray-600">{hours}</div>;
                      } else {
                        return (hours as { day: string; hours: string }[]).map(
                          (item: { day: string; hours: string }, idx: number) => (
                            <div key={idx} className="flex gap-2 sm:gap-3 text-xs sm:text-sm">
                              <span className="font-medium text-gray-700 w-5 sm:w-6">{item.day}</span>
                              <span className="text-gray-600 text-xs sm:text-sm">{item.hours}</span>
                            </div>
                          ),
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="memo">メモ（オプション）</Label>
            <textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="このスポットについてのメモを入力..."
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>優先度</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={24}
                  onClick={() => setPriority(star)}
                  className={`cursor-pointer transition-colors sm:w-7 sm:h-7 ${
                    star <= priority ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t bg-gray-50">
          {isAlreadyAdded ? (
            <Button onClick={handleAddWishlist} size="lg" className="w-full text-sm sm:text-base">
              <Plus className="mr-2" size={20} />
              行きたいリストから削除する
            </Button>
          ) : (
            <Button onClick={handleAddWishlist} size="lg" className="w-full text-sm sm:text-base">
              <Plus className="mr-2" size={20} />
              行きたいリストに追加
            </Button>
          )}
        </div>
      </ScrollArea>
    </>
  );
};

export default SpotPreview;
