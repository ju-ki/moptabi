import React from 'react';
import { Link2 } from 'lucide-react';

import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

interface LocationLinkCheckboxProps {
  /** 単一日かどうか */
  isSingleDay: boolean;
  /** チェック状態 */
  checked: boolean;
  /** チェック状態変更時のコールバック */
  onCheckedChange: (checked: boolean) => void;
}

/**
 * 出発地・目的地連動チェックボックス
 *
 * - 単一日の場合: 「出発地と目的地を同じにする」
 * - 複数日の場合: 「前日の目的地を翌日の出発地と同じにする」
 */
const LocationLinkCheckbox: React.FC<LocationLinkCheckboxProps> = ({ isSingleDay, checked, onCheckedChange }) => {
  const labelText = isSingleDay ? '出発地と目的地を同じにする' : '前日の目的地を翌日の出発地と同じにする';

  const descriptionText = isSingleDay
    ? 'チェックを入れると、出発地と目的地が連動します'
    : 'チェックを入れると、各日の目的地が翌日の出発地として自動設定されます';

  return (
    <div className="flex items-start space-x-3 p-3 border rounded-md bg-muted/30">
      <Checkbox
        id="location-link-checkbox"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
        data-testid="location-link-checkbox"
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor="location-link-checkbox" className="cursor-pointer text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4 text-blue-500" />
          {labelText}
        </Label>
        <p className="text-xs text-muted-foreground">{descriptionText}</p>
      </div>
    </div>
  );
};

export default LocationLinkCheckbox;
