import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({
  latex,
  displayMode = false,
  className = ''
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: true,
        strict: false
      });
    } catch (err) {
      if (import.meta.env?.DEV) {
        console.warn(`[MathView] Lỗi phân tích KaTeX cho chuỗi: "${latex}"`, err);
      }
      try {
        return katex.renderToString(latex, {
          displayMode,
          throwOnError: false,
          strict: false
        });
      } catch {
        return `<span class="katex-error">${latex}</span>`;
      }
    }
  }, [latex, displayMode]);

  return (
    <span
      className={`math-view ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
