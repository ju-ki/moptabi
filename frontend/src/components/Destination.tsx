import React, { useState } from 'react';
import { Check, MapPinIcon } from 'lucide-react';

import { useStoreForPlanning } from '@/lib/plan';
import { destinations } from '@/data/dummyData';
import { TransportNodeType } from '@/types/plan';
import { buildSpotId } from '@/lib/utils';

import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Command, CommandInput, CommandItem, CommandList } from './ui/command';

const Destination = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();
  const destinationData = fields.plans
    .filter((val) => val.date == date)[0]
    ?.spots.filter((spot) => spot.transports?.toType === TransportNodeType.DESTINATION)[0];
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Label>目的地</Label>
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
                    fields.setSpots(
                      date,
                      {
                        id: buildSpotId('destination', date, destination.latitude, destination.longitude),
                        location: {
                          name: destination.name,
                          latitude: destination.latitude,
                          longitude: destination.longitude,
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
                      },
                      false,
                    );
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
    </div>
  );
};

export default Destination;
