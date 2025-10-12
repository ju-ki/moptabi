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

  // 差分を計算（絶対値を取らない）
  let diffMinutes = totalMinutes1 - totalMinutes2;

  // 時と分に分割
  const diffHours = Math.floor(diffMinutes / 60);
  diffMinutes = Math.abs(diffMinutes % 60);

  // HH:mm 形式にフォーマット（符号は別途管理）
  return `${String(Math.abs(diffHours)).padStart(2, '0')}:${String(diffMinutes).padStart(2, '0')}`;
}

/**
 * 全体移動用の時間差分計算関数
 * @param newTime 新しい時間 (HH:mm)
 * @param originalTime 元の時間 (HH:mm)
 * @returns 移動量（分単位の数値）
 */
export function calcMoveDiff(newTime: string, originalTime: string): number {
  const [h1, m1] = newTime.split(':').map(Number);
  const [h2, m2] = originalTime.split(':').map(Number);

  // 分単位に変換
  const totalMinutes1 = h1 * 60 + m1;
  const totalMinutes2 = h2 * 60 + m2;

  // 差分を計算（符号付き）
  return totalMinutes1 - totalMinutes2;
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
    // 現状世界標準時で定義しているためUTCを使用(もしかしたら今後変更するかもしれない)
    const hours = String(parsedDate.getUTCHours()).padStart(2, '0');
    const minutes = String(parsedDate.getUTCMinutes()).padStart(2, '0');
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
 * @returns
 */
export const buildSpotId = (prefix: 'departure' | 'destination', date: string): string => {
  return `${prefix}_${date}`;
};

/**
 * タスクの最小時間（15分）をチェックする関数
 * @param startTime 開始時間 (HH:mm)
 * @param endTime 終了時間 (HH:mm)
 * @returns 15分以上の場合true、15分未満の場合false
 */
export const isTaskDurationValid = (startTime: string, endTime: string): boolean => {
  const diff = calcDiffTime(endTime, startTime);
  const [hours, minutes] = diff.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes >= 15;
};

/**
 * 時間の妥当性を検証する関数
 * @param time 検証する時間 (HH:mm)
 * @returns 妥当な時間の場合true、そうでない場合false
 */
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * 時間を分単位に変換する関数
 * @param time 時間 (HH:mm)
 * @returns 分単位の数値
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * 分単位の数値を時間形式に変換する関数
 * @param minutes 分単位の数値
 * @returns 時間形式 (HH:mm)
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * 分単位の差分で時間を更新する関数
 * @param baseTime 基準となる時間 (HH:mm)
 * @param diffMinutes 差分（分単位の数値）
 * @returns 更新された時間 (HH:mm)
 */
export function updateTimeByMinutes(baseTime: string, diffMinutes: number): string {
  const [baseHours, baseMinutes] = baseTime.split(':').map(Number);

  // 全体を分に変換
  let totalMinutes = baseHours * 60 + baseMinutes + diffMinutes;

  // 24時間制に収める（1440分 = 24時間）
  totalMinutes = totalMinutes % 1440;
  if (totalMinutes < 0) {
    totalMinutes += 1440;
  }

  // 時・分を計算
  const updatedHours = Math.floor(totalMinutes / 60);
  const updatedMinutes = totalMinutes % 60;

  // HH:mm 形式に整形
  return `${String(updatedHours).padStart(2, '0')}:${String(updatedMinutes).padStart(2, '0')}`;
}

/**
 * 英語形式になっている時間を日本語形式に変換するための関数
 * @param travelTime string 英語形式の時間
 * @returns 日本語形式の時間
 */
export function convertHHmmToJpFormat(travelTime: string): string {
  const regex = /(?:(\d+)\s*hours?)?\s*(?:(\d+)\s*mins?)?/;
  return travelTime.replace(regex, (match, hours, mins) => {
    let result = '';
    if (hours) {
      result += `${hours}時間`;
    }
    if (mins) {
      result += `${mins}分`;
    }
    return result || match; // マッチしなかった場合は元の文字列を返す
  });
}
