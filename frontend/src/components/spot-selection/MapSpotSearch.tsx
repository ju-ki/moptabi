'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pin } from 'lucide-react';
import { GoogleMap, Marker } from '@react-google-maps/api';

import { useStoreForPlanning } from '@/lib/plan';
import { setStartTimeAutomatically } from '@/lib/algorithm';
import { filterActualSpots } from '@/lib/utils';
import { loadMapPinLayers } from '@/lib/map-pin-layers';
import { checkOpeningStatus, hasOpeningWarning } from '@/lib/opening-hours';
import { MAP_FOCUS_ZOOM, MAP_SEARCH_MESSAGE } from '@/data/constants';
import { Button } from '@/components/ui/button';
import { useSpotSearchStore } from '@/store/planning/spotSearchStore';
import { toVisitNumberLabel, useMapCenterCandidates } from '@/hooks/spot-search/use-map-center-candidates';
import { useMapPoiSelection } from '@/hooks/spot-search/use-map-poi-selection';
import { useMapVisitedPins } from '@/hooks/spot-search/use-map-visited-pins';
import { Coordination, ExtendSpotType } from '@/types/plan';

import { MapCenterPicker } from './map/MapCenterPicker';
import { SelectedSpotCard } from './map/SelectedSpotCard';
import { MapPinLayerToggle } from './map/MapPinLayerToggle';
import { WishlistPinLayer } from './map/WishlistPinLayer';

type MapSpotSearchProps = {
  date: string;
  selectedSpotIds: string[];
  onSpotSelect: (spot: ExtendSpotType, isDeleted: boolean) => void;
  isLimitReached: boolean;
  limitsError: boolean;
};

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
/** 計画日に休みのピンの不透明度 */
const CLOSED_PIN_OPACITY = 0.4;
const WISHLIST_PIN_LABEL: google.maps.MarkerLabel = { text: '♥', color: '#ffffff' };
const VISITED_PIN_LABEL: google.maps.MarkerLabel = { text: '✓', color: '#ffffff' };

