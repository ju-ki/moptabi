import { create } from 'zustand';

import { Coordination, Spot } from '@/types/plan';

interface MapState {
  spots: Spot[];
  coordinate: Coordination;
  setSpots: (spots: Spot[]) => void;
  setCoordinate: (coord: Coordination) => void;
}

export const useMapStore = create<MapState>((set) => ({
  spots: [],
  coordinate: { id: '', lat: 35.0, lng: 135.0 },
  setSpots: (spots) => set({ spots }),
  setCoordinate: (coord) => set({ coordinate: coord }),
}));
