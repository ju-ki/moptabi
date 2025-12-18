'use client';

import React, { useCallback, useState } from 'react';
import { Search, MapPin, Star, Menu, Globe } from 'lucide-react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spot } from '@/types/plan';
import { GoogleSpotCard, WishlistSpotCard, VisitedSpotCard } from '@/components/spot-selection/cards';

export type ViewModeType = 'list' | 'map' | 'split';
export type CardType = 'google' | 'wishlist' | 'visited';

interface SearchResultsViewProps {
  spots: Spot[];
  selectedSpotIds?: string[];
  onSpotClick?: (spot: Spot) => void;
  /** カードの種類（google: Google検索, wishlist: 行きたいリスト, visited: 過去のスポット） */
  cardType?: CardType;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  spots,
  selectedSpotIds = [],
  onSpotClick,
  cardType = 'google',
}) => {
  const defaultCenter = { lat: 35.681236, lng: 139.767125 };
  const firstWithLocation = spots.find((s) => s.location?.lat != null && s.location?.lng != null);
  const mapCenter = firstWithLocation
    ? { lat: firstWithLocation.location.lat, lng: firstWithLocation.location.lng }
    : defaultCenter;
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [viewMode, setViewMode] = useState<ViewModeType>('list');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const handleMarkerClick = useCallback(
    (placeId: string) => {
      if (!map) return;

      const targetSpot = spots.find((result) => result.id === placeId);
      if (targetSpot) {
        setSelectedSpot(targetSpot);
      }
    },
    [map, spots],
  );

  const isSpotSelected = (spotId: string) => selectedSpotIds.includes(spotId);

  const getMarkerIcon = (place: Spot) => {
    const isAdded = isSpotSelected(place.id);
    const isSelected = selectedSpot?.id === place.id;
    const isHovered = hoveredPlaceId === place.id;

    const circlePath =
      typeof google !== 'undefined' && google.maps && google.maps.SymbolPath
        ? google.maps.SymbolPath.CIRCLE
        : undefined;

    if (!circlePath) {
      return undefined;
    }

    if (isSelected) {
      return {
        path: circlePath,
        fillColor: '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 12,
      };
    }

    if (isAdded) {
      return {
        path: circlePath,
        fillColor: '#10B981',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: isHovered ? 12 : 10,
      };
    }

    if (isHovered) {
      return {
        path: circlePath,
        fillColor: '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 12,
      };
    }

    return {
      path: circlePath,
      fillColor: '#EF4444',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 10,
    };
  };

  return (
    <div className="space-y-3 w-full max-w-full overflow-hidden" data-testid="search-results-view">
      {/* View Mode Toggle */}
      {spots && spots.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs sm:text-sm font-medium text-gray-700" data-testid="results-count">
            {spots.length}件のスポット
          </p>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewModeType)} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-2 lg:grid-cols-3 h-9 w-full sm:w-auto">
              <TabsTrigger value="list" className="text-xs px-3 gap-1">
                <Menu size={14} />
                <span className="hidden sm:inline">リスト</span>
              </TabsTrigger>
              <TabsTrigger value="split" className="text-xs px-3 gap-1 hidden lg:flex">
                <MapPin size={14} />
                <span>分割</span>
              </TabsTrigger>
              <TabsTrigger value="map" className="text-xs px-3 gap-1">
                <Globe size={14} />
                <span className="hidden sm:inline">地図</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Content Area */}
      <div className="border rounded-lg overflow-hidden bg-white h-[400px] sm:h-[500px] lg:h-[600px] w-full max-w-full">
        {spots && spots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
            <Search size={40} className="mb-3" />
            <p className="text-sm text-center">検索結果がありません</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row h-full w-full max-w-full">
            {/* List View */}
            {(viewMode === 'list' || viewMode === 'split') && (
              <div
                className={`${
                  viewMode === 'split' ? 'w-full lg:w-1/2 h-full lg:border-r' : 'w-full h-full'
                } max-w-full overflow-hidden`}
              >
                <ScrollArea className="h-full w-full">
                  <div className="p-2 sm:p-3 space-y-2">
                    {spots.length > 0 &&
                      spots.map((place) => {
                        // カードタイプに応じたコンポーネントをレンダリング
                        const CardComponent =
                          cardType === 'wishlist'
                            ? WishlistSpotCard
                            : cardType === 'visited'
                              ? VisitedSpotCard
                              : GoogleSpotCard;
                        return (
                          <CardComponent
                            key={place.id}
                            place={place}
                            onSpotClick={onSpotClick}
                            isSpotSelected={isSpotSelected}
                            viewMode={viewMode}
                          />
                        );
                      })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Map View */}
            {(viewMode === 'map' || viewMode === 'split') && (
              <div className={`${viewMode === 'split' ? 'w-full lg:w-1/2 h-full' : 'w-full h-full'} max-w-full`}>
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
                  {spots &&
                    spots.map((place) => {
                      if (!place.location) return null;

                      return (
                        <Marker
                          key={place.id}
                          position={{
                            lat: place.location.lat,
                            lng: place.location.lng,
                          }}
                          icon={getMarkerIcon(place)}
                          onClick={() => handleMarkerClick(place.id)}
                          onMouseOver={() => setHoveredPlaceId(place.id)}
                          onMouseOut={() => setHoveredPlaceId(null)}
                        />
                      );
                    })}

                  {selectedSpot && selectedSpot.location && (
                    <InfoWindow
                      position={{
                        lat: selectedSpot.location.lat,
                        lng: selectedSpot.location.lng,
                      }}
                      onCloseClick={() => setSelectedSpot(null)}
                    >
                      <div className="p-2 max-w-xs">
                        <h3 className="font-semibold text-sm mb-2" data-testid="info-window-spot-name">
                          {selectedSpot.location.name}
                        </h3>
                        {selectedSpot.rating && (
                          <div className="flex items-center gap-2 mb-2">
                            <Star size={14} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{selectedSpot.rating}</span>
                            {selectedSpot.ratingCount && (
                              <span className="text-xs text-gray-500">({selectedSpot.ratingCount})</span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{selectedSpot.address}</p>
                        <Button size="sm" className="w-full" onClick={() => onSpotClick?.(selectedSpot)}>
                          {isSpotSelected(selectedSpot.id) ? '選択解除' : '選択する'}
                        </Button>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-600 px-1">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white flex-shrink-0"></div>
          <span>未選択</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-white flex-shrink-0"></div>
          <span>選択済み</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white flex-shrink-0"></div>
          <span>フォーカス中</span>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsView;
