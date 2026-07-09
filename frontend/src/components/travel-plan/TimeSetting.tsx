import React from 'react';

import { TransportNodeType } from '@/types/plan';
import { useStoreForPlanning } from '@/lib/plan';

import { Label } from '../ui/label';
import { Input } from '../ui/input';

type TimeSettingProps = {
  type: TransportNodeType;
  date: string;
};

const TimeSetting = (props: TimeSettingProps) => {
  const fields = useStoreForPlanning();
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        {props.type === TransportNodeType.DEPARTURE ? '出発時間' : '到着時間'}を設定
      </Label>
      <Input
        type="time"
        value={fields.getDepartureAndDestination(props.date, props.type).time || ''}
        onChange={(e) => {
          const time = e.currentTarget.value;
          fields.setDepartureAndDestination(props.date, props.type, {
            ...fields.getDepartureAndDestination(props.date, props.type),
            time,
          });
        }}
      />
    </div>
  );
};

export default TimeSetting;
