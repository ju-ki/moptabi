import React, { useState } from 'react';
import { Check, MapPinIcon } from 'lucide-react';

import { useStoreForPlanning } from '@/lib/plan';
import { department } from '@/data/dummyData';
import { Spot, TransportNodeType } from '@/types/plan';
import { buildSpotId } from '@/lib/utils';
import { useMapStore } from '@/stores/mapStore';

import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Command, CommandInput, CommandItem, CommandList } from './ui/command';
import GoogleMapComponent from './GoogleMap';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

const Departure = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  const { coordinate } = useMapStore();
  const [isCheckCurrentLocation, setIsCheckCurrentLocation] = useState<boolean>(false);
  const departureData = fields.plans
    .filter((val) => val.date == date)[0]
    ?.spots.filter((spot) => spot.transports?.fromType === TransportNodeType.DEPARTURE)[0];
  const [open, setOpen] = useState(false);

  const DEPARTURE_DATA: Spot = {
    id: buildSpotId('departure', date),
    location: {
      name: departureData?.location.name || '出発地',
      latitude: coordinate.lat,
      longitude: coordinate.lng,
    },
    stayStart: '00:00',
    stayEnd: '00:00',
    order: 0,
    transports: {
      travelTime: '不明',
      cost: 0,
      name: 'DEFAULT',
      transportMethodIds: [0],
      fromType: TransportNodeType.DEPARTURE,
      toType: TransportNodeType.SPOT,
    },
  };

  return (
    <div>
      <Label>出発地</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
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
                    DEPARTURE_DATA.location.name = departure.name;
                    DEPARTURE_DATA.location.latitude = departure.latitude;
                    DEPARTURE_DATA.location.longitude = departure.longitude;
                    fields.setSpots(date, DEPARTURE_DATA, false);
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
            placeholder="出発地の名前を設定する"
            className="mt-2 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onInput={(e) => {
              DEPARTURE_DATA.location.name = e.currentTarget.value;
              fields.setSpots(date, DEPARTURE_DATA, false);
            }}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="current-location-checkbox"
            checked={isCheckCurrentLocation}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            onCheckedChange={() => setIsCheckCurrentLocation((prev) => !prev)}
          />
          <label htmlFor="current-location-checkbox" className="cursor-pointer text-sm font-medium text-gray-700">
            現在地を出発地に設定する
          </label>
        </div>

        <div className="mt-4">
          <GoogleMapComponent isSetCurrentLocation={isCheckCurrentLocation}></GoogleMapComponent>
        </div>
      </div>
    </div>
  );
};

export default Departure;
