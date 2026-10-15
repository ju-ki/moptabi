/**
 * 営業時間の判定ユーティリティ（No.158）
 *
 * Google Places の regularOpeningHours.periods と businessStatus から、
 * 計画日にスポットが営業しているか、滞在時間が営業時間内かを判定する。
 * UI に依存しない純粋関数だけを置く。祝日の営業は判定しない。
 */
import { OPENING_HOURS_MESSAGE } from '@/data/constants';
import { BusinessStatus, OpeningInfo, OpeningPeriod, OpeningPoint } from '@/types/spot';

export type OpeningStatus =
  | { kind: 'OPEN' }
  /** 営業時間情報なし。何も表示しない */
  | { kind: 'UNKNOWN' }
  | { kind: 'CLOSED_PERMANENTLY' }
  | { kind: 'CLOSED_TEMPORARILY' }
  /** 計画日の曜日に営業区間がない（定休日の可能性） */
  | { kind: 'CLOSED_DAY'; weekdayLabel: string }
  /** 滞在時間に営業時間外の時間帯が含まれる */
  | { kind: 'OUTSIDE_HOURS'; hoursOfDay: string };

export type CheckOpeningStatusParams = OpeningInfo & {
  date: string;
  stayStart?: string;
  stayEnd?: string;
};

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const DAY_MINUTES = 24 * 60;
const WEEK_MINUTES = 7 * DAY_MINUTES;
const BUSINESS_STATUSES: BusinessStatus[] = ['OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY'];

const pad = (value: number): string => String(value).padStart(2, '0');

const formatPoint = (point: OpeningPoint): string => `${pad(point.hour)}:${pad(point.minute)}`;

