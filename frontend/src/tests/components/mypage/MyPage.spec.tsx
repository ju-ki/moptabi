import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import MyPage from '@/app/mypage/page';
import { ProfileSection } from '@/components/mypage/ProfileSection';
import { NextTripSection } from '@/components/mypage/NextTripSection';
import { TripSummaryCards } from '@/components/mypage/TripSummaryCards';
import { UsageStatus } from '@/components/mypage/UsageStatus';
import { RecentTrips } from '@/components/mypage/RecentTrips';

// NextAuthのモック
vi.mock('next-auth/react', async () => {
  const actual = await vi.importActual('next-auth/react');
  return {
    ...actual,
    useSession: () => ({
      data: {
        user: {
          id: 'test-user-id',
          name: 'テストユーザー',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
        },
        expires: '2099-12-31T23:59:59.999Z',
      },
      status: 'authenticated',
    }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// useMypageDataフックのモック
const mockUseMypageData = vi.fn();
vi.mock('@/hooks/use-mypage', () => ({
  useMypageData: () => mockUseMypageData(),
}));

// useFetcherフックのモック
vi.mock('@/hooks/use-fetcher', () => ({
  useFetcher: () => ({
    getFetcher: async () => ({
      status: 200,
      user: {
        id: 'test-user-id',
        role: 'USER',
        name: 'テストユーザー',
        image: 'https://example.com/avatar.jpg',
        email: 'test@example.com',
      },
    }),
  }),
}));

// SWRのモック（ProfileSection用）
vi.mock('swr', () => ({
  default: () => ({
    data: {
      status: 200,
      user: {
        id: 'test-user-id',
        role: 'USER',
        name: 'テストユーザー',
        image: 'https://example.com/avatar.jpg',
        email: 'test@example.com',
      },
    },
    isLoading: false,
    error: null,
    mutate: vi.fn(),
  }),
}));

describe('マイページ', () => {
  beforeEach(() => {
    mockUseMypageData.mockReset();
  });

  describe('MyPage ページコンポーネント', () => {
    it('ローディング中は読み込み中表示が出る', () => {
      mockUseMypageData.mockReturnValue({
        isLoading: true,
        error: null,
        nextTrip: null,
        visitedCount: 0,
        wishlistCount: 0,
        totalTripDays: 0,
        planCount: 0,
        planLimit: 20,
        wishlistLimit: 100,
        wishlistTotalCount: 0,
        recentTrips: [],
      });

      render(<MyPage />);
      expect(screen.getByTestId('mypage-loading')).toBeInTheDocument();
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('エラー時はエラー表示が出る', () => {
      mockUseMypageData.mockReturnValue({
        isLoading: false,
        error: new Error('API Error'),
        nextTrip: null,
        visitedCount: 0,
        wishlistCount: 0,
        totalTripDays: 0,
        planCount: 0,
        planLimit: 20,
        wishlistLimit: 100,
        wishlistTotalCount: 0,
        recentTrips: [],
      });

      render(<MyPage />);
      expect(screen.getByTestId('mypage-error')).toBeInTheDocument();
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
    });

    it('データ取得成功時はマイページが表示される', () => {
      mockUseMypageData.mockReturnValue({
        isLoading: false,
        error: null,
        nextTrip: {
          id: 1,
          title: '京都日帰り旅行',
          startDate: '2025-01-15',
          daysUntil: 24,
        },
        visitedCount: 12,
        wishlistCount: 32,
        totalTripDays: 8,
        planCount: 5,
        planLimit: 20,
        wishlistLimit: 100,
        wishlistTotalCount: 32,
        recentTrips: [{ id: 1, title: '東京散策', startDate: '2024-12-10' }],
      });

      render(<MyPage />);
      expect(screen.getByText('マイページ')).toBeInTheDocument();
      expect(screen.getByText('京都日帰り旅行')).toBeInTheDocument();
    });
  });

  describe('ProfileSection', () => {
    it('ユーザー名が表示される', () => {
      render(<ProfileSection />);
      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
    });

    it('メールアドレスが表示される', () => {
      render(<ProfileSection />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('ユーザーアイコン（アバター）が表示される', () => {
      render(<ProfileSection />);
      // Avatarコンポーネントはフォールバック時にユーザー名の頭文字を表示
      const avatarFallback = screen.getByText('テ');
      expect(avatarFallback).toBeInTheDocument();
    });
  });

  describe('NextTripSection', () => {
    it('次の旅がある場合、プラン情報が表示される', () => {
      const nextTrip = {
        id: 1,
        title: '京都日帰り旅行',
        startDate: '2025-01-15',
        daysUntil: 24,
      };
      render(<NextTripSection nextTrip={nextTrip} wishlistCount={10} />);

      expect(screen.getByText('京都日帰り旅行')).toBeInTheDocument();
      expect(screen.getByText(/あと24日/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /詳細を見る/i })).toBeInTheDocument();
    });

    it('次の旅がない場合、プラン作成を促すメッセージが表示される', () => {
      render(<NextTripSection nextTrip={null} wishlistCount={32} />);

      expect(screen.getByText(/次の旅を計画しませんか/)).toBeInTheDocument();
      expect(screen.getByText(/32件/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /プランを作成/i })).toBeInTheDocument();
    });

    it('行きたいリストが0件の場合も適切に表示される', () => {
      render(<NextTripSection nextTrip={null} wishlistCount={0} />);

      expect(screen.getByText(/次の旅を計画しませんか/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /プランを作成/i })).toBeInTheDocument();
    });
  });

  describe('TripSummaryCards', () => {
    const mockData = {
      visitedCount: 12,
      wishlistCount: 32,
      totalTripDays: 8,
    };

    it('訪問済みスポット数が表示される', () => {
      render(<TripSummaryCards {...mockData} />);
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('訪問済み')).toBeInTheDocument();
    });

    it('行きたいスポット数が表示される', () => {
      render(<TripSummaryCards {...mockData} />);
      expect(screen.getByText('32')).toBeInTheDocument();
      expect(screen.getByText('行きたい')).toBeInTheDocument();
    });

    it('旅した日数が表示される', () => {
      render(<TripSummaryCards {...mockData} />);
      expect(screen.getByText('8日')).toBeInTheDocument();
      expect(screen.getByText('旅した日数')).toBeInTheDocument();
    });

    it('すべての値が0の場合も正しく表示される', () => {
      render(<TripSummaryCards visitedCount={0} wishlistCount={0} totalTripDays={0} />);
      expect(screen.getAllByText('0')).toHaveLength(2);
      expect(screen.getByText('0日')).toBeInTheDocument();
    });
  });

  describe('UsageStatus', () => {
    const mockData = {
      planCount: 5,
      planLimit: 20,
      wishlistCount: 32,
      wishlistLimit: 100,
    };

    it('プラン数と上限が表示される', () => {
      render(<UsageStatus {...mockData} />);
      expect(screen.getByText('5 / 20件')).toBeInTheDocument();
    });

    it('行きたいリスト数と上限が表示される', () => {
      render(<UsageStatus {...mockData} />);
      expect(screen.getByText('32 / 100件')).toBeInTheDocument();
    });

    it('プログレスバーが表示される', () => {
      render(<UsageStatus {...mockData} />);
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars).toHaveLength(2);
    });
  });

  describe('RecentTrips', () => {
    const mockTrips = [
      { id: 1, title: '東京散策', startDate: '2024-12-10' },
      { id: 2, title: '箱根温泉旅行', startDate: '2024-11-23' },
      { id: 3, title: '鎌倉日帰り', startDate: '2024-11-03' },
    ];

    it('最近の旅のリストが表示される', () => {
      render(<RecentTrips trips={mockTrips} />);

      expect(screen.getByText('東京散策')).toBeInTheDocument();
      expect(screen.getByText('箱根温泉旅行')).toBeInTheDocument();
      expect(screen.getByText('鎌倉日帰り')).toBeInTheDocument();
    });

    it('日付が表示される', () => {
      render(<RecentTrips trips={mockTrips} />);

      expect(screen.getByText('2024-12-10')).toBeInTheDocument();
      expect(screen.getByText('2024-11-23')).toBeInTheDocument();
    });

    it('「すべて見る」リンクが表示される', () => {
      render(<RecentTrips trips={mockTrips} />);

      expect(screen.getByRole('link', { name: /すべて見る/i })).toHaveAttribute('href', '/plan/list');
    });

    it('旅がない場合、適切なメッセージが表示される', () => {
      render(<RecentTrips trips={[]} />);

      expect(screen.getByText(/まだ旅の記録がありません/)).toBeInTheDocument();
    });
  });
});
