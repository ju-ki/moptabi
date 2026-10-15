import { describe, it, expect } from 'vitest';

import {
  buildOpeningStatusMessage,
  checkOpeningStatus,
  getWeekdayLabel,
  getOpeningHoursOfDay,
  getWeekday,
  isOpenOnPlanDate,
  normalizeBusinessStatus,
  normalizeOpeningPeriods,
} from '@/lib/opening-hours';
import { OpeningPeriod } from '@/types/spot';

// 2026-10-12 は月曜日。以降の日付は曜日を固定するために使う
const SUNDAY = '2026-10-11';
const MONDAY = '2026-10-12';
const TUESDAY = '2026-10-13';
const SATURDAY = '2026-10-17';

const period = (day: number, open: string, closeDay: number | null, close?: string): OpeningPeriod => {
  const [openHour, openMinute] = open.split(':').map(Number);
  if (closeDay === null || !close) {
    return { open: { day, hour: openHour, minute: openMinute } };
  }
  const [closeHour, closeMinute] = close.split(':').map(Number);
  return {
    open: { day, hour: openHour, minute: openMinute },
    close: { day: closeDay, hour: closeHour, minute: closeMinute },
  };
};

// 月曜定休・火〜日 10:00-17:00 の美術館
const MUSEUM: OpeningPeriod[] = [0, 2, 3, 4, 5, 6].map((day) => period(day, '10:00', day, '17:00'));
// 毎日 11:00-14:00 と 17:00-22:00 の飲食店
const RESTAURANT: OpeningPeriod[] = [0, 1, 2, 3, 4, 5, 6].flatMap((day) => [
  period(day, '11:00', day, '14:00'),
  period(day, '17:00', day, '22:00'),
]);
// 毎日 20:00-翌02:00 のバー（土曜は日曜 02:00 まで）
const BAR: OpeningPeriod[] = [0, 1, 2, 3, 4, 5, 6].map((day) => period(day, '20:00', (day + 1) % 7, '02:00'));
// 24 時間営業（Google の表現: 日曜 0:00 開店で close なしの 1 区間）
const ALWAYS_OPEN: OpeningPeriod[] = [period(0, '00:00', null)];

describe('getWeekday', () => {
  it('YYYY-MM-DD から曜日（0=日〜6=土）を返す', () => {
    expect(getWeekday(SUNDAY)).toBe(0);
    expect(getWeekday(MONDAY)).toBe(1);
    expect(getWeekday(SATURDAY)).toBe(6);
  });

  it('不正な日付は undefined を返す', () => {
    expect(getWeekday('')).toBeUndefined();
    expect(getWeekday('2026-13-40')).toBeUndefined();
    expect(getWeekday('abc')).toBeUndefined();
  });
});

describe('normalizeOpeningPeriods', () => {
  it('Google の periods を判定用の区間に変換する', () => {
    const periods = [
      { open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 18, minute: 30 } },
      { open: { day: 0, hour: 0, minute: 0 }, close: null },
    ] as unknown as google.maps.places.OpeningHoursPeriod[];

    expect(normalizeOpeningPeriods(periods)).toEqual([
      { open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 18, minute: 30 } },
      { open: { day: 0, hour: 0, minute: 0 } },
    ]);
  });

  it('periods がない・空のときは undefined を返す', () => {
    expect(normalizeOpeningPeriods(null)).toBeUndefined();
    expect(normalizeOpeningPeriods(undefined)).toBeUndefined();
    expect(normalizeOpeningPeriods([])).toBeUndefined();
  });
});

describe('normalizeBusinessStatus', () => {
  it('既知の営業状況はそのまま返す', () => {
    expect(normalizeBusinessStatus('OPERATIONAL')).toBe('OPERATIONAL');
    expect(normalizeBusinessStatus('CLOSED_TEMPORARILY')).toBe('CLOSED_TEMPORARILY');
    expect(normalizeBusinessStatus('CLOSED_PERMANENTLY')).toBe('CLOSED_PERMANENTLY');
  });

  it('未知の値・未取得は undefined を返す', () => {
    expect(normalizeBusinessStatus('UNKNOWN_STATUS')).toBeUndefined();
    expect(normalizeBusinessStatus(null)).toBeUndefined();
    expect(normalizeBusinessStatus(undefined)).toBeUndefined();
  });
});

