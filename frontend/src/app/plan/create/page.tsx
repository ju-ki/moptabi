'use client';
import { useEffect } from 'react';
import { Asterisk } from 'lucide-react';
import useSWRMutation from 'swr/mutation';
import Image from 'next/image';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDatesBetween } from '@/lib/utils';
import { useStoreForPlanning } from '@/lib/plan';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlanningComp from '@/components/PlanningComp';
import { useToast } from '@/hooks/use-toast';
import { useFetcher } from '@/hooks/use-fetcher';
import CreatePlanButton from '@/components/CreatePlanButton';
import { LimitDisplay } from '@/components/common/LimitDisplay';
import { APP_LIMITS } from '@/data/constants';
import DateRangePicker from '@/components/DateRangePicker';

const TravelPlanCreate = () => {
  const fields = useStoreForPlanning();
  const { toast } = useToast();
  const { getFetcher, postFetcher } = useFetcher();
  const { trigger: uploadImageTrigger } = useSWRMutation(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/images/upload`,
    postFetcher,
  );

  const { trigger: getDepartureAndDepartmentTrigger } = useSWRMutation(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/spots`,
    getFetcher,
  );

  useEffect(() => {
    const fetchDepartureAndDestination = async () => {
      try {
        const response = await getDepartureAndDepartmentTrigger();

        fields.setDepartureHistory(response.departure);
        fields.setDestinationHistory(response.destination);
      } catch (error) {
        console.error('Error fetching departure and destination:', error);
        toast({
          title: '出発地と目的地の取得に失敗しました',
          description: 'もう一度お試しください。',
          variant: 'destructive',
        });
      }
    };
    fetchDepartureAndDestination();
  }, []);

  const onUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const formData = new FormData();
    if (!event.target.files || event.target.files.length === 0) {
      toast({ title: '画像が選択されていません', description: '画像を選択してください', variant: 'destructive' });
      return;
    }
    formData.append('file', event.target.files[0]);

    try {
      const response = await uploadImageTrigger({ data: formData, isMulti: true });
      fields.setFields('imageUrl', response.fileName);
      toast({
        title: '画像がアップロードされました',
        description: '画像のアップロードに成功しました。',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

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
            <div className="space-y-2">
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
            </div>
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
                {fields.startDate &&
                  fields.endDate &&
                  getDatesBetween(new Date(fields.startDate), new Date(fields.endDate)).map((date) => (
                    <TabsTrigger key={date} value={date}>
                      {date}
                    </TabsTrigger>
                  ))}
              </TabsList>
              {fields.startDate &&
                fields.endDate &&
                getDatesBetween(new Date(fields.startDate), new Date(fields.endDate)).map((date) => (
                  <TabsContent key={date} value={date}>
                    <PlanningComp date={date} />
                  </TabsContent>
                ))}
            </Tabs>

            {/* 作成ボタン */}
            <CreatePlanButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TravelPlanCreate;
