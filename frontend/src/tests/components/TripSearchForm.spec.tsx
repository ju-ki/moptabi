import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TripSearchForm } from '@/components/TripSearchForm';

// cmdk の scrollIntoView は jsdom で未実装のためモック化する
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

/**
 * TripSearchForm テスト
 * 旅行検索フォームの表示・入力・ジャンル選択を検証する
 */
describe('TripSearchForm', () => {
  describe('初期表示', () => {
    it('タイトル検索入力フィールドが表示されること', () => {
      render(<TripSearchForm />);
      expect(screen.getByPlaceholderText('プラン名で検索...')).toBeInTheDocument();
    });

    it('日付選択ボタンが表示されること', () => {
      render(<TripSearchForm />);
      expect(screen.getByRole('button', { name: /日付/ })).toBeInTheDocument();
    });

    it('ジャンル選択ボタンが表示されること', () => {
      render(<TripSearchForm />);
      expect(screen.getByRole('button', { name: 'ジャンル' })).toBeInTheDocument();
    });

    it('検索ボタンが表示されること', () => {
      render(<TripSearchForm />);
      expect(screen.getByRole('button', { name: '検索' })).toBeInTheDocument();
    });
  });

  describe('タイトル入力', () => {
    it('タイトルを入力すると入力値が反映されること', () => {
      render(<TripSearchForm />);
      const input = screen.getByPlaceholderText('プラン名で検索...');

      fireEvent.change(input, { target: { value: '沖縄旅行' } });

      expect(input).toHaveValue('沖縄旅行');
    });

    it('入力をクリアすると空になること', () => {
      render(<TripSearchForm />);
      const input = screen.getByPlaceholderText('プラン名で検索...');

      fireEvent.change(input, { target: { value: '東京旅行' } });
      fireEvent.change(input, { target: { value: '' } });

      expect(input).toHaveValue('');
    });
  });

  describe('ジャンル選択', () => {
    it('ジャンルボタンをクリックするとジャンルのリストが表示されること', () => {
      render(<TripSearchForm />);

      fireEvent.click(screen.getByRole('button', { name: 'ジャンル' }));

      expect(screen.getByText('観光')).toBeInTheDocument();
      expect(screen.getByText('グルメ')).toBeInTheDocument();
      expect(screen.getByText('温泉')).toBeInTheDocument();
    });

    it('ジャンルを選択するとバッジに選択数が表示されること', () => {
      render(<TripSearchForm />);

      fireEvent.click(screen.getByRole('button', { name: 'ジャンル' }));
      fireEvent.click(screen.getByText('観光'));

      // ジャンルボタンに「1」バッジが表示される
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('同じジャンルを再クリックすると選択が解除されること', () => {
      render(<TripSearchForm />);

      fireEvent.click(screen.getByRole('button', { name: 'ジャンル' }));
      fireEvent.click(screen.getByText('観光'));
      fireEvent.click(screen.getByText('観光'));

      // バッジが消える（選択数0になる）
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });
});
