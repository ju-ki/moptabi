import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 *
 * @param time1 HH:mm
 * @param time2 HH:mm
 * @returns time1とtime2の差分(HH:mm)
 */
export function calcDiffTime(time1: string, time2: string): string {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);

  // 分単位に変換
  const totalMinutes1 = h1 * 60 + m1;
  const totalMinutes2 = h2 * 60 + m2;

  // 差分を計算（絶対値を取る）
  let diffMinutes = totalMinutes1 - totalMinutes2;

  // 時と分に分割
  const diffHours = Math.floor(diffMinutes / 60);
  diffMinutes %= 60;

  // HH:mm 形式にフォーマット
  return `${String(diffHours).padStart(2, '0')}:${String(diffMinutes).padStart(2, '0')}`;
}

/**
 *
 * @param baseTime 基準となる時間
 * @param diffTime 差分
 * @returns 基準時間に差分を加算した時間
 */
export function updatedTime(baseTime: string, diffTime: string): string {
  const [baseHours, baseMinutes] = baseTime.split(':').map(Number);
  const [diffHours, diffMinutes] = diffTime.split(':').map(Number);

  // 全体を分に変換
  let totalMinutes = baseHours * 60 + baseMinutes + diffHours * 60 + diffMinutes;

  // 24時間制に収める（1440分 = 24時間）
  totalMinutes = totalMinutes % 1440;

  // 時・分を計算
  const updatedHours = Math.floor(totalMinutes / 60);
  const updatedMinutes = totalMinutes % 60;

  // HH:mm 形式に整形
  return `${String(updatedHours).padStart(2, '0')}:${String(updatedMinutes).padStart(2, '0')}`;
}

/**
 *
 * @param start 開始日付
 * @param end   終了日付
 * @returns 間の日付を含んだ日付のリスト
 */
export const getDatesBetween = (start: Date, end: Date) => {
  if (!start || !end) {
    return [];
  }
  const startTime = start.getTime();
  const endTime = end.getTime();

  // 日数を整数にするため Math.round() を使用
  const days = Math.round((endTime - startTime) / (1000 * 60 * 60 * 24)) + 1;

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(startTime + i * (1000 * 60 * 60 * 24));
    return date.toLocaleDateString('ja-JP'); // YYYY/MM/DD 形式
  });
};

/**
 * YYYY-mm-dd形式に変換するメソッド
 * @param date
 * @returns
 */
export const removeTimeFromDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const formatToHHmm = (date: string): string => {
  try {
    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      console.error('Invalid date:', date);
      return '--:--';
    }
    const hours = String(parsedDate.getHours()).padStart(2, '0');
    const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error parsing date:', error);
    return '--:--';
  }
};

/**
 *
 * @param prefix departure | destination
 * @param date YYYY-MM-DD形式の日付
 * @param lat
 * @param lon
 * @returns
 */
export const buildSpotId = (prefix: 'departure' | 'destination', date: string, lat: number, lon: number): string => {
  return `${prefix}_${date}_${lat}_${lon}`.replace(/\./g, '_');
};
