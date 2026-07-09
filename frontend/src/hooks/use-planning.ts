import { useCallback } from 'react';

import { useStoreForPlanning } from '@/lib/plan';
import { executePlanning, PlanningParams } from '@/lib/planning';
import { TransportNodeType } from '@/types/plan';

export const usePlanning = () => {
  /**
   * プランニングを行うに当たってのバリデーションチェックとデータ加工
   * @param param date - プランニング対象の日付
   */
  const handlePreprocessingPlanning = useCallback(async ({ date }: { date: string }) => {
    const fields = useStoreForPlanning.getState();
    let isError = false;
    const departureData = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
    const destinationData = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);
    const spotsData = fields.getSpotInfo(date, TransportNodeType.SPOT);

    fields.resetErrors();
    //推した時点で予定日、目的地、出発地、交通手段、観光スポットが空の場合はエラーを出す
    if (!fields.startDate || !fields.endDate) {
      fields.setErrors({ startDate: 'プランの日付を入力してください' });
      isError = true;
    }

    // 出発時間と目的地の時間が両方とも入力されていない場合はエラー
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

    // 入力がある場合はHH:mm形式かチェック
    if (destinationData.time && destinationData.time !== '' && !/^\d{2}:\d{2}$/.test(destinationData.time)) {
      fields.setPlanErrors(date, {
        destination: '到着時間はHH:mm形式で入力してください',
      });
      isError = true;
    }

    // スポットデータの有無のチェック
    if (!spotsData || spotsData.length === 0) {
      fields.setPlanErrors(date, {
        spots: '観光地スポットは1つ以上選択してください',
      });
      isError = true;
    }

    // エラーがある場合はプランニングはスキップ
    if (isError) {
      fields.setSimulationStatus({ date: date, status: 9 });
      return;
    }

    fields.setSimulationStatus({ date: date, status: 1 });

    try {
      // プランニング再実施時に既に移動手段が設定されている場合のそのIDを取得する
      const preferredTransportMethodIds: Record<string, number> = {};
      // プランニング再実施時に既に発車時間が設定されている場合のその発車時間を取得する
      const preferredDepartureTimes: Record<string, string> = {};

      if (departureData.transports?.transportMethod) {
        preferredTransportMethodIds.DEPARTURE_TO_FIRST_SPOT = departureData.transports.transportMethod;
      }

      if (
        departureData.transports?.transportMethod &&
        departureData.transports?.transportMethod == 4 &&
        departureData.nearestStation?.scheduledDepartureTime
      ) {
        preferredDepartureTimes.DEPARTURE_TO_FIRST_SPOT = departureData.nearestStation?.scheduledDepartureTime;
      }

      spotsData.forEach((spot, index) => {
        const nextSpot = spotsData[index + 1];
        if (!nextSpot) return;
        if (!spot.transports?.transportMethod) return;

        preferredTransportMethodIds[`SPOT_${spot.id}_TO_${nextSpot.id}`] = spot.transports.transportMethod;

        // 最寄駅の情報は次のスポットに格納されているため
        if (spot.transports.transportMethod != 4) return;
        if (!nextSpot.nearestStation?.scheduledDepartureTime) return;
        preferredDepartureTimes[`SPOT_${spot.id}_TO_${nextSpot.id}`] = nextSpot.nearestStation.scheduledDepartureTime;
      });

      if (spotsData.length > 0 && destinationData.transports?.transportMethod) {
        const lastSpot = spotsData[spotsData.length - 1];
        preferredTransportMethodIds[`SPOT_${lastSpot.id}_TO_DESTINATION`] = destinationData.transports.transportMethod;
      }

      if (
        destinationData.transports?.transportMethod &&
        destinationData.transports?.transportMethod == 4 &&
        destinationData.nearestStation?.scheduledDepartureTime
      ) {
        const lastSpot = spotsData[spotsData.length - 1];
        preferredDepartureTimes[`SPOT_${lastSpot.id}_TO_DESTINATION`] =
          destinationData.nearestStation.scheduledDepartureTime;
      }

      const params: PlanningParams = {
        date,
        departure: departureData,
        destination: destinationData,
        spots: spotsData || [],
        transportMethodIds: fields.getPlanningInfo(date)?.transportationMethodId || [1], // 何も設定されていなければ徒歩を選択
        preferredTransportMethodIds,
        preferredDepartureTimes,
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

      // 初回プランニング反映時の内部更新でdirtyが立つため、
      // 最終状態を改めてスナップショット化してdirtyを解除する。
      fields.setPlanningResult(date, result);

      fields.setSimulationStatus({ date: date, status: 2 });
    } catch (error) {
      console.error('プランニングエラー:', error);
      fields.setPlanErrors(date, {
        spots: 'プランニング中にエラーが発生しました。再度お試しください。',
      });
      fields.setSimulationStatus({ date: date, status: 9 });
    }
  }, []);

  return {
    handlePreprocessingPlanning,
  };
};
