import React from 'react';
import { Info } from 'lucide-react';

import { useStoreForPlanning } from '@/lib/plan';
import { TransportMethods } from '@/data/constants';

import { Label } from './ui/label';
import { Input } from './ui/input';

const Transportation = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  const currentTransportMethods = fields.getPlanningInfo(date)?.transportationMethodId ?? [];

  return (
    <div className="my-4">
      <Label className="text-lg font-semibold flex space-x-2">
        <div>移動手段</div>
        <div className="flex items-center space-x-1">
          <Info className="w-3 h-3" />
          <span className="text-sm font-normal">未選択の場合は徒歩が選択されます</span>
        </div>
      </Label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-2">
        {Object.values(TransportMethods).map((method, idx) => (
          <div key={idx} className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Input
                type="checkbox"
                name={`transportation-${date}`}
                checked={currentTransportMethods.includes(method.id)}
                id={`transportation-${method.id}-${date}`}
                className="h-5 w-5 text-blue-500 gap-2"
                onChange={() => {
                  const updatedMethods = currentTransportMethods.includes(method.id)
                    ? currentTransportMethods.filter((id) => id !== method.id)
                    : [...currentTransportMethods, method.id];
                  fields.setPlanningInfo(date, {
                    ...fields.getPlanningInfo(date),
                    transportationMethodId: updatedMethods,
                  });
                }}
              />
              <Label htmlFor={`transportation-${method.id}-${date}`}>{method.jp_label}</Label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Transportation;
