import React from 'react';
import useSWR from 'swr';

import { useStoreForPlanning } from '@/lib/plan';
import { useFetcher } from '@/hooks/use-fetcher';
import { TransportMethods } from '@/types/plan';
import { JpTransportMethods } from '@/data/constants';

import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';

const Transportation = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  const { getFetcher } = useFetcher();
  const {
    data: transportationMethods,
    error,
    isLoading,
  } = useSWR(`${process.env.NEXT_PUBLIC_API_BASE_URL}/transport`, getFetcher);

  if (error) return <div className="container mx-auto py-8 text-center">エラーが発生しました</div>;
  if (isLoading || !transportationMethods)
    return <div className="container mx-auto py-8 text-center">読み込み中...</div>;
  return (
    <div className="my-4">
      <Label className="text-lg font-semibold">移動手段</Label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(transportationMethods as TransportMethods[]).map((method, idx) => (
          <div key={idx} className="flex items-center space-x-3">
            <div>
              <Checkbox
                checked={(fields.tripInfo.filter((val) => val.date === date)[0]?.transportationMethod || []).includes(
                  method.id,
                )}
                className="h-5 w-5 text-blue-500 focus:ring-2 focus:ring-blue-400"
                onCheckedChange={(checked) => {
                  const targetList = fields.tripInfo.filter((val) => val.date === date)[0]?.transportationMethod || [];
                  const isIncluded = targetList.includes(method.id);
                  if (checked && !isIncluded) {
                    fields.setTripInfo(date, 'transportationMethod', [...targetList, method.id]);
                  } else if (!checked && isIncluded) {
                    fields.setTripInfo(
                      date,
                      'transportationMethod',
                      targetList.filter((id) => id !== method.id),
                    );
                  }
                }}
              />
            </div>
            <Label className="text-sm">{JpTransportMethods[method.name]}</Label>
          </div>
        ))}
      </div>
      {fields.tripInfoErrors && (
        <span className="text-red-500">{fields.tripInfoErrors[date]?.transportationMethod}</span>
      )}
    </div>
  );
};

export default Transportation;
