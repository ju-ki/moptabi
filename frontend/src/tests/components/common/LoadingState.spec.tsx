import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import LoadingState from '@/components/common/LoadingState';

/**
 * LoadingState テスト
 * ローディング・エラー・通常の各状態表示を検証する
 */
describe('LoadingState', () => {
  describe('ローディング表示', () => {
    it('isLoadingがtrueの場合ローディングUIが表示されること', () => {
      render(<LoadingState isLoading={true} error={false} />);
      expect(screen.getByTestId('mypage-loading')).toBeInTheDocument();
    });

    it('isLoadingがtrueの場合「読み込み中...」テキストが表示されること', () => {
      render(<LoadingState isLoading={true} error={false} />);
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('isLoadingがtrueの場合エラーUIが表示されないこと', () => {
      render(<LoadingState isLoading={true} error={false} />);
      expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
    });
  });

  describe('エラー表示', () => {
    it('errorがtrueの場合エラーUIが表示されること', () => {
      render(<LoadingState isLoading={false} error={true} />);
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    it('errorがtrueの場合「データの取得に失敗しました」テキストが表示されること', () => {
      render(<LoadingState isLoading={false} error={true} />);
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
    });

    it('errorがtrueの場合「再読み込み」ボタンが表示されること', () => {
      render(<LoadingState isLoading={false} error={true} />);
      expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument();
    });

    it('errorがtrueの場合ローディングUIが表示されないこと', () => {
      render(<LoadingState isLoading={false} error={true} />);
      expect(screen.queryByTestId('mypage-loading')).not.toBeInTheDocument();
    });
  });

  describe('通常表示', () => {
    it('isLoadingとerrorが両方falseの場合ローディングUIとエラーUIが表示されないこと', () => {
      render(<LoadingState isLoading={false} error={false} />);
      expect(screen.queryByTestId('mypage-loading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
    });
  });
});