describe('getOpeningHoursOfDay', () => {
  it('計画日の曜日の営業時間を返す', () => {
    expect(getOpeningHoursOfDay(MUSEUM, TUESDAY)).toBe('10:00-17:00');
  });

  it('1 日に複数の営業区間があるときは開店順にカンマ区切りで返す', () => {
    const reversed = [...RESTAURANT].reverse();
    expect(getOpeningHoursOfDay(reversed, MONDAY)).toBe('11:00-14:00, 17:00-22:00');
  });

  it('計画日の曜日に営業区間がないときは「定休日」を返す', () => {
    expect(getOpeningHoursOfDay(MUSEUM, MONDAY)).toBe('定休日');
  });

  it('日跨ぎの区間は閉店時刻をそのまま表示する', () => {
    expect(getOpeningHoursOfDay(BAR, MONDAY)).toBe('20:00-02:00');
  });

  it('24 時間営業は「24時間営業」を返す', () => {
    expect(getOpeningHoursOfDay(ALWAYS_OPEN, MONDAY)).toBe('24時間営業');
  });

  it('close のない区間が他の区間と混在するときは 24:00 までの営業として表示する', () => {
    const mixed = [period(1, '10:00', null), period(2, '10:00', 2, '17:00')];
    expect(getOpeningHoursOfDay(mixed, MONDAY)).toBe('10:00-24:00');
  });

  it('営業時間情報がない・日付が不正なときは undefined を返す', () => {
    expect(getOpeningHoursOfDay(undefined, MONDAY)).toBeUndefined();
    expect(getOpeningHoursOfDay([], MONDAY)).toBeUndefined();
    expect(getOpeningHoursOfDay(MUSEUM, 'invalid')).toBeUndefined();
  });
});

