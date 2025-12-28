import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SpotDetailCard from '@/components/travel-plan/SpotDetailCard';
import { Spot, TransportNodeType } from '@/types/plan';

/**
 * SpotDetailCard コンポーネントテスト
 *
 * 画面設計書の要件に基づき、以下の機能をテストします：
 * - 各スポットの名称
 * - 各スポットの滞在時間
 * - 各スポットのイメージ画像
 * - 評価
 * - カテゴリ(3つまで)
 * - 各スポットの説明
 * - 各スポットの外部URL
 * - 各スポットの営業時間
 * - 各スポットのメモ機能
 * - 各スポットの住所
 * - 各スポットの間の移動時間と交通手段表示
 * - 各スポットの個別削除機能
 */

// テスト用のスポットデータ
const createMockSpot = (overrides?: Partial<Spot>): Spot => ({
  id: 'spot-1',
  location: {
    id: 'loc-1',
    name: '東京タワー',
    lat: 35.6586,
    lng: 139.7454,
  },
  stayStart: '10:00',
  stayEnd: '12:00',
  transports: {
    transportMethod: 1,
    name: 'TRANSIT',
    cost: 500,
    travelTime: '30分',
    fromType: TransportNodeType.SPOT,
    toType: TransportNodeType.SPOT,
  },
  url: 'https://www.tokyotower.co.jp/',
  memo: 'テストメモ',
  image: '/test-image.jpg',
  rating: 4.5,
  category: ['tourist_attraction', 'historical_place', 'landmark'],
  catchphrase: '東京のシンボル',
  description: '東京のランドマーク的存在のタワー',
  prefecture: '東京都',
  address: '東京都港区芝公園4-2-8',
  ratingCount: 1234,
  regularOpeningHours: [
    { day: '月曜日', hours: '9:00〜23:00' },
    { day: '火曜日', hours: '9:00〜23:00' },
    { day: '水曜日', hours: '9:00〜23:00' },
    { day: '木曜日', hours: '9:00〜23:00' },
    { day: '金曜日', hours: '9:00〜23:00' },
    { day: '土曜日', hours: '9:00〜23:00' },
    { day: '日曜日', hours: '9:00〜23:00' },
  ],
  nearestStation: {
    name: '神谷町駅',
    walkingTime: 7,
    latitude: 35.6619,
    longitude: 139.7467,
  },
  order: 1,
  ...overrides,
});

