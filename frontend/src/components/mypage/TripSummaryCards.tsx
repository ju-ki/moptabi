'use client';

import { MapPin, Heart, Calendar } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

type TripSummaryCardsProps = {
  visitedCount: number;
  wishlistCount: number;
  totalTripDays: number;
};

/**
 * 旅のサマリーカードコンポーネント
 * 訪問済みスポット数、行きたいスポット数、旅した日数を表示
 */
export function TripSummaryCards({ visitedCount, wishlistCount, totalTripDays }: TripSummaryCardsProps) {
  const cards = [
    {
      icon: MapPin,
      label: '訪問済み',
      value: visitedCount.toString(),
      unit: 'スポット',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      icon: Heart,
      label: '行きたい',
      value: wishlistCount.toString(),
      unit: 'スポット',
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      icon: Calendar,
      label: '旅した日数',
      value: `${totalTripDays}日`,
      unit: '',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className={`${card.bgColor} border-0`}>
          <CardContent className="p-4 text-center">
            <card.icon className={`h-6 w-6 mx-auto mb-2 ${card.color}`} />
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-600">{card.label}</p>
            {card.unit && <p className="text-xs text-gray-500">{card.unit}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
