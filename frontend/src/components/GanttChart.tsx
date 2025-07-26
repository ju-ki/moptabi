'use client';
import { DndContext, DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core';
import { Fragment, useEffect, useState } from 'react';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { X } from 'lucide-react';

import { isTaskDurationValid, timeToMinutes, calcMoveDiff, updateTimeByMinutes } from '@/lib/utils';
import { Spot, TransportNodeType } from '@/types/plan';
import { useStoreForPlanning } from '@/lib/plan';

import { DraggableHandle, DroppableHandle } from './common/DndItem';
import { Button } from './ui/button';

const GanttChart = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  const [spots, setSpots] = useState<Spot[] | []>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [draggingSpot, setDraggingSpot] = useState<{
    id: string;
    originalStart: string;
    originalEnd: string;
    dragType: 'start' | 'end' | 'move';
    originalTime: string;
  } | null>(null);
  const [previewSpots, setPreviewSpots] = useState<Spot[] | []>([]);

  useEffect(() => {
    const filteredSpots = fields.getSpotInfo(date, TransportNodeType.SPOT);
    if (filteredSpots.length > 0) {
      setSpots(filteredSpots);
      setPreviewSpots(filteredSpots);
    }
  }, [fields, fields.plans, date]);

  useEffect(() => {
    const slots = Array.from({ length: 25 }, (_, i) => {
      const hour = i;
      const minute = '00';
      return `${String(hour).padStart(2, '0')}:${minute}`;
    });
    setTimeSlots(slots);
  }, []);

  const isTimeWithinRange = (hour: string, minute: number, start: string, end: string) => {
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return time >= start && time < end;
  };

  const isStartPoint = (hour: number, minute: number, id: string) => {
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const targetData = spots.filter((spot) => spot.id === id)[0];
    if (targetData.stayStart === time) {
      return true;
    }
    return false;
  };

  const isEndPoint = (hour: number, minute: number, id: string) => {
    hour = minute == 45 ? hour + 1 : hour;
    minute = minute == 45 ? 0 : minute + 15;
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const targetData = spots.filter((spot) => spot.id === id)[0];
    if (targetData.stayEnd === time) {
      return true;
    }
    return false;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const [draggingId, oldTime] = event.active.id.toString().split('/').map(String);
    const spot = spots.find((s) => s.id === draggingId);

    if (spot) {
      const isStart = isStartPoint(
        Number.parseInt(oldTime.split(':')[0]),
        Number.parseInt(oldTime.split(':')[1]),
        draggingId,
      );
      const isEnd = isEndPoint(
        Number.parseInt(oldTime.split(':')[0]),
        Number.parseInt(oldTime.split(':')[1]),
        draggingId,
      );

      let dragType: 'start' | 'end' | 'move';
      if (isStart) {
        dragType = 'start';
      } else if (isEnd) {
        dragType = 'end';
      } else {
        dragType = 'move';
      }

      setDraggingSpot({
        id: draggingId,
        originalStart: spot.stayStart || '',
        originalEnd: spot.stayEnd || '',
        dragType,
        originalTime: oldTime,
      });
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const [draggingId, oldTime] = event.active.id.toString().split('/').map(String);

    if (event.over && draggingSpot) {
      const [spotId, newTime] = event.over.id.toString().split('/').map(String);

      // 予期せぬ箇所へドラッグされることを防ぐためのチェック
      if (draggingId !== spotId) {
        return;
      }

      const prevData = spots.find((activity) => activity.id === spotId);
      // データが取得できない場合は何もしない
      if (!prevData) {
        return;
      }

      let newStartTime = prevData.stayStart || '';
      let newEndTime = prevData.stayEnd || '';

      if (draggingSpot.dragType === 'start') {
        // 始点のドラッグ処理
        if (newTime >= prevData.stayEnd) {
          return;
        }
        newStartTime = newTime;
      } else if (draggingSpot.dragType === 'end') {
        // 終点のドラッグ処理
        if (newTime <= prevData.stayStart) {
          return;
        }
        newEndTime = newTime;
      } else if (draggingSpot.dragType === 'move') {
        // 全体移動の処理
        const timeDiff = calcMoveDiff(newTime, draggingSpot.originalTime);
        newStartTime = updateTimeByMinutes(prevData.stayStart || '', timeDiff);
        newEndTime = updateTimeByMinutes(prevData.stayEnd || '', timeDiff);

        // 24時間制の範囲内に収める
        const startMinutes = timeToMinutes(newStartTime);
        const endMinutes = timeToMinutes(newEndTime);

        if (startMinutes < 0 || endMinutes > 1440) {
          return; // 範囲外の場合は移動をキャンセル
        }
      }

      // 15分未満の場合はドラッグをキャンセル
      if (!isTaskDurationValid(newStartTime, newEndTime)) {
        return;
      }

      // プレビュー用のスポットを更新
      const updatedPreviewSpots = previewSpots.map((spot) => {
        if (spot.id === spotId) {
          return {
            ...spot,
            stayStart: newStartTime,
            stayEnd: newEndTime,
          };
        }
        return spot;
      });
      setPreviewSpots(updatedPreviewSpots);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const [draggingId, oldTime] = event.active.id.toString().split('/').map(String);

    if (event.over && draggingSpot) {
      const [spotId, newTime] = event.over.id.toString().split('/').map(String);

      if (draggingId !== spotId) {
        return;
      }

      const prevData = spots.find((activity) => activity.id === spotId);
      if (!prevData) {
        return;
      }

      let newStartTime = prevData.stayStart || '';
      let newEndTime = prevData.stayEnd || '';

      if (draggingSpot.dragType === 'start') {
        // 始点のドラッグ処理
        if (newTime >= prevData.stayEnd) {
          // ドラッグをキャンセルして元の状態に戻す
          setPreviewSpots(spots);
          setDraggingSpot(null);
          return;
        }
        newStartTime = newTime;
      } else if (draggingSpot.dragType === 'end') {
        // 終点のドラッグ処理
        if (newTime <= prevData.stayStart) {
          // ドラッグをキャンセルして元の状態に戻す
          setPreviewSpots(spots);
          setDraggingSpot(null);
          return;
        }
        newEndTime = newTime;
      } else if (draggingSpot.dragType === 'move') {
        // 全体移動の処理
        const timeDiff = calcMoveDiff(newTime, draggingSpot.originalTime);
        newStartTime = updateTimeByMinutes(prevData.stayStart || '', timeDiff);
        newEndTime = updateTimeByMinutes(prevData.stayEnd || '', timeDiff);

        // 24時間制の範囲内に収める
        const startMinutes = timeToMinutes(newStartTime);
        const endMinutes = timeToMinutes(newEndTime);

        if (startMinutes < 0 || endMinutes > 1440) {
          // 範囲外の場合はドラッグをキャンセル
          setPreviewSpots(spots);
          setDraggingSpot(null);
          return;
        }
      }

      // 15分未満の場合はドラッグをキャンセル
      if (!isTaskDurationValid(newStartTime, newEndTime)) {
        setPreviewSpots(spots);
        setDraggingSpot(null);
        return;
      }

      // 実際のデータを更新
      fields.setSpots(date, { ...prevData, stayStart: newStartTime, stayEnd: newEndTime }, false);
    }

    // ドラッグ状態をリセット
    setDraggingSpot(null);
    setPreviewSpots(spots);
  };

  const handleDeleteSpot = (id: string) => {
    setSpots((prev) => prev.filter((spot) => spot.id !== id));
    setPreviewSpots((prev) => prev.filter((spot) => spot.id !== id));
    const filteredPlan = fields.plans.find((plan) => plan.date === date);
    if (filteredPlan) {
      const spot = filteredPlan.spots.find((spot) => spot.id === id);
      if (spot) {
        fields.setSpots(date, spot, true);
      }
    }
  };

  // 表示用のスポット（ドラッグ中はプレビュー、そうでなければ実際のデータ）
  const displaySpots = draggingSpot ? previewSpots : spots;

  if (timeSlots.length === 0 || !displaySpots.length) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">観光地を選択してください</h3>
          <p className="text-gray-500 max-w-md">
            観光地を選択すると、ここにガントチャートが表示されます。時間の調整や移動が可能です。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-white rounded-lg shadow-sm border">
      <div className="flex flex-col lg:flex-row">
        {/* 観光地名 */}
        <div className="w-full lg:w-96 flex-shrink-0 mb-4 lg:mb-0">
          <div className="font-bold h-8 flex items-center justify-center bg-gray-200 border-b border-gray-300 rounded-t-lg">
            観光地名
          </div>

          {displaySpots.length > 0 &&
            displaySpots.map((spot, id) => (
              <div
                key={id}
                className={`h-16 flex items-center justify-between border-b border-gray-300 bg-gray-100 px-3 ${
                  id === displaySpots.length - 1 ? 'rounded-b-lg' : ''
                }`}
              >
                <div className="flex flex-col justify-center overflow-hidden flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{spot.location.name}</span>
                  <span className="text-xs text-gray-500 truncate">
                    ({spot.stayStart} ~ {spot.stayEnd})
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteSpot(spot.id || '')}
                  className="flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
        </div>

        <div className="flex-1 overflow-x-auto">
          {/* 時間軸 */}
          <div className="flex border-b border-gray-300" style={{ width: `${timeSlots.length * 80}px` }}>
            {timeSlots.map((timeSlot, index) => (
              <div
                key={index}
                className="flex items-center justify-center w-20 px-2 h-8 text-sm font-semibold text-gray-700 border-r border-gray-300 last:border-r-0 bg-gray-100"
              >
                {timeSlot}
              </div>
            ))}
          </div>

          {/* ガントチャート部分 */}
          <DndContext
            modifiers={[restrictToHorizontalAxis]}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
          >
            {displaySpots.map((spot, id) => (
              <div
                key={id}
                className="flex h-16 items-center border-b border-gray-300 last:border-b-0"
                style={{ width: `${timeSlots.length * 80}px` }}
              >
                {timeSlots.map((timeSlot, index) => {
                  const timeRange = [0, 15, 30, 45];
                  return (
                    <Fragment key={index}>
                      {timeRange.map((minute) => {
                        const isStart = isStartPoint(Number.parseInt(timeSlot.split(':')[0]), minute, spot.id || '');
                        const isEnd = isEndPoint(Number.parseInt(timeSlot.split(':')[0]), minute, spot.id || '');
                        const spotId = `${spot.id}/${timeSlot.split(':')[0]}:${String(minute).padEnd(2, '0')}`;
                        return (
                          <DroppableHandle key={spotId} id={spotId}>
                            {isTimeWithinRange(
                              timeSlot.split(':')[0],
                              minute,
                              spot.stayStart || '24:00',
                              spot.stayEnd || '24:00',
                            ) && <DraggableHandle id={spotId} isStart={isStart} isEnd={isEnd} />}
                          </DroppableHandle>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </div>
            ))}
          </DndContext>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
