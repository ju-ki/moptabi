'use client';

import React, { useState, useCallback } from 'react';
import { LocateIcon, Plus, Pencil, Trash2, MapPin, Star, Info, Loader2, AlertCircle } from 'lucide-react';
import { GoogleMap, Marker } from '@react-google-maps/api';

import {
  UserLocation,
  LOCATION_LABELS,
  MAX_USER_LOCATIONS,
  CreateUserLocationRequest,
  UpdateUserLocationRequest,
} from '@/models/userLocation';
import { useGeocoding } from '@/hooks/use-geocoding';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

/**
 * ユーザーお気に入り地点コンポーネント
 * マイページで出発地/目的地のお気に入り登録を管理する
 */
export function UserLocationSection({
  userLocationList,
  postUserLocation,
  updateUserLocation,
  deleteUserLocation,
}: {
  userLocationList: UserLocation[];
  postUserLocation: (newUserLocation: CreateUserLocationRequest) => Promise<Response>;
  updateUserLocation: (updatedUserLocation: UpdateUserLocationRequest) => Promise<Response>;
  deleteUserLocation: (id: number) => Promise<Response>;
}) {
  const firstWithLocation = userLocationList?.find((s) => s.isDefault);
  const mapCenter = firstWithLocation
    ? { lat: firstWithLocation.latitude, lng: firstWithLocation.longitude }
    : { lat: 35.6895, lng: 139.6917 }; // デフォルトの中心座標
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [locations, setLocations] = useState<UserLocation[]>(userLocationList);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<UserLocation | null>(null);

  // フォームの状態
  const [formData, setFormData] = useState<CreateUserLocationRequest>({
    name: '',
    latitude: 35.6895,
    longitude: 139.6917,
    address: '',
    label: '',
    isDefault: false,
  });

  // 追加ダイアログを開く
  function handleOpenAddDialog() {
    setFormData({
      name: '',
      latitude: 35.6895,
      longitude: 139.6917,
      address: '',
      label: '',
      isDefault: false,
    });
    setIsAddDialogOpen(true);
  }

  // 編集ダイアログを開く
  function handleOpenEditDialog(location: UserLocation) {
    setSelectedLocation(location);
    setFormData({
      name: location.name || '',
      latitude: location.latitude,
      longitude: location.longitude,
      label: location.label || '',
      isDefault: location.isDefault,
    });
    setIsEditDialogOpen(true);
  }

  // 削除ダイアログを開く
  function handleOpenDeleteDialog(location: UserLocation) {
    setSelectedLocation(location);
    setIsDeleteDialogOpen(true);
  }

  // 追加処理（モック）
  async function handleAdd() {
    const newLocation: UserLocation = {
      id: Date.now(),
      userId: 'user_001',
      name: formData.name,
      latitude: formData.latitude,
      longitude: formData.longitude,
      label: formData.label || null,
      usageCount: 0,
      isDefault: formData.isDefault || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await postUserLocation(formData);

    // デフォルトフラグの排他処理
    if (newLocation.isDefault) {
      setLocations((prev) => prev.map((loc) => ({ ...loc, isDefault: false })));
    }

    setLocations((prev) => [...prev, newLocation]);
    setIsAddDialogOpen(false);
  }

  // 更新処理（モック）
  async function handleUpdate() {
    if (!selectedLocation) return;
    await updateUserLocation({ id: selectedLocation.id, ...formData });

    // デフォルトフラグの排他処理
    if (formData.isDefault) {
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === selectedLocation.id ? { ...loc, ...formData, isDefault: true } : { ...loc, isDefault: false },
        ),
      );
    } else {
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === selectedLocation.id ? { ...loc, ...formData, updatedAt: new Date().toISOString() } : loc,
        ),
      );
    }

    setIsEditDialogOpen(false);
    setSelectedLocation(null);
  }

  // 削除処理（モック）
  async function handleDelete() {
    if (!selectedLocation) return;
    await deleteUserLocation(selectedLocation.id);
    setLocations((prev) => prev.filter((loc) => loc.id !== selectedLocation.id));
    setIsDeleteDialogOpen(false);
    setSelectedLocation(null);
  }

  const canAddMore = locations.length < MAX_USER_LOCATIONS;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <LocateIcon className="h-5 w-5 text-pink-500" />
              出発地と目的地
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>自宅や最寄駅など、よく使う『旅の拠点』を登録しましょう。</p>
                  <p>プラン作成時の入力が1タップで完了します。</p>
                </TooltipContent>
              </Tooltip>
              <Badge variant="outline" className="ml-2">
                {locations.length} / {MAX_USER_LOCATIONS}
              </Badge>
            </CardTitle>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!canAddMore} onClick={handleOpenAddDialog}>
                <Plus className="h-4 w-4 mr-1" />
                追加
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>お気に入り地点を追加</DialogTitle>
                <DialogDescription>旅行計画で使用する出発地・目的地を登録できます。</DialogDescription>
              </DialogHeader>
              <LocationForm formData={formData} setFormData={setFormData} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleAdd} disabled={!formData.name}>
                  追加する
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {locations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>お気に入りの地点がまだ登録されていません</p>
            <p className="text-sm mt-1">よく使う出発地・目的地を登録しましょう</p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location, index) => (
              <div
                key={location.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-400 w-6">{index + 1}</span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{location.name}</span>
                      {location.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                          デフォルト
                        </Badge>
                      )}
                      {location.label && (
                        <Badge variant="outline" className="text-xs">
                          {location.label}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">使用回数: {location.usageCount}回</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEditDialog(location)}
                    data-testid={`edit-button-${location.id}`}
                  >
                    <Pencil className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDeleteDialog(location)}
                    data-testid={`delete-button-${location.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Google Map プレースホルダー */}
        {locations.length > 0 && (
          <div className="mt-4 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
            <GoogleMap
              center={mapCenter}
              zoom={14}
              mapContainerStyle={{ width: '100%', height: '100%' }}
              onLoad={(map) => {
                setMap(map);
              }}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                clickableIcons: true,
              }}
            >
              {locations &&
                locations.map((place) => {
                  return (
                    <Marker
                      key={place.id}
                      position={{
                        lat: place.latitude,
                        lng: place.longitude,
                      }}
                      // onClick={() => handleMarkerClick(place.id)}
                      // onMouseOver={() => setHoveredPlaceId(place.id)}
                      // onMouseOut={() => setHoveredPlaceId(null)}
                    />
                  );
                })}
            </GoogleMap>
          </div>
        )}
      </CardContent>

      {/* 編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>お気に入り地点を編集</DialogTitle>
            <DialogDescription>地点の情報を更新できます。</DialogDescription>
          </DialogHeader>
          <LocationForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name}>
              更新する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>削除の確認</DialogTitle>
            <DialogDescription>
              「{selectedLocation?.name}」を削除しますか？
              <br />
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/**
 * 地点入力フォームコンポーネント
 * 住所検索機能付き
 */
interface LocationFormProps {
  formData: CreateUserLocationRequest;
  setFormData: React.Dispatch<React.SetStateAction<CreateUserLocationRequest>>;
}

function LocationForm({ formData, setFormData }: LocationFormProps) {
  const { isLoading: isGeocodingLoading, error: geocodingError, searchByAddress, clearError } = useGeocoding();
  const [map, setMap] = useState<google.maps.Map | null>(null);

  /**
   * 住所からカーソルが離れた時に座標を検索
   */
  const handleAddressBlur = useCallback(async () => {
    if (!formData.address?.trim()) return;

    const result = await searchByAddress(formData.address);
    if (result) {
      setFormData((prev) => ({
        ...prev,
        latitude: result.latitude,
        longitude: result.longitude,
        // フォーマット済み住所で上書きしない（ユーザー入力を尊重）
      }));

      // 地図の中心を移動
      if (map) {
        map.panTo({ lat: result.latitude, lng: result.longitude });
      }
    }
  }, [formData.address, searchByAddress, setFormData, map]);

  /**
   * 住所入力が変更された時にエラーをクリア
   */
  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      clearError();
      setFormData((prev) => ({ ...prev, address: e.target.value }));
    },
    [clearError, setFormData],
  );

  return (
    <div className="grid gap-4 py-4">
      {/* 名前（必須） */}
      <div className="grid gap-2">
        <Label htmlFor="name">
          名前 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder="例: 自宅、東京駅"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>

      {/* ラベル */}
      <div className="grid gap-2">
        <Label htmlFor="label">ラベル</Label>
        <Select
          value={formData.label || ''}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, label: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="ラベルを選択" />
          </SelectTrigger>
          <SelectContent>
            {LOCATION_LABELS.map((label) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 住所 */}
      <div className="grid gap-2">
        <Label htmlFor="address">住所</Label>
        <div className="relative">
          <Input
            id="address"
            placeholder="例: 東京都新宿区西新宿1-1-1"
            value={formData.address || ''}
            onChange={handleAddressChange}
            onBlur={handleAddressBlur}
            className={geocodingError ? 'border-red-500 pr-10' : ''}
            data-testid="address-input"
          />
          {isGeocodingLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" data-testid="geocoding-loading" />
            </div>
          )}
        </div>
        {geocodingError ? (
          <div className="flex items-center gap-1 text-xs text-red-500" data-testid="geocoding-error">
            <AlertCircle className="h-3 w-3" />
            <span>{geocodingError}</span>
            <span className="text-gray-500 ml-1">（地図上でピンを直接調整できます）</span>
          </div>
        ) : (
          <p className="text-xs text-gray-500">住所を入力してカーソルを外すと、Google Mapで位置を自動取得します</p>
        )}
      </div>

      {/* 緯度・経度（読み取り専用表示） */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>緯度</Label>
          <Input value={formData.latitude.toFixed(4)} disabled className="bg-gray-50" data-testid="latitude-display" />
        </div>
        <div className="grid gap-2">
          <Label>経度</Label>
          <Input
            value={formData.longitude.toFixed(4)}
            disabled
            className="bg-gray-50"
            data-testid="longitude-display"
          />
        </div>
      </div>

      {/* Google Map */}
      <div className="h-40 bg-gray-200 rounded-lg flex items-center justify-center">
        <GoogleMap
          center={
            formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : undefined
          }
          zoom={14}
          mapContainerStyle={{ width: '100%', height: '100%' }}
          onLoad={(mapInstance) => setMap(mapInstance)}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            clickableIcons: true,
          }}
          onClick={(e) =>
            e.latLng?.lat &&
            e.latLng?.lng &&
            setFormData({
              ...formData,
              latitude: e.latLng.lat(),
              longitude: e.latLng.lng(),
            })
          }
        >
          <Marker
            key={`${formData.latitude}-${formData.longitude}`}
            position={{
              lat: formData.latitude,
              lng: formData.longitude,
            }}
            draggable={true}
            onDragEnd={(e) => {
              if (e.latLng) {
                setFormData({
                  ...formData,
                  latitude: e.latLng.lat(),
                  longitude: e.latLng.lng(),
                });
              }
            }}
          />
        </GoogleMap>
      </div>
      <p className="text-xs text-gray-500 -mt-2">地図をクリック、またはピンをドラッグして位置を調整できます</p>

      {/* デフォルトフラグ */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isDefault"
          checked={formData.isDefault}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isDefault: checked === true }))}
        />
        <Label htmlFor="isDefault" className="text-sm font-normal cursor-pointer">
          デフォルトの地点として設定する
        </Label>
      </div>
    </div>
  );
}

// 後方互換性のためのエクスポート
export { UserLocationSection as UserLocation };
