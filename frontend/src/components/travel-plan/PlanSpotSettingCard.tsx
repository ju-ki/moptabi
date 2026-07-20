'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bus,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  Loader2,
  Train,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  estimateTransitTime,
  estimateWalkingTime,
  formatDuration,
  shouldRecommendNearestStation,
} from '@/data/mockNearestStation';
import { searchNearestStation } from '@/lib/google-maps';
import { cn } from '@/lib/utils';
import { NearestStation } from '@/types/plan';
import { Coordination, Spot } from '@/types/plan';

import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export type PlanSpotSettingCardProps = {
  spot: Spot;
  previousLocation: Coordination;
  previousSpot?: Spot;
  totalSpots: number;
  onSettingChange: (setting: Spot) => void;
  distanceFromPrevious?: number;
  onOrderChange: (spotId: string, newOrder: number) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDelete: (id: string) => void;
};

export default function PlanSpotSettingCard({
  spot,
  previousSpot,
  totalSpots,
  onSettingChange,
  distanceFromPrevious,
  onOrderChange,
  isDragging = false,
  isDropTarget = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDragLeave,
  onDelete,
}: PlanSpotSettingCardProps) {
  const buildInitialDepartureCandidates = (): string[] => {
    const candidates = spot.nearestStation?.scheduledDepartureTimes?.slice(0, 3) ?? [];
    if (candidates.length > 0) {
      return [...candidates, ...Array(Math.max(0, 3 - candidates.length)).fill('')];
    }
    const fallback = spot.nearestStation?.scheduledDepartureTime ?? '';
    return [fallback, '', ''];
  };

  const currentStayDuration = spot.stayDuration ?? 60;
  const hours = Math.floor(currentStayDuration / 60);
  const minutes = currentStayDuration % 60;

  const shouldRecommend = distanceFromPrevious ? shouldRecommendNearestStation(distanceFromPrevious) : false;

  const [useNearestStation, setUseNearestStation] = useState<boolean>(!!spot.nearestStation);
  const [excludeBusStop, setExcludeBusStop] = useState<boolean>(false);
  const [nearestStations, setNearestStations] = useState<NearestStation[]>(
    [spot.nearestStation].filter((s): s is NearestStation => !!s),
  );
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(spot.nearestStation?.placeId || null);
  const [transitTime, setTransitTime] = useState<number>(spot.nearestStation?.transitTime || 0);
  const [isManualTransitTime, setIsManualTransitTime] = useState<boolean>(
    spot.nearestStation?.isManualTransitTime || false,
  );
  const [scheduledDepartureTime, setScheduledDepartureTime] = useState<string>(
    spot.nearestStation?.scheduledDepartureTime || '',
  );
  const [scheduledDepartureTimes, setScheduledDepartureTimes] = useState<string[]>(buildInitialDepartureCandidates());
  const [transitMemo, setTransitMemo] = useState<string>(spot.nearestStation?.transitMemo || '');

  const [isStationSectionExpanded, setIsStationSectionExpanded] = useState<boolean>(
    !!spot.nearestStation && !!spot.nearestStation.name,
  );

  const lastSearchBusStop = useRef<boolean>(excludeBusStop);
  const lastSearchCoord = useRef<{ lat: number; lng: number } | null>(
    spot.location ? { lat: spot.location.lat, lng: spot.location.lng } : null,
  );

  useEffect(() => {
    if (spot.nearestStation && nearestStations.length > 0) {
      const existingStation = nearestStations.find(
        (s) =>
          s.name === spot.nearestStation?.name ||
          (s.latitude === spot.nearestStation?.latitude && s.longitude === spot.nearestStation?.longitude),
      );
      if (existingStation) {
        setSelectedStationId(existingStation.placeId);
      }
    }
  }, [nearestStations, spot.nearestStation]);

  const fetchNearestStations = async () => {
    setIsLoadingStations(true);
    try {
      const stations = await searchNearestStation({ center: spot.location, radius: 1, excludeBusStop });
      setNearestStations(stations);
      lastSearchBusStop.current = excludeBusStop;
      lastSearchCoord.current = spot.location ? { lat: spot.location.lat, lng: spot.location.lng } : null;
    } catch (error) {
      console.error('最寄駅の取得に失敗しました:', error);
    } finally {
      setIsLoadingStations(false);
    }
  };

  const handleUseNearestStationChange = (checked: boolean) => {
    setUseNearestStation(checked);
    setIsStationSectionExpanded(checked);
    if (
      checked &&
      (lastSearchBusStop.current !== excludeBusStop ||
        lastSearchCoord.current?.lat !== spot.location?.lat ||
        lastSearchCoord.current?.lng !== spot.location?.lng ||
        nearestStations.length === 0)
    ) {
      fetchNearestStations();
    }
    if (!checked) {
      onSettingChange({ ...spot, nearestStation: undefined });
      setSelectedStationId(null);
      setTransitTime(0);
      setIsManualTransitTime(false);
      setScheduledDepartureTime('');
      setScheduledDepartureTimes(['', '', '']);
      setTransitMemo('');
    }
  };

  const handleStationSelect = (stationId: string) => {
    setSelectedStationId(stationId);
    const station = nearestStations.find((s) => s.placeId === stationId);
    if (station) {
      const estimatedTime = distanceFromPrevious ? estimateTransitTime(distanceFromPrevious) : 0;
      setTransitTime(estimatedTime);
      setIsManualTransitTime(false);

      onSettingChange({
        ...spot,
        nearestStation: {
          spotId: station.spotId,
          placeId: stationId,
          stationType: station.stationType,
          name: station.name || '',
          walkingTime: station.walkingTime || 0,
          latitude: station.latitude || 0,
          longitude: station.longitude || 0,
          transitTime: estimatedTime,
          isManualTransitTime: false,
          scheduledDepartureTime,
          scheduledDepartureTimes: scheduledDepartureTimes.filter((candidate) => candidate !== ''),
          transportMethodId: 1,
        },
      });
    }
  };

  const handleScheduledDepartureTimeChange = (time: string) => {
    setScheduledDepartureTime(time);
    const nextCandidates = [...scheduledDepartureTimes];
    nextCandidates[0] = time;
    setScheduledDepartureTimes(nextCandidates);
    if (spot.nearestStation) {
      onSettingChange({
        ...spot,
        nearestStation: {
          ...spot.nearestStation,
          scheduledDepartureTime: time,
          scheduledDepartureTimes: nextCandidates.filter((candidate) => candidate !== ''),
        },
      });
    }
  };

  const handleScheduledDepartureTimeCandidateChange = (index: number, time: string) => {
    const nextCandidates = [...scheduledDepartureTimes];
    nextCandidates[index] = time;
    setScheduledDepartureTimes(nextCandidates);

    const firstCandidate = nextCandidates.find((candidate) => candidate !== '') ?? '';
    setScheduledDepartureTime(firstCandidate);

    if (spot.nearestStation) {
      onSettingChange({
        ...spot,
        nearestStation: {
          ...spot.nearestStation,
          scheduledDepartureTime: firstCandidate,
          scheduledDepartureTimes: nextCandidates.filter((candidate) => candidate !== ''),
        },
      });
    }
  };

  const handleTransitMemoChange = (memo: string) => {
    setTransitMemo(memo);
    if (spot.nearestStation) {
      onSettingChange({
        ...spot,
        nearestStation: {
          ...spot.nearestStation,
          transitMemo: memo,
        },
      });
    }
  };

  const handleTransitTimeChange = (newTime: number) => {
    const validTime = Math.min(540, Math.max(1, newTime || 1));
    setTransitTime(validTime);
    setIsManualTransitTime(true);

    if (spot.nearestStation) {
      onSettingChange({
        ...spot,
        nearestStation: {
          ...spot.nearestStation,
          transitTime: validTime,
          isManualTransitTime: true,
        },
      });
    }
  };

  const handleDurationChange = (newHours: number, newMinutes: number) => {
    const duration = newHours * 60 + newMinutes;
    onSettingChange({ ...spot, stayDuration: Math.max(0, duration) });
  };

  const orderOptions = Array.from({ length: totalSpots }, (_, i) => i + 1);
  const orderSelect = (
    <Select value={String(spot.order)} onValueChange={(value) => onOrderChange(spot.id, Number(value))}>
      <SelectTrigger className="h-8 w-16">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {orderOptions.map((order) => (
          <SelectItem key={order} value={String(order)}>
            {order}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Card
      className={cn(
        'relative transition-all',
        isDragging && 'opacity-50 ring-2 ring-primary',
        isDropTarget && 'ring-2 ring-blue-400 bg-blue-50',
      )}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
    >
      <button
        type="button"
        className="absolute top-2 right-2 hidden rounded-full p-1 transition-colors hover:bg-destructive/10 sm:inline-flex"
        onClick={() => onDelete(spot.id)}
        aria-label="スポットを削除"
      >
        <X className="h-4 w-4 text-destructive" />
      </button>

      <CardContent className="p-3 pr-10 sm:p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex w-full items-start justify-between sm:hidden">
            <div className="flex items-center gap-3">
              <div className="cursor-grab rounded p-1 hover:bg-muted active:cursor-grabbing">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              {orderSelect}
            </div>
            <button
              type="button"
              className="rounded-full p-1 transition-colors hover:bg-destructive/10"
              onClick={() => onDelete(spot.id)}
              aria-label="スポットを削除"
            >
              <X className="h-4 w-4 text-destructive" />
            </button>
          </div>

          <div className="hidden rounded p-1 hover:bg-muted sm:block">
            <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground active:cursor-grabbing" />
          </div>

          <div className="hidden sm:block">{orderSelect}</div>

          <div className="w-full min-w-0 flex-1 sm:w-auto">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium truncate">{spot.location.name}</h4>
              {distanceFromPrevious !== undefined && (
                <p className="text-sm text-gray-500">前のスポットから{(distanceFromPrevious / 1000).toFixed(1)} km</p>
              )}
              {shouldRecommend && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
                      <AlertTriangle className="h-3 w-3" />
                      取得推奨
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>徒歩{estimateWalkingTime(distanceFromPrevious!)}分かかるため、 最寄駅の取得を推奨します。</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">滞在時間</Label>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={hours}
                  onChange={(e) => handleDurationChange(Number(e.target.value), minutes)}
                  className="w-16 text-center"
                />
                <span className="text-sm text-muted-foreground">時間</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  value={minutes}
                  onChange={(e) => handleDurationChange(hours, Number(e.target.value))}
                  className="w-16 text-center"
                />
                <span className="text-sm text-muted-foreground">分</span>
              </div>
              <span className="text-sm text-muted-foreground">({formatDuration(currentStayDuration)})</span>
            </div>

            <div className="mt-4 border rounded-lg overflow-hidden">
              <div
                data-testid="station-section-toggle"
                className={cn(
                  'flex cursor-pointer flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between',
                  useNearestStation ? 'bg-blue-50' : 'bg-gray-50',
                )}
                onClick={() => useNearestStation && setIsStationSectionExpanded(!isStationSectionExpanded)}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Switch
                    id={`use-station-${spot.id}`}
                    checked={useNearestStation}
                    onCheckedChange={handleUseNearestStationChange}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Label
                    htmlFor={`use-station-${spot.id}`}
                    className="text-sm cursor-pointer flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Train className="h-4 w-4" />
                    最寄駅を使用
                  </Label>
                  <div className="flex items-center gap-1 sm:ml-2">
                    <Checkbox
                      checked={excludeBusStop}
                      onCheckedChange={() => setExcludeBusStop((prev) => !prev)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Label className="text-sm cursor-pointer flex items-center gap-1 text-muted-foreground">
                      <Bus className="h-4 w-4" />
                      バス停を除外
                    </Label>
                  </div>
                </div>
                {useNearestStation && (
                  <button type="button" className="p-1">
                    {isStationSectionExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                )}
              </div>

              {useNearestStation && isStationSectionExpanded && (
                <div className="p-4 space-y-4 border-t">
                  {isLoadingStations ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      最寄駅を検索中...
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                            最寄駅
                          </Badge>
                          <span className="text-sm text-gray-600">このスポット周辺の最寄駅</span>
                        </div>
                        {nearestStations.length > 0 ? (
                          <div className="space-y-2">
                            <Select value={selectedStationId || ''} onValueChange={handleStationSelect}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="このスポットの最寄駅を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                {nearestStations.map((station) => (
                                  <SelectItem key={station.placeId} value={station.placeId}>
                                    {station.stationType === 'BUS' ? '🚌' : '🚃'} {station.name} (徒歩
                                    {station.walkingTime}分 / 距離{station.distance}m)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedStationId && (
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <span>✓ 選択中:</span>
                                {nearestStations.find((s) => s.placeId === selectedStationId)?.name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            このスポット周辺に最寄駅が見つかりませんでした
                          </span>
                        )}
                      </div>

                      {spot.nearestStation && previousSpot && previousSpot?.nearestStation && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              移動情報
                            </Badge>
                            <span className="text-sm text-gray-600">出発駅 → 到着駅 の電車/バス移動</span>
                          </div>

                          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                            <div className="flex items-center gap-2">
                              <Train className="h-4 w-4 text-muted-foreground" />
                              <Label className="text-sm">移動時間</Label>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={1}
                                max={540}
                                value={transitTime}
                                data-testid="transit-time-test"
                                onChange={(e) => handleTransitTimeChange(Number(e.target.value))}
                                className="w-20 text-center"
                              />
                              <span className="text-sm text-muted-foreground">分</span>
                            </div>
                            {isManualTransitTime ? (
                              <Badge variant="outline" className="text-xs">
                                手入力
                              </Badge>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    推定値
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    直線距離からの概算です。
                                    <br />
                                    乗換案内アプリで調べた時間に修正してください。
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          <div className="flex flex-col items-start gap-2 sm:flex-row sm:gap-4">
                            <div className="flex min-w-fit items-center gap-2 sm:mt-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <Label className="text-sm">発車時間</Label>
                            </div>
                            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                              {scheduledDepartureTimes.map((candidate, index) => (
                                <Input
                                  key={`scheduled-departure-${spot.id}-${index}`}
                                  type="time"
                                  data-testid={`scheduled-departure-${index + 1}`}
                                  value={candidate}
                                  onChange={(e) => handleScheduledDepartureTimeCandidateChange(index, e.target.value)}
                                  className="w-28"
                                  aria-label={`発車時間候補${index + 1}`}
                                />
                              ))}
                            </div>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-muted-foreground cursor-help">?</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  乗換案内アプリで調べた発車時間を入力してください。
                                  <br />
                                  最寄駅到着時間に応じた発車時間が自動で採用されます。
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          <div className="flex flex-col items-start gap-2 sm:flex-row sm:gap-4">
                            <Label className="mt-2 min-w-fit text-sm">路線メモ</Label>
                            <Textarea
                              value={transitMemo}
                              onChange={(e) => handleTransitMemoChange(e.target.value)}
                              placeholder="例: ○○線 △△行き、乗り換え1回"
                              className="h-16 w-full text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {spot.nearestStation && previousSpot && previousSpot?.nearestStation && (
                        <div className="rounded bg-gray-100 p-2 text-sm text-gray-600 break-words">
                          <span className="font-medium">ルート: </span>
                          <span>{previousSpot.location.name}</span>
                          {previousSpot.nearestStation && (
                            <>
                              <span className="mx-1">→</span>
                              <span className="text-blue-600">
                                {previousSpot.nearestStation?.name}
                                (徒歩{previousSpot.nearestStation?.walkingTime}分)
                              </span>
                              <span className="mx-1">→</span>
                            </>
                          )}
                          {spot.nearestStation && previousSpot && previousSpot?.nearestStation && (
                            <>
                              <span className="mx-1">→</span>
                              <span className="text-green-600">🚃 {transitTime}分</span>
                            </>
                          )}
                          {selectedStationId && (
                            <>
                              <span className="mx-1">→</span>
                              <span className="text-blue-600">
                                {spot.nearestStation?.name}
                                (徒歩{spot.nearestStation?.walkingTime}分)
                              </span>
                            </>
                          )}
                          <span className="mx-1">→</span>
                          <span>{spot.location.name}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {useNearestStation &&
                !isStationSectionExpanded &&
                (spot.nearestStation || previousSpot?.nearestStation) && (
                  <div className="px-4 py-2 text-sm text-gray-600 border-t bg-gray-50">
                    {previousSpot?.nearestStation && (
                      <span className="mr-3">
                        <Badge
                          variant="outline"
                          className="bg-orange-100 text-orange-700 border-orange-300 text-xs mr-1"
                        >
                          出発
                        </Badge>
                      </span>
                    )}
                    {spot.nearestStation && previousSpot?.nearestStation && (
                      <span className="text-gray-400 mr-3">→</span>
                    )}
                    {spot.nearestStation && (
                      <span>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs mr-1">
                          到着
                        </Badge>
                        {nearestStations.find((s) => s.placeId === selectedStationId)?.name}
                      </span>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
