'use client';

import { useParams, useRouter } from 'next/navigation';
import React from 'react';
import useSWR from 'swr';
import { Clock, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import useSWRMutation from 'swr/mutation';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DayPlan } from '@/components/DayPlan';
import { Button } from '@/components/ui/button';
import { useFetcher } from '@/hooks/use-fetcher';
import { useToast } from '@/hooks/use-toast';
import { ResponseTripType } from '@/types/plan';

const PageDetail = () => {
  const params = useParams();
  const router = useRouter();
  const { getFetcher, deleteFetcher } = useFetcher();
  const { trigger } = useSWRMutation(`${process.env.NEXT_PUBLIC_API_BASE_URL}/trips`, deleteFetcher);
  const { toast } = useToast();
  const {
    data: trip,
    error,
    isLoading,
  } = useSWR<ResponseTripType>(`${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/${params.id}`, getFetcher);

  if (error) return <div className="container mx-auto py-8 text-center">エラーが発生しました</div>;
  if (isLoading || !trip) return <div className="container mx-auto py-8 text-center">読み込み中...</div>;

  const handleDeletePlan = async () => {
    try {
      await trigger({ id: Number(params.id) });
      toast({ title: '旅行計画が削除されました', description: '旅行計画の削除に成功しました。', variant: 'success' });
      router.push('/plan/list');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ title: '旅行計画の削除に失敗しました', description: errorMessage, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex gap-2 py-3 px-3 justify-between">
        <div className="p-3">
          <Button variant="outline" size="sm" onClick={() => {}} className="flex items-center gap-1">
            <Link href={'/plan/list'}>一覧に戻る</Link>
          </Button>
        </div>
        <div className="flex gap-2 py-3 px-3 justify-end">
          <Button variant="outline" size="sm" onClick={() => {}} className="flex items-center gap-1">
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
                <span>
                  {format(trip.startDate, 'yyyy年MM月dd日')} - {format(trip.endDate, 'yyyy年MM月dd日')}
                </span>
              </div>
              {trip.tripInfo.map((info, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{info.memo}</span>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="day-1" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            {trip.plans.map((_, index) => (
              <TabsTrigger key={`day-${index + 1}`} value={`day-${index + 1}`} className="text-lg">
                Day {index + 1}
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
