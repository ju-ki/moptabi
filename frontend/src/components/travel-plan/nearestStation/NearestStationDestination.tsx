import { AlertTriangle, Bus, Calendar, ChevronDown, ChevronUp, Loader2, Train } from 'lucide-react';
import React, { useCallback, useState } from 'react';

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
import { DepartureAndDestinationType } from '@/models/planLocation';
import { NearestStation } from '@/types/nearestStation';
import { TransportNodeType } from '@/types/plan';

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
  const [destinationNearestStations, setDestinationNearestStations] = useState<NearestStation[]>(
    [destinationData?.nearestStation].filter((s): s is NearestStation => !!s),
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
  const [transitMemo, setTransitMemo] = useState<string>(destinationData?.nearestStation?.transitMemo || '');
  const [isDestinationSectionExpanded, setIsDestinationSectionExpanded] = useState<boolean>(
    !!destinationData?.nearestStation && !!destinationData?.nearestStation.name,
  );
  const [useDestinationNearestStation, setUseDestinationNearestStation] = useState<boolean>(
    !!destinationData?.nearestStation,
  );

  // スポット間の距離を計算
  const getDistanceFromPrevious = useCallback((): number | undefined => {
    return calculateDistance(
      lastSpot.location.lat,
      lastSpot.location.lng,
      destinationData.latitude,
      destinationData.longitude,
    );
  }, [lastSpot, destinationData]);

  // 目的地の情報を更新（最寄駅など）
  const handleDestinationChange = (updatedDestination: DepartureAndDestinationType) => {
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
    if (checked && destinationNearestStations.length === 0) {
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
          transitMemo: memo,
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

                    {/* 目的地への移動時間入力 */}
                    {lastSpot.nearestStation && destinationData.nearestStation && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            移動情報
                          </Badge>
                          <span className="text-sm text-gray-600">このスポット → 目的地の最寄駅 の電車/バス移動</span>
                        </div>

                        <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                          <div className="flex items-center gap-2">
                            <Train className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm">移動時間</Label>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={1}
                              max={540}
                              data-testid="transit-time-test"
                              value={destinationTransitTime}
                              onChange={(e) => handleDestinationTransitTimeChange(Number(e.target.value))}
                              className="w-20 text-center"
                            />
                            <span className="text-sm text-muted-foreground">分</span>
                          </div>
                          {isDestinationManualTransitTime ? (
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
                        {/* 発車時間入力 */}

                        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:gap-4">
                          <div className="flex items-center gap-2 min-w-fit sm:mt-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm">発車時間</Label>
                          </div>
                          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                            {scheduledDepartureTimes.map((candidate, index) => (
                              <Input
                                key={`destination-candidate-${index}`}
                                type="time"
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

                        {/* 路線メモ */}
                        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:gap-4">
                          <Label className="min-w-fit text-sm sm:mt-2">路線メモ</Label>
                          <Textarea
                            value={transitMemo}
                            onChange={(e) => handleTransitMemoChange(e.target.value)}
                            placeholder="例: ○○線 △△行き、乗り換え1回"
                            className="h-16 text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {/* 目的地ルートサマリー */}
                    {lastSpot.nearestStation && destinationData.nearestStation && (
                      <div className="break-words rounded bg-gray-100 p-2 text-sm text-gray-600">
                        <span className="font-medium">ルート: </span>
                        <span>{lastSpot.location.name}</span>
                        <span className="mx-1">→</span>
                        <span className="text-purple-600">
                          {lastSpot.nearestStation?.name}
                          (徒歩
                          {lastSpot.nearestStation?.walkingTime}
                          分)
                        </span>
                        <span className="mx-1">→</span>
                        <span className="text-green-600">🚃 {destinationTransitTime}分</span>
                        <span className="mx-1">→</span>
                        <span className="text-purple-600">
                          {destinationNearestStations.find((s) => s.placeId === selectedDestinationStationId)?.name}
                          (徒歩
                          {
                            destinationNearestStations.find((s) => s.placeId === selectedDestinationStationId)
                              ?.walkingTime
                          }
                          分)
                        </span>
                        <span className="mx-1">→</span>
                        <span>{destinationData.name}</span>
                      </div>
                    )}
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
