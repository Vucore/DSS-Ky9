import React from 'react';
import { Dataset, Step5Output, SelectedTraceState, AppMode } from '../../domain/types';
import { ResultTable, ResultRow } from '../../components/ResultTable';
import { StepSummary } from '../../components/StepSummary';
import { GuidedStepLayout } from '../../components/GuidedStepLayout';
import { FormulaCard } from '../../components/FormulaCard';
import { InlineMath } from '../../components/InlineMath';
import { Play } from 'lucide-react';
import { toMathId, toMathSet, cleanEntityName } from '../../domain/notationRegistry';

interface Step5CFProps {
  dataset: Dataset;
  output?: Step5Output;
  canRun: boolean;
  appMode?: AppMode;
  onRunStep: () => void;
  onSelectTrace: (traceState: SelectedTraceState) => void;
  onHoverTrace?: (traceState: SelectedTraceState) => void;
  onLeaveTrace?: () => void;
  selectedEntityId?: string;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const Step5CF: React.FC<Step5CFProps> = ({
  dataset,
  output,
  canRun,
  appMode = 'guided',
  onRunStep,
  onSelectTrace,
  onHoverTrace,
  onLeaveTrace,
  selectedEntityId,
  onNextStep,
  onPrevStep
}) => {
  const rows: ResultRow[] = output
    ? dataset.pois.map((poi) => {
        const cf = output.cfScores[poi.id];
        const activeContributors = cf.contributingUsers.filter((u) => u.hasVisited);

        return {
          key: poi.id,
          label: (
            <span>
              {cleanEntityName(poi.name)}{' '}
              <span className="text-xs text-muted font-mono">(<InlineMath latex={toMathId(poi.id)} />)</span>
            </span>
          ),
          sublabel: <span>Thể loại: <InlineMath latex={toMathSet(poi.categories)} /></span>,
          values: [
            { columnKey: 'num', display: <code>{cf.numerator.toFixed(4)}</code> },
            { columnKey: 'denom', display: <code>{cf.denominator.toFixed(4)}</code> },
            {
              columnKey: 'score',
              display: (
                <span className="badge badge-emerald font-bold">
                  {cf.score.toFixed(4)}
                </span>
              ),
              trace: cf.trace
            },
            {
              columnKey: 'contributors',
              display: (
                <span className="text-xs text-muted">
                  {activeContributors.length > 0 ? (
                    activeContributors.map((c, idx) => (
                      <span key={c.userId} style={{ marginRight: '6px' }}>
                        <InlineMath latex={toMathId(c.userId)} /> ({c.sim.toFixed(2)}){idx < activeContributors.length - 1 ? ',' : ''}
                      </span>
                    ))
                  ) : (
                    'Chưa có láng giềng nào ghé'
                  )}
                </span>
              )
            }
          ],
          trace: cf.trace
        };
      })
    : [];

  const mainContent = output ? (
    <>
      <ResultTable
        title={<>Điểm số lọc cộng tác cho từng địa điểm POI <InlineMath latex="f_{g, l}" /> (Công thức 14)</>}
        subtitle="Rê chuột hoặc nhấp vào bất kỳ điểm số nào để kiểm tra chi tiết công thức tử số / mẫu số."
        columns={[
          { key: 'num', label: <>Tử số: <InlineMath latex="\sum (\operatorname{sim}_{g, v} \cdot r_{v, l})" /></>, align: 'right' },
          { key: 'denom', label: <>Mẫu số: <InlineMath latex="\sum \operatorname{sim}_{g, v}" /></>, align: 'right' },
          { key: 'score', label: <>Điểm CF <InlineMath latex="f_{g, l}" /></>, align: 'right' },
          { key: 'contributors', label: <>Láng giềng đóng góp (<InlineMath latex="r_{v, l} = 1" />)</> }
        ]}
        rows={rows}
        selectedKey={selectedEntityId}
        onHoverTrace={(tr, lbl, e) =>
          (onHoverTrace || onSelectTrace)({
            stepId: 5,
            entityId: rows.find((r) => r.trace === tr)?.key || 'cf',
            trace: tr,
            label: lbl,
            position: e ? { x: e.clientX, y: e.clientY } : undefined
          })
        }
        onSelectTrace={(tr, lbl) =>
          onSelectTrace({
            stepId: 5,
            entityId: rows.find((r) => r.trace === tr)?.key || 'cf',
            trace: tr,
            label: lbl
          })
        }
        onLeaveTrace={onLeaveTrace}
      />

      {/* Khối tóm tắt kết quả đầu ra nổi bật của Bước 5 */}
      <div className="step-output-highlight-card">
        <div className="step-output-header">
          <div className="step-output-title-group">
            <h4 className="step-output-title">🎯 Kết quả đầu ra của Bước 5 (Output):</h4>
          </div>
          <span className="step-output-badge-target">Chuyển tiếp sang Bước 7</span>
        </div>

        <div className="step-output-grid">
          <div className="step-output-card" style={{ gridColumn: '1 / -1' }}>
            <div className="step-output-card-label">
              <span>Vectơ điểm Lọc cộng tác (<InlineMath latex="\mathbf{f}_g \in \mathbb{R}^6" />):</span>
            </div>
            <div className="step-output-card-val text-primary">
              <InlineMath
                latex={`\\mathbf{f}_g = [${dataset.pois.map((p) => (output.cfScores[p.id]?.score ?? 0).toFixed(3)).join(', ')}]^T`}
              />
            </div>
            <div className="step-output-card-meaning">
              Điểm dự đoán mức độ quan tâm của nhóm đối với 6 địa điểm: {dataset.pois.map((p) => `${cleanEntityName(p.name)} (${output.cfScores[p.id]?.score.toFixed(3)})`).join(', ')}.
            </div>
          </div>
        </div>

        <div className="step-output-forwarding">
          <span>➡️ <strong>Đích đến tiếp theo:</strong> Vectơ điểm <InlineMath latex="\mathbf{f}_g" /> được chuyển tiếp sang <strong>Bước 7</strong> làm thành phần ưa thích tích cực trong mô hình Pareto (<InlineMath latex="\alpha \cdot f_{g, l}" />).</span>
        </div>
      </div>
    </>
  ) : (
    <div className="placeholder-step-box">
      <p>Bước 5 cần kết quả của Bước 4.</p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!canRun}
        onClick={onRunStep}
      >
        <Play size={16} fill="currentColor" />
        <span>Chạy Bước 5</span>
      </button>
    </div>
  );

