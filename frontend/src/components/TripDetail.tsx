import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { MapPin, Calendar, Info, Navigation } from 'lucide-react';
import Image from 'next/image';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

type TripDetailProps = {
  trip: {
    title: string;
    startDate: string;
    endDate: string;
    tripInfo: {
      date: string;
      genreId: number;
      transportationMethod: number;
      memo: string | null;
    }[];
    plans: {
      date: string;
      departure: {
        name: string;
        latitude: number;
        longitude: number;
      };
      destination: {
        name: string;
        latitude: number;
        longitude: number;
      };
      spots: {
        name: string;
        latitude: number;
        longitude: number;
        stay: {
          start: string;
          end: string;
        };
        memo?: string;
        image?: string;
        rating?: number;
        category?: string[];
        catchphrase?: string;
        description?: string;
        nearestStation?: {
          name: string;
          walkingTime: number;
          latitude: number;
          longitude: number;
        };
      }[];
    }[];
  };
};

export function TripDetail({ trip }: TripDetailProps) {
  return (
    <div className="container mx-auto py-8">
      {/* ヘッダー部分 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{trip.title}</h1>
        <div className="flex items-center gap-4 text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>
              {format(new Date(trip.startDate), 'yyyy年MM月dd日', { locale: ja })} -{' '}
              {format(new Date(trip.endDate), 'yyyy年MM月dd日', { locale: ja })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側：旅行情報 */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                旅行情報
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {trip.tripInfo.map((info, index) => (
                  <div key={index} className="mb-4">
                    <p className="font-semibold">{format(new Date(info.date), 'M月d日 (E)', { locale: ja })}</p>
                    {info.memo && <p className="text-sm text-gray-600 mt-1">{info.memo}</p>}
                    <Separator className="my-2" />
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 右側：プラン詳細 */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {trip.plans.map((plan, planIndex) => (
              <Card key={planIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {format(new Date(plan.date), 'M月d日 (E)', { locale: ja })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 出発地・目的地 */}
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <span>{plan.departure.name}</span>
                    <Navigation className="h-4 w-4 text-gray-500" />
                    <span>{plan.destination.name}</span>
                  </div>

                  {/* スポット一覧 */}
                  <div className="space-y-4">
                    {plan.spots.map((spot, spotIndex) => (
                      <div key={spotIndex} className="border rounded-lg p-4">
                        <div className="flex gap-4">
                          {spot.image && (
                            <div className="relative w-32 h-32 flex-shrink-0">
                              <Image src={'/'} alt={spot.name} fill className="object-cover rounded-lg" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold mb-2">{spot.name}</h4>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {spot.category?.map((cat, idx) => (
                                <Badge key={idx} variant="secondary">
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{/* {spot.stay.start} - {spot.stay.end} */}</p>
                            {spot.nearestStation && (
                              <p className="text-sm text-gray-600">
                                最寄り駅: {spot.nearestStation.name}（徒歩{spot.nearestStation.walkingTime}分）
                              </p>
                            )}
                            {spot.description && <p className="text-sm text-gray-600 mt-2">{spot.description}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
