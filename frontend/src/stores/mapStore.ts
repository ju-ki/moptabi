import { create } from 'zustand';

import { Coordination } from '@/types/plan';

interface MapState {
  coordinate: Coordination;
  setCoordinate: (coord: Coordination) => void;
}

export const useMapStore = create<MapState>((set) => ({
  coordinate: { id: '', lat: 35.6813, lng: 139.7671 },
  setCoordinate: (coord) => set({ coordinate: coord }),
}));
