import React, { useState } from 'react';
import { Check, MapPinIcon, Star, History } from 'lucide-react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { PlanLocationCandidateItemType } from '@shared/user/types';

import { useStoreForPlanning } from '@/lib/plan';
import { ExtendPlanLocationType, TransportNodeType } from '@/types/plan';
import { DEFAULT_ARRIVAL_TIME, DEFAULT_DEPARTURE_TIME } from '@/data/constants';
import { calculateDistance } from '@/data/mockNearestStation';

import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Command, CommandInput, CommandItem, CommandList, CommandGroup, CommandEmpty } from './ui/command';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import AddressSearch from './AddressSearch';
import SpotLocationSelector from './SpotLocationSelector';
import TimeSetting from './travel-plan/TimeSetting';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const DepartureAndDestination = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  const departureCandidates = fields.departureList;
  const destinationCandidates = fields.destinationList;
  const [departureOrDestination, setDepartureOrDestination] = useState<'DEPARTURE' | 'DESTINATION'>('DEPARTURE');
  const [isCheckCurrentLocation, setIsCheckCurrentLocation] = useState<boolean>(false);
  const [selectedPlanLocationId, setSelectedPlanLocationId] = useState<number | null>(null);
  const departureData = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
  const destinationData = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);
  const [open, setOpen] = useState<boolean>(false);

  // 日付に対応するスポット情報を取得
  const currentDayPlan = fields.plans.find((p) => p.date === date);
  const currentDaySpots = currentDayPlan?.spots || [];
  const targetName = departureOrDestination === 'DEPARTURE' ? '出発地' : '目的地';

  /**
   * 出発地と目的地を更新する処理
   * @param overrides 上書きする出発地または目的地の情報
   */
  function setDepartureAndDestination(overrides: Partial<ExtendPlanLocationType>) {
    const isDeparture = departureOrDestination === 'DEPARTURE';
    const locationType = isDeparture ? TransportNodeType.DEPARTURE : TransportNodeType.DESTINATION;
    const baseData = isDeparture ? departureData : destinationData;
    fields.setDepartureAndDestination(date, locationType, {
      ...baseData,
      ...overrides,
      locationType,
    });
  }

  return (
    <div>
      <Label className="text-lg font-semibold text-gray-800 my-2 flex space-x-2">
        <span>出発地/目的地</span>
        <div className="flex items-center space-x-1"></div>
      </Label>
      {fields.planErrors[date]?.departure && (
        <div className="mb-2 text-sm text-red-600">{fields.planErrors[date]?.departure}</div>
      )}

      <Tabs
        className="w-full min-w-0"
        value={departureOrDestination}
        onValueChange={(value) => {
          setDepartureOrDestination(value as 'DEPARTURE' | 'DESTINATION');
          setIsCheckCurrentLocation(false);
        }}
      >
        <div className="w-full max-w-full overflow-x-auto pb-1">
          <TabsList className="inline-flex w-max min-w-full flex-nowrap justify-start gap-2 whitespace-nowrap">
            <TabsTrigger value="DEPARTURE">出発地</TabsTrigger>
            <TabsTrigger value="DESTINATION">目的地</TabsTrigger>
          </TabsList>
        </div>
        {/* 時間設定 */}
        <div className="flex space-x-4 my-4">
          <TimeSetting type={TransportNodeType.DEPARTURE} date={date} />
          <TimeSetting type={TransportNodeType.DESTINATION} date={date} />
        </div>

        <div className="space-x-4 my-4">
          <Label htmlFor="target-input" className="text-sm  text-gray-800">
            {targetName}の名前を設定
          </Label>
          <Input
            id="target-input"
            type="text"
            value={departureOrDestination === 'DEPARTURE' ? departureData.name : destinationData.name}
            placeholder={`${targetName}の名前を設定する`}
            className="flex mt-2 mx-auto rounded-md border"
            onInput={(e) => {
              const targetName = e.currentTarget.value;
              setDepartureAndDestination({
                name: targetName,
              });
            }}
          />
        </div>

        <TabsContent value="DEPARTURE">
          <Label htmlFor="target-selector" className="block text-sm  text-gray-800">
            {targetName}の候補リスト
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button role="combobox" variant="outline" className="w-full justify-start" id="target-selector">
                {departureData ? (
                  <>
                    <MapPinIcon className="mr-2 h-4 w-4" />
                    <span>
                      {departureData.userLocationId || selectedPlanLocationId ? departureData.name : '出発地を選択'}
                    </span>
                  </>
                ) : (
                  <>
                    <MapPinIcon className="mr-2 h-4 w-4" />
                    <span>出発地を選択</span>
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="検索..." />
                <CommandList>
                  <CommandEmpty>候補が見つかりません</CommandEmpty>
                  {/* お気に入りグループ */}
                  {departureCandidates?.favorites && departureCandidates.favorites.length > 0 && (
                    <CommandGroup
                      heading={
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          お気に入り
                        </span>
                      }
                    >
                      {departureCandidates.favorites.map((candidate: PlanLocationCandidateItemType) => (
                        <CommandItem
                          key={`favorite-${candidate.userLocationId}`}
                          onSelect={() => {
                            const isNearestStationSet = candidate.nearestStation ? true : false;
                            setDepartureAndDestination({
                              name: candidate.name,
                              latitude: candidate.latitude,
                              longitude: candidate.longitude,
                              locationType: TransportNodeType.DEPARTURE,
                              time: DEFAULT_DEPARTURE_TIME,
                              travelTime: 0,
                              userLocationId: candidate.userLocationId ?? undefined,
                              transportMethod: isNearestStationSet ? 'TRANSIT' : 'DEFAULT',
                              transportMethodId: isNearestStationSet ? 4 : 0,
                              isSetSelectedNearestStation: isNearestStationSet,
                              nearestStation: candidate.nearestStation
                                ? {
                                    placeId: candidate.nearestStation.placeId,
                                    stationType: candidate.nearestStation.stationType,
                                    latitude: candidate.nearestStation.latitude,
                                    longitude: candidate.nearestStation.longitude,
                                    name: candidate.nearestStation.name,
                                    walkingTime: candidate.nearestStation.walkingTime,
                                    distance: calculateDistance(
                                      candidate.latitude,
                                      candidate.longitude,
                                      candidate.nearestStation.latitude,
                                      candidate.nearestStation.longitude,
                                    ),
                                    transitTime: 0,
                                  }
                                : undefined,
                              alternateRoutes: [],
                            });
                            setOpen(false);
                          }}
                          className="flex items-center"
                        >
                          {departureData && departureData.userLocationId === candidate.userLocationId && (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          <div className="flex flex-col">
                            <span>{candidate.name}</span>
                            {candidate.label && (
                              <span className="text-xs text-muted-foreground">{candidate.label}</span>
                            )}
                          </div>
                          {candidate.isDefault && <span className="ml-auto text-xs text-blue-500">デフォルト</span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {/* 履歴グループ */}
                  {departureCandidates?.history && departureCandidates.history.length > 0 && (
                    <CommandGroup
                      heading={
                        <span className="flex items-center gap-1">
                          <History className="h-3 w-3" />
                          履歴
                        </span>
                      }
                    >
                      {departureCandidates.history.map((candidate: PlanLocationCandidateItemType) => (
                        <CommandItem
                          key={`history-${candidate.planLocationId}`}
                          onSelect={() => {
                            setDepartureAndDestination({
                              name: candidate.name,
                              latitude: candidate.latitude,
                              longitude: candidate.longitude,
                              locationType: TransportNodeType.DEPARTURE,
                              time: DEFAULT_DEPARTURE_TIME,
                              travelTime: 0,
                              userLocationId: candidate.userLocationId ?? undefined,
                              transportMethod: 'DEFAULT',
                              transportMethodId: 0,
                              nearestStation: undefined,
                              alternateRoutes: [],
                            });
                            setSelectedPlanLocationId(candidate.planLocationId || null);
                            setOpen(false);
                          }}
                          className="flex items-center"
                        >
                          {selectedPlanLocationId && selectedPlanLocationId === candidate.planLocationId && (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          <div className="flex flex-col">
                            <span>{candidate.name}</span>
                            {candidate.planName && (
                              <span className="text-xs text-muted-foreground">
                                使用プラン名:{candidate.planName} 使用種別:
                                {candidate.locationType === TransportNodeType.DEPARTURE ? '出発地' : '目的地'}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </TabsContent>
        <TabsContent value="DESTINATION">
          <Label htmlFor="target-selector" className="block text-sm  text-gray-800">
            {targetName}の候補リスト
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button role="combobox" variant="outline" className="w-full justify-start" id="target-selector">
                {destinationData ? (
                  <>
                    <MapPinIcon className="mr-2 h-4 w-4" />
                    <span>
                      {destinationData.userLocationId || selectedPlanLocationId ? destinationData.name : '目的地を選択'}
                    </span>
                  </>
                ) : (
                  <>
                    <MapPinIcon className="mr-2 h-4 w-4" />
                    <span>目的地を選択</span>
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="検索..." />
                <CommandList>
                  <CommandEmpty>候補が見つかりません</CommandEmpty>
                  {/* お気に入りグループ */}
                  {destinationCandidates?.favorites && destinationCandidates.favorites.length > 0 && (
                    <CommandGroup
                      heading={
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          お気に入り
                        </span>
                      }
                    >
                      {destinationCandidates.favorites.map((candidate: PlanLocationCandidateItemType) => (
                        <CommandItem
                          key={`favorite-${candidate.userLocationId}`}
                          onSelect={() => {
                            const isNearestStationSet = candidate.nearestStation ? true : false;
                            fields.setDepartureAndDestination(date, TransportNodeType.DESTINATION, {
                              name: candidate.name,
                              latitude: candidate.latitude,
                              longitude: candidate.longitude,
                              locationType: TransportNodeType.DESTINATION,
                              time: DEFAULT_ARRIVAL_TIME,
                              travelTime: 0,
                              userLocationId: candidate.userLocationId ?? undefined,
                              transportMethod: isNearestStationSet ? 'TRANSIT' : 'DEFAULT',
                              transportMethodId: isNearestStationSet ? 4 : 0,
                              isSetSelectedNearestStation: isNearestStationSet,
                              nearestStation: candidate.nearestStation
                                ? {
                                    placeId: candidate.nearestStation.placeId,
                                    stationType: candidate.nearestStation.stationType,
                                    latitude: candidate.nearestStation.latitude,
                                    longitude: candidate.nearestStation.longitude,
                                    name: candidate.nearestStation.name,
                                    walkingTime: candidate.nearestStation.walkingTime,
                                    distance: calculateDistance(
                                      candidate.latitude,
                                      candidate.longitude,
                                      candidate.nearestStation.latitude,
                                      candidate.nearestStation.longitude,
                                    ),
                                    transitTime: 0,
                                  }
                                : undefined,
                              alternateRoutes: [],
                            });
                            setOpen(false);
                          }}
                          className="flex items-center"
                        >
                          {destinationData && destinationData.userLocationId === candidate.userLocationId && (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          <div className="flex flex-col">
                            <span>{candidate.name}</span>
                            {candidate.label && (
                              <span className="text-xs text-muted-foreground">{candidate.label}</span>
                            )}
                          </div>
                          {candidate.isDefault && <span className="ml-auto text-xs text-blue-500">デフォルト</span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {/* 履歴グループ */}
                  {destinationCandidates?.history && destinationCandidates.history.length > 0 && (
                    <CommandGroup
                      heading={
                        <span className="flex items-center gap-1">
                          <History className="h-3 w-3" />
                          履歴
                        </span>
                      }
                    >
                      {destinationCandidates.history.map((candidate: PlanLocationCandidateItemType) => (
                        <CommandItem
                          key={`history-${candidate.planLocationId}`}
                          onSelect={() => {
                            fields.setDepartureAndDestination(date, TransportNodeType.DESTINATION, {
                              name: candidate.name,
                              latitude: candidate.latitude,
                              longitude: candidate.longitude,
                              locationType: TransportNodeType.DESTINATION,
                              time: DEFAULT_ARRIVAL_TIME,
                              travelTime: 0,
                              transportMethod: 'DEFAULT',
                              transportMethodId: 0,
                              nearestStation: undefined,
                              alternateRoutes: [],
                            });
                            setSelectedPlanLocationId(candidate.planLocationId || null);
                            setOpen(false);
                          }}
                          className="flex items-center"
                        >
                          {selectedPlanLocationId && selectedPlanLocationId === candidate.planLocationId && (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          <div className="flex flex-col">
                            <span>{candidate.name}</span>
                            {candidate.planName && (
                              <span className="text-xs text-muted-foreground">
                                使用プラン名:{candidate.planName} 使用種別:
                                {candidate.locationType === TransportNodeType.DEPARTURE ? '出発地' : '目的地'}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </TabsContent>
      </Tabs>

      {/* 住所検索 */}
      <div className="space-x-4 my-4">
        <AddressSearch
          label={`住所から${targetName}を検索`}
          placeholder="住所を入力（例: 東京都渋谷区渋谷1-1-1）"
          onCoordinateFound={(coord) => {
            setDepartureAndDestination({ latitude: coord.lat, longitude: coord.lng });
          }}
        />
      </div>

      {/* 観光スポット周辺から出発地を選択 */}
      <div className="space-x-4 my-4">
        <SpotLocationSelector
          spots={currentDaySpots}
          label={`観光スポット周辺から${targetName}を選択する`}
          placeholder="スポットを選択"
          onSelect={(spot) => {
            setDepartureAndDestination({ latitude: spot.latitude, longitude: spot.longitude, name: spot.name });
          }}
        />
      </div>

      <div className="flex items-center space-x-4 my-4">
        <Checkbox
          id="current-location-checkbox-for-departure"
          checked={isCheckCurrentLocation}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          onCheckedChange={(checked) => {
            setIsCheckCurrentLocation((prev) => !prev);
            if (checked) {
              navigator.geolocation.getCurrentPosition((position) => {
                const newCoordinate = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                };
                setDepartureAndDestination({ latitude: newCoordinate.latitude, longitude: newCoordinate.longitude });
              });
            }
          }}
        />
        <Label
          htmlFor="current-location-checkbox-for-departure"
          className="cursor-pointer text-sm font-medium text-gray-700"
        >
          {`現在地を${targetName}に設定する`}
        </Label>
      </div>

      <div className="my-4">
        <GoogleMap
          center={
            departureOrDestination == 'DEPARTURE'
              ? { lat: departureData.latitude, lng: departureData.longitude }
              : { lat: destinationData.latitude, lng: destinationData.longitude }
          }
          mapContainerStyle={containerStyle}
          onClick={(coord) => {
            const clickedCoord = {
              lat: coord.latLng?.lat() || 0,
              lng: coord.latLng?.lng() || 0,
            };
            setDepartureAndDestination({ latitude: clickedCoord.lat, longitude: clickedCoord.lng });
          }}
          options={{
            zoom: 12,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }],
              },
              {
                featureType: 'transit',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }],
              },
            ],
          }}
        >
          {/* 出発地のマーカー */}
          <Marker position={{ lat: departureData.latitude, lng: departureData.longitude }} />
          <Marker position={{ lat: destinationData.latitude, lng: destinationData.longitude }} />
        </GoogleMap>
      </div>
    </div>
  );
};

export default DepartureAndDestination;