describe('checkOpeningStatus', () => {
  describe('営業状況', () => {
    it('閉業は営業時間より優先して CLOSED_PERMANENTLY を返す', () => {
      expect(
        checkOpeningStatus({ openingPeriods: MUSEUM, businessStatus: 'CLOSED_PERMANENTLY', date: TUESDAY }),
      ).toEqual({ kind: 'CLOSED_PERMANENTLY' });
    });

    it('臨時休業は営業時間情報がなくても CLOSED_TEMPORARILY を返す', () => {
      expect(checkOpeningStatus({ businessStatus: 'CLOSED_TEMPORARILY', date: TUESDAY })).toEqual({
        kind: 'CLOSED_TEMPORARILY',
      });
    });
  });

  describe('日単位の判定（滞在時間なし）', () => {
    it('営業時間情報がないときは UNKNOWN を返す', () => {
      expect(checkOpeningStatus({ date: MONDAY })).toEqual({ kind: 'UNKNOWN' });
      expect(checkOpeningStatus({ openingPeriods: [], businessStatus: 'OPERATIONAL', date: MONDAY })).toEqual({
        kind: 'UNKNOWN',
      });
    });

    it('日付が不正なときは UNKNOWN を返す', () => {
      expect(checkOpeningStatus({ openingPeriods: MUSEUM, date: '' })).toEqual({ kind: 'UNKNOWN' });
    });

    it('計画日の曜日に営業区間がないときは CLOSED_DAY を返す', () => {
      expect(checkOpeningStatus({ openingPeriods: MUSEUM, date: MONDAY })).toEqual({
        kind: 'CLOSED_DAY',
        weekdayLabel: '月',
      });
    });

    it('計画日の曜日に営業区間があるときは OPEN を返す', () => {
      expect(checkOpeningStatus({ openingPeriods: MUSEUM, date: TUESDAY })).toEqual({ kind: 'OPEN' });
    });

    it('24 時間営業は全曜日 OPEN を返す', () => {
      expect(checkOpeningStatus({ openingPeriods: ALWAYS_OPEN, date: MONDAY })).toEqual({ kind: 'OPEN' });
      expect(checkOpeningStatus({ openingPeriods: ALWAYS_OPEN, date: SATURDAY })).toEqual({ kind: 'OPEN' });
    });

    it('close のない区間が他の曜日の区間と混在するときは 24 時間営業とみなさない', () => {
      const mixed = [period(1, '10:00', null), period(2, '10:00', 2, '17:00')];
      expect(checkOpeningStatus({ openingPeriods: mixed, date: SATURDAY })).toEqual({
        kind: 'CLOSED_DAY',
        weekdayLabel: '土',
      });
    });
  });

  describe('時間帯の判定（滞在時間あり）', () => {
    it('滞在時間が営業区間に収まるときは OPEN を返す', () => {
      expect(
        checkOpeningStatus({ openingPeriods: MUSEUM, date: TUESDAY, stayStart: '10:00', stayEnd: '17:00' }),
      ).toEqual({ kind: 'OPEN' });
    });

    it('開店前から滞在するときは OUTSIDE_HOURS とその日の営業時間を返す', () => {
      expect(
        checkOpeningStatus({ openingPeriods: MUSEUM, date: TUESDAY, stayStart: '09:30', stayEnd: '11:00' }),
      ).toEqual({ kind: 'OUTSIDE_HOURS', hoursOfDay: '10:00-17:00' });
    });

    it('閉店後まで滞在するときは OUTSIDE_HOURS を返す', () => {
      expect(
        checkOpeningStatus({ openingPeriods: MUSEUM, date: TUESDAY, stayStart: '16:00', stayEnd: '17:30' }),
      ).toEqual({ kind: 'OUTSIDE_HOURS', hoursOfDay: '10:00-17:00' });
    });

    it('昼休憩をまたぐ滞在は OUTSIDE_HOURS を返す', () => {
      expect(
        checkOpeningStatus({ openingPeriods: RESTAURANT, date: MONDAY, stayStart: '13:00', stayEnd: '18:00' }),
      ).toEqual({ kind: 'OUTSIDE_HOURS', hoursOfDay: '11:00-14:00, 17:00-22:00' });
    });

    it('2 つ目の営業区間に収まる滞在は OPEN を返す', () => {
      expect(
        checkOpeningStatus({ openingPeriods: RESTAURANT, date: MONDAY, stayStart: '18:00', stayEnd: '20:00' }),
      ).toEqual({ kind: 'OPEN' });
    });

    it('日跨ぎ営業の店で深夜 0 時前に収まる滞在は OPEN を返す', () => {
      expect(checkOpeningStatus({ openingPeriods: BAR, date: MONDAY, stayStart: '21:00', stayEnd: '23:30' })).toEqual({
        kind: 'OPEN',
      });
    });

    it('土曜から日曜に跨ぐ営業の店で土曜夜の滞在は OPEN を返す', () => {
      expect(checkOpeningStatus({ openingPeriods: BAR, date: SATURDAY, stayStart: '22:00', stayEnd: '23:59' })).toEqual(
        { kind: 'OPEN' },
      );
    });

    it('日曜の早朝に土曜夜から続く営業区間で滞在するときは OPEN を返す', () => {
      expect(checkOpeningStatus({ openingPeriods: BAR, date: SUNDAY, stayStart: '00:30', stayEnd: '01:30' })).toEqual({
        kind: 'OPEN',
      });
    });

    describe('計画日に開店がなく、前日の営業が深夜まで続く店', () => {
      // 土曜 20:00 〜 日曜 02:00 だけ営業（日曜は開店しない）
      const SATURDAY_NIGHT_ONLY = [period(6, '20:00', 0, '02:00')];

      it('前日から続く営業区間に収まる滞在は OPEN を返す', () => {
        expect(
          checkOpeningStatus({
            openingPeriods: SATURDAY_NIGHT_ONLY,
            date: SUNDAY,
            stayStart: '00:30',
            stayEnd: '01:30',
          }),
        ).toEqual({ kind: 'OPEN' });
      });

      it('前日から続く営業区間の外の滞在は CLOSED_DAY を返す', () => {
        expect(
          checkOpeningStatus({
            openingPeriods: SATURDAY_NIGHT_ONLY,
            date: SUNDAY,
            stayStart: '10:00',
            stayEnd: '11:00',
          }),
        ).toEqual({ kind: 'CLOSED_DAY', weekdayLabel: '日' });
      });

      it('滞在時間を渡さない日単位の判定は CLOSED_DAY を返す', () => {
        expect(checkOpeningStatus({ openingPeriods: SATURDAY_NIGHT_ONLY, date: SUNDAY })).toEqual({
          kind: 'CLOSED_DAY',
          weekdayLabel: '日',
        });
      });
    });

    it('24 時間営業はどの時間帯でも OPEN を返す', () => {
      expect(
        checkOpeningStatus({ openingPeriods: ALWAYS_OPEN, date: SUNDAY, stayStart: '03:00', stayEnd: '05:00' }),
      ).toEqual({ kind: 'OPEN' });
    });

    it('混在データの close のない区間は 24:00 まで営業として判定する', () => {
      const mixed = [period(1, '10:00', null), period(2, '10:00', 2, '17:00')];
      expect(checkOpeningStatus({ openingPeriods: mixed, date: MONDAY, stayStart: '22:00', stayEnd: '23:30' })).toEqual(
        { kind: 'OPEN' },
      );
      expect(checkOpeningStatus({ openingPeriods: mixed, date: MONDAY, stayStart: '09:00', stayEnd: '11:00' })).toEqual(
        { kind: 'OUTSIDE_HOURS', hoursOfDay: '10:00-24:00' },
      );
    });

    it('定休日は滞在時間があっても CLOSED_DAY を返す', () => {
      expect(
        checkOpeningStatus({ openingPeriods: MUSEUM, date: MONDAY, stayStart: '10:00', stayEnd: '11:00' }),
      ).toEqual({ kind: 'CLOSED_DAY', weekdayLabel: '月' });
    });

    it('滞在時間が不正なとき（終了が開始以前・形式違い）は時間帯を判定せず OPEN を返す', () => {
      expect(
        checkOpeningStatus({ openingPeriods: MUSEUM, date: TUESDAY, stayStart: '12:00', stayEnd: '12:00' }),
      ).toEqual({ kind: 'OPEN' });
      expect(
        checkOpeningStatus({ openingPeriods: MUSEUM, date: TUESDAY, stayStart: '18:00', stayEnd: '09:00' }),
      ).toEqual({ kind: 'OPEN' });
      expect(checkOpeningStatus({ openingPeriods: MUSEUM, date: TUESDAY, stayStart: '9時', stayEnd: '10:00' })).toEqual(
        { kind: 'OPEN' },
      );
    });
  });
});

