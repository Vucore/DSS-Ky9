import React from 'react';
import { Dataset, Step4Output, SelectedTraceState, SimMode, AppMode } from '../../domain/types';
import { ResultTable, ResultRow } from '../../components/ResultTable';
import { StepSummary } from '../../components/StepSummary';
import { GuidedStepLayout } from '../../components/GuidedStepLayout';
import { FormulaCard } from '../../components/FormulaCard';
import { InlineMath } from '../../components/InlineMath';
import { Play, Sliders, CheckCircle, XCircle } from 'lucide-react';
import { toMathId, toMathSet, cleanEntityName } from '../../domain/notationRegistry';

interface Step4SimilarityProps {
  dataset: Dataset;
  output?: Step4Output;
  canRun: boolean;
  appMode?: AppMode;
  onRunStep: () => void;
  onSelectTrace: (traceState: SelectedTraceState) => void;
  onHoverTrace?: (traceState: SelectedTraceState) => void;
  onLeaveTrace?: () => void;
  selectedEntityId?: string;
  onUpdateSimMode?: (mode: SimMode, suggestedTheta?: number) => void;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const Step4Similarity: React.FC<Step4SimilarityProps> = ({
  dataset,
  output,
  canRun,
  appMode = 'guided',
  onRunStep,
  onSelectTrace,
  onHoverTrace,
  onLeaveTrace,
  selectedEntityId,
  onUpdateSimMode,
  onNextStep,
  onPrevStep
}) => {
  const { hyperparameters, users, groups, selectedGroupId } = dataset;
  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const passedUsers = output ? output.candidateUserIds.length : 0;

  const rows: ResultRow[] = output
    ? dataset.users.map((u) => {
        const simData = output.similarities[u.id];
        const isMember = currentGroup?.memberUserIds.includes(u.id);

        return {
          key: u.id,
          label: (
            <span>
              <InlineMath latex={`v = ${toMathId(u.id)}`} />:{' '}
              {cleanEntityName(u.name)}
            </span>
          ),
          sublabel: isMember ? 'Thành viên nhóm g (v ∈ g)' : 'Người dùng ngoài nhóm g (v ∉ g)',
          badge: simData.passedThreshold
            ? { text: <span>ĐẠT NGƯỠNG (<InlineMath latex="\ge \theta" />)</span>, variant: 'emerald' }
            : { text: <span>BỊ LOẠI (<InlineMath latex="< \theta" />)</span>, variant: 'rose' },
          values: [
            {
              columnKey: 'simM',
              display: <code>{simData.simM.value.toFixed(4)}</code>,
              trace: simData.simM
            },
            {
              columnKey: 'simU',
              display: <code>{simData.simU.value.toFixed(4)}</code>,
              trace: simData.simU
            },
            {
              columnKey: 'combined',
              display: <strong>{simData.combinedSim.value.toFixed(4)}</strong>,
              trace: simData.combinedSim
            },
            {
              columnKey: 'thresholded',
              display: (
                <span
                  className={`badge badge-${simData.passedThreshold ? 'emerald' : 'muted'}`}
                >
                  {simData.passedThreshold ? (
                    <>
                      <CheckCircle size={12} style={{ marginRight: '4px' }} />
                      {simData.finalSim.toFixed(4)}
                    </>
                  ) : (
                    <>
                      <XCircle size={12} style={{ marginRight: '4px' }} />
                      0.0000
                    </>
                  )}
                </span>
              ),
              trace: simData.thresholdTrace
            }
          ],
          trace: simData.combinedSim
        };
      })
    : [];

  const mainContent = output ? (
    <>
      {/* Card Quy ước toán học đang dùng cho Công thức (12) */}
      <div className="card convention-card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <div className="header-title-group">
            <Sliders size={18} className="text-accent" />
            <h4 className="card-title">Quy ước công thức kết hợp tương đồng (Công thức 12)</h4>
          </div>
          <span className="badge badge-indigo">Tùy chọn học thuật</span>
        </div>

        <div className="card-grid-2">
          <div
            className={`convention-option-box ${hyperparameters.simMode === 'paper_sum' ? 'convention-active' : ''}`}
            onClick={() => onUpdateSimMode && onUpdateSimMode('paper_sum')}
            style={{ cursor: 'pointer' }}
          >
            <div className="convention-radio-row">
              <input
                type="radio"
                checked={hyperparameters.simMode === 'paper_sum'}
                onChange={() => onUpdateSimMode && onUpdateSimMode('paper_sum')}
              />
              <strong>Bám sát công thức in trong bài báo (Tổng)</strong>
            </div>
            <div className="convention-formula">
              <InlineMath latex="\operatorname{sim}_{g, v} = \operatorname{sim}^m_{g, v} + \operatorname{sim}^u_{g, v} \in [0, 2]" />
            </div>
            <p className="text-xs text-muted">
              Cộng trực tiếp 2 giá trị cosine. Miền giá trị từ 0 đến 2. Ngưỡng <InlineMath latex="\theta" /> tương ứng thường đặt từ 0.6 đến 1.2.
            </p>
          </div>

          <div
            className={`convention-option-box ${hyperparameters.simMode === 'normalized_avg' ? 'convention-active' : ''}`}
            onClick={() => onUpdateSimMode && onUpdateSimMode('normalized_avg')}
            style={{ cursor: 'pointer' }}
          >
            <div className="convention-radio-row">
              <input
                type="radio"
                checked={hyperparameters.simMode === 'normalized_avg'}
                onChange={() => onUpdateSimMode && onUpdateSimMode('normalized_avg')}
              />
              <strong>Chuẩn hóa trung bình </strong>
            </div>
            <div className="convention-formula">
              <InlineMath latex="\operatorname{sim}_{g, v} = \frac{\operatorname{sim}^m_{g, v} + \operatorname{sim}^u_{g, v}}{2} \in [0, 1]" />
            </div>
            <p className="text-xs text-muted">
              Chuẩn hóa tổng về miền [0, 1] theo câu mô tả &ldquo;we normalize the sum of the two&rdquo;. Ngưỡng <InlineMath latex="\theta" /> tương ứng thường đặt từ 0.3 đến 0.6.
            </p>
          </div>
        </div>
      </div>

      <ResultTable
        title={<>Bảng độ tương đồng giữa nhóm g và từng người dùng ứng viên <InlineMath latex="v \in U" /> (Công thức 10–13)</>}
        subtitle={<>Biến số toán học <InlineMath latex="v" /> đại diện cho từng người dùng trong hệ thống (gồm cả thành viên và người ngoài). Ngưỡng <InlineMath latex={`\\theta = ${hyperparameters.theta}`} /> | Rê chuột xem biểu thức thay số</>}
        columns={[
          { key: 'simM', label: <>Cosine đặc trưng <InlineMath latex="\operatorname{sim}^m_{g, v}" /> (CT 10)</>, align: 'right' },
          { key: 'simU', label: <>Cosine check-in <InlineMath latex="\operatorname{sim}^u_{g, v}" /> (CT 11)</>, align: 'right' },
          { key: 'combined', label: <>Tương đồng kết hợp <InlineMath latex="\operatorname{sim}_{g, v}" /> (CT 12)</>, align: 'right' },
          { key: 'thresholded', label: <>Sau lọc ngưỡng <InlineMath latex="\ge \theta" /> (CT 13)</>, align: 'right' }
        ]}
        rows={rows}
        selectedKey={selectedEntityId}
        onHoverTrace={(tr, lbl, e) =>
          (onHoverTrace || onSelectTrace)({
            stepId: 4,
            entityId: rows.find((r) => r.trace === tr)?.key || 'sim',
            trace: tr,
            label: lbl,
            position: e ? { x: e.clientX, y: e.clientY } : undefined
          })
        }
        onSelectTrace={(tr, lbl) =>
          onSelectTrace({
            stepId: 4,
            entityId: rows.find((r) => r.trace === tr)?.key || 'sim',
            trace: tr,
            label: lbl
          })
        }
        onLeaveTrace={onLeaveTrace}
      />

      {/* Khối tóm tắt kết quả đầu ra nổi bật của Bước 4 */}
      <div className="step-output-highlight-card">
        <div className="step-output-header">
          <div className="step-output-title-group">
            <h4 className="step-output-title">🎯 Kết quả đầu ra của Bước 4 (Output):</h4>
          </div>
          <span className="step-output-badge-target">Chuyển tiếp sang Bước 5</span>
        </div>

        <div className="step-output-grid">
          <div className="step-output-card">
            <div className="step-output-card-label">
              <span>Tập láng giềng đạt chuẩn (<InlineMath latex="K_g" />):</span>
            </div>
            <div className="step-output-card-val text-emerald">
              <InlineMath latex={`K_g = ${toMathSet(output.candidateUserIds)}`} />
            </div>
            <div className="step-output-card-meaning">
              Có {output.candidateUserIds.length}/{dataset.users.length} người dùng đạt điều kiện <InlineMath latex={`\\operatorname{sim}_{g, v} \\ge ${hyperparameters.theta}`} /> được chọn vào tập cố vấn tin cậy cho nhóm.
            </div>
          </div>

          <div className="step-output-card">
            <div className="step-output-card-label">
              <span>Tổng trọng số láng giềng (<InlineMath latex="\sum_{v \in K_g} \operatorname{sim}_{g, v}" />):</span>
            </div>
            <div className="step-output-card-val text-primary">
              {Object.values(output.similarities)
                .reduce((sum, o) => sum + (o.passedThreshold ? o.finalSim : 0), 0)
                .toFixed(4)}
            </div>
            <div className="step-output-card-meaning">
              Mẫu số chuẩn hóa cho toàn bộ các phép tính điểm Lọc cộng tác ở Bước 5.
            </div>
          </div>
        </div>

        <div className="step-output-forwarding">
          <span>➡️ <strong>Đích đến tiếp theo:</strong> Tập hợp <InlineMath latex="K_g" /> cùng các điểm tương đồng <InlineMath latex="\operatorname{sim}_{g, v}" /> được chuyển sang <strong>Bước 5</strong> để tính điểm Lọc cộng tác <InlineMath latex="f_{g, l}" />.</span>
        </div>
      </div>
    </>
  ) : (
    <div className="placeholder-step-box">
      <p>Bước 4 cần kết quả của Bước 3.</p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!canRun}
        onClick={onRunStep}
      >
        <Play size={16} fill="currentColor" />
        <span>Chạy Bước 4</span>
      </button>
    </div>
  );

