import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import {
  HolidayNote,
  OpeningHoursOfDay,
  OpeningStatusBadge,
  SpotOpeningSummary,
} from '@/components/common/OpeningHoursInfo';
import { OpeningPeriod } from '@/types/spot';

// 2026-10-12 は月曜日
const MONDAY = '2026-10-12';
const TUESDAY = '2026-10-13';
const MUSEUM: OpeningPeriod[] = [0, 2, 3, 4, 5, 6].map((day) => ({
  open: { day, hour: 10, minute: 0 },
  close: { day, hour: 17, minute: 0 },
}));

describe('OpeningStatusBadge', () => {
  it.each([
    [{ kind: 'CLOSED_PERMANENTLY' as const }, '閉業'],
    [{ kind: 'CLOSED_TEMPORARILY' as const }, '臨時休業中'],
    [{ kind: 'CLOSED_DAY' as const, weekdayLabel: '月' }, '定休日の可能性'],
    [{ kind: 'OUTSIDE_HOURS' as const, hoursOfDay: '10:00-17:00' }, '営業時間外の可能性'],
  ])('判定結果 %o のときは「%s」バッジを表示する', (status, label) => {
    render(<OpeningStatusBadge status={status} />);
    expect(screen.getByTestId('opening-status-badge')).toHaveTextContent(label);
  });

  it('営業中・情報なしのときは何も表示しない', () => {
    const { container, rerender } = render(<OpeningStatusBadge status={{ kind: 'OPEN' }} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<OpeningStatusBadge status={{ kind: 'UNKNOWN' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('OpeningHoursOfDay', () => {
  it('計画日の曜日と営業時間を 1 行で表示する', () => {
    render(<OpeningHoursOfDay openingPeriods={MUSEUM} date={TUESDAY} />);
    expect(screen.getByTestId('opening-hours-of-day')).toHaveTextContent('この日(火)の営業時間: 10:00-17:00');
  });

  it('定休日は「定休日」と表示する', () => {
    render(<OpeningHoursOfDay openingPeriods={MUSEUM} date={MONDAY} />);
    expect(screen.getByTestId('opening-hours-of-day')).toHaveTextContent('この日(月)の営業時間: 定休日');
  });

  it('営業時間情報がない・計画日がないときは何も表示しない', () => {
    const { container, rerender } = render(<OpeningHoursOfDay date={MONDAY} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<OpeningHoursOfDay openingPeriods={MUSEUM} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('HolidayNote', () => {
  it('祝日を判定していない旨の注記を表示する', () => {
    render(<HolidayNote />);
    expect(screen.getByTestId('opening-hours-holiday-note')).toHaveTextContent('祝日の営業は判定していません');
  });
});

describe('SpotOpeningSummary', () => {
  it('検索結果のスポットが仮の滞在時間を持っていても日単位で判定し、営業時間外バッジを出さない', () => {
    const spot = { openingPeriods: MUSEUM, stayStart: '08:00', stayEnd: '09:00' };
    render(<SpotOpeningSummary spot={spot} planDate={TUESDAY} />);
    expect(screen.queryByTestId('opening-status-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('opening-hours-of-day')).toBeInTheDocument();
  });

  it('表示するものがないときは何も描画しない', () => {
    const { container } = render(<SpotOpeningSummary spot={{}} planDate={TUESDAY} />);
    expect(container).toBeEmptyDOMElement();
  });
});
