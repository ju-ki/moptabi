import React from 'react';

import { useStoreForPlanning } from '@/lib/plan';
import { executePlanning, PlanningParams } from '@/lib/planning';
import { TransportNodeType } from '@/types/plan';

import { Button } from './ui/button';

const PlanningButton = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();

  const onClickPlanningButton = async (): Promise<void> => {
    let isError = false;
    fields.resetErrors();
    //推した時点で予定日、目的地、出発地、交通手段、観光スポットが空の場合はエラーを出す
    if (!fields.startDate || !fields.endDate) {
      fields.setErrors({ startDate: 'プランの日付を入力してください' });
      isError = true;
    }

    const targetPlans = fields.plans.filter((val) => val.date === date)[0];

    const departureData = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
    const destinationData = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);

    if ((!departureData.time && !destinationData.time) || (departureData.time === '' && destinationData.time === '')) {
      fields.setPlanErrors(date, {
        departure: '出発時間または到着時間のどちらかを入力してください',
      });
      isError = true;
    }

    // 入力がある場合はHH:mm形式かチェック
    if (departureData.time && departureData.time !== '' && !/^\d{2}:\d{2}$/.test(departureData.time)) {
      fields.setPlanErrors(date, {
        departure: '出発時間はHH:mm形式で入力してください',
      });
      isError = true;
    }

    if (destinationData.time && destinationData.time !== '' && !/^\d{2}:\d{2}$/.test(destinationData.time)) {
      fields.setPlanErrors(date, {
        destination: '到着時間はHH:mm形式で入力してください',
      });
      isError = true;
    }

    // スポットデータのチェック
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
    try {
      const params: PlanningParams = {
        date,
        departure: departureData,
        destination: destinationData,
        spots: spotsData || [],
        transportMethodIds: fields.getPlanningInfo(date)?.transportationMethodId || [1], // 何も設定されていなければ徒歩を選択
      };

      const result = await executePlanning(params);

      fields.setPlanningResult(date, result);
      fields.setDepartureAndDestination(date, TransportNodeType.DEPARTURE, {
        ...result.updatedDeparture,
      });
      fields.setDepartureAndDestination(date, TransportNodeType.DESTINATION, {
        ...result.updatedDestination,
      });
      // 更新されたスポット情報をストアに反映
      for (const spot of result.updatedSpots) {
        fields.editSpots(date, spot.id, {
          stayStart: spot.stayStart,
          stayEnd: spot.stayEnd,
          stayDuration: spot.stayDuration,
          routeToNext: spot.routeToNext,
        });
      }

      // 交通手段を更新した状態でストアに保存
      if (result.routes) {
        for (const route of result.routes) {
          if (route.routeType === 'DEPARTURE_TO_SPOT') {
            fields.switchAlternativeRoute(date, route.id, route.transportMethodId);
          } else if (route.routeType === 'SPOT_TO_DESTINATION') {
            fields.switchAlternativeRoute(date, route.id, route.transportMethodId);
          } else if (route.routeType === 'SPOT_TO_SPOT') {
            const spot = fields.getSpotInfo(date, TransportNodeType.SPOT).find((s) => s.id === route.fromSpotId);
            if (spot) {
              fields.switchAlternativeRoute(date, route.id, route.transportMethodId);
            }
          } else if (route.routeType === 'TO_STATION') {
            fields.switchAlternativeRoute(date, route.id, route.transportMethodId);
          }
        }
      }

      fields.setSimulationStatus({ date: date, status: 2 });
    } catch (error) {
      console.error('プランニングエラー:', error);
      fields.setPlanErrors(date, {
        spots: 'プランニング中にエラーが発生しました。再度お試しください。',
      });
      fields.setSimulationStatus({ date: date, status: 9 });
    }
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
