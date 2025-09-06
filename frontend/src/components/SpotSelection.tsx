import React, { useEffect, useState } from 'react';
import { CheckIcon, Search, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from 'lib/utils';

import { searchSpots, useStoreForPlanning } from '@/lib/plan';
import { calcDistance, setStartTimeAutomatically } from '@/lib/algorithm';
import { Coordination, PlaceTypeGroupKey, SortOption, Spot } from '@/types/plan';
import { defaultLocation, placeTypeMap, prefectureCenters, prefectures } from '@/data/constants';

import { Command, CommandInput, CommandList } from './ui/command';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import GoogleMapComponent from './GoogleMap';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

const SpotSelection = ({ date }: { date: string }) => {
  const genreList: { key: PlaceTypeGroupKey; name: string }[] = [
    { key: 'culture', name: '歴史文化' },
    { key: 'nature', name: '自然' },
    { key: 'leisure', name: 'レジャー' },
    { key: 'gourmet', name: 'グルメ' },
  ];
  const fields = useStoreForPlanning();
  const [searchCenter, setSearchCenter] = useState<Coordination>(defaultLocation);
  const [searchedSpots, setSearchedSpots] = useState<Spot[]>([]);
  const [radius, setRadius] = useState<number>(1);
  const [genreIds, setGenreIds] = useState<PlaceTypeGroupKey[]>([]);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('');
  const [searchWord, setSearchWord] = useState<string>('');

  const [sortOption, setSortOption] = useState<SortOption>('popularity');
  const [maxResultLimit, setMaxResultLimit] = useState<number>(10);
  const [isCurrentPosition, setIsCurrentPosition] = useState<boolean>(false);
  const [searchBaseLocation, setSearchBaseLocation] = useState<'current' | 'departure' | 'destination' | 'default'>(
    'default',
  );

  useEffect(() => {
    if (searchBaseLocation == 'current') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSearchCenter({
            id: 'current-location',
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setSearchCenter(defaultLocation);
          setIsCurrentPosition(false);
        },
      );
    } else if (searchBaseLocation == 'departure' || searchBaseLocation == 'destination') {
      const result = fields.getSpotCoordination(date);
      if (!result) {
        return;
      }

      if (searchBaseLocation == 'departure' && result.departureCoordination) {
        setSearchCenter({
          id: result.departureCoordination.id,
          lat: result.departureCoordination.location.lat,
          lng: result.departureCoordination.location.lng,
        });
      } else if (searchBaseLocation == 'destination' && result.destinationCoordination) {
        setSearchCenter({
          id: result.destinationCoordination.id,
          lat: result.destinationCoordination.location.lat,
          lng: result.destinationCoordination.location.lng,
        });
      }
    }
  }, [searchBaseLocation, date]);

  const onSearchSpot = async () => {
    const searchedSpots = await searchSpots({
      center: searchCenter,
      genreIds: genreIds,
      radius: radius,
      sortOption,
      maxResultLimit,
      searchWord,
    });
    if (selectedPrefecture) {
      setSearchCenter(searchCenter);
    }
    setSearchedSpots(searchedSpots);
  };

  return (
    <div className="space-y-4">
      <Label className="block text-lg font-semibold text-gray-800">観光地を検索</Label>
      {fields.planErrors[date]?.spots && (
        <div className="mb-2 text-sm text-red-600">{fields.planErrors[date]?.spots}</div>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <div>
            <Button variant="outline" className=" justify-start">
              <span>観光地を検索</span>
              <Search className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto sm:max-w-4xl sm:max-h-[90vh] md:max-w-4xl md:max-h-[90vh] lg:max-w-4xl lg:max-h-[90vh] xl:max-w-4xl xl:max-h-[90vh] 2xl:max-w-4xl 2xl:max-h-[90vh]">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <DialogTitle className="flex items-center text-xl font-semibold">
              <Search className="mr-2 h-5 w-5" />
              <span>観光地を検索</span>
            </DialogTitle>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </DialogHeader>

          {/* 検索条件をアコーディオンで折りたたみ */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="search-conditions" className="border-b">
              <AccordionTrigger className="text-lg font-medium py-3">検索条件を設定</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* 都道府県選択 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">都道府県を選択</Label>
                  <Select onValueChange={(value) => setSearchCenter(prefectureCenters[value])}>
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

                {/* 基準となる場所の設定 */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">基準となる場所</Label>
                  <RadioGroup
                    value={searchBaseLocation}
                    onValueChange={(value) => setSearchBaseLocation(value as 'current' | 'departure' | 'destination')}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="current" id="current-location" />
                      <Label htmlFor="current-location" className="text-sm">
                        現在地
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="departure" id="departure-location" />
                      <Label htmlFor="departure-location" className="text-sm">
                        出発地
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="destination" id="destination-location" />
                      <Label htmlFor="destination-location" className="text-sm">
                        目的地
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* ジャンル選択 */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">ジャンル</Label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {genreList.map((genre) => (
                      <div key={genre.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={genre.key}
                          className="h-4 w-4 text-blue-500 focus:ring-2 focus:ring-blue-400"
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
                        <Label htmlFor={genre.key} className="text-sm">
                          {genre.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* その他の検索条件 */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">距離</Label>
                    <Select defaultValue={radius.toString()} onValueChange={(value) => setRadius(Number(value))}>
                      <SelectTrigger className="w-full">
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

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">表示順序</Label>
                    <Select defaultValue={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="表示順序" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distance">距離順</SelectItem>
                        <SelectItem value="popularity">人気順</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">表示件数</Label>
                    <Select
                      defaultValue={maxResultLimit.toString()}
                      onValueChange={(value) => setMaxResultLimit(Number(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="表示件数" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* キーワード検索 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">キーワードから検索</Label>
                  <Input
                    type="text"
                    value={searchWord}
                    onChange={(e) => setSearchWord(e.target.value)}
                    placeholder="観光スポット名や特徴を入力"
                    className="w-full"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* 検索ボタン */}
          <Button onClick={onSearchSpot} className="w-full sm:w-auto px-6 py-2">
            検索実行
          </Button>
          {/* 検索結果と地図エリア */}
          <div className="space-y-4">
            {/* 検索結果 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">検索結果</Label>
              <Command className="border rounded-lg">
                <CommandInput placeholder="観光スポットを検索" />
                <CommandList className="max-h-60">
                  {searchedSpots.length ? (
                    searchedSpots.map((spot) => {
                      const isSelected = fields.plans
                        .filter((val) => val.date === date)[0]
                        ?.spots.some((s) => s.location.name === spot.location.name);

                      return (
                        <div
                          key={spot.id}
                          className={cn(
                            'flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition',
                            isSelected ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50',
                          )}
                          onClick={() => {
                            if (!isSelected) {
                              spot = setStartTimeAutomatically(
                                spot,
                                fields.plans.filter((val) => val.date === date)[0]?.spots,
                              );
                              fields.setSpots(date, spot, false);
                            } else {
                              fields.setSpots(date, spot, true);
                            }
                          }}
                        >
                          {/* サムネイル */}
                          <Image
                            src={spot.image ?? '/not_found.png'}
                            alt={spot.location.name ?? ''}
                            width={80}
                            height={60}
                            className="rounded-md object-cover w-20 h-16"
                          />

                          {/* 情報 */}
                          <div className="flex-1 space-y-1">
                            <div className="font-semibold text-sm">{spot.location.name}</div>
                            <div className="text-xs text-gray-600">⭐️ {spot.rating ?? '評価なし'}</div>
                            <div className="text-xs">{calcDistance(searchCenter, spot.location)}</div>
                          </div>

                          <div className="flex gap-1 flex-wrap">
                            {spot.category?.slice(0, 2).map((t: string) => (
                              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {/* TODO: なんか順番があまり良くないので、後々変更 */}
                                {placeTypeMap[t] ?? 'その他'}
                              </span>
                            ))}
                          </div>

                          {/* 選択済みアイコン */}
                          {isSelected && <CheckIcon className="h-4 w-4 text-green-600" />}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex justify-center items-center h-20 text-gray-500">
                      <p>観光スポットが見つかりませんでした</p>
                    </div>
                  )}
                </CommandList>
              </Command>
            </div>

            {/* 地図表示 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">地図表示</Label>
              <GoogleMapComponent
                isSetCurrentLocation={isCurrentPosition}
                extraCoordinate={searchCenter}
                searchedSpots={searchedSpots}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpotSelection;
