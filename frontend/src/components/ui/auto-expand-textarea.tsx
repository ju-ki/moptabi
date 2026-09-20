import * as React from 'react';
import { useEffect } from 'react';

import { cn } from '@/lib/utils';

interface AutoExpandTextareaProps extends React.ComponentProps<'textarea'> {
  /**
   * 最大高さ（ピクセル）。この値を超えるとスクロール可能になります。
   * デフォルト: 200px
   */
  maxHeight?: number;
  /**
   * 最小行数。デフォルト: 4
   */
  minRows?: number;
}

/**
 * 自動拡大・縮小するテキストエリアコンポーネント
 *
 * @example
 * ```tsx
 * const [value, setValue] = useState('');
 * <AutoExpandTextarea
 *   value={value}
 *   onChange={(e) => setValue(e.target.value)}
 *   placeholder="テキストを入力..."
 * />
 * ```
 */
const AutoExpandTextarea = React.forwardRef<HTMLTextAreaElement, AutoExpandTextareaProps>(
  ({ className, maxHeight = 200, minRows = 4, onChange, value, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    const textareaRef = ref || internalRef;

    /**
     * テキストエリアの高さを自動調整する
     */
    const adjustHeight = React.useCallback(() => {
      const textarea = (textareaRef as React.MutableRefObject<HTMLTextAreaElement>)?.current;
      if (!textarea) return;

      // リセット
      textarea.style.height = 'auto';

      // scrollHeight に基づいて高さを計算
      const scrollHeight = textarea.scrollHeight;
      const minHeight = minRows * 24; // 約24pxが1行の高さ（標準的な環境での値）

      // 最大高さを考慮
      const newHeight = Math.max(scrollHeight, minHeight);
      const finalHeight = maxHeight ? Math.min(newHeight, maxHeight) : newHeight;

      textarea.style.height = `${finalHeight}px`;

      // 最大高さに達した場合はスクロール可能に
      if (maxHeight && scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }, [minRows, maxHeight, textareaRef]);

    /**
     * 初期化とリサイズリスナー設定
     */
    useEffect(() => {
      adjustHeight();

      // ウィンドウのリサイズ時に高さを再調整
      const handleResize = () => {
        adjustHeight();
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, [adjustHeight]);

    /**
     * 値が変更されたときに高さを調整
     */
    useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    /**
     * 入力イベントハンドラ
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none',
          className,
        )}
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        rows={minRows}
        {...props}
      />
    );
  },
);

AutoExpandTextarea.displayName = 'AutoExpandTextarea';

export { AutoExpandTextarea };
export type { AutoExpandTextareaProps };
