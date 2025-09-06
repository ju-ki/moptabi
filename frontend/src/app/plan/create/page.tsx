'use client';
import { useEffect } from 'react';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import useSWRMutation from 'swr/mutation';
import Image from 'next/image';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, getDatesBetween } from '@/lib/utils';
import { useStoreForPlanning } from '@/lib/plan';
import type { FormData as formType } from '@/lib/plan';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlanningComp from '@/components/PlanningComp';
import { useToast } from '@/hooks/use-toast';
import { useFetcher } from '@/hooks/use-fetcher';

const TravelPlanCreate = () => {
  const fields = useStoreForPlanning();
  const { toast } = useToast();
  const { getFetcher, postFetcher } = useFetcher();
  const { trigger: createTripTrigger } = useSWRMutation(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/create`,
    postFetcher,
  );
  const { trigger: uploadImageTrigger } = useSWRMutation(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/images/upload`,
    postFetcher,
  );

  const { trigger: getDepartureAndDepartmentTrigger } = useSWRMutation(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/spot`,
    getFetcher,
  );

  const { trigger: getTransportMasterTrigger } = useSWRMutation(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/transport`,
    getFetcher,
  );

  const router = useRouter();

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

  useEffect(() => {
    const fetchTransportMaster = async () => {
      try {
        const response = await getTransportMasterTrigger();
        fields.setTransportMaster(response);
      } catch (error) {
        console.error('Error fetching departure and destination:', error);
        toast({
          title: '移動手段のマスタの取得に失敗しました',
          description: 'もう一度お試しください。',
          variant: 'destructive',
        });
      }
    };
    fetchTransportMaster();
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

  const handleCreatePlan = async () => {
    try {
      const newData: formType = {
        title: fields.title,
        imageUrl: fields.imageUrl,
        startDate: fields.startDate,
        endDate: fields.endDate,
        tripInfo: fields.tripInfo,
        plans: fields.plans,
      };
      const result = await createTripTrigger({ data: newData, isMulti: false });
      toast({ title: '旅行計画が作成されました', description: '旅行計画の作成に成功しました。', variant: 'success' });
      router.push(`/plan/${result.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ title: '旅行計画の作成に失敗しました', description: errorMessage, variant: 'destructive' });
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
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                placeholder="旅行プランのタイトルを入力"
                onChange={(e) => fields.setFields('title', e.target.value)}
              />
              {/* {methods.formState.errors.title && (
                <span className="text-red-500">{methods.formState.errors.title.message}</span>
              )} */}
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
              <Label>予定日</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !fields.startDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fields.startDate ? (
                      fields.endDate ? (
                        <>
                          {format(fields.startDate, 'yyyy/MM/dd')} 〜 {format(fields.endDate, 'yyyy/MM/dd')}
                        </>
                      ) : (
                        format(fields.startDate, 'yyyy/MM/dd')
                      )
                    ) : (
                      <span>日付範囲を選択</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={new Date(fields.startDate)}
                    selected={{
                      from: new Date(fields.startDate),
                      to: new Date(fields.endDate),
                    }}
                    onSelect={(dateRange: DateRange | undefined) => {
                      const fromDate = dateRange?.from && dateRange.from.toLocaleDateString('ja-JP');
                      const toDate = dateRange?.to && dateRange.to.toLocaleDateString('ja-JP');
                      fields.setRangeDate({
                        from: fromDate,
                        to: toDate,
                      });
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
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
            <div className="space-y-2">
              <Button onClick={() => handleCreatePlan()} type="button" role="button" className="w-full">
                旅行計画を作成
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TravelPlanCreate;
