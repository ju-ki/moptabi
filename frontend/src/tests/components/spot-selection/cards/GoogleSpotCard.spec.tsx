import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GoogleSpotCard from '@/components/spot-selection/cards/GoogleSpotCard';
import { Spot, TransportNodeType } from '@/types/plan';

// テスト用のSpotデータを生成するヘルパー関数
const createMockSpot = (overrides?: Partial<Spot>): Spot => ({
  id: 'spot-1',
  location: {
    id: 'spot-1',
    name: 'テスト観光スポット',
    lat: 35.6895,
    lng: 139.6917,
  },
  stayStart: '09:00',
  stayEnd: '10:00',
  transports: {
    transportMethodIds: [0],
    name: 'DEFAULT',
    travelTime: '不明',
    fromType: TransportNodeType.SPOT,
    toType: TransportNodeType.SPOT,
  },
  order: 0,
  image: 'https://example.com/image.jpg',
  rating: 4.5,
  ratingCount: 1234,
  address: '東京都千代田区',
  url: 'https://example.com',
  ...overrides,
});

describe('GoogleSpotCard', () => {
  describe('表示内容', () => {
    it('画像が表示される', () => {
      const spot = createMockSpot();
      render(<GoogleSpotCard place={spot} isSpotSelected={() => false} />);

      const image = screen.getByAltText('テスト観光スポット');
      expect(image).toBeInTheDocument();
    });

    it('スポット名が表示される', () => {
      const spot = createMockSpot();
      render(<GoogleSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('google-spot-name-spot-1')).toHaveTextContent('テスト観光スポット');
    });

    it('評価が表示される', () => {
      const spot = createMockSpot({ rating: 4.5 });
      render(<GoogleSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('google-spot-rating-spot-1')).toHaveTextContent('4.5');
    });

    it('評価数が表示される', () => {
      const spot = createMockSpot({ ratingCount: 1234 });
      render(<GoogleSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('google-spot-rating-count-spot-1')).toHaveTextContent('(1,234)');
    });

    it('住所が表示される', () => {
      const spot = createMockSpot({ address: '東京都千代田区' });
      render(<GoogleSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('google-spot-address-spot-1')).toHaveTextContent('東京都千代田区');
    });

    it('外部リンクが表示される', () => {
      const spot = createMockSpot({ url: 'https://example.com' });
      render(<GoogleSpotCard place={spot} isSpotSelected={() => false} />);

      const link = screen.getByTestId('google-spot-url-spot-1');
      expect(link).toHaveTextContent('外部リンク');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('評価がない場合は評価セクションが表示されない', () => {
      const spot = createMockSpot({ rating: undefined });
      render(<GoogleSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.queryByTestId('google-spot-rating-spot-1')).not.toBeInTheDocument();
    });

    it('URLがない場合は外部リンクが表示されない', () => {
      const spot = createMockSpot({ url: undefined });
      render(<GoogleSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.queryByTestId('google-spot-url-spot-1')).not.toBeInTheDocument();
    });
  });

  describe('選択状態', () => {
    it('選択済みの場合は選択済みバッジが表示される', () => {
      const spot = createMockSpot();
      render(<GoogleSpotCard place={spot} isSpotSelected={() => true} />);

      expect(screen.getByText('選択済み')).toBeInTheDocument();
    });

    it('未選択の場合は選択済みバッジが表示されない', () => {
      const spot = createMockSpot();
      render(<GoogleSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.queryByText('選択済み')).not.toBeInTheDocument();
    });
  });

  describe('クリックイベント', () => {
    it('カードをクリックするとonSpotClickが呼ばれる', () => {
      const spot = createMockSpot();
      const onSpotClick = vi.fn();
      render(<GoogleSpotCard place={spot} isSpotSelected={() => false} onSpotClick={onSpotClick} />);

      fireEvent.click(screen.getByTestId('google-spot-card-spot-1'));
      expect(onSpotClick).toHaveBeenCalledWith(spot);
    });
  });
});