/** HH:mm を分に変換する。形式が不正なときは undefined */
const parseTime = (time: string | undefined): number | undefined => {
  const match = time?.match(/^(\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return undefined;
  return hour * 60 + minute;
};

/** 週の始まり（日曜 0:00）からの分 */
const toWeekMinutes = (point: OpeningPoint): number => point.day * DAY_MINUTES + point.hour * 60 + point.minute;

/** 区間が 1 件だけで close がない場合は 24 時間営業（Google の表現） */
const isAlwaysOpen = (periods: OpeningPeriod[]): boolean => periods.length === 1 && !periods[0].close;

/**
 * YYYY-MM-DD から曜日（0=日〜6=土）を返す。
 * 端末のタイムゾーンに依存しないよう UTC で計算する。不正な日付は undefined
 */
export function getWeekday(date: string): number | undefined {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    return undefined;
  }
  return utc.getUTCDay();
}

/** Google の periods を判定用の区間に変換する。取得なし・空は undefined */
export function normalizeOpeningPeriods(
  periods: google.maps.places.OpeningHoursPeriod[] | null | undefined,
): OpeningPeriod[] | undefined {
  if (!periods || periods.length === 0) return undefined;
  return periods.map((period) => {
    const open = { day: period.open.day, hour: period.open.hour, minute: period.open.minute };
    if (!period.close) return { open };
    return { open, close: { day: period.close.day, hour: period.close.hour, minute: period.close.minute } };
  });
}

/** Google の businessStatus を判定用の値に変換する。未知の値・未取得は undefined */
export function normalizeBusinessStatus(status: string | null | undefined): BusinessStatus | undefined {
  return BUSINESS_STATUSES.find((value) => value === status);
}

/**
 * 計画日の営業時間の表示文字列を返す（例: "10:00-17:00"、"11:00-14:00, 17:00-22:00"、"24時間営業"、"定休日"）。
 * 営業時間情報がない・日付が不正なときは undefined
 */
export function getOpeningHoursOfDay(periods: OpeningPeriod[] | undefined, date: string): string | undefined {
  if (!periods || periods.length === 0) return undefined;
  const weekday = getWeekday(date);
  if (weekday === undefined) return undefined;
  if (isAlwaysOpen(periods)) return '24時間営業';

  const periodsOfDay = periods
    .filter((period) => period.open.day === weekday)
    .sort((left, right) => toWeekMinutes(left.open) - toWeekMinutes(right.open));
  if (periodsOfDay.length === 0) return '定休日';

  return periodsOfDay
    .map((period) => `${formatPoint(period.open)}-${period.close ? formatPoint(period.close) : '24:00'}`)
    .join(', ');
}

/** 滞在区間（週の分）が営業区間のいずれかに完全に含まれるか */
const isStayWithinPeriods = (periods: OpeningPeriod[], stayStart: number, stayEnd: number): boolean =>
  periods.some((period) => {
    const open = toWeekMinutes(period.open);
    // close がない区間は open の曜日の 24:00 まで
    let close = period.close ? toWeekMinutes(period.close) : period.open.day * DAY_MINUTES + DAY_MINUTES;
    // 土曜→日曜のように週を跨ぐ区間は翌週の時刻として扱う
    if (close <= open) close += WEEK_MINUTES;
    // 日曜早朝の滞在が土曜夜からの区間に含まれる場合に備え、翌週側でも比較する
    return [0, WEEK_MINUTES].some((offset) => open <= stayStart + offset && stayEnd + offset <= close);
  });

/**
 * スポットの営業状況を判定する。
 * stayStart / stayEnd を渡したときだけ時間帯まで判定し、渡さないときは計画日に営業区間があるかだけを見る。
 */
export function checkOpeningStatus({
  openingPeriods,
  businessStatus,
  date,
  stayStart,
  stayEnd,
}: CheckOpeningStatusParams): OpeningStatus {
  if (businessStatus === 'CLOSED_PERMANENTLY') return { kind: 'CLOSED_PERMANENTLY' };
  if (businessStatus === 'CLOSED_TEMPORARILY') return { kind: 'CLOSED_TEMPORARILY' };

  const weekday = getWeekday(date);
  if (!openingPeriods || openingPeriods.length === 0 || weekday === undefined) return { kind: 'UNKNOWN' };
  if (isAlwaysOpen(openingPeriods)) return { kind: 'OPEN' };

  const closedDay: OpeningStatus = { kind: 'CLOSED_DAY', weekdayLabel: WEEKDAY_LABELS[weekday] };
  const hasOpeningOnWeekday = openingPeriods.some((period) => period.open.day === weekday);

  const start = parseTime(stayStart);
  const end = parseTime(stayEnd);
  // 時間帯の指定がない・不正なときは日単位の判定だけで終える（警告を増やさない）
  if (start === undefined || end === undefined || end <= start) {
    return hasOpeningOnWeekday ? { kind: 'OPEN' } : closedDay;
  }

  // 前日から続く営業区間に収まる滞在は、計画日に開店がなくても営業中とする
  const dayOffset = weekday * DAY_MINUTES;
  if (isStayWithinPeriods(openingPeriods, dayOffset + start, dayOffset + end)) return { kind: 'OPEN' };
  if (!hasOpeningOnWeekday) return closedDay;

  return { kind: 'OUTSIDE_HOURS', hoursOfDay: getOpeningHoursOfDay(openingPeriods, date) ?? '' };
}

/**
 * 計画日に営業しているか（検索フィルター用）。
 * 定休日・閉業・臨時休業は false、営業時間情報がないスポットは true（除外しない）
 */
export function isOpenOnPlanDate(spot: OpeningInfo, date: string): boolean {
  // スポットが滞在時間を持っていても、日単位で判定する
  const status = checkOpeningStatus({
    openingPeriods: spot.openingPeriods,
    businessStatus: spot.businessStatus,
    date,
  });
  return status.kind === 'OPEN' || status.kind === 'UNKNOWN';
}

/** 計画日の曜日ラベル（日〜土）。不正な日付は undefined */
export function getWeekdayLabel(date: string): string | undefined {
  const weekday = getWeekday(date);
  return weekday === undefined ? undefined : WEEKDAY_LABELS[weekday];
}

/**
 * 判定結果から利用者向けのメッセージを作る。営業中・情報なしは undefined
 */
export function buildOpeningStatusMessage(
  status: OpeningStatus,
  spot: { name: string; stayStart?: string; stayEnd?: string },
): string | undefined {
  switch (status.kind) {
    case 'CLOSED_PERMANENTLY':
      return OPENING_HOURS_MESSAGE.CLOSED_PERMANENTLY.replace(':name', spot.name);
    case 'CLOSED_TEMPORARILY':
      return OPENING_HOURS_MESSAGE.CLOSED_TEMPORARILY.replace(':name', spot.name);
    case 'CLOSED_DAY':
      return OPENING_HOURS_MESSAGE.CLOSED_DAY.replace(':name', spot.name).replace(':weekday', status.weekdayLabel);
    case 'OUTSIDE_HOURS':
      return OPENING_HOURS_MESSAGE.OUTSIDE_HOURS.replace(':name', spot.name)
        .replace(':stayStart', spot.stayStart ?? '')
        .replace(':stayEnd', spot.stayEnd ?? '')
        .replace(':hours', status.hoursOfDay);
    default:
      return undefined;
  }
}
