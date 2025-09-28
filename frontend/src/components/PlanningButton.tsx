import React from 'react';

import { useStoreForPlanning } from '@/lib/plan';
import { sortSpotByStartTime } from '@/lib/algorithm';
import { TransportNodeType } from '@/types/plan';

import { Button } from './ui/button';

const PlanningButton = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();

  const onClickPlanningButton = (): void => {
    let isError = false;
    fields.resetErrors();
    //推した時点で予定日、目的地、出発地、交通手段、観光スポットが空の場合はエラーを出す
    if (!fields.startDate || !fields.endDate) {
      fields.setErrors({ startDate: 'プランの日付を入力してください' });
      isError = true;
    }

    const targetTripInfo = fields.tripInfo.filter((val) => val.date === date)[0];
    const targetPlans = fields.plans.filter((val) => val.date === date)[0];

    // if (!targetTripInfo || !targetTripInfo.transportationMethod.length) {
    //   fields.setTripInfoErrors(date, {
    //     transportationMethod: '計画設定の移動手段を一つ以上チェックしてください',
    //   });
    //   isError = true;
    // }

    // if (!targetTripInfo || !targetTripInfo.genreId) {
    //   fields.setTripInfoErrors(date, {
    //     genreId: '計画設定のジャンルを選択してください',
    //   });
    //   isError = true;
    // }

    if (targetTripInfo && targetTripInfo.memo && targetTripInfo.memo.length > 1000) {
      fields.setTripInfoErrors(date, {
        memo: 'メモは1000文字以内で入力してください。',
      });
      isError = true;
    }

    const spotsData = fields.getSpotInfo(date, TransportNodeType.SPOT);

    if (!spotsData || spotsData.length === 0) {
      fields.setPlanErrors(date, {
        spots: '観光地スポットは1つ以上選択してください',
      });
      isError = true;
    }

    if (isError) {
      fields.setSimulationStatus({ date: date, status: 9 });
      return;
    }

    fields.setSimulationStatus({ date: date, status: 1 });
    alert('プランニング中です');

    // 開始時間を元にスポットをソートする
    const sortedSpots = sortSpotByStartTime(targetPlans.spots);

    // ソート後の順番を反映処理
    sortedSpots.forEach((spot) => {
      fields.editSpots(date, spot.spotId, { order: spot.order });
    });

    //TODO: 非同期でプラン作成をシミュレーションする機能の追加
    setTimeout(() => {
      fields.setSimulationStatus({ date: date, status: 2 });
    }, 2000); // 2秒後にシミュレーション完了状態に
  };
  return (
    <div>
      <Button type="button" onClick={onClickPlanningButton}>
        {date}のプラン作成
      </Button>
    </div>
  );
};

export default PlanningButton;
