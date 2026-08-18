'use client';
import { Asterisk } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDatesBetween } from '@/lib/utils';
import { useStoreForPlanning } from '@/lib/plan';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlanningComp from '@/components/PlanningComp';
import CreatePlanButton from '@/components/CreatePlanButton';
import { LimitDisplay } from '@/components/common/LimitDisplay';
import {
  APP_LIMITS,
  DEFAULT_DEPARTURE_AND_DESTINATION,
  DEFAULT_DEPARTURE_TIME,
  DEFAULT_ARRIVAL_TIME,
} from '@/data/constants';
import DateRangePicker from '@/components/DateRangePicker';
import { usePlanLocationCandidates } from '@/hooks/use-plan-location';
import { TransportNodeType } from '@/types/plan';

/**
 * プラン作成画面の入力フォーム全体を描画する。
 * 初回候補の反映と、画面離脱時のストア初期化もここで管理する。
 * @returns プラン作成ページ
 */
const TravelPlanCreate = () => {
  const fields = useStoreForPlanning();
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
            name: defaultDeparture?.name ?? DEFAULT_DEPARTURE_AND_DESTINATION.name,
            latitude: defaultDeparture?.latitude ?? DEFAULT_DEPARTURE_AND_DESTINATION.latitude,
            longitude: defaultDeparture?.longitude ?? DEFAULT_DEPARTURE_AND_DESTINATION.longitude,
            planId: defaultDeparture?.planId ?? DEFAULT_DEPARTURE_AND_DESTINATION.planId,
            locationType: TransportNodeType.DEPARTURE,
            transportMethodId: 0, // デフォルトの移動手段IDを設定（例: 0はDEFAULT）
            transportMethod: 'DEFAULT', // デフォルトの移動手段を設定
            travelTime: 0, // デフォルトの移動時間を設定（例: 0分）
            time: DEFAULT_DEPARTURE_TIME,
          },
          {
            name: defaultDestination?.name ?? DEFAULT_DEPARTURE_AND_DESTINATION.name,
            latitude: defaultDestination?.latitude ?? DEFAULT_DEPARTURE_AND_DESTINATION.latitude,
            longitude: defaultDestination?.longitude ?? DEFAULT_DEPARTURE_AND_DESTINATION.longitude,
            planId: defaultDestination?.planId ?? DEFAULT_DEPARTURE_AND_DESTINATION.planId,
            locationType: TransportNodeType.DESTINATION,
            transportMethodId: 0, // デフォルトの移動手段IDを設定（例: 0はDEFAULT）
            transportMethod: 'DEFAULT', // デフォルトの移動手段を設定
            travelTime: 0, // デフォルトの移動時間を設定（例: 0分）
            time: DEFAULT_ARRIVAL_TIME,
          },
        );
      });

      fields.setDepartureList(departureCandidates);
      fields.setDestinationList(destinationCandidates);
    }
  }, [isDepartureCandidatesLoading, departureCandidates, isDestinationCandidatesLoading, destinationCandidates, dates]);

  // コンポーネントのマウント時にストアを初期化
  useEffect(() => {
    fields.resetPlanningStore();
  }, []);

  return (
    <div>
      <div className="container mx-auto p-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>旅行計画を作成</CardTitle>
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
                onChange={(e) => fields.setFields('title', e.target.value)}
              />
              {fields.errors.title && <span className="text-red-500">{fields.errors.title.toString()}</span>}
            </div>
            {/* イメージ画像 */}
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
                onDeletePlanData={fields.deletePlanInfo}
              />
              <div className="my-1">
                {fields.errors.startDate && <span className="text-red-500">{fields.errors.startDate.toString()}</span>}
              </div>
            </div>

            {/* 選択した日付分だけタブが生成されるようにする */}
            <Tabs className="w-full min-w-0" defaultValue={fields.startDate && fields.startDate} defaultChecked={true}>
              <div className="w-full max-w-full overflow-x-auto pb-1">
                <TabsList className="inline-flex w-max min-w-full flex-nowrap justify-start gap-2 whitespace-nowrap">
                  {dates.map((date) => (
                    <TabsTrigger key={date} value={date} className="shrink-0">
                      {date}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {dates.map((date) => (
                <TabsContent key={date} value={date}>
                  <PlanningComp date={date} />
                </TabsContent>
              ))}
            </Tabs>

            {/* 作成ボタン */}
            <CreatePlanButton isEdit={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TravelPlanCreate;
