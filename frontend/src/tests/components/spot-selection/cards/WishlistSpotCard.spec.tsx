import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import WishlistSpotCard from '@/components/spot-selection/cards/WishlistSpotCard';
import { ExtendSpotType } from '@/types/plan';

// テスト用のSpotデータを生成するヘルパー関数
const createMockSpot = (overrides?: Partial<ExtendSpotType>): ExtendSpotType => ({
  id: 'spot-1',
  spotId: 'spot-1',
  name: 'テスト観光スポット',
  latitude: 35.6895,
  longitude: 139.6917,
  stayStart: '',
  stayEnd: '',
  stayDuration: 0,
  transportMethodId: 0,
  transportMethod: 'DEFAULT',
  travelTime: 0,
  order: 0,
  image: 'https://example.com/image.jpg',
  rating: 4.5,
  address: '東京都千代田区',
  url: 'https://example.com',
  createdAt: '2024-06-15T10:30:00.000Z',
  ...overrides,
});

describe('WishlistSpotCard', () => {
  describe('表示内容', () => {
    it('画像が表示される', () => {
      const spot = createMockSpot();
      render(<WishlistSpotCard place={spot} isSpotSelected={() => false} />);

      const image = screen.getByAltText('テスト観光スポット');
      expect(image).toBeInTheDocument();
    });

    it('スポット名が表示される', () => {
      const spot = createMockSpot();
      render(<WishlistSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('wishlist-spot-name-spot-1')).toHaveTextContent('テスト観光スポット');
    });

    it('評価が表示される', () => {
      const spot = createMockSpot({ rating: 4.5 });
      render(<WishlistSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('wishlist-spot-rating-spot-1')).toHaveTextContent('4.5');
    });

    it('住所が表示される', () => {
      const spot = createMockSpot({ address: '東京都千代田区' });
      render(<WishlistSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('wishlist-spot-address-spot-1')).toHaveTextContent('東京都千代田区');
    });

    it('外部リンクが表示される', () => {
      const spot = createMockSpot({ url: 'https://example.com' });
      render(<WishlistSpotCard place={spot} isSpotSelected={() => false} />);

      const link = screen.getByTestId('wishlist-spot-url-spot-1');
      expect(link).toHaveTextContent('外部リンク');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('登録日時がYYYY-MM-DD形式で表示される', () => {
      const spot = createMockSpot({ createdAt: '2024-06-15T10:30:00.000Z' });
      render(<WishlistSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('wishlist-spot-created-at-spot-1')).toHaveTextContent('登録: 2024-06-15');
    });

    it('評価数は表示されない（Google検索との違い）', () => {
      const spot = createMockSpot({ ratingCount: 1234 });
      render(<WishlistSpotCard place={spot} isSpotSelected={() => false} />);

      // 評価数はWishlistSpotCardでは表示しない
      expect(screen.queryByText('(1,234)')).not.toBeInTheDocument();
    });

    it('登録日時がない場合は表示されない', () => {
      const spot = createMockSpot({ createdAt: undefined });
      render(<WishlistSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.queryByTestId('wishlist-spot-created-at-spot-1')).not.toBeInTheDocument();
    });
  });

  describe('選択状態', () => {
    it('選択済みの場合は選択済みバッジが表示される', () => {
      const spot = createMockSpot();
      render(<WishlistSpotCard place={spot} isSpotSelected={() => true} />);

      expect(screen.getByText('選択済み')).toBeInTheDocument();
    });

    it('未選択の場合は選択済みバッジが表示されない', () => {
      const spot = createMockSpot();
      render(<WishlistSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.queryByText('選択済み')).not.toBeInTheDocument();
    });
  });

  describe('クリックイベント', () => {
    it('カードをクリックするとonSpotClickが呼ばれる', () => {
      const spot = createMockSpot();
      const onSpotClick = vi.fn();
      render(<WishlistSpotCard place={spot} isSpotSelected={() => false} onSpotClick={onSpotClick} />);

      fireEvent.click(screen.getByTestId('wishlist-spot-card-spot-1'));
      expect(onSpotClick).toHaveBeenCalledWith(spot);
    });
  });

  describe('営業時間の表示（No.158）', () => {
    // 2026-10-12 は月曜日。月曜定休・火〜日 10:00-17:00 のスポット
    const MONDAY = '2026-10-12';
    const TUESDAY = '2026-10-13';
    const openingPeriods = [0, 2, 3, 4, 5, 6].map((day) => ({
      open: { day, hour: 10, minute: 0 },
      close: { day, hour: 17, minute: 0 },
    }));

    it('計画日が定休日のときは「定休日の可能性」バッジと営業時間を表示する', () => {
      render(
        <WishlistSpotCard place={createMockSpot({ openingPeriods })} isSpotSelected={() => false} planDate={MONDAY} />,
      );
      expect(screen.getByTestId('opening-status-badge')).toHaveTextContent('定休日の可能性');
      expect(screen.getByTestId('opening-hours-of-day')).toHaveTextContent('この日(月)の営業時間: 定休日');
    });

    it('計画日が営業日のときはバッジを表示せず、営業時間だけを表示する', () => {
      render(
        <WishlistSpotCard place={createMockSpot({ openingPeriods })} isSpotSelected={() => false} planDate={TUESDAY} />,
      );
      expect(screen.queryByTestId('opening-status-badge')).not.toBeInTheDocument();
      expect(screen.getByTestId('opening-hours-of-day')).toHaveTextContent('この日(火)の営業時間: 10:00-17:00');
    });

    it('閉業のスポットは「閉業」バッジを表示する', () => {
      render(
        <WishlistSpotCard
          place={createMockSpot({ openingPeriods, businessStatus: 'CLOSED_PERMANENTLY' })}
          isSpotSelected={() => false}
          planDate={TUESDAY}
        />,
      );
      expect(screen.getByTestId('opening-status-badge')).toHaveTextContent('閉業');
    });

    it('営業時間情報がない・計画日がないときは何も表示しない', () => {
      const { rerender } = render(
        <WishlistSpotCard place={createMockSpot()} isSpotSelected={() => false} planDate={MONDAY} />,
      );
      expect(screen.queryByTestId('opening-status-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('opening-hours-of-day')).not.toBeInTheDocument();

      rerender(<WishlistSpotCard place={createMockSpot({ openingPeriods })} isSpotSelected={() => false} />);
      expect(screen.queryByTestId('opening-status-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('opening-hours-of-day')).not.toBeInTheDocument();
    });
  });
});
