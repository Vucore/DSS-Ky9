import React, { useMemo } from 'react';
import { CalculationTraceMeta } from '../domain/types';
import { MathView } from './MathView';
import { InlineMath } from './InlineMath';
import { getTraceNumberOrigins } from '../domain/traceExplainer';
import { Calculator, ArrowRight, CheckCircle2 } from 'lucide-react';

interface CalculationTraceProps {
  title?: string;
  trace: CalculationTraceMeta;
  targetLabel?: string;
}

export const CalculationTrace: React.FC<CalculationTraceProps> = ({
  title = 'Phép tính số học thay thế',
  trace,
  targetLabel
}) => {
  const origins = useMemo(() => getTraceNumberOrigins(trace), [trace]);

  return (
    <div className="card calculation-trace-card">
      <div className="card-header">
        <div className="header-title-group">
          <Calculator size={18} className="text-accent" />
          <h4 className="card-title">{title}</h4>
          {targetLabel && <span className="badge badge-indigo">{targetLabel}</span>}
        </div>
        <span className="badge badge-eq">{trace.formulaNumber}</span>
      </div>

      {trace.formulaLatex && (
        <div className="trace-formula-preview">
          <MathView latex={trace.formulaLatex} displayMode={true} />
        </div>
      )}

      {/* Biểu thức số học thay thế (KaTeX chuẩn hóa) */}
      <div className="trace-section">
        <div className="trace-section-label">Biểu thức số học thay thế</div>
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
                  <span className="origin-val">={item.value}</span>
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
  );
};
