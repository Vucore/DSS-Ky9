import React from 'react';
import { Dataset, Step7Output, SelectedTraceState, AppMode } from '../../domain/types';
import { RankingTable } from '../../components/RankingTable';
import { StepSummary } from '../../components/StepSummary';
import { GuidedStepLayout } from '../../components/GuidedStepLayout';
import { FormulaCard } from '../../components/FormulaCard';
import { InlineMath } from '../../components/InlineMath';
import { cleanEntityName, toMathId } from '../../domain/notationRegistry';
import { Play } from 'lucide-react';

interface Step7RankingProps {
  dataset: Dataset;
  output?: Step7Output;
  canRun: boolean;
  appMode?: AppMode;
  onRunStep: () => void;
  onSelectTrace: (traceState: SelectedTraceState) => void;
  onHoverTrace?: (traceState: SelectedTraceState) => void;
  onLeaveTrace?: () => void;
  selectedEntityId?: string;
  onPrevStep?: () => void;
  onNextStep?: () => void;
}

export const Step7Ranking: React.FC<Step7RankingProps> = ({
  dataset,
  output,
  canRun,
  appMode = 'guided',
  onRunStep,
  onSelectTrace,
  onHoverTrace,
  onLeaveTrace,
  selectedEntityId,
  onPrevStep,
  onNextStep
}) => {
  const { hyperparameters } = dataset;

  const rankingContent = output ? (
    <div className="step7-content-wrapper">
      {/* Bảng xếp hạng và Thẻ vinh danh Top-N (có kèm Accordion bảng chi tiết) */}
      <RankingTable
        output={output}
        alpha={hyperparameters.alpha}
        topN={hyperparameters.topN}
        selectedPoiId={selectedEntityId}
        defaultExpandTable={appMode === 'guided'}
        onHoverTrace={(tr, lbl, e) =>
          (onHoverTrace || onSelectTrace)({
            stepId: 7,
            entityId: output.rankings.find((r) => r.trace === tr)?.poiId || 'top',
            trace: tr,
            label: lbl,
            position: e ? { x: e.clientX, y: e.clientY } : undefined
          })
        }
        onSelectTrace={(tr, lbl) =>
          onSelectTrace({
            stepId: 7,
            entityId: output.rankings.find((r) => r.trace === tr)?.poiId || 'top',
            trace: tr,
            label: lbl
          })
        }
        onLeaveTrace={onLeaveTrace}
      />

      {/* Khối tóm tắt kết quả đầu ra nổi bật của Bước 7 */}
      <div className="step-output-highlight-card">
        <div className="step-output-header">
          <div className="step-output-title-group">
            <h4 className="step-output-title">🎯 Kết quả đầu ra của Bước 7 (Output Hoàn tất):</h4>
          </div>
          <span className="step-output-badge-target">Hoàn tất quy trình</span>
        </div>

        <div className="step-output-grid">
          <div className="step-output-card" style={{ gridColumn: '1 / -1' }}>
            <div className="step-output-card-label">
              <span>Vectơ điểm khuyến nghị Pareto cuối cùng (<InlineMath latex="\mathbf{f}'_g \in \mathbb{R}^6" />):</span>
            </div>
            <div className="step-output-card-val text-primary">
              <InlineMath
                latex={`\\mathbf{f}'_g = [${dataset.pois.map((p) => (output.rankings.find((r) => r.poiId === p.id)?.finalScore ?? 0).toFixed(3)).join(', ')}]^T`}
              />
            </div>
            <div className="step-output-card-meaning">
              Điểm tổng hợp cân bằng tối ưu giữa đồng thuận tập thể và triệt tiêu mâu thuẫn nội bộ (<InlineMath latex="f'_{g, l} = \alpha f_{g, l} - (1 - \alpha) d_{g, l}" />).
            </div>
          </div>

          {output.topN.map((r) => {
            const fullRanking = output.rankings.find((x) => x.poiId === r.poiId);
            return (
              <div key={r.poiId} className="step-output-card">
                <div className="step-output-card-label">
                  <span>Hạng #{r.rank} Đề xuất:</span>
                </div>
                <div className="step-output-card-val text-emerald">
                  <InlineMath latex={toMathId(r.poiId)} />: {cleanEntityName(r.poiName)}
                </div>
                <div className="step-output-card-meaning">
                  Điểm Pareto: <strong>{r.finalScore.toFixed(4)}</strong> (CF: {(fullRanking?.cfScore ?? 0).toFixed(3)}, Phạt: {(fullRanking?.divergence ?? 0).toFixed(3)})
                </div>
              </div>
            );
          })}
        </div>

        <div className="step-output-forwarding">
          <span>✓ <strong>Hoàn thành:</strong> Hệ thống đã hoàn tất quy trình ra quyết định nhóm CFID và xuất danh sách Top-{hyperparameters.topN} địa điểm được đề xuất tối ưu.</span>
        </div>
      </div>
    </div>
  ) : (
    <div className="placeholder-step-box">
      <p>Bước 7 cần kết quả của Bước 5 (Lọc cộng tác) và Bước 6 (Độ bất đồng).</p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!canRun}
        onClick={onRunStep}
      >
        <Play size={16} fill="currentColor" />
        <span>Chạy Bước 7 (Xếp hạng cuối cùng)</span>
      </button>
    </div>
  );

  if (appMode === 'guided') {
    return (
      <GuidedStepLayout
        stepId={7}
        stepName="Xếp hạng đề xuất Top-N cuối cùng (Final Recommendation)"
        whyText={
          <span>
            Cân bằng giữa điểm đồng thuận từ lọc cộng tác <InlineMath latex="f_{g, l}" /> và hình phạt độ bất đồng nội bộ nhóm <InlineMath latex="d_{g, l}" /> thông qua tham số <InlineMath latex="\alpha" />, tạo danh sách Top-{hyperparameters.topN} địa điểm phù hợp nhất cho cả nhóm (Công thức 17).
          </span>
        }
        inputs={[
          { label: <span>Kế thừa từ Bước 5 (<InlineMath latex="f_{g, l}" />)</span>, value: `Vectơ điểm CF 6 chiều (từ 0.000 đến 0.600)` },
          { label: <span>Kế thừa từ Bước 6 (<InlineMath latex="d_{g, l}" />)</span>, value: `Vectơ hình phạt mâu thuẫn 6 chiều` },
          { label: <span>Kế thừa từ Bước 0</span>, value: <InlineMath latex={`\\alpha = ${hyperparameters.alpha}, \\; 1-\\alpha = ${(1 - hyperparameters.alpha).toFixed(2)}, \\; Top\\text{-}N = ${hyperparameters.topN}`} /> }
        ]}
        deepDiveContent={<FormulaCard stepId={7} />}
        conclusion={
          output ? (
            <span>
              {`Đã xếp hạng tất cả ${output.rankings.length} địa điểm POI theo công thức CFID. Quán quân đề xuất: #${output.topN[0]?.rank} ${cleanEntityName(output.topN[0]?.poiName)} (Điểm: ${output.topN[0]?.finalScore.toFixed(4)}).`}
            </span>
          ) : undefined
        }
        isCompleted={!!output}
        canRun={canRun}
        onRunStep={onRunStep}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        prevStepName="Bước 6: Độ bất đồng"
        nextStepName="Quay về Bước 1"
      >
        {rankingContent}
      </GuidedStepLayout>
    );
  }

  return (
    <div className="step-feature-container">
      <StepSummary
        purpose={
          <span>
            Cân bằng giữa điểm đồng thuận từ lọc cộng tác <InlineMath latex="f_{g, l}" /> và hình phạt độ bất đồng nội bộ nhóm <InlineMath latex="d_{g, l}" /> thông qua tham số <InlineMath latex="\alpha = " /> {hyperparameters.alpha}, tính điểm khuyến nghị cuối cùng <InlineMath latex="f'_{g, l} = \alpha f_{g, l} - (1 - \alpha) d_{g, l}" /> và xếp hạng Top-{hyperparameters.topN} POI (Công thức 17).
          </span>
        }
        conclusion={
          output ? (
            <span>
              {`Đã xếp hạng tất cả ${output.rankings.length} địa điểm POI theo công thức CFID. Quán quân đề xuất: #${output.topN[0]?.rank} ${cleanEntityName(output.topN[0]?.poiName)} (Điểm: ${output.topN[0]?.finalScore.toFixed(4)}).`}
            </span>
          ) : undefined
        }
        isCompleted={!!output}
      />
      {rankingContent}
    </div>
  );
};
