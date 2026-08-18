import React, { useState } from 'react';
import { Check, Info, MapPinIcon, Star, History } from 'lucide-react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { PlanLocationCandidateItemType } from '@shared/user/types';

import { useStoreForPlanning } from '@/lib/plan';
import { TransportNodeType } from '@/types/plan';
import { DEFAULT_DEPARTURE_TIME } from '@/data/constants';

import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Command, CommandInput, CommandItem, CommandList, CommandGroup, CommandEmpty } from './ui/command';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import AddressSearch from './AddressSearch';
import SpotLocationSelector from './SpotLocationSelector';
import TimeSetting from './travel-plan/TimeSetting';

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const Departure = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  const candidates = fields.departureList;
  const [isCheckCurrentLocation, setIsCheckCurrentLocation] = useState<boolean>(false);
  const [selectedPlanLocationId, setSelectedPlanLocationId] = useState<number | null>(null);
  const departureData = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
  const [open, setOpen] = useState<boolean>(false);

  // 日付に対応するスポット情報を取得
  const currentDayPlan = fields.plans.find((p) => p.date === date);
  const currentDaySpots = currentDayPlan?.spots || [];

  return (
    <div>
      <Label className="text-lg font-semibold text-gray-800 my-2 flex space-x-2">
        <span>出発地</span>
        <div className="flex items-center space-x-1">
          <Info className="w-3 h-3" />
          <span className="text-sm font-normal">未選択の場合は地図で選択されている場所が選択されます</span>
        </div>
      </Label>
      {fields.planErrors[date]?.departure && (
        <div className="mb-2 text-sm text-red-600">{fields.planErrors[date]?.departure}</div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start" id="departure-select-box">
            {departureData ? (
              <>
                <MapPinIcon className="mr-2 h-4 w-4" />
                <span>
                  {departureData.userLocationId || selectedPlanLocationId
                    ? departureData.name
                    : '候補以外の地点を選択中'}
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
              {candidates?.favorites && candidates.favorites.length > 0 && (
                <CommandGroup
                  heading={
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      お気に入り
                    </span>
                  }
                >
                  {candidates.favorites.map((candidate: PlanLocationCandidateItemType) => (
                    <CommandItem
                      key={`favorite-${candidate.userLocationId}`}
                      onSelect={() => {
                        fields.setDepartureAndDestination(date, TransportNodeType.DEPARTURE, {
                          name: candidate.name,
                          latitude: candidate.latitude,
                          longitude: candidate.longitude,
                          locationType: TransportNodeType.DEPARTURE,
                          time: DEFAULT_DEPARTURE_TIME,
                          travelTime: 0,
                          userLocationId: candidate.userLocationId ?? undefined,
                          transportMethod: 'DEFAULT',
                          transportMethodId: 0,
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
                        {candidate.label && <span className="text-xs text-muted-foreground">{candidate.label}</span>}
                      </div>
                      {candidate.isDefault && <span className="ml-auto text-xs text-blue-500">デフォルト</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {/* 履歴グループ */}
              {candidates?.history && candidates.history.length > 0 && (
                <CommandGroup
                  heading={
                    <span className="flex items-center gap-1">
                      <History className="h-3 w-3" />
                      履歴
                    </span>
                  }
                >
                  {candidates.history.map((candidate: PlanLocationCandidateItemType) => (
                    <CommandItem
                      key={`history-${candidate.planLocationId}`}
                      onSelect={() => {
                        fields.setDepartureAndDestination(date, TransportNodeType.DEPARTURE, {
                          name: candidate.name,
                          latitude: candidate.latitude,
                          longitude: candidate.longitude,
                          locationType: TransportNodeType.DEPARTURE,
                          time: DEFAULT_DEPARTURE_TIME,
                          travelTime: 0,
                          transportMethod: 'DEFAULT',
                          transportMethodId: 0,
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
      <div className="space-y-4 p-4">
        <div>
          <Label htmlFor="destination-input" className="block text-sm  text-gray-800">
            出発地の名前を設定(空の場合は出発地_{date}になります)
          </Label>
          <Input
            id="departure-input"
            type="text"
            value={departureData.name || ''}
            placeholder="出発地の名前を設定する"
            className="mt-2 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onInput={(e) => {
              const departureName = e.currentTarget.value;
              fields.setDepartureAndDestination(date, TransportNodeType.DEPARTURE, {
                ...departureData,
                name: departureName,
                locationType: TransportNodeType.DEPARTURE,
              });
            }}
          />
        </div>

        {/* 時間設定 */}
        <TimeSetting type={TransportNodeType.DEPARTURE} date={date} />

        {/* 住所検索 */}
        <AddressSearch
          label="住所から出発地を検索"
          placeholder="住所を入力（例: 東京都渋谷区渋谷1-1-1）"
          onCoordinateFound={(coord) => {
            fields.setDepartureAndDestination(date, TransportNodeType.DEPARTURE, {
              ...departureData,
              name: '',
              latitude: coord.lat,
              longitude: coord.lng,
              locationType: TransportNodeType.DEPARTURE,
            });
          }}
        />

        {/* 観光スポット周辺から出発地を選択 */}
        <SpotLocationSelector
          spots={currentDaySpots}
          label="観光スポット周辺から出発地を選択する"
          placeholder="スポットを選択"
          onSelect={(spot) => {
            fields.setDepartureAndDestination(date, TransportNodeType.DEPARTURE, {
              ...departureData,
              name: spot.name,
              latitude: spot.latitude,
              longitude: spot.longitude,
              locationType: TransportNodeType.DEPARTURE,
            });
          }}
        />

        <div className="flex items-center space-x-2">
          <Checkbox
            id="current-location-checkbox-for-departure"
            checked={isCheckCurrentLocation}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            onCheckedChange={(checked) => {
              setIsCheckCurrentLocation((prev) => !prev);
              if (checked) {
                navigator.geolocation.getCurrentPosition((position) => {
                  const newCoordinate = {
                    id: '',
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    name: '',
                  };
                  fields.setDepartureAndDestination(date, TransportNodeType.DEPARTURE, {
                    ...departureData,
                    ...newCoordinate,
                    locationType: TransportNodeType.DEPARTURE,
                  });
                });
              }
            }}
          />
          <Label
            htmlFor="current-location-checkbox-for-departure"
            className="cursor-pointer text-sm font-medium text-gray-700"
          >
            現在地を出発地に設定する
          </Label>
        </div>

        <div className="mt-4">
          <GoogleMap
            center={{ lat: departureData.latitude, lng: departureData.longitude }}
            mapContainerStyle={containerStyle}
            onClick={(coord) => {
              const clickedCoord = {
                id: `clicked-${coord.latLng?.lat()}-${coord.latLng?.lng()}`,
                name: '',
                lat: coord.latLng?.lat() || 0,
                lng: coord.latLng?.lng() || 0,
              };
              fields.setDepartureAndDestination(date, TransportNodeType.DEPARTURE, {
                ...departureData,
                name: clickedCoord.name,
                latitude: clickedCoord.lat,
                longitude: clickedCoord.lng,
                locationType: TransportNodeType.DEPARTURE,
              });
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
          </GoogleMap>
        </div>
      </div>
    </div>
  );
};

export default Departure;
