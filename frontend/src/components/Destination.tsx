import React, { useEffect, useState } from 'react';
import { Check, MapPinIcon } from 'lucide-react';

import { useStoreForPlanning } from '@/lib/plan';
import { Coordination, Spot, TransportNodeType } from '@/types/plan';
import { buildSpotId } from '@/lib/utils';

import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Command, CommandInput, CommandItem, CommandList } from './ui/command';
import { Checkbox } from './ui/checkbox';
import GoogleMapComponent from './GoogleMap';
import { Input } from './ui/input';

const Destination = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  const destinations = fields.destinationHistory;
  const [destinationName, setDestinationName] = useState<string>('');
  const [selectedMapCoordinate, setSelectedMapCoordinate] = useState<Coordination | undefined>(undefined);
  const [isCheckCurrentLocation, setIsCheckCurrentLocation] = useState<boolean>(false);
  const destinationData = fields.plans
    .filter((val) => val.date == date)[0]
    ?.spots.filter((spot) => spot.transports?.toType === TransportNodeType.DESTINATION)[0];
  const [open, setOpen] = useState(false);

  const DESTINATION_DATA: Spot = {
    id: buildSpotId('destination', date),
    location: {
      id: buildSpotId('destination', date),
      name: destinationData?.location.name || '目的地',
      lat: selectedMapCoordinate?.lat || 0,
      lng: selectedMapCoordinate?.lng || 0,
    },
    order: 0,
    stayStart: '00:00',
    stayEnd: '00:00',
    transports: {
      travelTime: '不明',
      cost: 0,
      name: 'DEFAULT',
      transportMethodIds: [0],
      fromType: TransportNodeType.SPOT,
      toType: TransportNodeType.DESTINATION,
    },
  };

  useEffect(() => {
    if (!selectedMapCoordinate) return;
    fields.setSpots(date, DESTINATION_DATA, false);
  }, [selectedMapCoordinate]);

  return (
    <div>
      <Label className="block text-lg font-semibold text-gray-800">目的地</Label>
      {fields.planErrors[date]?.destination && (
        <div className="mb-2 text-sm text-red-600">{fields.planErrors[date]?.destination}</div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            {destinationData ? (
              <>
                <MapPinIcon className="mr-2 h-4 w-4" />
                <span>{destinationData.location.name}</span>
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
              {destinations.map((destination) => (
                <CommandItem
                  key={destination.name}
                  onSelect={() => {
                    DESTINATION_DATA.location.name = destination.name || '目的地';
                    fields.setSpots(date, DESTINATION_DATA, false);
                    setSelectedMapCoordinate(destination);
                    setOpen(false);
                  }}
                  className="flex items-center"
                >
                  {destinationData && destinationData.location.name == destination.name && (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {destination.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="space-y-4 p-4">
        <div>
          <Label htmlFor="destination-input" className="block text-lg font-semibold text-gray-800">
            目的地を地図から選択する
          </Label>
          <Input
            id="destination-input"
            type="text"
            value={destinationName}
            placeholder="目的地の名前を設定する"
            className="mt-2 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onInput={(e) => {
              DESTINATION_DATA.location.name = e.currentTarget.value;
              fields.setSpots(date, DESTINATION_DATA, false);
              setDestinationName(e.currentTarget.value);
            }}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="current-location-checkbox-for-destination"
            checked={isCheckCurrentLocation}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            onCheckedChange={(checked) => {
              setIsCheckCurrentLocation((prev) => !prev);
              DESTINATION_DATA.location.name = checked ? '目的地(' + date + ')' : '';
              DESTINATION_DATA.location.lat = selectedMapCoordinate?.lat || 0;
              DESTINATION_DATA.location.lng = selectedMapCoordinate?.lng || 0;
              fields.setSpots(date, DESTINATION_DATA, false);
              setDestinationName(checked ? '目的地(' + date + ')' : '');
            }}
          />
          <Label
            htmlFor="current-location-checkbox-for-destination"
            className="cursor-pointer text-sm font-medium text-gray-700"
          >
            現在地を目的地に設定する
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

export default Destination;
