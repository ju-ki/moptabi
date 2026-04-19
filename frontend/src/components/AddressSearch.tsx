import React, { useState, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';

import { useGeocoding } from '@/hooks/use-geocoding';
import { Coordination } from '@/types/plan';

import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';

interface AddressSearchProps {
  /** ラベル（例: "住所から検索"） */
  label?: string;
  /** プレースホルダー */
  placeholder?: string;
  /** 座標が取得できた時のコールバック */
  onCoordinateFound: (coord: Coordination) => void;
  /** 住所取得時のコールバック（オプション） */
  onAddressFound?: (address: string) => void;
}

/**
 * 住所検索コンポーネント
 *
 * 住所を入力してカーソルアウト（blur）したら検索してピンを自動調整
 * - 入力内容が変わっていない場合は検索をかけない
 * - 検索結果は一定時間キャッシュとして保存される（useGeocodingフック内）
 */
const AddressSearch: React.FC<AddressSearchProps> = ({
  label = '住所から検索',
  placeholder = '住所を入力（例: 東京都渋谷区渋谷1-1-1）',
  onCoordinateFound,
  onAddressFound,
}) => {
  const [address, setAddress] = useState('');
  const [lastSearchedAddress, setLastSearchedAddress] = useState('');
  const { searchByAddress, isLoading, error } = useGeocoding();

  /**
   * カーソルアウト時に住所検索を実行
   */
  const handleBlur = useCallback(async () => {
    // 入力内容が変わっていない場合はスキップ
    if (address === lastSearchedAddress || !address.trim()) {
      return;
    }

    const result = await searchByAddress(address);
    if (result) {
      setLastSearchedAddress(address);
      onCoordinateFound({
        id: `address-search-${Date.now()}`,
        name: result.formattedAddress,
        lat: result.latitude,
        lng: result.longitude,
      });
      onAddressFound?.(result.formattedAddress);
    }
  }, [address, lastSearchedAddress, searchByAddress, onCoordinateFound, onAddressFound]);

  /**
   * 検索ボタンクリック時
   */
  const handleSearch = useCallback(async () => {
    if (!address.trim()) return;

    const result = await searchByAddress(address);
    if (result) {
      setLastSearchedAddress(address);
      onCoordinateFound({
        id: `address-search-${Date.now()}`,
        name: result.formattedAddress,
        lat: result.latitude,
        lng: result.longitude,
      });
      onAddressFound?.(result.formattedAddress);
    }
  }, [address, searchByAddress, onCoordinateFound, onAddressFound]);

  /**
   * Enterキーで検索
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch],
  );

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <div className="flex gap-2">
        <Input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
          data-testid="address-search-input"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleSearch}
          disabled={isLoading || !address.trim()}
          data-testid="address-search-button"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default AddressSearch;
