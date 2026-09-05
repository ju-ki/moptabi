'use client';

import { useState, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { calcDistance } from '@/lib/algorithm';
import { useStoreForPlanning } from '@/lib/plan';
import { ExtendSpotType, TransportNodeType } from '@/types/plan';

import PlanSpotSettingCard from './PlanSpotSettingCard';
import NearestStationDestination from './nearestStation/NearestStationDestination';
import NearestStationDeparture from './nearestStation/NearestStationDeparture';

type SpotSettingListProps = {
  date: string;
};

/**
 * スポット設定一覧コンポーネント
 * ドラッグ&ドロップまたはプルダウンで順番変更、滞在時間の設定が可能
 */
export function SpotSettingList({ date }: SpotSettingListProps) {
  const fields = useStoreForPlanning();
  const spots = fields.getSpotInfo(date, null);
  const departureData = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
  const destinationData = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);
  const [draggedSpotId, setDraggedSpotId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // スポットを順番でソート
  const sortedSpots = [...spots].sort((a, b) => a.order - b.order);

  // スポット間の距離を計算
  const getDistanceFromPrevious = useCallback(
    (spotId: string, index: number): number | undefined => {
      const currentSpot = spots.find((s) => s.id === spotId);
      if (!currentSpot) return undefined;

      if (index === 0) {
        // 最初のスポットは出発地からの距離
        if (!departureData) return undefined;
        return calcDistance(
          { lat: departureData.latitude, lng: departureData.longitude },
          { lat: currentSpot.latitude, lng: currentSpot.longitude },
        );
      }

      const prevSetting = spots[index - 1];
      const prevSpot = spots.find((s) => s.id === prevSetting.id);
      if (!prevSpot) return undefined;

      return calcDistance(
        { lat: prevSpot.latitude, lng: prevSpot.longitude },
        { lat: currentSpot.latitude, lng: currentSpot.longitude },
      );
    },
    [spots, departureData],
  );

  // 順番を入れ替えるヘルパー関数
  const reorderSpots = useCallback(
    (fromSpotId: string, toSpotId: string) => {
      const fromSpot = spots.find((s) => s.id === fromSpotId);
      const toSpot = spots.find((s) => s.id === toSpotId);
      if (!fromSpot || !toSpot || fromSpot.id === toSpot.id) return;

      const fromOrder = fromSpot.order;
      const toOrder = toSpot.order;

      // 影響を受けるスポットの順番を更新
      spots.forEach((spot) => {
        if (spot.id === fromSpotId) {
          fields.editSpots(date, spot.id, { order: toOrder });
        } else if (fromOrder < toOrder) {
          // 下方向への移動: fromOrder+1 ~ toOrder のスポットを1つ上に
          if (spot.order > fromOrder && spot.order <= toOrder) {
            fields.editSpots(date, spot.id, { order: spot.order - 1 });
          }
        } else {
          // 上方向への移動: toOrder ~ fromOrder-1 のスポットを1つ下に
          if (spot.order >= toOrder && spot.order < fromOrder) {
            fields.editSpots(date, spot.id, { order: spot.order + 1 });
          }
        }
      });
    },
    [spots, fields, date],
  );

  // プルダウンから順番を変更
  const handleOrderChange = useCallback(
    (spotId: string, newOrder: number) => {
      const currentSpot = spots.find((s) => s.id === spotId);
      if (!currentSpot || currentSpot.order === newOrder) return;

      const currentOrder = currentSpot.order;

      // 順番を更新
      spots.forEach((spot) => {
        if (spot.id === spotId) {
          fields.editSpots(date, spot.id, { order: newOrder });
        } else if (currentOrder < newOrder) {
          // 下方向への移動
          if (spot.order > currentOrder && spot.order <= newOrder) {
            fields.editSpots(date, spot.id, { order: spot.order - 1 });
          }
        } else {
          // 上方向への移動
          if (spot.order >= newOrder && spot.order < currentOrder) {
            fields.editSpots(date, spot.id, { order: spot.order + 1 });
          }
        }
      });
    },
    [spots, fields, date],
  );

  const handleSettingChange = (updatedSetting: ExtendSpotType) => {
    fields.editSpots(date, updatedSetting.id, updatedSetting);
  };

  // ドラッグイベントハンドラ
  const handleDragStart = (e: React.DragEvent, spotId: string) => {
    setDraggedSpotId(spotId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', spotId);
  };

  const handleDragEnd = () => {
    setDraggedSpotId(null);
    setDropTargetId(null);
  };

  const handleDragOver = (e: React.DragEvent, spotId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (spotId !== draggedSpotId) {
      setDropTargetId(spotId);
    }
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetSpotId: string) => {
    e.preventDefault();
    const sourceSpotId = e.dataTransfer.getData('text/plain');
    if (sourceSpotId && sourceSpotId !== targetSpotId) {
      reorderSpots(sourceSpotId, targetSpotId);
    }
    setDraggedSpotId(null);
    setDropTargetId(null);
  };

  const onDelete = (id: string) => {
    const deletedSpot = spots.find((spot) => spot.id === id);
    if (!deletedSpot) return;

    const deletedOrder = deletedSpot.order;

    // スポットを削除
    fields.setSpots(date, deletedSpot, true);

    // 削除されたスポットより後の順番を1つずつ繰り上げる
    spots
      .filter((spot) => spot.id !== id && spot.order > deletedOrder)
      .forEach((spot) => {
        fields.editSpots(date, spot.id, { order: spot.order - 1 });
      });
  };

  if (spots.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
        <p>スポットが選択されていません</p>
        <p className="text-sm mt-1">スポットを追加してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">スポットと最寄駅の設定</h3>
        <Badge variant="outline">{spots.length}件</Badge>
      </div>

      <div className="space-y-2">
        <NearestStationDeparture date={date} />
        {sortedSpots.map((spot, index) => (
          <PlanSpotSettingCard
            key={spot.id}
            spot={spot}
            destinationData={index === spots.length - 1 ? destinationData : undefined}
            totalSpots={spots.length}
            onSettingChange={handleSettingChange}
            distanceFromPrevious={getDistanceFromPrevious(spot.id, index)}
            nextSpot={index < spots.length - 1 ? sortedSpots[index + 1] : undefined}
            onOrderChange={handleOrderChange}
            isDragging={draggedSpotId === spot.id}
            isDropTarget={dropTargetId === spot.id}
            onDragStart={(e) => handleDragStart(e, spot.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, spot.id)}
            onDrop={(e) => handleDrop(e, spot.id)}
            onDragLeave={handleDragLeave}
            onDelete={() => onDelete(spot.id)}
          />
        ))}
        <NearestStationDestination date={date} />
      </div>
    </div>
  );
}
