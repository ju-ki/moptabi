import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SpotLocationSelector from '@/components/SpotLocationSelector';
import { Spot, TransportNodeType } from '@/types/plan';

// テスト用のスポットデータ
const createSpot = (id: string, name: string, fromType: TransportNodeType, toType: TransportNodeType): Spot => ({
  id,
  location: {
    id,
    name,
    lat: 35.6812,
    lng: 139.7671,
  },
  stayStart: '10:00',
  stayEnd: '11:00',
  order: 1,
  rating: 4.5,
  transports: {
    travelTime: '10分',
    cost: 0,
    name: 'DEFAULT',
    transportMethod: 1,
    fromType,
    toType,
  },
});

describe('SpotLocationSelector コンポーネント', () => {
  describe('表示制御', () => {
    // 観光スポットが1件もない場合は、非活性になっていること
    it('観光スポットがない場合は、非活性になっていること', () => {
      render(<SpotLocationSelector spots={[]} label="観光スポット周辺から出発地を選択する" onSelect={vi.fn()} />);

      const trigger = screen.getByTestId('spot-location-selector');
      expect(trigger).toBeDisabled();
    });

    it('観光スポットが1つ以上ある場合は、活性になっていること', () => {
      const spots = [createSpot('spot-1', '浅草寺', TransportNodeType.SPOT, TransportNodeType.SPOT)];

      render(<SpotLocationSelector spots={spots} label="観光スポット周辺から出発地を選択する" onSelect={vi.fn()} />);

      const trigger = screen.getByTestId('spot-location-selector');
      expect(trigger).toBeEnabled();
    });
  });

  describe('スポット選択', () => {
    it('ラベルが正しく表示される', () => {
      const spots = [createSpot('spot-1', '浅草寺', TransportNodeType.SPOT, TransportNodeType.SPOT)];

      render(<SpotLocationSelector spots={spots} label="観光スポット周辺から目的地を選択する" onSelect={vi.fn()} />);

      expect(screen.getByText('観光スポット周辺から目的地を選択する')).toBeInTheDocument();
    });

    it('プレースホルダーが正しく表示される', () => {
      const spots = [createSpot('spot-1', '浅草寺', TransportNodeType.SPOT, TransportNodeType.SPOT)];

      render(
        <SpotLocationSelector
          spots={spots}
          label="観光スポット周辺から出発地を選択する"
          placeholder="スポットを選んでください"
          onSelect={vi.fn()}
        />,
      );

      expect(screen.getByText('スポットを選んでください')).toBeInTheDocument();
    });

    it.skip('スポットを選択するとonSelectが呼ばれる', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      const spots = [
        createSpot('spot-1', '浅草寺', TransportNodeType.SPOT, TransportNodeType.SPOT),
        createSpot('spot-2', 'スカイツリー', TransportNodeType.SPOT, TransportNodeType.SPOT),
      ];

      render(<SpotLocationSelector spots={spots} label="観光スポット周辺から出発地を選択する" onSelect={onSelect} />);

      // セレクトボックスをクリック
      const trigger = screen.getByTestId('spot-location-selector');
      await user.click(trigger);

      // スポットを選択
      const option = screen.getByText('浅草寺');
      await user.click(option);

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'spot-1',
          location: expect.objectContaining({
            name: '浅草寺',
          }),
        }),
      );
    });
  });
});
