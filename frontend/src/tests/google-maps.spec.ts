import { formatOpeningHours } from '@/lib/google-maps';
import { describe, it, expect } from 'vitest';

describe('営業時間取得ユーティリティ', () => {
  describe('extractOpeningHours', () => {
    it('weekday_text と periods を含む PlaceOpeningHours から営業時間を抽出できる', () => {
      const mockOpeningHours = {
        weekdayDescriptions: [
          '月曜日: 9時00分~18時00分',
          '火曜日: 9時00分~18時00分',
          '水曜日: 定休日',
          '木曜日: 9時00分~18時00分',
          '金曜日: 9時00分~20時00分',
          '土曜日: 10時00分~20時00分',
          '日曜日: 10時00分~17時00分',
        ],
        weekday_text: [
          '月曜日: 9時00分~18時00分',
          '火曜日: 9時00分~18時00分',
          '水曜日: 定休日',
          '木曜日: 9時00分~18時00分',
          '金曜日: 9時00分~20時00分',
          '土曜日: 10時00分~20時00分',
          '日曜日: 10時00分~17時00分',
        ],
        isOpen: () => false,
        open_now: false,
        periods: [
          {
            open: { day: 1, hour: 9, minute: 0 },
            close: { day: 1, hour: 18, minute: 0 },
          },
          {
            open: { day: 2, hour: 9, minute: 0 },
            close: { day: 2, hour: 18, minute: 0 },
          },
          {
            open: { day: 4, hour: 9, minute: 0 },
            close: { day: 4, hour: 18, minute: 0 },
          },
          {
            open: { day: 5, hour: 9, minute: 0 },
            close: { day: 5, hour: 20, minute: 0 },
          },
          {
            open: { day: 6, hour: 10, minute: 0 },
            close: { day: 6, hour: 20, minute: 0 },
          },
          {
            open: { day: 0, hour: 10, minute: 0 },
            close: { day: 0, hour: 17, minute: 0 },
          },
        ],
      } as google.maps.places.OpeningHours;

      const result = formatOpeningHours(mockOpeningHours.periods);

      expect(result).not.toBeNull();
      expect(result.length).toEqual(6);

      // 月曜日（day=1）の営業時間を確認
      const monday = result.find((p) => p.day === '月');
      expect(monday).toBeDefined();
      expect(monday?.hours).toEqual('09:00-18:00');
    });
  });

  it('営業時間情報がない場合に適切なメッセージを返す', () => {
    const result = formatOpeningHours(null);
    expect(result).not.toBeNull();
    expect(result.length).toEqual(1);
    expect(result[0].day).toEqual('不明');
    expect(result[0].hours).toEqual('営業時間情報なし');
  });

  it('24時間営業の場合に適切に処理できる', () => {
    const mockOpeningHours = [
      {
        open: { day: 0, hour: 0, minute: 0 },
        close: null,
      },
    ] as google.maps.places.OpeningHoursPeriod[];

    const result = formatOpeningHours(mockOpeningHours);
    expect(result).not.toBeNull();
    expect(result.length).toEqual(1);
    expect(result[0].day).toEqual('全');
    expect(result[0].hours).toEqual('24時間営業');
  });
});
