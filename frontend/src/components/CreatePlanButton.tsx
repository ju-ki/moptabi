import React from 'react';
import useSWRMutation from 'swr/mutation';
import { useRouter } from 'next/navigation';

import { useToast } from '@/hooks/use-toast';
import { useStoreForPlanning, type FormData as formType } from '@/lib/plan';
import { useFetcher } from '@/hooks/use-fetcher';
import { getDatesBetween } from '@/lib/utils';
import { TransportNodeType } from '@/types/plan';

import { Button } from './ui/button';

const CreatePlanButton = () => {
  const fields = useStoreForPlanning();
  const router = useRouter();
  const { toast } = useToast();
  const { postFetcher } = useFetcher();
  const { trigger: createTripTrigger } = useSWRMutation(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/trips/create`,
    postFetcher,
  );

  const checkValidation = () => {
    let isError = false;

    if (fields.title === '') {
      fields.setErrors({ title: 'タイトルを入力してください' });
      isError = true;
    }

    if (!fields.startDate || !fields.endDate) {
      fields.setErrors({ startDate: 'プランの日付を入力してください' });
      isError = true;
    }

    getDatesBetween(new Date(fields.startDate), new Date(fields.endDate)).map((date) => {
      const spotsData = fields.getSpotInfo(date, TransportNodeType.SPOT);
      const targetTripInfo = fields.tripInfo.filter((val) => val.date === date)[0];

      if (targetTripInfo && targetTripInfo.memo && targetTripInfo.memo.length > 1000) {
        fields.setTripInfoErrors(date, {
          memo: 'メモは1000文字以内で入力してください。',
        });
        isError = true;
      }

      if (!spotsData || spotsData.length === 0) {
        fields.setPlanErrors(date, {
          spots: '観光地スポットは1つ以上選択してください',
        });
        isError = true;
      }

      spotsData.map((spot) => {
        if (spot.memo && spot.memo?.length > 1000) {
          fields.setSpotErrors(date, {
            memo: 'メモは1000文字以内で入力してください。',
          });
          isError = true;
        }
      });
    });

    return isError;
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
      if (!checkValidation()) {
        const result = await createTripTrigger({ data: newData, isMulti: false });
        toast({ title: '旅行計画が作成されました', description: '旅行計画の作成に成功しました。', variant: 'success' });
        router.push(`/plan/${result.id}`);
      } else {
        toast({
          title: '入力項目に一部不備があります',
          description: '入力項目を見直してください',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ title: '旅行計画の作成に失敗しました', description: errorMessage, variant: 'destructive' });
    }
  };
  return (
    <div className="space-y-2">
      <Button onClick={() => handleCreatePlan()} type="button" role="button" className="w-full">
        旅行計画を作成
      </Button>
    </div>
  );
};

export default CreatePlanButton;
