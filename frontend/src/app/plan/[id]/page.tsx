'use client';

import { useRouter } from 'next/navigation';
import React, { use, useEffect } from 'react';
import { Calendar, Clock, Pencil, Printer, Share, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import useSWRMutation from 'swr/mutation';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DayPlan } from '@/components/DayPlan';
import { Button } from '@/components/ui/button';
import { useFetcher } from '@/hooks/use-fetcher';
import { useToast } from '@/hooks/use-toast';
import { useFetchTripDetail } from '@/hooks/use-trip';
import { useStoreForPlanning } from '@/lib/plan';
import { Spot, TransportNodeType } from '@/types/plan';

const PageDetail = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const router = useRouter();
  const fields = useStoreForPlanning();
  const { toast } = useToast();
  const { trip, isLoading, error } = useFetchTripDetail(id);
  const { deleteFetcher } = useFetcher();
  const { trigger } = useSWRMutation(`${process.env.NEXT_PUBLIC_API_BASE_URL}/trips`, deleteFetcher);

  useEffect(() => {
    if (!trip || error) {
      return;
    }

    trip.plans.forEach((plan) => {
      plan.planSpots.forEach((planSpot) => {
        const type = planSpot.spot.id.split('_')[0];
        const spot: Spot = {
          id: planSpot.spot.id,
          location: {
            id: planSpot.spot.id,
            lat: planSpot.spot.meta.latitude,
            lng: planSpot.spot.meta.longitude,
            name: planSpot.spot.meta.name,
          },
          image: planSpot.spot.meta.image,
          rating: planSpot.spot.meta.rating,
          catchphrase: planSpot.spot.meta.catchphrase,
          description: planSpot.spot.meta.description,
          category: planSpot.spot.meta.categories,
          address: planSpot.spot.meta.address,
          prefecture: planSpot.spot.meta.prefecture ?? undefined,
          url: planSpot.spot.meta.url ?? undefined,
          regularOpeningHours: planSpot.spot.meta.openingHours ? planSpot.spot.meta.openingHours : undefined,
          memo: planSpot.memo,
          stayStart: planSpot.stayStart,
          stayEnd: planSpot.stayEnd,
          order: planSpot.order,
          nearestStation: planSpot.spot.nearestStation,
          transports: {
            fromType: type === 'departure' ? TransportNodeType.DEPARTURE : TransportNodeType.SPOT,
            toType: type === 'destination' ? TransportNodeType.DESTINATION : TransportNodeType.SPOT,
            transportMethodIds: planSpot.fromLocation[0].transportMethodIds,
            name: planSpot.fromLocation[0].name,
            travelTime: planSpot.fromLocation[0].travelTime,
            cost: planSpot.fromLocation[0].cost,
          },
        };
        fields.setSpots(plan.date, spot, false);
      });
    });
  }, [trip, error]);

  const handleDeletePlan = async () => {
    try {
      // TODO: 仮
      if (confirm('削除してもよろしいですか')) {
        await trigger({ id: Number(id) });
        toast({ title: '旅行計画が削除されました', description: '旅行計画の削除に成功しました。', variant: 'success' });
        router.push('/plan/list');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ title: '旅行計画の削除に失敗しました', description: errorMessage, variant: 'destructive' });
    }
  };

  if (!trip || isLoading) {
    return <>読み込み中です</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex gap-2 py-3 px-3 justify-between">
        <div className="p-3">
          <Button variant="outline" size="sm" onClick={() => {}} className="flex items-center gap-1">
            <Link href={'/plan/list'}>一覧に戻る</Link>
          </Button>
        </div>
        <div className="flex gap-2 py-3 px-3 justify-end">
          <Button variant="ghost-subtle" size="sm" onClick={() => {}} className="flex items-center gap-1">
            <Share className="w-4 h-4" />
            シェアする
          </Button>

          <Button variant="ghost-subtle" size="sm" onClick={() => {}} className="flex items-center gap-1">
            <Printer className="w-4 h-4" />
            印刷
          </Button>

          <Button variant="secondary-outline" size="sm" onClick={() => {}} className="flex items-center gap-1">
            <Pencil className="w-4 h-4" />
            編集
          </Button>

          <Button onClick={handleDeletePlan} variant="destructive" size="sm" className="flex items-center gap-1">
            <Trash2 className="w-4 h-4" />
            削除
          </Button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto pb-8 px-4">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">{trip.title}</CardTitle>
            <div className="flex items-center gap-6 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {trip.startDate == trip.endDate ? (
                    <>{format(trip.startDate, 'yyyy年MM月dd日')}</>
                  ) : (
                    <>
                      {format(trip.startDate, 'yyyy年MM月dd日')} - {format(trip.endDate, 'yyyy年MM月dd日')}
                    </>
                  )}
                </span>
              </div>
              {trip.tripInfo.map((info, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{info.memo || 'ここにメモが表示されます'}</span>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="day-1" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            {trip.plans.map((_, index) => (
              <TabsTrigger key={`day-${index + 1}`} value={`day-${index + 1}`} className="text-lg">
                {index + 1}日目
              </TabsTrigger>
            ))}
          </TabsList>

          {trip.plans.map((plan, index) => (
            <TabsContent key={`day-${index + 1}`} value={`day-${index + 1}`}>
              <DayPlan plan={plan} dayNumber={index + 1} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default PageDetail;
