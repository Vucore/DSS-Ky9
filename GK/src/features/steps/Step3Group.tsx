import React from 'react';
import { Dataset, Step3Output, SelectedTraceState, AppMode } from '../../domain/types';
import { ResultTable, ResultRow } from '../../components/ResultTable';
import { StepSummary } from '../../components/StepSummary';
import { GuidedStepLayout } from '../../components/GuidedStepLayout';
import { FormulaCard } from '../../components/FormulaCard';
import { InlineMath } from '../../components/InlineMath';
import { Play } from 'lucide-react';
import { toMathId, toMathSet, cleanEntityName } from '../../domain/notationRegistry';

interface Step3GroupProps {
  dataset: Dataset;
  output?: Step3Output;
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

export const Step3Group: React.FC<Step3GroupProps> = ({
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
  const currentGroup = dataset.groups.find((g) => g.id === dataset.selectedGroupId) || dataset.groups[0];

  const affRows: ResultRow[] = output
    ? currentGroup.memberUserIds.map((memId) => {
        const aff = output.memberAffinities[memId];
        const u = dataset.users.find((x) => x.id === memId);
        return {
          key: memId,
          label: (
            <span>
              {cleanEntityName(u?.name || memId)}{' '}
              <span className="text-xs text-muted font-mono">(<InlineMath latex={toMathId(memId)} />)</span>
            </span>
          ),
          sublabel: <span>Mã: <InlineMath latex={toMathId(memId)} /></span>,
          badge: { text: <InlineMath latex={`\\eta_{${toMathId(memId)}}^g = ${aff?.affinity.toFixed(4)}`} />, variant: 'emerald' },
          values: [
            { columnKey: 'Lu', display: aff?.Lu && aff.Lu.length > 0 ? <InlineMath latex={toMathSet(aff.Lu)} /> : '—' },
            { columnKey: 'Lug', display: aff?.Lu_g && aff.Lu_g.length > 0 ? <InlineMath latex={toMathSet(aff.Lu_g)} /> : '—' },
            { columnKey: 'intersect', display: aff?.intersection && aff.intersection.length > 0 ? <InlineMath latex={toMathSet(aff.intersection)} /> : <InlineMath latex="\\emptyset" /> },
            {
              columnKey: 'eta',
              display: (
                <span className="badge badge-emerald font-semibold">
                  {aff?.affinity.toFixed(4)}
                </span>
              ),
              trace: aff?.trace
            }
          ],
          trace: aff?.trace
        };
      })
    : [];

  const mainContent = output ? (
    <>
      <ResultTable
        title={
          <>
            Hệ số gắn kết thành viên trong nhóm <InlineMath latex="\eta_u^g" /> (Công thức 7)
          </>
        }
        subtitle="Tỷ lệ địa điểm thành viên đã ghé thăm từng được các thành viên khác trong nhóm ghé thăm. Rê chuột hoặc nhấp hàng để mở chi tiết."
        columns={[
          { key: 'Lu', label: <span>Địa điểm đã ghé (<InlineMath latex="L_u" />)</span> },
          { key: 'Lug', label: <span>Địa điểm thành viên khác (<InlineMath latex="L_{u, g}" />)</span> },
          { key: 'intersect', label: 'Giao thoa trùng lặp' },
          { key: 'eta', label: <span>Hệ số gắn kết <InlineMath latex="\eta_u^g" /></span>, align: 'right' }
        ]}
        rows={affRows}
        selectedKey={selectedEntityId}
        onHoverTrace={(tr, lbl, e) =>
          (onHoverTrace || onSelectTrace)({
            stepId: 3,
            entityId: affRows.find((r) => r.trace === tr)?.key || 'eta',
            trace: tr,
            label: lbl,
            position: e ? { x: e.clientX, y: e.clientY } : undefined
          })
        }
        onSelectTrace={(tr, lbl) =>
          onSelectTrace({
            stepId: 3,
            entityId: affRows.find((r) => r.trace === tr)?.key || 'eta',
            trace: tr,
            label: lbl
          })
        }
        onLeaveTrace={onLeaveTrace}
      />

      <div className="card" style={{ marginTop: '16px' }} onMouseLeave={onLeaveTrace}>
        <h4 className="card-title">
          Vectơ đặc trưng tổng hợp của nhóm <InlineMath latex="M_g" /> (Công thức 8 &amp; 9)
        </h4>
        <div className="feature-vector-grid" onMouseLeave={onLeaveTrace}>
          {output.groupVectorMg.features.map((featVal, idx) => {
            const fName = output.groupVectorMg.featureNames[idx] || `Đặc trưng ${idx + 1}`;
            const tr = output.groupVectorMg.traces[idx];
            return (
              <div
                key={idx}
                className={`feature-pill-card ${selectedEntityId === `mg_${idx}` ? 'cell-selected' : ''}`}
                onMouseEnter={(e) =>
                  (onHoverTrace || onSelectTrace)({
                    stepId: 3,
                    entityId: `mg_${idx}`,
                    trace: tr,
                    label: `Đặc trưng nhóm: ${fName}`,
                    position: e ? { x: e.clientX, y: e.clientY } : undefined
                  })
                }
                onMouseMove={(e) =>
                  (onHoverTrace || onSelectTrace)({
                    stepId: 3,
                    entityId: `mg_${idx}`,
                    trace: tr,
                    label: `Đặc trưng nhóm: ${fName}`,
                    position: e ? { x: e.clientX, y: e.clientY } : undefined
                  })
                }
                onMouseLeave={onLeaveTrace}
                onClick={() =>
                  onSelectTrace({
                    stepId: 3,
                    entityId: `mg_${idx}`,
                    trace: tr,
                    label: `Đặc trưng nhóm: ${fName}`
                  })
                }
                title="Rê chuột xem card nổi · Nhấp để mở thanh bên phải"
                style={{ cursor: 'pointer' }}
              >
                <div className="feature-name">{fName}</div>
                <div className="feature-value">{featVal.toFixed(4)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Khối tóm tắt kết quả đầu ra nổi bật của Bước 3 */}
      <div className="step-output-highlight-card">
        <div className="step-output-header">
          <div className="step-output-title-group">
            <h4 className="step-output-title">🎯 Kết quả đầu ra của Bước 3 (Output):</h4>
          </div>
          <span className="step-output-badge-target">Chuyển tiếp sang Bước 4</span>
        </div>

        <div className="step-output-grid">
          <div className="step-output-card">
            <div className="step-output-card-label">
              <span>Hệ số gắn kết thành viên (<InlineMath latex="\eta_u^g" />):</span>
            </div>
            <div className="step-output-card-val">
              {currentGroup.memberUserIds.map((uid) => (
                <span key={uid} style={{ marginRight: '8px' }}>
                  <InlineMath latex={`\\eta_{${toMathId(uid)}}^g = ${(output.memberAffinities[uid]?.affinity ?? 1).toFixed(2)}`} />
                </span>
              ))}
            </div>
            <div className="step-output-card-meaning">
              Mức độ gắn bó của từng thành viên với nhóm theo độ trùng lặp địa điểm ghé thăm (Công thức 7). Trọng số chuẩn hóa mỗi người là {(1 / currentGroup.memberUserIds.length).toFixed(3)}.
            </div>
          </div>

          <div className="step-output-card">
            <div className="step-output-card-label">
              <span>Vectơ đại diện nhóm (<InlineMath latex="M_g \in \mathbb{R}^{11}" />):</span>
            </div>
            <div className="step-output-card-val">
              [{output.groupVectorMg.features.map((v) => v.toFixed(2)).join(', ')}]
            </div>
            <div className="step-output-card-meaning">
              Vectơ sở thích tổng hợp đại diện cho nhóm ảo g, bao gồm 6 chiều danh mục thể loại và 5 chiều thói quen thời gian (Công thức 8 &amp; 9).
            </div>
          </div>
        </div>

        <div className="step-output-forwarding">
          <span>➡️ <strong>Đích đến tiếp theo:</strong> Toàn bộ vectơ <InlineMath latex="M_g" /> được chuyển tiếp sang <strong>Bước 4</strong> làm tâm chuẩn đối sánh Cosine để tìm tập người dùng tương đồng <InlineMath latex="K_g" />.</span>
        </div>
      </div>
    </>
  ) : (
    <div className="placeholder-step-box">
      <p>Bước 3 cần kết quả của Bước 2.</p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!canRun}
        onClick={onRunStep}
      >
        <Play size={16} fill="currentColor" />
        <span>Chạy Bước 3</span>
      </button>
    </div>
  );

  if (appMode === 'guided') {
    return (
      <GuidedStepLayout
        stepId={3}
        stepName="Mô hình sở thích của nhóm (Group Preference Model)"
        whyText={
          <span>
            Tính toán mức độ ảnh hưởng / hệ số gắn kết <InlineMath latex="\eta_u^g" /> của từng thành viên dựa trên lịch sử check-in chung, sau đó tổng hợp có trọng số thành vectơ sở thích nhóm <InlineMath latex="M_g" />.
          </span>
        }
        inputs={[
          { label: 'Thành viên nhóm', value: <InlineMath latex={`g = ${toMathSet(currentGroup?.memberUserIds || [])}`} /> },
          { label: <span>Kế thừa từ Bước 2 (<InlineMath latex="M_u" />)</span>, value: `3 vectơ cá nhân 11 chiều (6C + 5T)` },
          { label: <span>Kế thừa từ Bước 0 (<InlineMath latex="L_u" />)</span>, value: `Lịch sử check-in địa điểm thành viên` }
        ]}
        deepDiveContent={<FormulaCard stepId={3} />}
        conclusion={
          output ? (
            <span>
              Đã xác định trọng số gắn kết cho {currentGroup?.memberUserIds.length} thành viên và tổng hợp vectơ nhóm đại diện <InlineMath latex="M_g" />.
            </span>
          ) : undefined
        }
        isCompleted={!!output}
        canRun={canRun}
        onRunStep={onRunStep}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        prevStepName="Bước 2: Sở thích thời gian"
        nextStepName="Bước 4: Tương đồng nhóm - người dùng"
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
            Tính toán hệ số gắn kết / mức độ ảnh hưởng của từng thành viên <InlineMath latex="\eta_u^g" /> dựa trên độ trùng lặp địa điểm đã ghé trong tập Train, sau đó tổng hợp có trọng số thành vectơ nhóm <InlineMath latex="M_g" /> (Công thức 7, 8 &amp; 9).
          </span>
        }
        conclusion={
          output ? (
            <span>
              Đã xác định trọng số gắn kết cho {currentGroup?.memberUserIds.length} thành viên và tổng hợp vectơ nhóm đại diện <InlineMath latex="M_g" />.
            </span>
          ) : undefined
        }
        isCompleted={!!output}
      />
      {mainContent}
    </div>
  );
};
