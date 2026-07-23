import React from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/hooks/use-toast';
import { useStoreForPlanning } from '@/lib/plan';
import { getDatesBetween, getActualSpotCount } from '@/lib/utils';
import { TransportNodeType } from '@/types/plan';
import { isSpotsPerDayLimitReached, isPlanDaysLimitReached, getLimitErrorMessage } from '@/lib/limits';
import { useFetchTripDetail } from '@/hooks/use-trip';
import { TripType } from '@/models/trip';
import { PLANNING_DIRTY_BLOCK_MESSAGE } from '@/data/constants';

import { Button } from './ui/button';

/**
 * プラン保存前のバリデーションと保存実行を担うボタン。
 * dirty状態の保存ブロックと、保存成功時の初期化・遷移を扱う。
 * @returns 保存ボタンUI
 */
const CreatePlanButton = ({ isEdit = false }: { isEdit: boolean }) => {
  const fields = useStoreForPlanning();
  const router = useRouter();
  const { toast } = useToast();
  const { postTrip, patchTrip } = useFetchTripDetail();

  /**
   * 保存前にフォーム入力とdirty状態を検証する。
   * @returns 検証結果の種別
   */
  const checkValidation = (): 'success' | 'dirty-blocked' | 'validation-error' => {
    let isError = false;

    if (fields.title === '') {
      fields.setErrors({ title: 'タイトルを入力してください' });
      isError = true;
    }

    if (!fields.startDate || !fields.endDate) {
      fields.setErrors({ startDate: 'プランの日付を入力してください' });
      isError = true;
    }

    const dates = getDatesBetween(new Date(fields.startDate), new Date(fields.endDate));

    const dirtyPlanningDates = fields.getDirtyPlanningDates();
    if (dirtyPlanningDates.length > 0) {
      toast({
        title: PLANNING_DIRTY_BLOCK_MESSAGE.title,
        description: PLANNING_DIRTY_BLOCK_MESSAGE.description,
        variant: 'destructive',
      });
      return 'dirty-blocked';
    }

    // プラン日数の上限チェック
    if (isPlanDaysLimitReached(dates.length)) {
      toast({
        title: 'プラン日数が上限を超えています',
        description: getLimitErrorMessage('planDays'),
        variant: 'destructive',
      });
      return 'validation-error';
    }

    dates.map((date) => {
      const spotsData = fields.getSpotInfo(date, TransportNodeType.SPOT);
      const targetTripInfo = fields.getPlanInfo(date);

      if (targetTripInfo && targetTripInfo.memo && targetTripInfo.memo.length > 1000) {
        fields.setPlanErrors(date, {
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

      // 1日あたりのスポット数の上限チェック（出発地・目的地は除外）
      const actualSpotCount = getActualSpotCount(spotsData);
      if (isSpotsPerDayLimitReached(actualSpotCount)) {
        fields.setPlanErrors(date, {
          spots: getLimitErrorMessage('spotsPerDay'),
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

    return isError ? 'validation-error' : 'success';
  };

  /**
   * 保存APIを実行し、成功時はストア初期化後に詳細または一覧画面へ遷移する。
   * @returns なし
   */
  const handleCreatePlan = async () => {
    try {
      const validationResult = checkValidation();
      if (validationResult != 'success') {
        toast({
          title: '入力項目に一部不備があります',
          description: '入力項目を見直してください',
          variant: 'destructive',
        });
        return;
      }

      //保存するボタンを押下時点でプランニング後の状態をストアに反映する
      const dates = getDatesBetween(new Date(fields.startDate), new Date(fields.endDate));
      dates.forEach((date) => {
        const targetPlanning = fields.getPlanningResult(date);

        if (!targetPlanning) {
          return;
        }
      });

      const newData: TripType = {
        id: fields.id,
        title: fields.title,
        imageUrl: fields.imageUrl,
        startDate: fields.startDate,
        endDate: fields.endDate,
        plans: useStoreForPlanning.getState().plans,
      };

      let resultId;
      if (newData.id && isEdit) {
        resultId = await patchTrip(newData);
        toast({ title: '旅行計画が更新されました', description: '旅行計画の更新に成功しました。', variant: 'success' });
      } else {
        resultId = await postTrip(newData);
        toast({ title: '旅行計画が作成されました', description: '旅行計画の作成に成功しました。', variant: 'success' });
      }

      fields.resetPlanningStore();

      router.push(resultId ? `/plan/${resultId}` : '/plan/list');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ title: '旅行計画の作成に失敗しました', description: errorMessage, variant: 'destructive' });
    }
  };
  return (
    <div className="space-y-2">
      <Button onClick={() => handleCreatePlan()} type="button" role="button" className="w-full">
        {isEdit ? '旅行計画を更新' : '旅行計画を作成'}
      </Button>
    </div>
  );
};

export default CreatePlanButton;
