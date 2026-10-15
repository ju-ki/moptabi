import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LimitFetchError } from '@/components/common/LimitFetchError';
import { LIMIT_FETCH_ERROR_MESSAGE } from '@/lib/limits';

describe('LimitFetchError', () => {
  it('上限を取得できなかった旨のメッセージを表示すること', () => {
    render(<LimitFetchError onRetry={vi.fn()} />);

    expect(screen.getByTestId('limit-fetch-error')).toBeDefined();
    expect(screen.getByText(LIMIT_FETCH_ERROR_MESSAGE.title)).toBeDefined();
  });

  it('再試行ボタンを押すとonRetryが呼ばれること', () => {
    const onRetry = vi.fn();
    render(<LimitFetchError onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: '再試行' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