describe('SpotDetailCard', () => {
  describe('スポット名称の表示', () => {
    it('スポット名が正しく表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.getByText('東京タワー')).toBeInTheDocument();
    });

    it('番号付きインデックスが表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={2} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('滞在時間の表示', () => {
    it('滞在開始時間と終了時間が表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.getByText('10:00 - 12:00')).toBeInTheDocument();
    });
  });

  describe('イメージ画像の表示', () => {
    it('画像が設定されている場合、画像が表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      const image = screen.getByAltText('東京タワー');
      expect(image).toBeInTheDocument();
    });

    it('画像が設定されていない場合、画像は表示されない', () => {
      const spot = createMockSpot({ image: undefined });
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.queryByAltText('東京タワー')).not.toBeInTheDocument();
    });
  });

  describe('評価の表示', () => {
    it('評価が正しく表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.getByText('4.5')).toBeInTheDocument();
    });

    it('評価がない場合は表示されない', () => {
      const spot = createMockSpot({ rating: undefined });
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.queryByTestId('spot-rating')).not.toBeInTheDocument();
    });
  });

  describe('カテゴリの表示', () => {
    it('カテゴリが3つまで表示される', () => {
      const spot = createMockSpot({
        category: ['tourist_attraction', 'historical_place', 'landmark', 'extra_category'],
      });
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      // 3つまで表示される
      const categoryContainer = screen.getByTestId('spot-categories');
      expect(categoryContainer.children.length).toBeLessThanOrEqual(3);
    });

    it('カテゴリがない場合は表示されない', () => {
      const spot = createMockSpot({ category: undefined });
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.queryByTestId('spot-categories')).not.toBeInTheDocument();
    });
  });

  describe('説明の表示', () => {
    it('キャッチコピーが表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.getByText('東京のシンボル')).toBeInTheDocument();
    });

    it('説明文が表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.getByText('東京のランドマーク的存在のタワー')).toBeInTheDocument();
    });
  });

  describe('外部URLの表示', () => {
    it('外部URLリンクが表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      const link = screen.getByRole('link', { name: /外部サイト/i });
      expect(link).toHaveAttribute('href', 'https://www.tokyotower.co.jp/');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('URLがない場合はリンクが表示されない', () => {
      const spot = createMockSpot({ url: undefined });
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.queryByRole('link', { name: /外部サイト/i })).not.toBeInTheDocument();
    });
  });

  describe('営業時間の表示', () => {
    it('営業時間が表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.getByTestId('spot-opening-hours')).toBeInTheDocument();
    });

    it('営業時間がない場合は表示されない', () => {
      const spot = createMockSpot({ regularOpeningHours: undefined });
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.queryByTestId('spot-opening-hours')).not.toBeInTheDocument();
    });
  });

  describe('住所の表示', () => {
    it('住所が表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.getByText('東京都港区芝公園4-2-8')).toBeInTheDocument();
    });

    it('住所がない場合は表示されない', () => {
      const spot = createMockSpot({ address: undefined });
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.queryByTestId('spot-address')).not.toBeInTheDocument();
    });
  });

  describe('メモ機能', () => {
    it('メモテキストエリアが表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      const textarea = screen.getByPlaceholderText(/メモや注意点を記載/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('テストメモ');
    });

    it('メモを入力するとonMemoChangeが呼ばれる', () => {
      const spot = createMockSpot();
      const onMemoChange = vi.fn();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={onMemoChange} />);

      const textarea = screen.getByPlaceholderText(/メモや注意点を記載/i);
      fireEvent.change(textarea, { target: { value: '新しいメモ' } });

      expect(onMemoChange).toHaveBeenCalledWith('新しいメモ');
    });
  });

  describe('移動情報の表示', () => {
    it('移動時間と交通手段が表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} showTransport={true} />);

      expect(screen.getByText(/30分/)).toBeInTheDocument();
      expect(screen.getByText(/電車/)).toBeInTheDocument();
    });

    it('showTransportがfalseの場合、移動情報は表示されない', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} showTransport={false} />);

      expect(screen.queryByTestId('spot-transport')).not.toBeInTheDocument();
    });
  });

  describe('削除機能', () => {
    it('削除ボタンをクリックするとonDeleteが呼ばれる', () => {
      const spot = createMockSpot();
      const onDelete = vi.fn();
      render(
        <SpotDetailCard spot={spot} index={0} onDelete={onDelete} onMemoChange={vi.fn()} showDeleteButton={true} />,
      );

      const deleteButton = screen.getByRole('button', { name: /削除/i });
      fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith('spot-1');
    });

    it('showDeleteButtonがfalseの場合、削除ボタンは表示されない', () => {
      const spot = createMockSpot();
      render(
        <SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} showDeleteButton={false} />,
      );

      expect(screen.queryByRole('button', { name: /削除/i })).not.toBeInTheDocument();
    });
  });

  describe('出発地・目的地の表示', () => {
    it('出発地の場合、簡易表示になる', () => {
      const spot = createMockSpot({
        transports: {
          transportMethod: 1,
          name: 'TRANSIT',
          cost: 0,
          travelTime: '0分',
          fromType: TransportNodeType.DEPARTURE,
          toType: TransportNodeType.SPOT,
        },
      });
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      // 出発地・目的地では滞在時間や評価は表示されない
      expect(screen.queryByText('10:00 - 12:00')).not.toBeInTheDocument();
      expect(screen.queryByTestId('spot-rating')).not.toBeInTheDocument();
    });

    it('目的地の場合、簡易表示になる', () => {
      const spot = createMockSpot({
        transports: {
          transportMethod: 1,
          name: 'TRANSIT',
          cost: 0,
          travelTime: '0分',
          fromType: TransportNodeType.SPOT,
          toType: TransportNodeType.DESTINATION,
        },
      });
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      // 目的地では滞在時間や評価は表示されない
      expect(screen.queryByText('10:00 - 12:00')).not.toBeInTheDocument();
      expect(screen.queryByTestId('spot-rating')).not.toBeInTheDocument();
    });
  });

  describe('最寄駅情報の表示', () => {
    it('最寄駅情報が表示される', () => {
      const spot = createMockSpot();
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.getByText(/神谷町駅/)).toBeInTheDocument();
      expect(screen.getByText(/徒歩/)).toBeInTheDocument();
    });

    it('最寄駅がない場合は表示されない', () => {
      const spot = createMockSpot({ nearestStation: undefined });
      render(<SpotDetailCard spot={spot} index={0} onDelete={vi.fn()} onMemoChange={vi.fn()} />);

      expect(screen.queryByTestId('spot-nearest-station')).not.toBeInTheDocument();
    });
  });
});
