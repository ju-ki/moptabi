import { CalendarIcon, CheckCircle, Clock, MapPin, Star, Trash2, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import React, { useState } from 'react';

import { WishlistType } from '@/types/wishlist';
import { useFetchWishlist } from '@/hooks/use-wishlist';
import { useWishlistStore } from '@/store/wishlist/wishlistStore';
import { formatTimeDate } from '@/lib/utils';
import { placeTypeMap } from '@/data/constants';

import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface WishlistSpotInfoCardProps {
  item: WishlistType;
  idx: number;
}

const WishlistSpotInfoCard = ({ item, idx }: WishlistSpotInfoCardProps) => {
  const wishlistStore = useWishlistStore();
  const { updateWishlist, deleteWishlist } = useFetchWishlist();
  const getItemKey = (item: WishlistType, idx: number) => (typeof item.id === 'string' ? item.id : String(idx));
  const key = getItemKey(item, idx);

  const [visitedAt, setVisitedAt] = useState<{ [id: string]: string | null }>({});
  const [editMemo, setEditMemo] = useState<{ [id: string]: string }>({});

  const handleVisitedAtChange = async (date: Date | undefined) => {
    if (date) {
      const dateString = date.toLocaleDateString('sv-SE');
      setVisitedAt((prev) => ({ ...prev, [key]: dateString }));
      if (item.visited === 1) {
        wishlistStore.updateWishlist({ ...item, visitedAt: dateString });
        await updateWishlist({ ...item, visitedAt: dateString });
      }
    } else {
      setVisitedAt((prev) => ({ ...prev, [key]: null }));
    }
  };

  const handleMemoChange = (id: string, value: string) => {
    setEditMemo((prev) => ({ ...prev, [id]: value }));
  };

  const handleMemoSave = async (item: WishlistType, idx: number) => {
    wishlistStore.updateWishlist({ ...item, memo: editMemo[key] ?? item.memo });
    await updateWishlist({ ...item, memo: editMemo[key] ?? item.memo });
  };

  const handlePriorityChange = async (item: WishlistType, priority: number) => {
    wishlistStore.updateWishlist({ ...item, priority });
    await updateWishlist({ ...item, priority: priority });
  };

  const handleToggleVisited = async (item: WishlistType) => {
    const isCurrentlyVisited = item.visited === 1;

    if (isCurrentlyVisited) {
      wishlistStore.updateWishlist({ ...item, visited: 0, visitedAt: null });
      await updateWishlist({ ...item, visited: 0, visitedAt: null });
      setVisitedAt((prev) => ({ ...prev, [key]: null }));
    } else {
      const today = new Date().toLocaleDateString('sv-SE');
      const selectedVisitedAt = visitedAt[key] ?? today;
      setVisitedAt((prev) => ({ ...prev, [key]: selectedVisitedAt }));
      wishlistStore.updateWishlist({ ...item, visited: 1, visitedAt: selectedVisitedAt });
      await updateWishlist({ ...item, visited: 1, visitedAt: selectedVisitedAt });
    }
  };

  const handleToggleDeleted = async (id: number) => {
    if (!id || id === 0) {
      console.error('Invalid item id');
      return;
    }
    wishlistStore.setWishlist(wishlistStore.getSortAndFilteredWishlist().filter((val) => val.id !== id));
    await deleteWishlist(id);
  };

  const renderStars = (item: WishlistType) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          aria-label={`星${star}`}
          role="button"
          key={star}
          size={20}
          className={`${
            star <= item.priority ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          } cursor-pointer hover:scale-125 transition-all duration-200 hover:drop-shadow-md`}
          onClick={() => handlePriorityChange(item, star)}
        />
      ))}
    </div>
  );

  return (
    <div
      key={key}
      className={`group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
        item.visited ? 'opacity-70' : ''
      }`}
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        <Image
          width={200}
          height={200}
          src={item.spot.meta.image || './placeholder.jpg'}
          alt={item.spot.meta.name || 'スポット画像'}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {item.visited && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
            <CheckCircle size={14} />
            訪問済み
          </div>
        )}

        {/* 優先度を画像上部に表示 */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={14}
                className={star <= item.priority ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title & Rating */}
        <div className="mb-3">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{item.spot.meta.name}</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
              <Star size={16} className="fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-bold text-gray-900">{item.spot.meta.rating}</span>
            </div>
          </div>
        </div>

        {/* カテゴリ */}
        {item.spot.meta.categories && item.spot.meta.categories.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 mb-4">
            {item.spot.meta.categories.slice(0, 3).map((t: string) => (
              <Badge key={t} variant="secondary" className="text-xs font-medium">
                {placeTypeMap[t] ?? 'その他'}
              </Badge>
            ))}
          </div>
        )}

        {/* 住所 */}
        <div className="flex items-start gap-2.5 text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
          <MapPin size={16} className="mt-0.5 flex-shrink-0 text-gray-500" />
          <span className="text-sm leading-relaxed">{item.spot.meta.address}</span>
        </div>

        {/* 営業時間 */}
        {item.spot.meta.openingHours && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-2.5">
              <Clock size={16} className="mt-0.5 flex-shrink-0 text-blue-600" />
              <div className="flex-1">
                <span className="font-semibold text-gray-900 text-sm block mb-2">営業時間</span>
                <div className="space-y-1.5">
                  {item.spot.meta.openingHours.map((item, idx) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      {item.day !== '不明' && item.day !== '全' && (
                        <span className="font-medium text-gray-700 w-6">{item.day}</span>
                      )}
                      <span className="text-gray-600">{item.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 外部URL */}
        {item.spot.meta.url && item.spot.meta.url !== '' && (
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={item.spot.meta.url}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 transition-colors group/link"
          >
            <ExternalLink size={16} className="flex-shrink-0" />
            <span className="text-sm font-medium group-hover/link:underline">外部サイトで詳細を見る</span>
          </a>
        )}

        {/* Memo */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-700 mb-2 block">メモ</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
            value={editMemo[key] ?? item.memo ?? ''}
            onChange={(e) => handleMemoChange(key, e.target.value)}
            onBlur={() => handleMemoSave(item, idx)}
            placeholder="メモを入力..."
            rows={3}
          />
        </div>

        {/* Priority */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <label className="text-xs font-semibold text-gray-700 mb-2 block">優先度</label>
          {renderStars(item)}
        </div>

        {/* 訪問日時 */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-700 mb-2 block">訪問日時</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="button"
                data-testid={`visited-at-button-${key}`}
                className="w-full justify-start h-11 border-gray-300 hover:bg-gray-50"
                disabled={item.visited !== 1}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {visitedAt[key] ? (
                  <span className="font-medium">{visitedAt[key]}</span>
                ) : item.visitedAt ? (
                  <span className="font-medium">{formatTimeDate(item.visitedAt)}</span>
                ) : (
                  <span className="text-gray-500">
                    {item.visited === 1 ? '日付を選択してください' : '訪問済みにすると編集可能'}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                showOutsideDays={false}
                selected={
                  visitedAt[key]
                    ? new Date(visitedAt[key])
                    : item.visitedAt
                      ? (() => {
                          const formatted = formatTimeDate(item.visitedAt);
                          return formatted ? new Date(formatted) : undefined;
                        })()
                      : undefined
                }
                onSelect={handleVisitedAtChange}
                data-testid={`visited-at-calendar-${key}`}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => handleToggleVisited(item)}
            className={`flex-1 h-11 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              item.visited
                ? 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400'
                : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md'
            }`}
          >
            {item.visited ? '未訪問に戻す' : '訪問済みにする'}
          </Button>
          <Button
            aria-label="削除ボタン"
            onClick={() => handleToggleDeleted(item.id ?? 0)}
            className="h-11 w-11 bg-white border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-400 transition-all shadow-sm hover:shadow-md flex-shrink-0"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WishlistSpotInfoCard;
