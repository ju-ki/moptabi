'use client';
import { Asterisk } from 'lucide-react';
import { use, useEffect, useMemo } from 'react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDatesBetween } from '@/lib/utils';
import { useStoreForPlanning } from '@/lib/plan';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlanningComp from '@/components/PlanningComp';
import CreatePlanButton from '@/components/CreatePlanButton';
import { LimitDisplay } from '@/components/common/LimitDisplay';
import { APP_LIMITS, DEFAULT_DEPARTURE_AND_DESTINATION } from '@/data/constants';
import DateRangePicker from '@/components/DateRangePicker';
import { usePlanLocationCandidates } from '@/hooks/use-plan-location';
import { TransportNodeType } from '@/types/plan';
import { Button } from '@/components/ui/button';
import { usePlanning } from '@/hooks/use-planning';
import { useFetchTripDetail } from '@/hooks/use-trip';

const TravelEditPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const { handlePreprocessingPlanning } = usePlanning();
  const fields = useStoreForPlanning();
  const { trip, isLoading, error } = useFetchTripDetail(id);

  const { candidates: departureCandidates, isLoading: isDepartureCandidatesLoading } = usePlanLocationCandidates(
    TransportNodeType.DEPARTURE,
  );
  const { candidates: destinationCandidates, isLoading: isDestinationCandidatesLoading } = usePlanLocationCandidates(
    TransportNodeType.DESTINATION,
  );

  // 日付の範囲を取得
  const dates = useMemo(
    () => getDatesBetween(new Date(fields.startDate), new Date(fields.endDate)),
    [fields.startDate, fields.endDate],
  );

  useEffect(() => {
    if (!trip || error) {
      return;
    }
    fields.resetPlanningStore();
    fields.setFields('id', Number.parseInt(id));
    fields.setFields('title', trip.title);

    fields.setRangeDate({ from: trip.startDate, to: trip.endDate });
    trip.plans.forEach((plan) => {
      plan.spots.map((spot) => {
        fields.setSpots(plan.date, spot, false);
      });
      fields.setPlanInfo(plan.date, { ...plan, memo: plan.memo ?? '' });
      fields.setDepartureAndDestination(plan.date, TransportNodeType.DEPARTURE, plan.departure);
      fields.setDepartureAndDestination(plan.date, TransportNodeType.DESTINATION, plan.destination);
    });
  }, [trip, error, id]);

  // 取得した候補からデフォルトの地点を当日の出発地・目的地にセットする
  // 出発地と目的地のデフォルト値を設定
  // addDateWithDefaultLocationを使用することで、既存の日付は上書きされず、新規日付のみデフォルト値が設定される
  useEffect(() => {
    if (
      !isDepartureCandidatesLoading &&
      departureCandidates &&
      !isDestinationCandidatesLoading &&
      destinationCandidates
    ) {
      const defaultDeparture = departureCandidates.favorites.find((fav) => fav.isDefault);
      const defaultDestination = destinationCandidates.favorites.find((fav) => fav.isDefault);

      // 新規日付に対してのみデフォルト値を設定（既存日付は上書きしない）
      dates.forEach((date) => {
        fields.addDateWithDefaultLocation(
          date,
          {
            ...(defaultDeparture ?? DEFAULT_DEPARTURE_AND_DESTINATION),
            locationType: TransportNodeType.DEPARTURE,
          },
          {
            ...(defaultDestination ?? DEFAULT_DEPARTURE_AND_DESTINATION),
            locationType: TransportNodeType.DESTINATION,
          },
        );
      });

      fields.setDepartureList(departureCandidates);
      fields.setDestinationList(destinationCandidates);
    }
  }, [isDepartureCandidatesLoading, departureCandidates, isDestinationCandidatesLoading, destinationCandidates, dates]);

  // 初期表示時にプランニングをする
  useEffect(() => {
    if (!trip || error) {
      return;
    }

    const registeredPlanDates = Array.from(new Set(trip.plans.map((plan) => plan.date)));

    registeredPlanDates.forEach((date) => {
      handlePreprocessingPlanning({ date });
    });
  }, [trip, error, handlePreprocessingPlanning]);

  if (error) {
    return <>プランの取得に失敗しました</>;
  }
  if (!trip || isLoading) {
    return <>読み込み中です</>;
  }

  return (
    <div>
      <div className="container mx-auto p-4">
        <div className="p-3">
          <Button variant="outline" size="sm" onClick={() => {}} className="flex items-center gap-1">
            <Link href={`/plan/${id}`}>詳細画面に戻る</Link>
          </Button>
        </div>
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>旅行計画を編集</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* タイトル */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label className="block text-lg font-semibold text-gray-800" htmlFor="title">
                  タイトル
                </Label>
                <Asterisk className="text-red-500 text-sm" />
              </div>
              <Input
                id="title"
                placeholder="旅行プランのタイトルを入力"
                defaultValue={fields.getFields('title')}
                onChange={(e) => fields.setFields('title', e.target.value)}
              />
              {fields.errors.title && <span className="text-red-500">{fields.errors.title.toString()}</span>}
            </div>
            {/* イメージ画像 */}
            {/*  TODO: 対応できていない機能のためコメントアウト */}
            {/* <div className="space-y-2">
              <Label>イメージ画像</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {fields.imageUrl ? (
                  <div className="mb-4">
                    <Image
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/images/${fields.imageUrl}`}
                      alt="アップロードされた画像"
                      width={300}
                      height={200}
                      unoptimized
                      onError={(e) => {
                        console.error('Image load error:', e);
                        console.log(
                          'Failed to load image:',
                          `${process.env.NEXT_PUBLIC_API_BASE_URL}/uploads/${fields.imageUrl?.split('/').pop()}`,
                        );
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">ここに画像をアップロードまたはドラッグ＆ドロップ</p>
                )}
                <Input type="file" multiple accept="image/*" onChange={onUploadImage} />
              </div>
            </div> */}
            {/* 予定日 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs">
                  <Label className="block text-lg font-semibold text-gray-800" htmlFor="date">
                    予定日
                  </Label>
                  <Asterisk className="text-red-500" />
                </div>
                {/* 日数表示 */}
                {fields.startDate && fields.endDate && (
                  <LimitDisplay
                    current={getDatesBetween(new Date(fields.startDate), new Date(fields.endDate)).length}
                    limit={APP_LIMITS.MAX_PLAN_DAYS}
                    label="旅行日数"
                    unit="日"
                    size="sm"
                    data-testid="plan-days-display"
                  />
                )}
              </div>
              <DateRangePicker
                startDate={fields.startDate}
                endDate={fields.endDate}
                onDateChange={fields.setRangeDate}
              />
              <div className="my-1">
                {fields.errors.startDate && <span className="text-red-500">{fields.errors.startDate.toString()}</span>}
              </div>
            </div>

            {/* 選択した日付分だけタブが生成されるようにする */}
            <Tabs defaultValue={fields.startDate && fields.startDate} defaultChecked={true}>
              <TabsList className="flex justify-start space-x-2">
                {dates.map((date) => (
                  <TabsTrigger key={date} value={date}>
                    {date}
                  </TabsTrigger>
                ))}
              </TabsList>
              {dates.map((date) => (
                <TabsContent key={date} value={date}>
                  <PlanningComp date={date} />
                </TabsContent>
              ))}
            </Tabs>

            {/* 作成ボタン */}
            <CreatePlanButton isEdit={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TravelEditPage;