  if (appMode === 'guided') {
    return (
      <GuidedStepLayout
        stepId={4}
        stepName="Độ tương đồng Nhóm - Người dùng (Group-User Similarity)"
        whyText={
          <span>
            Tìm kiếm những người dùng bên ngoài nhóm có thói quen thời gian, thể loại và lịch sử check-in tương đồng vượt qua ngưỡng <InlineMath latex="\theta" /> để trở thành tập láng giềng đáng tin cậy cho Lọc cộng tác.
          </span>
        }
        inputs={[
          { label: <span>Kế thừa từ Bước 3 (<InlineMath latex="M_g" />)</span>, value: `Tâm nhóm 11 chiều & check-in nhóm Rg` },
          { label: <span>Kế thừa từ Bước 2 (<InlineMath latex="M_v" />)</span>, value: `${dataset.users.length} vectơ đặc trưng người dùng 11 chiều` },
          { label: <span>Ngưỡng tương đồng (<InlineMath latex="\theta" />)</span>, value: `${hyperparameters.theta} (từ Bước 0)` }
        ]}
        deepDiveContent={<FormulaCard stepId={4} />}
        conclusion={
          output ? (
            <span>
              Có {passedUsers}/{users.length} người dùng đạt ngưỡng <InlineMath latex={`\\operatorname{sim}_{g, v} \\ge ${hyperparameters.theta}`} /> và trở thành tập láng giềng tham gia bỏ phiếu tại Bước 5.
            </span>
          ) : undefined
        }
        isCompleted={!!output}
        canRun={canRun}
        onRunStep={onRunStep}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        prevStepName="Bước 3: Sở thích nhóm"
        nextStepName="Bước 5: Lọc cộng tác (CF)"
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
            Tính toán độ tương đồng giữa nhóm <InlineMath latex="g" /> và từng người dùng <InlineMath latex="v" /> bằng cách kết hợp cosine đặc trưng <InlineMath latex="\operatorname{sim}^m_{g, v}" /> và cosine check-in <InlineMath latex="\operatorname{sim}^u_{g, v}" />, sau đó lọc theo ngưỡng <InlineMath latex="\theta" /> (Công thức 10, 11, 12 &amp; 13).
          </span>
        }
        conclusion={
          output ? (
            <span>
              Có {passedUsers}/{users.length} người dùng đạt ngưỡng <InlineMath latex={`\\operatorname{sim}_{g, v} \\ge ${hyperparameters.theta}`} /> và trở thành tập láng giềng cho bước Lọc cộng tác tiếp theo.
            </span>
          ) : undefined
        }
        isCompleted={!!output}
      />
      {mainContent}
    </div>
  );
};