  if (appMode === 'guided') {
    return (
      <GuidedStepLayout
        stepId={5}
        stepName="Lọc cộng tác cho nhóm (Collaborative Filtering)"
        whyText={
          <span>
            Dự đoán điểm ưa thích của nhóm <InlineMath latex="f_{g, l}" /> cho từng địa điểm ứng viên bằng cách tổng hợp có trọng số hành vi check-in của các người dùng tương đồng vượt ngưỡng <InlineMath latex="\theta" />.
          </span>
        }
        inputs={[
          { label: <span>Kế thừa từ Bước 4 (<InlineMath latex="K_g" />)</span>, value: `Tập láng giềng & mẫu số tổng trọng số sim` },
          { label: <span>Kế thừa từ Bước 0 (<InlineMath latex="r_{v, l}" />)</span>, value: `Lịch sử check-in nhị phân trên ${dataset.pois.length} POI` },
          { label: 'Tập người dùng tham gia', value: <span>Toàn bộ <InlineMath latex="v \in U" /></span> }
        ]}
        deepDiveContent={<FormulaCard stepId={5} />}
        conclusion={
          output ? (
            <span>
              Đã tính toán xong điểm đồng thuận <InlineMath latex="f_{g, l}" /> cho toàn bộ {dataset.pois.length} POI theo đúng Công thức (14) của bài báo.
            </span>
          ) : undefined
        }
        isCompleted={!!output}
        canRun={canRun}
        onRunStep={onRunStep}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        prevStepName="Bước 4: Tương đồng nhóm"
        nextStepName="Bước 6: Độ bất đồng nội bộ"
      >
        {mainContent}
      </GuidedStepLayout>
    );
  }

  return (
    <div className="step-feature-container">
      <StepSummary
        purpose={
          <span>
            Dự đoán điểm ưa thích lọc cộng tác của nhóm <InlineMath latex="f_{g, l}" /> cho từng địa điểm bằng cách tổng hợp trọng số check-in của các người dùng tương đồng đã vượt qua ngưỡng <InlineMath latex="\theta" /> (Công thức 14).
          </span>
        }
        conclusion={
          output ? (
            <span>
              Đã tính toán xong điểm đồng thuận <InlineMath latex="f_{g, l}" /> cho toàn bộ {dataset.pois.length} POI theo đúng Công thức (14).
            </span>
          ) : undefined
        }
        isCompleted={!!output}
      />
      {mainContent}
    </div>
  );
};
