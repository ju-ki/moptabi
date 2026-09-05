import { AlertTriangle, Bus, Calendar, ChevronDown, ChevronUp, Loader2, Train } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateDistance, estimateTransitTime } from '@/data/mockNearestStation';
import { searchNearestStation } from '@/lib/google-maps';
import { useStoreForPlanning } from '@/lib/plan';
import { cn } from '@/lib/utils';
import { ExtendNearestStationType, ExtendPlanLocationType, TransportNodeType } from '@/types/plan';

const NearestStationDestination = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  const lastSpot = fields.getSpotInfo(date, null).slice(-1)[0];
  const destinationData = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);
  const buildInitialDepartureCandidates = (): string[] => {
    const candidates = destinationData?.nearestStation?.scheduledDepartureTimes?.slice(0, 3) ?? [];
    if (candidates.length > 0) {
      return [...candidates, ...Array(Math.max(0, 3 - candidates.length)).fill('')];
    }
    const fallback = destinationData?.nearestStation?.scheduledDepartureTime ?? '';
    return [fallback, '', ''];
  };

  const [excludeBusStop, setExcludeBusStop] = useState<boolean>(false);
  const [isLoadingStations, setIsLoadingStations] = useState<boolean>(false);
  // 目的地の最寄駅関連の状態（最後のスポットの場合）
  const [destinationNearestStations, setDestinationNearestStations] = useState<ExtendNearestStationType[]>(
    [destinationData?.nearestStation].filter((s): s is ExtendNearestStationType => !!s),
  );
  const [selectedDestinationStationId, setSelectedDestinationStationId] = useState<string | null>(
    destinationData?.nearestStation?.placeId || null,
  );
  const [destinationTransitTime, setDestinationTransitTime] = useState<number>(
    destinationData?.nearestStation?.transitTime || 0,
  );
  const [isDestinationManualTransitTime, setIsDestinationManualTransitTime] = useState<boolean>(
    destinationData?.nearestStation?.isManualTransitTime || false,
  );
  // 発着時間メモ
  const [scheduledDepartureTime, setScheduledDepartureTime] = useState<string>(
    destinationData?.nearestStation?.scheduledDepartureTime || '',
  );
  const [scheduledDepartureTimes, setScheduledDepartureTimes] = useState<string[]>(buildInitialDepartureCandidates());
  const [transitMemo, setTransitMemo] = useState<string>(destinationData?.nearestStation?.memo || '');
  const [isDestinationSectionExpanded, setIsDestinationSectionExpanded] = useState<boolean>(
    !!destinationData?.nearestStation && !!destinationData?.nearestStation.name,
  );
  const [useDestinationNearestStation, setUseDestinationNearestStation] = useState<boolean>(
    !!destinationData?.nearestStation,
  );

  const lastSearchBusStop = useRef<boolean>(excludeBusStop);
  const lastSearchCoord = useRef<{ lat: number; lng: number } | null>(
    destinationData ? { lat: destinationData.latitude, lng: destinationData.longitude } : null,
  );

  // スポット間の距離を計算
  const getDistanceFromPrevious = useCallback((): number | undefined => {
    return calculateDistance(
      lastSpot.latitude,
      lastSpot.longitude,
      destinationData.latitude,
      destinationData.longitude,
    );
  }, [lastSpot, destinationData]);

  // 目的地の情報を更新（最寄駅など）
  const handleDestinationChange = (updatedDestination: ExtendPlanLocationType) => {
    fields.setDepartureAndDestination(date, TransportNodeType.DESTINATION, updatedDestination);
  };

  // 目的地の最寄駅を取得する関数
  const fetchDestinationNearestStations = async () => {
    if (!destinationData) return;

    setIsLoadingStations(true);
    try {
      const stations = await searchNearestStation({
        center: {
          id: 'destination',
          name: destinationData.name,
          lat: destinationData.latitude,
          lng: destinationData.longitude,
        },
        radius: 1,
        excludeBusStop,
      });
      setDestinationNearestStations(stations);
      lastSearchBusStop.current = excludeBusStop;
      lastSearchCoord.current = { lat: destinationData.latitude, lng: destinationData.longitude };
    } catch (error) {
      console.error('目的地の最寄駅の取得に失敗しました:', error);
    } finally {
      setIsLoadingStations(false);
    }
  };

  // 目的地の最寄駅使用のON/OFF切り替え
  const handleUseDestinationNearestStationChange = (checked: boolean) => {
    setUseDestinationNearestStation(checked);
    setIsDestinationSectionExpanded(checked);
    if (
      checked &&
      (lastSearchBusStop.current !== excludeBusStop ||
        lastSearchCoord.current?.lat !== destinationData.latitude ||
        lastSearchCoord.current?.lng !== destinationData.longitude ||
        destinationNearestStations.length === 0)
    ) {
      fetchDestinationNearestStations();
    }
    if (!checked && destinationData) {
      // OFFにした場合、目的地の最寄駅情報をクリア
      handleDestinationChange({ ...destinationData, nearestStation: undefined });
      setSelectedDestinationStationId(null);
      setDestinationTransitTime(0);
      setIsDestinationManualTransitTime(false);
      setScheduledDepartureTime('');
      setScheduledDepartureTimes(['', '', '']);
    }
  };

  // 目的地の最寄駅選択時の処理
  const handleDestinationStationSelect = (stationId: string) => {
    setSelectedDestinationStationId(stationId);
    const station = destinationNearestStations.find((s) => s.placeId === stationId);
    if (station && destinationData) {
      const distanceFromPrevious = getDistanceFromPrevious();
      const estimatedTime = distanceFromPrevious ? estimateTransitTime(distanceFromPrevious) : 0;
      setDestinationTransitTime(estimatedTime);
      setIsDestinationManualTransitTime(false);
      handleDestinationChange({
        ...destinationData,
        nearestStation: {
          placeId: stationId,
          spotId: station.spotId,
          stationType: station.stationType,
          name: station.name || '',
          walkingTime: station.walkingTime || 0,
          latitude: station.latitude || 0,
          longitude: station.longitude || 0,
          transitTime: estimatedTime,
          isManualTransitTime: false,
          scheduledDepartureTime,
          scheduledDepartureTimes: scheduledDepartureTimes.filter((candidate) => candidate !== ''),
        },
      });
    }
  };

  // 発車時間変更ハンドラ
  const handleScheduledDepartureTimeChange = (time: string) => {
    setScheduledDepartureTime(time);
    const nextCandidates = [...scheduledDepartureTimes];
    nextCandidates[0] = time;
    setScheduledDepartureTimes(nextCandidates);
    if (destinationData?.nearestStation) {
      handleDestinationChange({
        ...destinationData,
        nearestStation: {
          ...destinationData.nearestStation,
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

    if (destinationData?.nearestStation) {
      handleDestinationChange({
        ...destinationData,
        nearestStation: {
          ...destinationData.nearestStation,
          scheduledDepartureTime: firstCandidate,
          scheduledDepartureTimes: nextCandidates.filter((candidate) => candidate !== ''),
        },
      });
    }
  };

  // 乗換メモ変更ハンドラ
  const handleTransitMemoChange = (memo: string) => {
    setTransitMemo(memo);
    if (destinationData?.nearestStation) {
      handleDestinationChange({
        ...destinationData,
        nearestStation: {
          ...destinationData.nearestStation,
          memo: memo,
        },
      });
    }
  };

  // 目的地の移動時間変更ハンドラ
  const handleDestinationTransitTimeChange = (newTime: number) => {
    const validTime = Math.min(540, Math.max(1, newTime || 1));
    setDestinationTransitTime(validTime);
    setIsDestinationManualTransitTime(true);

    if (destinationData?.nearestStation) {
      handleDestinationChange({
        ...destinationData,
        nearestStation: {
          ...destinationData.nearestStation,
          transitTime: validTime,
          isManualTransitTime: true,
        },
      });
    }
  };

  return (
    <Card>
      {destinationData && (
        <CardContent className="p-4 sm:pr-10">
          <div className="border rounded-lg overflow-hidden">
            <div
              data-testid="destination-station-section-toggle"
              className={cn(
                'flex cursor-pointer flex-col gap-3 px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between',
                useDestinationNearestStation ? 'bg-purple-50' : 'bg-gray-50 hover:bg-gray-100',
              )}
              onClick={() => setIsDestinationSectionExpanded(!isDestinationSectionExpanded)}
            >
              <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Train className={cn('h-4 w-4', useDestinationNearestStation ? 'text-purple-600' : 'text-gray-400')} />
                <div className="min-w-0">
                  <span data-testid="destination-station-header" className="text-sm font-medium">
                    目的地の最寄駅
                  </span>
                  <p className="text-xs text-gray-500">目的地（{destinationData.name}）の最寄駅を設定</p>
                </div>
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
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={useDestinationNearestStation}
                    onCheckedChange={handleUseDestinationNearestStationChange}
                  />
                </div>
                {isDestinationSectionExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>

            {useDestinationNearestStation && isDestinationSectionExpanded && (
              <div className="p-4 border-t bg-white space-y-4">
                {isLoadingStations ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    駅を検索中...
                  </div>
                ) : (
                  <>
                    {/* 目的地の最寄駅 */}
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                          目的地の最寄駅
                        </Badge>
                        <span className="text-sm text-gray-600">目的地（{destinationData.name}）周辺の最寄駅</span>
                      </div>
                      {destinationNearestStations.length > 0 ? (
                        <div className="space-y-2">
                          <Select
                            value={selectedDestinationStationId || ''}
                            onValueChange={handleDestinationStationSelect}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="目的地の最寄駅を選択" />
                            </SelectTrigger>
                            <SelectContent>
                              {destinationNearestStations.map((station) => (
                                <SelectItem key={station.placeId} value={station.placeId}>
                                  {station.stationType === 'BUS' ? '🚌' : '🚃'} {station.name} (徒歩
                                  {station.walkingTime}分 / 距離{station.distance}m)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedDestinationStationId && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <span>✓ 選択中:</span>
                              {destinationNearestStations.find((s) => s.placeId === selectedDestinationStationId)?.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">目的地周辺に最寄駅が見つかりませんでした</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 目的地セクション閉じている状態で選択済みの駅情報を表示 */}
            {useDestinationNearestStation &&
              !isDestinationSectionExpanded &&
              lastSpot.nearestStation &&
              destinationData.nearestStation && (
                <div className="px-4 py-2 text-sm text-gray-600 border-t bg-gray-50">
                  <span>
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-xs mr-1">
                      目的地の最寄駅
                    </Badge>
                    {destinationNearestStations.find((s) => s.placeId === selectedDestinationStationId)?.name}
                  </span>
                </div>
              )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default NearestStationDestination;
