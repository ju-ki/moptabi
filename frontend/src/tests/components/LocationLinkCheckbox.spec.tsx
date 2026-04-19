import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LocationLinkCheckbox from '@/components/LocationLinkCheckbox';

describe('LocationLinkCheckbox コンポーネント', () => {
  describe('単一日の場合', () => {
    it('「出発地と目的地を同じにする」ラベルが表示される', () => {
      render(<LocationLinkCheckbox isSingleDay={true} checked={false} onCheckedChange={vi.fn()} />);

      expect(screen.getByText('出発地と目的地を同じにする')).toBeInTheDocument();
      expect(screen.getByText('チェックを入れると、出発地と目的地が連動します')).toBeInTheDocument();
    });

    it('チェックボックスがクリックされるとonCheckedChangeが呼ばれる', async () => {
      const onCheckedChange = vi.fn();
      const user = userEvent.setup();

      render(<LocationLinkCheckbox isSingleDay={true} checked={false} onCheckedChange={onCheckedChange} />);

      const checkbox = screen.getByTestId('location-link-checkbox');
      await user.click(checkbox);

      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('checkedがtrueの場合、チェックボックスがチェック状態になる', () => {
      render(<LocationLinkCheckbox isSingleDay={true} checked={true} onCheckedChange={vi.fn()} />);

      const checkbox = screen.getByTestId('location-link-checkbox');
      expect(checkbox).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('複数日の場合', () => {
    it('「前日の目的地を翌日の出発地と同じにする」ラベルが表示される', () => {
      render(<LocationLinkCheckbox isSingleDay={false} checked={false} onCheckedChange={vi.fn()} />);

      expect(screen.getByText('前日の目的地を翌日の出発地と同じにする')).toBeInTheDocument();
      expect(
        screen.getByText('チェックを入れると、各日の目的地が翌日の出発地として自動設定されます'),
      ).toBeInTheDocument();
    });

    it('チェックボックスがクリックされるとonCheckedChangeが呼ばれる', async () => {
      const onCheckedChange = vi.fn();
      const user = userEvent.setup();

      render(<LocationLinkCheckbox isSingleDay={false} checked={false} onCheckedChange={onCheckedChange} />);

      const checkbox = screen.getByTestId('location-link-checkbox');
      await user.click(checkbox);

      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });
  });
});
