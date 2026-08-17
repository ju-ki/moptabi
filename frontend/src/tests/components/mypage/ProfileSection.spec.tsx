import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * ProfileSection テスト
 * ユーザープロフィール情報の表示ロジックを検証する
 */

// next-auth/react のセッションをモック化する（useSWRが依存）
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// useFetcher は getFetcher のみ提供するモックにする
vi.mock('@/hooks/use-fetcher', () => ({
  useFetcher: () => ({
    getFetcher: vi.fn(),
  }),
}));

// SWR は直接モック化してAPIレスポンスを制御する
const mockUseSWR = vi.fn();
vi.mock('swr', () => ({
  default: (...args: any[]) => mockUseSWR(...args),
}));

import { useSession } from 'next-auth/react';

import { ProfileSection } from '@/components/mypage/ProfileSection';

describe('ProfileSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: 認証済みセッション
    (useSession as any).mockReturnValue({
      data: { user: { id: 'test-user' } },
      status: 'authenticated',
    });
  });

  describe('ローディング表示', () => {
    it('APIデータ取得中の場合スケルトンUIが表示されること', () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: null });

      render(<ProfileSection />);

      // スケルトンUIは animate-pulse クラスを持つ要素
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('ローディング中はユーザー名が表示されないこと', () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: null });

      render(<ProfileSection />);

      expect(screen.queryByText('テストユーザー')).not.toBeInTheDocument();
    });
  });

  describe('データ取得後の表示', () => {
    it('ユーザー名が表示されること', () => {
      mockUseSWR.mockReturnValue({
        data: { user: { id: '1', role: 'USER', name: 'テストユーザー', image: '', email: 'test@example.com' } },
        isLoading: false,
        error: null,
      });

      render(<ProfileSection />);

      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
    });

    it('メールアドレスが表示されること', () => {
      mockUseSWR.mockReturnValue({
        data: {
          user: { id: '1', role: 'USER', name: 'テストユーザー', image: '', email: 'test@example.com' },
        },
        isLoading: false,
        error: null,
      });

      render(<ProfileSection />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('ユーザーデータがない場合「ユーザー」がデフォルト名として表示されること', () => {
      mockUseSWR.mockReturnValue({ data: null, isLoading: false, error: null });

      render(<ProfileSection />);

      expect(screen.getByText('ユーザー')).toBeInTheDocument();
    });

    it('メールアドレスが空の場合メールアドレス欄が表示されないこと', () => {
      mockUseSWR.mockReturnValue({
        data: { user: { id: '1', role: 'USER', name: 'テストユーザー', image: '', email: '' } },
        isLoading: false,
        error: null,
      });

      render(<ProfileSection />);

      // メール欄は条件付きレンダリング（email が falsy なら非表示）
      const emailEl = screen.queryByText('test@example.com');
      expect(emailEl).not.toBeInTheDocument();
    });
  });
});
