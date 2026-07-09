'use client';

import { Info, Check, Clock, Train, FootprintsIcon, Car, Bike, CircleHelp } from 'lucide-react';

import { TransportNodeType, TravelModeTypeForDisplay, TravelPlanType } from '@/types/plan';
import { useStoreForPlanning } from '@/lib/plan';
// import { calculateArrivalWarning } from '@/lib/planning';

import TravelMap from './TravelMap';
import SpotDetailCard from './travel-plan/SpotDetailCard';
import DestinationDetailCard from './travel-plan/DestinationDetailCard';
import DepartureDetailCard from './travel-plan/DepartureDetailCard';
import PlanningWarningList from './travel-plan/PlanningWarningList';
import ExtraTimeSuggestions from './travel-plan/ExtraTimeSuggestions';
import ArrivalTimeWarning from './travel-plan/ArrivalTimeWarning';
import TimelineStatus from './travel-plan/TimelineStatus';

// transportIconsをエクスポート（他の場所で使われている可能性があるため）
export const transportIcons: TravelModeTypeForDisplay = {
  WALKING: { icon: <FootprintsIcon className="w-5 h-5 text-yellow-500" />, label: '徒歩' },
  TRANSIT: { icon: <Train className="w-5 h-5 text-blue-500" />, label: '電車' },
  DRIVING: { icon: <Car className="w-5 h-5 text-gray-700" />, label: '車' },
  BICYCLING: { icon: <Bike className="w-5 h-5 text-green-500" />, label: '自転車' },
  DEFAULT: { icon: <CircleHelp className="w-5 h-5 text-gray-400" />, label: '不明' },
};

const TravelPlan = ({ travelPlan }: { travelPlan: TravelPlanType }) => {
  const fields = useStoreForPlanning();
  if (!travelPlan) {
    return null;
  }

  const targetSimulationStatus = fields.simulationStatus
    ? fields.simulationStatus.filter((val) => val.date == travelPlan.date)[0]?.status
    : null;

  const spots = fields.getSpotInfo(travelPlan.date, null);
  const departureData = fields.getDepartureAndDestination(travelPlan.date, TransportNodeType.DEPARTURE);
  const destinationData = fields.getDepartureAndDestination(travelPlan.date, TransportNodeType.DESTINATION);

  const handleDeleteSpot = (id: string) => {
    const updatedSpots = spots.filter((spot) => spot.id == id)[0];
    fields.setSpots(travelPlan.date, updatedSpots, true);
  };

  if (!targetSimulationStatus || targetSimulationStatus === 0 || targetSimulationStatus === 1) {
    return (
      <div className="flex items-center space-x-2 my-10">
        {!targetSimulationStatus || targetSimulationStatus === 0 ? (
          <Info className="w-5 h-5 text-gray-400" />
        ) : (
          <Clock className="w-5 h-5 text-gray-400" />
        )}
        {!targetSimulationStatus || targetSimulationStatus === 0 ? (
          <span>観光地を選択して、上記のプラン作成ボタンを押下してください</span>
        ) : (
          <span>プラン作成中です</span>
        )}
      </div>
    );
  }

  if (!targetSimulationStatus || targetSimulationStatus === 9) {
    return (
      <div className="flex items-center space-x-2 my-10">
        {!targetSimulationStatus || targetSimulationStatus === 9 ? <Check className="w-5 h-5 text-red-400" /> : <></>}
        {!targetSimulationStatus || targetSimulationStatus === 9 ? (
          <span className="text-red-500">未入力項目があります。各項目の内容を確認してください。</span>
        ) : (
          <span></span>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-10 border-l-4 border-gray-300">
      <TimelineStatus date={travelPlan.date} />
      <ArrivalTimeWarning date={travelPlan.date} />
      <PlanningWarningList date={travelPlan.date} />
      <ExtraTimeSuggestions date={travelPlan.date} />

      {/* マップを追加 */}
      <div className="mb-10 bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">旅行ルート</h2>
        <TravelMap date={travelPlan.date} />
      </div>

      {/* 出発地 */}
      {departureData && <DepartureDetailCard date={travelPlan.date} index={0} />}

      {/* 観光スポット */}
      {spots.map((spot, index) => {
        return (
          <SpotDetailCard
            date={travelPlan.date}
            key={spot.id}
            spot={spot}
            nextSpot={spots[index + 1]}
            index={index == spots.length - 1 ? -1 : index}
            onDelete={handleDeleteSpot}
            onMemoChange={(memo) => fields.setSpots(travelPlan.date, { ...spot, memo }, false)}
          />
        );
      })}

      {/* 目的地 */}
      {destinationData && <DestinationDetailCard date={travelPlan.date} index={spots.length + 1} />}
    </div>
  );
};

export default TravelPlan;
