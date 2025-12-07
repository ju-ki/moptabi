'use client';

import useSWR from 'swr';

import { TripCard } from '@/components/TripCard';
import { TripSearchForm } from '@/components/TripSearchForm';
import { FormData } from '@/lib/plan';
import { useFetcher } from '@/hooks/use-fetcher';
import { ResponseTripType } from '@/types/plan';

export default function TripsPage() {
  const { getFetcher } = useFetcher();
  const { data: trips, error, isLoading } = useSWR(`${process.env.NEXT_PUBLIC_API_BASE_URL}/trips`, getFetcher);

  if (error) return <div>エラーが発生しました</div>;
  if (isLoading) return <div>読み込み中...</div>;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">旅行プラン一覧</h1>
        <TripSearchForm />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(trips as ResponseTripType[]).map((trip, idx) => (
          <TripCard
            key={trip.id}
            id={trip.id}
            title={trip.title}
            startDate={trip.startDate}
            endDate={trip.endDate}
            imageUrl={trip.imageUrl}
          />
        ))}
      </div>
    </div>
  );
}
