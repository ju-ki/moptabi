import Image from 'next/image';
import { format } from 'date-fns';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';

type TripCardProps = {
  id: string | number;
  title: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
};

export const TripCard = ({ id, title, startDate, endDate, imageUrl }: TripCardProps) => {
  return (
    <Link href={`/plan/${id}`}>
      <Card className="overflow-hidden">
        <div className="relative h-40 w-full">
          <Image
            src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/images/${imageUrl}`}
            alt={title}
            width={300}
            height={200}
            unoptimized
            onError={(e) => {
              console.log('Failed to load image:', `${process.env.NEXT_PUBLIC_API_BASE_URL}/images/${imageUrl}`);
            }}
            className="rounded-lg shadow-md"
          />
        </div>
        <CardContent className="p-4">
          <h3 className="text-lg font-bold mb-2 line-clamp-1">{title}</h3>
          <div className="flex text-sm text-gray-600">
            <p>{format(startDate, 'yyyy/MM/dd')}</p>
            <p>〜</p>
            <p>{format(endDate, 'yyyy/MM/dd')}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
