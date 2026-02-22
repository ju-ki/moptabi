import { OpeningHoursType } from '@/types/plan';

const getDayName = (day: number): string => {
  const days = ['日', '月', '火', '水', '木', '金', '土', '全', '不明'];
  return days[day];
};

const formatTime = (hour: number, minute: number): string => {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

export const formatOpeningHours = (periods: google.maps.places.OpeningHoursPeriod[] | null): OpeningHoursType => {
  const hoursByDay: Record<number, string[]> = {};
  if (!periods || periods.length === 0) {
    return [{ day: getDayName(8), hours: '営業時間情報なし' }];
  }

  if (periods.length === 1 && !periods[0].close) {
    return [{ day: getDayName(7), hours: '24時間営業' }];
  }

  periods.forEach((period) => {
    if (!period.open) {
      return;
    }
    const day = period.open.day;
    // Places API (New) では hours/minutes プロパティを使用
    const openTime = formatTime(period.open.hour, period.open.minute);
    const closeTime = period.close ? formatTime(period.close.hour, period.close.minute) : '24:00';

    if (!hoursByDay[day]) {
      hoursByDay[day] = [];
    }
    hoursByDay[day].push(`${openTime}-${closeTime}`);
  });

  const sortedDays = Object.keys(hoursByDay).sort((a, b) => Number(a) - Number(b));

  return sortedDays.map((day) => ({
    day: getDayName(Number(day)),
    hours: hoursByDay[Number(day)].join(', '),
  }));
};
