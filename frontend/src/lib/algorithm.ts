import { Spot } from '@/types/plan';

interface SortedSpot {
  order: number;
  spotId: string;
}

export const sortSpotByStartTime = (spots: Spot[]): SortedSpot[] => {
  if (!spots || spots.length === 0) {
    return [];
  }

  // 出発地と目的地は除外する
  spots = spots.filter((spot) => spot.stayStart !== undefined && spot.stayEnd !== undefined);
  //
  spots.sort((a, b) => {
    const startA = a.stayStart ?? '00:00';
    const startB = b.stayStart ?? '00:00';

    const startATotalTime = parseInt(startA.split(':')[0]) * 60 + parseInt(startA.split(':')[1]);
    const startBTotalTime = parseInt(startB.split(':')[0]) * 60 + parseInt(startB.split(':')[1]);
    return startATotalTime - startBTotalTime;
  });

  // ソート後に連番を振り直す
  const sortedSpots: SortedSpot[] = spots.map((spot, index) => ({
    order: index + 1,
    spotId: spot.id,
  }));

  return sortedSpots;
};
