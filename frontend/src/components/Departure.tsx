import React, { useEffect, useState } from 'react';
import { Check, Info, MapPinIcon } from 'lucide-react';

import { useStoreForPlanning } from '@/lib/plan';
import { Coordination, Spot, TransportNodeType } from '@/types/plan';
import { buildSpotId } from '@/lib/utils';

import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Command, CommandInput, CommandItem, CommandList } from './ui/command';
import GoogleMapComponent from './GoogleMap';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

const Departure = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  const department = fields.departureHistory;
  const [departureName, setDepartureName] = useState<string>('');
  const [selectedMapCoordinate, setSelectedMapCoordinate] = useState<Coordination | undefined>(undefined);
  const [isCheckCurrentLocation, setIsCheckCurrentLocation] = useState<boolean>(false);
  const departureData = fields.plans
    .filter((val) => val.date == date)[0]
    ?.spots.filter((spot) => spot.transports?.fromType === TransportNodeType.DEPARTURE)[0];
  const [open, setOpen] = useState(false);

  const DEPARTURE_DATA: Spot = {
    id: buildSpotId('departure', date),
    location: {
      id: buildSpotId('departure', date),
      name: departureData?.location.name || '出発地',
      lat: selectedMapCoordinate?.lat || 0,
      lng: selectedMapCoordinate?.lng || 0,
    },
    stayStart: '00:00',
    stayEnd: '00:00',
    order: 0,
    transports: {
      travelTime: '不明',
      cost: 0,
      name: 'DEFAULT',
      transportMethod: 1,
      fromType: TransportNodeType.DEPARTURE,
      toType: TransportNodeType.SPOT,
    },
  };

  useEffect(() => {
    if (!selectedMapCoordinate) return;
    fields.setSpots(date, DEPARTURE_DATA, false);
  }, [selectedMapCoordinate]);

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
                <span>{departureData.location.name}</span>
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
              {department.map((departure) => (
                <CommandItem
                  key={departure.name}
                  onSelect={() => {
                    DEPARTURE_DATA.location.name = departure.name || '出発地';
                    DEPARTURE_DATA.location.lat = departure.lat;
                    DEPARTURE_DATA.location.lng = departure.lng;
                    fields.setSpots(date, DEPARTURE_DATA, false);
                    setSelectedMapCoordinate(departure);
                    setOpen(false);
                  }}
                  className="flex items-center"
                >
                  {departureData && departureData.location.name == departure.name && <Check className="mr-2 h-4 w-4" />}
                  {departure.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="space-y-4 p-4">
        <div>
          <Label htmlFor="destination-input" className="block text-lg font-semibold text-gray-800">
            出発地を地図から選択する
          </Label>
          <Input
            id="destination-input"
            type="text"
            value={departureName}
            placeholder="出発地の名前を設定する"
            className="mt-2 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onInput={(e) => {
              DEPARTURE_DATA.location.name = e.currentTarget.value;
              fields.setSpots(date, DEPARTURE_DATA, false);
              setDepartureName(e.currentTarget.value);
            }}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="current-location-checkbox-for-departure"
            checked={isCheckCurrentLocation}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            onCheckedChange={(checked) => {
              setIsCheckCurrentLocation((prev) => !prev);
              DEPARTURE_DATA.location.name = checked ? '出発地(' + date + ')' : '';
              fields.setSpots(date, DEPARTURE_DATA, false);
              setDepartureName(checked ? '出発地(' + date + ')' : '');
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
          <GoogleMapComponent
            isSetCurrentLocation={isCheckCurrentLocation}
            extraCoordinate={selectedMapCoordinate}
            setCoordinate={setSelectedMapCoordinate}
          ></GoogleMapComponent>
        </div>
      </div>
    </div>
  );
};

export default Departure;
