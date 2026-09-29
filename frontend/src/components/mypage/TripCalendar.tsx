'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { TripSummary } from '@/models/mypage';

type TripCalendarProps = {
  trips: TripSummary[];
  defaultDate: Date;
};

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

const WEEK_DAY_COLOR: Record<string, string> = {
  日: 'text-red-500',
  土: 'text-blue-500',
};

function getDayNumberColor(dayOfWeek: number, isToday: boolean): string {
  if (isToday) return 'bg-blue-500 text-white font-bold';
  if (dayOfWeek === 0) return 'text-red-500';
  if (dayOfWeek === 6) return 'text-blue-500';
  return 'text-gray-700';
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isDateInRange(date: Date, startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

export function TripCalendar({ trips, defaultDate }: TripCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(defaultDate);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startOffset = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => new Date(year, month, i + 1)),
  ];

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const tripsForDate = (date: Date) => trips.filter((trip) => isDateInRange(date, trip.startDate, trip.endDate));

  const today = new Date();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="sm" onClick={goToPrevMonth} aria-label="前月">
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">前月</span>
        </Button>
        <span className="font-semibold text-sm">
          {year}年{month + 1}月
        </span>
        <Button variant="ghost" size="sm" onClick={goToNextMonth} aria-label="次月">
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">次月</span>
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs mb-1">
        {WEEK_DAYS.map((day) => (
          <div key={day} className={`py-1 font-medium ${WEEK_DAY_COLOR[day] ?? 'text-gray-500'}`}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded">
        {cells.map((date, idx) => {
          const isToday = date !== null && isSameDay(date, today);
          const dayOfWeek = date !== null ? date.getDay() : -1;
          const dayTrips = date !== null ? tripsForDate(date) : [];

          return (
            <div key={idx} className="bg-white min-h-[56px] p-0.5 flex flex-col">
              {date !== null && (
                <>
                  <span
                    className={`text-xs self-center w-5 h-5 flex items-center justify-center rounded-full mb-0.5 ${getDayNumberColor(dayOfWeek, isToday)}`}
                  >
                    {date.getDate()}
                  </span>
                  <div className="flex flex-col gap-px overflow-hidden">
                    {dayTrips.map((trip) => (
                      <Link
                        key={trip.id}
                        href={`/plan/${trip.id}`}
                        className="block text-[10px] leading-tight bg-blue-100 text-blue-800 rounded px-0.5 truncate hover:bg-blue-200"
                        title={trip.title}
                      >
                        {trip.title}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
