import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import MyPage from '@/app/mypage/page';
import { ProfileSection } from '@/components/mypage/ProfileSection';
import { TripSummaryCards } from '@/components/mypage/TripSummaryCards';
import { UsageStatus } from '@/components/mypage/UsageStatus';
import { TooltipProvider } from '@/components/ui/tooltip';

const mockSignOut = vi.fn();
const mockToast = vi.fn();

// NextAuthのモック
vi.mock('next-auth/react', async () => {
  const actual = await vi.importActual('next-auth/react');
  return {
    ...actual,
    signOut: (...args: unknown[]) => mockSignOut(...args),
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

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// TripCalendarはjsdomでの描画を避けるためモック化する
vi.mock('@/components/mypage/TripCalendar', () => ({
  TripCalendar: () => <div data-testid="trip-calendar" />,
}));

// next/linkのモック
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

// useMypageDataフックのモック
const mockUseMypageData = vi.fn();
vi.mock('@/hooks/use-mypage', () => ({
  useMypageData: () => mockUseMypageData(),
}));

// next/navigationのモック
vi.mock('next/navigation', () => ({
  useRouter: () => vi.fn(),
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

const defaultMypageData = {
  isLoading: false,
  error: null,
  trips: [],
  nextTrips: [],
  defaultCalendarDate: new Date('2025-01-01'),
  visitedCount: 0,
  wishlistCount: 0,
  totalTripDays: 0,
  planCount: 0,
  planLimit: 20,
  wishlistLimit: 100,
  wishlistTotalCount: 0,
  userLocations: [],
  postUserLocation: vi.fn(),
  updateUserLocation: vi.fn(),
  deleteUserLocation: vi.fn(),
};

describe('マイページ', () => {
  beforeEach(() => {
    mockUseMypageData.mockReset();
    mockSignOut.mockReset();
    mockToast.mockReset();
  });

  describe('MyPage ページコンポーネント', () => {
    it('ローディング中は読み込み中表示が出る', () => {
      mockUseMypageData.mockReturnValue({
        ...defaultMypageData,
        isLoading: true,
      });

      render(<MyPage />);
      expect(screen.getByTestId('mypage-loading')).toBeInTheDocument();
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('エラー時はエラー表示が出る', () => {
      mockUseMypageData.mockReturnValue({
        ...defaultMypageData,
        error: new Error('API Error'),
      });

      render(<MyPage />);
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
    });

    it('データ取得成功時はマイページが表示される', () => {
      mockUseMypageData.mockReturnValue({
        ...defaultMypageData,
        nextTrips: [
          {
            id: 1,
            title: '京都日帰り旅行',
            startDate: '2025-01-15',
            endDate: '2025-01-15',
            daysUntil: 24,
          },
        ],
        visitedCount: 12,
        wishlistCount: 32,
        totalTripDays: 8,
        planCount: 5,
        wishlistTotalCount: 32,
      });

      renderWithProviders(<MyPage />);
      expect(screen.getByText('マイページ')).toBeInTheDocument();
      expect(screen.getByText('京都日帰り旅行')).toBeInTheDocument();
    });

    it('ログアウト押下でトップへ遷移するredirectTo付きsignOutが呼ばれる', async () => {
      mockUseMypageData.mockReturnValue(defaultMypageData);
      mockSignOut.mockResolvedValue(undefined);

      renderWithProviders(<MyPage />);
      fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: '/' });
      });
    });

    it('ログアウト失敗時はエラートーストを表示する', async () => {
      mockUseMypageData.mockReturnValue(defaultMypageData);
      mockSignOut.mockRejectedValue(new Error('signout failed'));

      renderWithProviders(<MyPage />);
      fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'ログアウトに失敗しました',
            variant: 'destructive',
          }),
        );
      });
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
      const avatarFallback = screen.getByText('テ');
      expect(avatarFallback).toBeInTheDocument();
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
});
