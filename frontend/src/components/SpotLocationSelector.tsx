import React from 'react';
import { MapPin } from 'lucide-react';

import { Spot } from '@/types/plan';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

interface SpotLocationSelectorProps {
  /** 選択済みスポット一覧 */
  spots: Spot[];
  /** ラベル（例: "観光スポット周辺から出発地を選択する"） */
  label: string;
  /** 選択時のコールバック */
  onSelect: (spot: Spot) => void;
  /** プレースホルダー */
  placeholder?: string;
}

/**
 * 観光スポット周辺から出発地/目的地を選択するコンポーネント
 *
 * - 選択済みのスポットが一つ以上の時に表示
 * - 現在選択されているスポットの一覧をプルダウンで表示
 * - 選択されたスポットと同一地点にピンが刺さる
 */
const SpotLocationSelector: React.FC<SpotLocationSelectorProps> = ({
  spots,
  label,
  onSelect,
  placeholder = 'スポットを選択',
}) => {
  const handleValueChange = (value: string) => {
    const selectedSpot = spots.find((spot) => spot.id === value);
    if (selectedSpot) {
      onSelect(selectedSpot);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
        <MapPin className="h-4 w-4" />
        {label}
      </Label>
      <Select onValueChange={handleValueChange} disabled={spots.length === 0}>
        <SelectTrigger className="w-full" data-testid="spot-location-selector">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {spots.map((spot) => (
            <SelectItem key={spot.id} value={spot.id}>
              <div className="flex items-center gap-2">
                <span>{spot.location.name}</span>
                {spot.rating && <span className="text-xs text-muted-foreground">★{spot.rating.toFixed(1)}</span>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SpotLocationSelector;