const MAP_OPTIONS: google.maps.MapOptions = {
  clickableIcons: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

/**
 * 地図で探す（No.341）
 * 地図上の Google の POI を押して詳細を見て、計画に追加する。自動検索・エリア検索はしない
 */
export function MapSpotSearch({
  date,
  selectedSpotIds,
  onSpotSelect,
  isLimitReached,
  limitsError,
}: MapSpotSearchProps) {
  const { plans } = useStoreForPlanning();
  const { mapCenter, mapCenterLabel, setMapCenter, pinLayers, setPinLayers, openOnPlanDate } = useSpotSearchStore();
  const { candidates, initialCenter } = useMapCenterCandidates(date);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { selectedSpot, isLoading, error, selectPlace, selectSpot, clearSelection } = useMapPoiSelection();
  // この画面で直前に追加したスポット。カードに「追加しました・取り消す」を出す
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [isPinSheetOpen, setIsPinSheetOpen] = useState(false);
  const visitedPins = useMapVisitedPins(pinLayers.visited);

  // 前回 ON にしたピンを復元する（localStorage が使えないときは両方 OFF）
  useEffect(() => {
    setPinLayers(loadMapPinLayers());
  }, [setPinLayers]);

  // 中心が未設定（初めて開いた・日付が変わった）ときは初期中心を使う
  const center = mapCenter ?? initialCenter;
  const centerLabel = mapCenter ? mapCenterLabel : initialCenter.label;
  // GoogleMap の center は初回だけ渡し、以降は panTo で動かす（再描画で中心が戻らないように）
  const [initialMapCenter] = useState(() => ({ lat: center.lat, lng: center.lng }));

  const plan = useMemo(() => plans.find((p) => p.date === date), [plans, date]);
  const planSpots = useMemo(() => filterActualSpots(plan?.spots ?? []), [plan]);
  const departure = candidates.find((c) => c.kind === 'departure');
  const destination = candidates.find((c) => c.kind === 'destination');
  const isSameDepartureAndDestination =
    !!departure && !!destination && departure.lat === destination.lat && departure.lng === destination.lng;

  const handleCenterChange = useCallback(
    (next: Coordination, label: string | null) => {
      setMapCenter(next, label);
      map?.panTo({ lat: next.lat, lng: next.lng });
      map?.setZoom(MAP_FOCUS_ZOOM);
    },
    [map, setMapCenter],
  );

  const handleMapClick = (e: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
    if ('placeId' in e && e.placeId) {
      // Google 標準の吹き出しは出さず、アプリのカードで表示する
      e.stop();
      setJustAddedId(null);
      void selectPlace(e.placeId);
      return;
    }
    clearSelection();
  };

  // アプリ側のピンは持っているデータでカードを出す（API を呼ばない）
  const handlePinClick = (spot: ExtendSpotType) => {
    setJustAddedId(null);
    selectSpot(spot);
  };

  const handleAdd = (spot: ExtendSpotType) => {
    // 上限チェック・休みの確認トーストは SpotSelectionDialog.handleSpotSelect で行う
    onSpotSelect(setStartTimeAutomatically(spot, plan?.spots ?? []), false);
    setJustAddedId(spot.id);
  };

  const handleRemove = (spot: ExtendSpotType) => {
    onSpotSelect(spot, true);
    setJustAddedId(null);
  };

  // 計画日に休みのピンは薄く、「計画日に休みのピンを隠す」が ON なら描かない
  const pinVisibility = (spot: ExtendSpotType | null): 'hidden' | 'faded' | 'normal' => {
    if (!spot) return 'normal';
    const status = checkOpeningStatus({
      openingPeriods: spot.openingPeriods,
      businessStatus: spot.businessStatus,
      date,
    });
    if (!hasOpeningWarning(status)) return 'normal';
    return openOnPlanDate ? 'hidden' : 'faded';
  };

  const renderListPin = (spot: ExtendSpotType, label: google.maps.MarkerLabel, onClick: () => void) => {
    // プランに入っているスポットは番号ピンで出すため重ねない
    if (selectedSpotIds.includes(spot.id)) return null;
    const visibility = pinVisibility(spot);
    if (visibility === 'hidden') return null;
    return (
      <Marker
        key={`${label.text}-${spot.id}`}
        position={{ lat: spot.latitude, lng: spot.longitude }}
        label={label}
        title={spot.name}
        opacity={visibility === 'faded' ? CLOSED_PIN_OPACITY : 1}
        onClick={onClick}
      />
    );
  };

  // ドラッグで動かしたら、その中心からの距離を出す（基準名は「中心」）
  const handleDragEnd = () => {
    const next = map?.getCenter();
    if (!next) return;
    setMapCenter(
      { id: 'map-center', name: MAP_SEARCH_MESSAGE.MAP_CENTER_NAME, lat: next.lat(), lng: next.lng() },
      null,
    );
  };

  return (
    <div className="relative flex flex-col gap-3 sm:grid sm:grid-cols-[320px_1fr] sm:gap-4">
      <div className="space-y-4 sm:max-h-[65vh] sm:overflow-y-auto sm:pr-1">
        <MapCenterPicker
          candidates={candidates}
          activeLabel={centerLabel}
          onCenterChange={handleCenterChange}
          trailing={
            <Button variant="outline" onClick={() => setIsPinSheetOpen(true)}>
              <Pin className="h-4 w-4" />
              {MAP_SEARCH_MESSAGE.PIN_BUTTON.replace(
                ':count',
                String(Number(pinLayers.wishlist) + Number(pinLayers.visited)),
              )}
            </Button>
          }
        />
        <MapPinLayerToggle
          isSheetOpen={isPinSheetOpen}
          onSheetClose={() => setIsPinSheetOpen(false)}
          visitedRemainingCount={visitedPins.remainingCount}
          onVisitedLoadMore={visitedPins.loadMore}
        />
        {/* PC は左パネル、スマホは地図の下部に重ねて出す */}
        <SelectedSpotCard
          spot={selectedSpot}
          isLoading={isLoading}
          error={error}
          date={date}
          center={center}
          basisLabel={centerLabel}
          isSelected={!!selectedSpot && selectedSpotIds.includes(selectedSpot.id)}
          isJustAdded={!!selectedSpot && justAddedId === selectedSpot.id}
          isLimitReached={isLimitReached}
          limitsError={limitsError}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onClose={clearSelection}
          className="max-sm:absolute max-sm:inset-x-2 max-sm:bottom-2 max-sm:z-10"
        />
      </div>

      <div className="h-[65vh] w-full overflow-hidden rounded-lg border max-sm:h-[calc(100dvh-13rem)]">
        <GoogleMap
          center={initialMapCenter}
          zoom={MAP_FOCUS_ZOOM}
          mapContainerStyle={MAP_CONTAINER_STYLE}
          options={MAP_OPTIONS}
          onLoad={setMap}
          onUnmount={() => setMap(null)}
          onDragEnd={handleDragEnd}
          onClick={handleMapClick}
        >
          {isSameDepartureAndDestination && departure ? (
            <Marker position={departure} label="S/G" title={departure.label} />
          ) : (
            <>
              {departure && <Marker position={departure} label="S" title={departure.label} />}
              {destination && <Marker position={destination} label="G" title={destination.label} />}
            </>
          )}
          {planSpots.map((spot, index) => {
            // 滞在時間まで含めて判定し、営業時間外などになるスポットに印を付ける
            const hasWarning = hasOpeningWarning(
              checkOpeningStatus({
                openingPeriods: spot.openingPeriods,
                businessStatus: spot.businessStatus,
                date,
                stayStart: spot.stayStart,
                stayEnd: spot.stayEnd,
              }),
            );
            const title = `${toVisitNumberLabel(index)} ${spot.name}`;
            return (
              <Marker
                key={spot.id}
                position={{ lat: spot.latitude, lng: spot.longitude }}
                label={hasWarning ? { text: `${index + 1}!`, color: '#b45309', fontWeight: 'bold' } : String(index + 1)}
                title={hasWarning ? `${title}（${MAP_SEARCH_MESSAGE.OPENING_WARNING_MARK}）` : title}
                onClick={() => handlePinClick(spot)}
              />
            );
          })}
          {pinLayers.wishlist && (
            <WishlistPinLayer
              renderPin={(spot) => renderListPin(spot, WISHLIST_PIN_LABEL, () => handlePinClick(spot))}
            />
          )}
          {pinLayers.visited &&
            visitedPins.pins.map((pin) => {
              // 座標キャッシュだけのピンは、押したときに詳細を取得する
              if (!pin.spot) {
                if (selectedSpotIds.includes(pin.spotId)) return null;
                return (
                  <Marker
                    key={`visited-${pin.spotId}`}
                    position={{ lat: pin.lat, lng: pin.lng }}
                    label={VISITED_PIN_LABEL}
                    onClick={() => {
                      setJustAddedId(null);
                      void selectPlace(pin.spotId);
                    }}
                  />
                );
              }
              const spot = pin.spot;
              return renderListPin(spot, VISITED_PIN_LABEL, () => handlePinClick(spot));
            })}
        </GoogleMap>
      </div>
    </div>
  );
}

export default MapSpotSearch;
