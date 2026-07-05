import React from 'react';

import { usePlanning } from '@/hooks/use-planning';

import { Button } from './ui/button';

/**
 * 指定日付のプランニングを実行し、結果をストアへ反映するボタン。
 * 再プランニング時は現在選択中の区間別移動手段も優先条件として渡す。
 * @param date 対象日付
 * @returns プラン作成ボタンUI
 */
const PlanningButton = ({ date }: { date: string }) => {
  const { handlePreprocessingPlanning } = usePlanning();

  /**
   * 入力値を検証したうえでプランニングを実行し、計算結果と選択中の移動手段をストアへ反映する。
   * @returns なし
   */
  const onClickPlanningButton = async (): Promise<void> => {
    await handlePreprocessingPlanning({ date });
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
