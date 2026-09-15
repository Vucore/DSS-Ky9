import React, { useEffect, useMemo } from 'react';
import { SelectedTraceState, StepId } from '../domain/types';
import { MathView } from './MathView';
import { InlineMath } from './InlineMath';
import { getTraceNumberOrigins } from '../domain/traceExplainer';
import { Calculator, ArrowRight, CheckCircle2, X } from 'lucide-react';

interface TraceInspectorProps {
  isOpen: boolean;
  currentStepId: StepId;
  selectedTrace: SelectedTraceState | null;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const TraceInspector: React.FC<TraceInspectorProps> = ({
  isOpen,
  currentStepId,
  selectedTrace,
  onClose,
  onMouseEnter,
  onMouseLeave
}) => {
  // Lắng nghe phím ESC để đóng drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Trích xuất nguồn gốc con số trong phép tính
  const origins = useMemo(() => {
    return selectedTrace?.trace ? getTraceNumberOrigins(selectedTrace.trace) : [];
  }, [selectedTrace]);

  // Nếu không mở hoặc không có trace hợp lệ cho bước hiện tại
  const isTraceValid = isOpen && selectedTrace && selectedTrace.stepId === currentStepId;

  if (!isTraceValid) {
    return null;
  }

  const { trace, label } = selectedTrace;

  return (
    <>
      {/* Backdrop disabled from intercepting any pointer/hover events */}
      <div
        className="trace-drawer-backdrop"
        aria-hidden="true"
        style={{ pointerEvents: 'none', display: 'none' }}
      />

      {/* Slide Drawer Panel */}
      <aside
        className="trace-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trace-drawer-title"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="card-header trace-drawer-header">
          <div className="header-title-group">
            <Calculator size={18} className="text-accent" />
            <h4 id="trace-drawer-title" className="card-title">
              Chi tiết phép tính số học
            </h4>
          </div>
          <div className="header-actions-group">
            <span className="badge badge-eq">{trace.formulaNumber}</span>
            <span className="badge badge-indigo" title="Bảng chi tiết phép tính thuật toán CFID">
              Chi tiết phép tính
            </span>
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              aria-label="Đóng bảng chi tiết phép tính"
              title="Đóng (ESC)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="trace-drawer-body">
          {label && (
            <div className="trace-entity-badge">
              <span className="badge badge-indigo">{label}</span>
            </div>
          )}

          {trace.formulaLatex && (
            <div className="trace-section">
              <div className="trace-section-label">📐 Công thức toán học nguyên bản:</div>
              <div className="trace-formula-preview">
                <MathView latex={trace.formulaLatex} displayMode={true} />
              </div>
            </div>
          )}

          {/* Biểu thức số học thay thế (KaTeX chuẩn hóa) */}
          <div className="trace-section">
            <div className="trace-section-label">🔢 Biểu thức thay số cụ thể và kết quả:</div>
            <div className="expression-box math-expression-box">
              <MathView latex={trace.expressionLatex || trace.expression} displayMode={true} />
            </div>
          </div>

          {/* Nguồn gốc các con số trong phép tính */}
          {origins.length > 0 && (
            <div className="trace-section">
              <div className="trace-section-label">📌 Nguồn gốc các con số:</div>
              <div className="trace-origin-list">
                {origins.map((item, idx) => (
                  <div key={idx} className="trace-origin-item">
                    <div className="origin-badge-group">
                      <span className="origin-symbol">
                        <InlineMath latex={item.symbol} />
                      </span>
                      <span className="origin-val">
                        {item.value.startsWith('=') ? item.value : `= ${item.value}`}
                      </span>
                    </div>
                    <span className="origin-desc">{item.origin}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kết quả đầu ra */}
          <div className="trace-output-bar">
            <div className="output-label">
              <CheckCircle2 size={16} className="text-emerald" />
              <span>Giá trị kết quả đầu ra</span>
            </div>
            <div className="output-value-container">
              <ArrowRight size={16} className="text-muted" />
              <span className="output-number">{trace.value.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