describe('isOpenOnPlanDate', () => {
  it('定休日・閉業・臨時休業のスポットは false を返す', () => {
    expect(isOpenOnPlanDate({ openingPeriods: MUSEUM }, MONDAY)).toBe(false);
    expect(isOpenOnPlanDate({ openingPeriods: MUSEUM, businessStatus: 'CLOSED_PERMANENTLY' }, TUESDAY)).toBe(false);
    expect(isOpenOnPlanDate({ businessStatus: 'CLOSED_TEMPORARILY' }, TUESDAY)).toBe(false);
  });

  it('スポットが滞在時間を持っていても日単位で判定する', () => {
    const spot = { openingPeriods: MUSEUM, stayStart: '08:00', stayEnd: '09:00' };
    expect(isOpenOnPlanDate(spot, TUESDAY)).toBe(true);
  });

  it('営業日と営業時間情報がないスポットは true を返す', () => {
    expect(isOpenOnPlanDate({ openingPeriods: MUSEUM }, TUESDAY)).toBe(true);
    expect(isOpenOnPlanDate({}, MONDAY)).toBe(true);
  });
});

describe('getWeekdayLabel', () => {
  it('計画日の曜日ラベルを返す', () => {
    expect(getWeekdayLabel(MONDAY)).toBe('月');
    expect(getWeekdayLabel(SUNDAY)).toBe('日');
  });

  it('不正な日付は undefined を返す', () => {
    expect(getWeekdayLabel('invalid')).toBeUndefined();
  });
});

describe('buildOpeningStatusMessage', () => {
  it('定休日のメッセージにスポット名と曜日を入れる', () => {
    expect(buildOpeningStatusMessage({ kind: 'CLOSED_DAY', weekdayLabel: '月' }, { name: '美術館' })).toBe(
      '「美術館」はこの日（月）が定休日の可能性があります。公式サイト等で営業日をご確認ください。',
    );
  });

  it('営業時間外のメッセージに滞在時間と営業時間を入れる', () => {
    expect(
      buildOpeningStatusMessage(
        { kind: 'OUTSIDE_HOURS', hoursOfDay: '11:00-17:00' },
        { name: '美術館', stayStart: '10:00', stayEnd: '12:00' },
      ),
    ).toBe(
      '「美術館」の滞在予定（10:00〜12:00）に営業時間外の時間帯が含まれています（この日の営業時間: 11:00-17:00）。公式サイト等で営業時間をご確認ください。',
    );
  });

  it('閉業・臨時休業のメッセージにスポット名を入れる', () => {
    expect(buildOpeningStatusMessage({ kind: 'CLOSED_PERMANENTLY' }, { name: 'カフェ' })).toBe(
      '「カフェ」は Google マップ上で閉業と登録されています。公式サイト等で最新情報をご確認ください。',
    );
    expect(buildOpeningStatusMessage({ kind: 'CLOSED_TEMPORARILY' }, { name: 'カフェ' })).toBe(
      '「カフェ」は Google マップ上で臨時休業中と登録されています。公式サイト等で最新情報をご確認ください。',
    );
  });

  it('営業中・情報なしは undefined を返す', () => {
    expect(buildOpeningStatusMessage({ kind: 'OPEN' }, { name: 'カフェ' })).toBeUndefined();
    expect(buildOpeningStatusMessage({ kind: 'UNKNOWN' }, { name: 'カフェ' })).toBeUndefined();
  });
});
