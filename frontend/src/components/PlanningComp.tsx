import React from 'react';

import { useStoreForPlanning } from '@/lib/plan';
import { getDatesBetween } from '@/lib/utils';

import { Label } from './ui/label';
import Transportation from './Transportation';
import Departure from './Departure';
import { Textarea } from './ui/textarea';
import Destination from './Destination';
import PlanningButton from './PlanningButton';
import TravelPlan from './TravelPlan';
import SpotSelectionDialog from './spot-selection/SpotSelectionDialog';
import LocationLinkCheckbox from './LocationLinkCheckbox';
import { SpotSettingList } from './travel-plan/SpotSettingEditor';
import PlanConsistencyAction from './PlanConsistencyAction';

const PlanningComp = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  const targetPlan = fields.getPlanInfo(date);

  // 日数を計算して単一日か複数日かを判定
  const dates =
    fields.startDate && fields.endDate ? getDatesBetween(new Date(fields.startDate), new Date(fields.endDate)) : [];
  const isSingleDay = dates.length === 1;

  return (
    <div>
      <h1 className="text-2xl py-4">{date}の計画設定</h1>

      {/* メインとなる移動手段 */}
      <div className="space-y-4">
        <Transportation date={date} />
      </div>

      {/* 出発地・目的地連動チェックボックス */}
      <div className="space-y-4 my-4">
        <LocationLinkCheckbox
          isSingleDay={isSingleDay}
          checked={fields.isLocationLinked}
          onCheckedChange={fields.setIsLocationLinked}
        />
      </div>

      {/* 出発地 */}
      <div className="space-y-4">
        <Departure date={date} />
      </div>

      {/* 目的地 */}
      <div className="space-y-4">
        <Destination date={date} />
      </div>
      {/* 備考 */}
      <div className="space-y-4">
        <Label className="block text-lg font-semibold text-gray-800">備考</Label>
        <Textarea
          placeholder="メモや注意点を記載"
          value={targetPlan?.memo || ''}
          onChange={(e) =>
            targetPlan != undefined ? fields.setPlanInfo(date, { ...targetPlan, memo: e.target.value }) : undefined
          }
        />

        {fields.getPlanErrors(date)?.memo && <span className="text-red-500">{fields.getPlanErrors(date)?.memo}</span>}
      </div>

      {/* スポット選択 */}
      <div className="space-y-4">
        <SpotSelectionDialog date={date} />
      </div>
      {/* スポット設定 */}
      <div className="space-y-4">
        <div className="w-full max-w-6xl mx-auto p-4">
          <SpotSettingList date={date} />
        </div>
      </div>

      {/* プランの仮作成ボタン */}
      <div className="space-y-2">
        <PlanningButton date={date} />
      </div>

      {/* 日付単位の整合性導線 */}
      <div className="space-y-2 my-4">
        <PlanConsistencyAction date={date} />
      </div>

      {/* プランニング計画シート */}
      <div className="space-y-2 my-4">
        <TravelPlan travelPlan={fields.plans.filter((plan) => plan.date == date)[0]} />
      </div>

      {/* 作成ボタン */}
      {/* TODO: 対応できていない機能のためコメントアウト */}
      {/* <div className="space-y-2">
        <Button type="button" variant={'outline'} role="button" className="w-full">
          AIによるシミュレート
        </Button>
      </div> */}
    </div>
  );
};

export default PlanningComp;
