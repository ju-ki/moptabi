import React, { useState } from 'react';
import { CheckIcon, Search } from 'lucide-react';

import { searchSpots, useStoreForPlanning } from '@/lib/plan';
import { setStartTimeAutomatically } from '@/lib/algorithm';
import { PlaceTypeGroupKey, SortOption } from '@/types/plan';
import { useMapStore } from '@/stores/mapStore';
import { prefectureCenters, prefectures } from '@/data/dummyData';

import { Command, CommandInput, CommandList, CommandItem } from './ui/command';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import GoogleMapComponent from './GoogleMap';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';

const SpotSelection = ({ date }: { date: string }) => {
  const genreList: { key: PlaceTypeGroupKey; name: string }[] = [
    { key: 'culture', name: '歴史文化' },
    { key: 'nature', name: '自然' },
    { key: 'leisure', name: 'レジャー' },
    { key: 'gourmet', name: 'グルメ' },
  ];
  const fields = useStoreForPlanning();
  const { coordinate, setCoordinate, spots, setSpots } = useMapStore();
  const [radius, setRadius] = useState<number>(1);
  const [genreIds, setGenreIds] = useState<PlaceTypeGroupKey[]>([]);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('');
  const [searchWord, setSearchWord] = useState<string>('');

  const [sortOption, setSortOption] = useState<SortOption>('distance');
  const [maxResultLimit, setMaxResultLimit] = useState<number>(10);
  const [isCurrentPosition, setIsCurrentPosition] = useState<boolean>(false);

  const onSearchSpot = async () => {
    const searchCenter = selectedPrefecture ? prefectureCenters[selectedPrefecture] : coordinate;

    const spots = await searchSpots({
      center: searchCenter,
      genreIds: genreIds,
      radius: radius,
      sortOption,
      maxResultLimit,
      searchWord,
    });
    if (selectedPrefecture) {
      setCoordinate(searchCenter);
    }
    setSpots(spots);
  };

  return (
    <div className="space-y-4">
      <Dialog>
        <DialogTrigger asChild>
          <Label>観光地を検索</Label>
        </DialogTrigger>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex align-middle">
              <span>観光地を検索</span>
              <Search />
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label>都道府県を選択</Label>
            <Select onValueChange={(value) => setSelectedPrefecture(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="都道府県を選択" />
              </SelectTrigger>
              <SelectContent>
                {prefectures.map((pref) => (
                  <SelectItem key={pref} value={pref}>
                    {pref}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>現在地を使用</Label>
            <Checkbox
              id="current-location"
              className="h-5 w-5 text-blue-500 focus:ring-2 focus:ring-blue-400"
              checked={isCurrentPosition}
              onCheckedChange={(checked) => {
                setIsCurrentPosition(Boolean(checked));
              }}
            />
          </div>
          <Label>ジャンル</Label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {genreList.map((genre) => (
              <div key={genre.key} className="flex items-center space-x-3">
                <Checkbox
                  id={genre.key}
                  className="h-5 w-5 text-blue-500 focus:ring-2 focus:ring-blue-400"
                  checked={genreIds.includes(genre.key)}
                  onCheckedChange={(checked) => {
                    const isIncluded = genreIds.includes(genre.key);
                    if (checked && !isIncluded) {
                      setGenreIds([...genreIds, genre.key]);
                    } else if (!checked && isIncluded) {
                      setGenreIds(genreIds.filter((prev) => prev !== genre.key));
                    }
                  }}
                />
                <Label htmlFor={genre.key}>{genre.name}</Label>
              </div>
            ))}
          </div>
          <div>
            <Label>距離</Label>
            <Select defaultValue={radius.toString()} onValueChange={(value) => setRadius(Number(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="距離を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1km</SelectItem>
                <SelectItem value="3">3km</SelectItem>
                <SelectItem value="5">5km</SelectItem>
                <SelectItem value="10">10km</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>表示順序</Label>
            <Select defaultValue={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="表示順序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">距離順</SelectItem>
                <SelectItem value="popularity">人気順</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>表示件数</Label>
            <Select
              defaultValue={maxResultLimit.toString()}
              onValueChange={(value) => setMaxResultLimit(Number(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="表示件数" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>キーワードから検索</Label>
            <Input type="text" value={searchWord} onChange={(e) => setSearchWord(e.target.value)} />
          </div>
          <Command>
            <CommandInput placeholder="観光スポットを検索" />
            <CommandList>
              {spots.length ? (
                spots.map((spot, index) => (
                  <CommandItem
                    className="flex item-start justify-between"
                    key={index}
                    onSelect={() => {
                      const selectedSpots =
                        fields.plans.filter((val) => val.date.toLocaleDateString('ja-JP') === date)[0]?.spots || [];
                      const isSelected = selectedSpots.some((s) => s.location.name === spot.location.name);

                      if (!isSelected) {
                        // スポットの開始時間を前スポットの終了時間を基準に設定
                        spot = setStartTimeAutomatically(
                          spot,
                          fields.plans.filter((val) => val.date.toLocaleDateString('ja-JP') === date)[0]?.spots,
                        );
                        fields.setSpots(new Date(date), spot, false);
                      } else {
                        fields.setSpots(new Date(date), spot, true);
                      }
                    }}
                  >
                    {spot.location.name}
                    {fields.plans
                      .filter((val) => val.date.toLocaleDateString('ja-JP') === date)[0]
                      ?.spots.some((s) => s.location.name === spot.location.name) && (
                      <CheckIcon className="mr-2 h-4 w-4" />
                    )}
                  </CommandItem>
                ))
              ) : (
                <div className="flex justify-center items-center h-20">
                  <p>観光スポットが見つかりませんでした</p>
                </div>
              )}
            </CommandList>
          </Command>
          <Button onClick={onSearchSpot}>検索</Button>
          <GoogleMapComponent isSetCurrentLocation={isCurrentPosition} />
        </DialogContent>
      </Dialog>

      {fields.planErrors && <span className="text-red-500">{fields.planErrors[date]?.spots}</span>}
    </div>
  );
};

export default SpotSelection;
