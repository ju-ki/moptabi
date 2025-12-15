import React from 'react';

import { useStoreForPlanning } from '@/lib/plan';

import { Label } from './ui/label';
import Transportation from './Transportation';
import Departure from './Departure';
import { Textarea } from './ui/textarea';
import Destination from './Destination';
import GanttChart from './GanttChart';
import { Button } from './ui/button';
import PlanningButton from './PlanningButton';
import TravelPlan from './TravelPlan';
import SpotSelectionDialog from './spot-selection/SpotSelectionDialog';

const PlanningComp = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  return (
    <div>
      <h1 className="text-2xl py-4">{date}の計画設定</h1>

      {/* メインとなる移動手段 */}
      <div className="space-y-4">
        <Transportation date={date} />
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
          value={fields.tripInfo.filter((val) => val.date === date)[0]?.memo || ''}
          onChange={(e) => fields.setTripInfo(date, 'memo', e.target.value)}
        />

        {fields.tripInfoErrors && <span className="text-red-500">{fields.tripInfoErrors[date]?.memo}</span>}
      </div>

      {/* スポット選択 */}
      <div className="space-y-4">
        <SpotSelectionDialog date={date} />
      </div>
      {/* タイムライン */}
      <div className="space-y-4">
        <div className="w-full max-w-6xl mx-auto p-4">
          <GanttChart date={date} />
        </div>
      </div>

      {/* プランの仮作成ボタン */}
      <div className="space-y-2">
        <PlanningButton date={date} />
      </div>

      {/* プランニング計画シート */}
      <div className="space-y-2 my-4">
        <TravelPlan travelPlan={fields.plans.filter((plan) => plan.date == date)[0]} />
      </div>

      {/* 作成ボタン */}
      <div className="space-y-2">
        <Button type="button" variant={'outline'} role="button" className="w-full">
          AIによるシミュレート
        </Button>
      </div>
    </div>
  );
};

export default PlanningComp;
