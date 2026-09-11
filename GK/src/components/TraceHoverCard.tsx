import React, { useMemo } from 'react';
import { CalculationTraceMeta } from '../domain/types';
import { MathView } from './MathView';
import { InlineMath } from './InlineMath';
import { getTraceNumberOrigins } from '../domain/traceExplainer';
import { Calculator } from 'lucide-react';

interface TraceHoverCardProps {
  trace: CalculationTraceMeta;
  label: React.ReactNode;
  x: number;
  y: number;
}

export const TraceHoverCard: React.FC<TraceHoverCardProps> = ({
  trace,
  label,
  x,
  y
}) => {
  // Trích xuất nguồn gốc và lý giải các con số trong phép tính
  const origins = useMemo(() => getTraceNumberOrigins(trace), [trace]);

  // Tính toán vị trí hiển thị nổi tại con trỏ chuột, chống tràn khung hình
  const { left, top } = useMemo(() => {
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800;

    const CARD_WIDTH = winW < 650 ? winW - 32 : 620;
    const ESTIMATED_HEIGHT = 420;
    const OFFSET_X = 18;
    const OFFSET_Y = 18;

    let posX = x + OFFSET_X;
    // Nếu tràn lề phải, lật sang bên trái con trỏ chuột
    if (posX + CARD_WIDTH > winW - 16) {
      posX = x - CARD_WIDTH - OFFSET_X;
    }
    posX = Math.max(16, Math.min(winW - CARD_WIDTH - 16, posX));

    let posY = y + OFFSET_Y;
    // Nếu tràn lề dưới, lật lên trên con trỏ chuột
    if (posY + ESTIMATED_HEIGHT > winH - 16) {
      posY = y - ESTIMATED_HEIGHT - OFFSET_Y;
    }
    posY = Math.max(16, Math.min(winH - ESTIMATED_HEIGHT - 16, posY));

    return { left: posX, top: posY };
  }, [x, y]);

  return (
    <div
      className="trace-hover-card"
      style={{
        left: `${left}px`,
        top: `${top}px`
      }}
      role="tooltip"
      aria-live="polite"
    >
      {/* Header rõ ràng */}
      <div className="hover-card-header">
        <div className="hover-card-title-group">
          <Calculator size={16} className="text-accent" />
          <span className="hover-card-title">Chi tiết phép tính toán học</span>
        </div>
        <span className="badge badge-eq">{trace.formulaNumber}</span>
      </div>

      {/* Tên thực thể */}
      {label && <div className="hover-card-label">{label}</div>}

      {/* Công thức toán học tổng quát */}
      {trace.formulaLatex && (
        <div className="hover-card-section">
          <div className="hover-card-section-label">📐 Công thức toán học nguyên bản:</div>
          <div className="hover-card-formula">
            <MathView latex={trace.formulaLatex} displayMode={true} />
          </div>
        </div>
      )}

      {/* Biểu thức thay số cụ thể */}
      {(trace.expressionLatex || trace.expression) && (
        <div className="hover-card-section">
          <div className="hover-card-section-label">🔢 Biểu thức thay số chi tiết:</div>
          <div className="hover-math-box">
            <MathView latex={trace.expressionLatex || trace.expression} displayMode={true} />
          </div>
        </div>
      )}

      {/* Lý giải nguồn gốc các con số */}
      {origins.length > 0 && (
        <div className="hover-card-section">
          <div className="hover-card-section-label">📌 Nguồn gốc các con số:</div>
          <div className="hover-origin-list">
            {origins.map((item, idx) => (
              <div key={idx} className="hover-origin-item">
                <div className="origin-badge-group">
                  <span className="origin-symbol">
                    <InlineMath latex={item.symbol} />
                  </span>
                  <span className="origin-val">={item.value}</span>
                </div>
                <span className="origin-desc">{item.origin}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kết quả đầu ra */}
      <div className="hover-card-result-row">
        <span className="result-label">Giá trị kết quả tính toán:</span>
        <span className="result-value">{trace.value.toFixed(4)}</span>
      </div>

      {/* Gợi ý tương tác nhấp chuột */}
      <div className="hover-card-hint">
        <span>💡 Nhấp chuột vào ô để xem phân tích chi tiết đầy đủ ở thanh bên phải</span>
      </div>
    </div>
  );
};
