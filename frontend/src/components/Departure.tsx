import React, { useState } from 'react';
import { Check, MapPinIcon } from 'lucide-react';

import { useStoreForPlanning } from '@/lib/plan';
import { department } from '@/data/dummyData';
import { TransportNodeType } from '@/types/plan';
import { buildSpotId } from '@/lib/utils';

import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Command, CommandInput, CommandItem, CommandList } from './ui/command';

const Departure = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  const departureData = fields.plans
    .filter((val) => val.date.toLocaleDateString('ja-JP') == date)[0]
    ?.spots.filter((spot) => spot.transports?.fromType === TransportNodeType.DEPARTURE)[0];
  const [open, setOpen] = useState(false);

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
                    fields.setSpots(
                      new Date(date),
                      {
                        id: buildSpotId('departure', date, departure.latitude, departure.longitude),
                        location: {
                          name: departure.name,
                          latitude: departure.latitude,
                          longitude: departure.longitude,
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
                      },
                      false,
                    );
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
    </div>
  );
};

export default Departure;
