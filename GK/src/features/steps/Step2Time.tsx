import React from 'react';
import { Dataset, Step2Output, SelectedTraceState, AppMode } from '../../domain/types';
import { MatrixTable, MatrixCell } from '../../components/MatrixTable';
import { StepSummary } from '../../components/StepSummary';
import { GuidedStepLayout } from '../../components/GuidedStepLayout';
import { FormulaCard } from '../../components/FormulaCard';
import { InlineMath } from '../../components/InlineMath';
import { Play } from 'lucide-react';
import { toMathId, cleanEntityName } from '../../domain/notationRegistry';

interface Step2TimeProps {
  dataset: Dataset;
  output?: Step2Output;
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

export const Step2Time: React.FC<Step2TimeProps> = ({
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

  const rowHeaders = dataset.users.map((u) => ({
    key: u.id,
    label: (
      <span>
        {cleanEntityName(u.name)}{' '}
        <span className="text-xs text-muted font-mono">(<InlineMath latex={toMathId(u.id)} />)</span>
      </span>
    ),
    badge: currentGroup?.memberUserIds.includes(u.id) ? 'Thành viên' : undefined
  }));

  const colHeaders = [
    { key: 'T1', label: <span><InlineMath latex="T_1" />: Buổi sáng</span>, badge: '07-12h' },
    { key: 'T2', label: <span><InlineMath latex="T_2" />: Buổi chiều</span>, badge: '13-18h' },
    { key: 'T3', label: <span><InlineMath latex="T_3" />: Buổi tối</span>, badge: '19-24h' },
    { key: 'T4', label: <span><InlineMath latex="T_4" />: Ban đêm</span>, badge: '01-06h' },
    { key: 'T5', label: <span><InlineMath latex="T_5" />: Cuối tuần</span>, badge: 'Tỷ lệ' }
  ];

  const cells: Record<string, Record<string, MatrixCell>> = {};
  if (output) {
    for (const u of dataset.users) {
      cells[u.id] = {};
      const uTime = output.timePreferences[u.id];
      for (const col of ['T1', 'T2', 'T3', 'T4', 'T5'] as const) {
        const trace = uTime?.traces[col];
        cells[u.id][col] = {
          rowKey: u.id,
          colKey: col,
          value: trace?.value ?? 0,
          formatted: (trace?.value ?? 0).toFixed(4),
          trace
        };
      }
    }
  }

  const selectedCellCoords = selectedEntityId
    ? {
        rowKey: selectedEntityId.split('_')[0],
        colKey: selectedEntityId.split('_')[1]
      }
    : null;

  const mainTableContent = output ? (
    <MatrixTable
      title={
        <>
          Ma trận thói quen thời gian của người dùng <InlineMath latex="M_u^T" /> (Công thức 4 &amp; 5)
        </>
      }
      subtitle={
        <>
          Tỷ lệ lượt check-in theo 4 khung giờ trong ngày <InlineMath latex="T_1 \dots T_4" /> và tỷ lệ ghé thăm vào cuối tuần <InlineMath latex="T_5" />. Rê chuột hoặc nhấp vào ô để xem chi tiết phép tính.
        </>
      }
      rowHeaders={rowHeaders}
      colHeaders={colHeaders}
      cells={cells}
      selectedCell={selectedCellCoords}
      onHoverCell={(cell, e) => {
        if (cell.trace) {
          const u = dataset.users.find((x) => x.id === cell.rowKey);
          (onHoverTrace || onSelectTrace)({
            stepId: 2,
            entityId: `${cell.rowKey}_${cell.colKey}`,
            trace: cell.trace,
            label: `${u?.name} - Khung giờ ${cell.colKey}`,
            position: e ? { x: e.clientX, y: e.clientY } : undefined
          });
        }
      }}
      onSelectCell={(cell) => {
        if (cell.trace) {
          const u = dataset.users.find((x) => x.id === cell.rowKey);
          onSelectTrace({
            stepId: 2,
            entityId: `${cell.rowKey}_${cell.colKey}`,
            trace: cell.trace,
            label: `${u?.name} - Khung giờ ${cell.colKey}`
          });
        }
      }}
      onLeaveCell={onLeaveTrace}
    />
  ) : (
    <div className="placeholder-step-box">
      <p>Bước 2 cần kết quả của Bước 1.</p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!canRun}
        onClick={onRunStep}
      >
        <Play size={16} fill="currentColor" />
        <span>Chạy Bước 2</span>
      </button>
    </div>
  );

  if (appMode === 'guided') {
    return (
      <GuidedStepLayout
        stepId={2}
        stepName="Độ ưa thích thời gian của người dùng (Time Preference)"
        whyText={
          <span>
            Khám phá nhịp sinh hoạt theo thời gian <InlineMath latex="M_u^T" /> (Sáng, Chiều, Tối, Đêm và Ngày thường/Cuối tuần), sau đó ghép nối với <InlineMath latex="M_u^C" /> để tạo vectơ người dùng hoàn chỉnh <InlineMath latex="M_u" />.
          </span>
        }
        inputs={[
          { label: 'Check-in Train', value: `${dataset.checkIns.length} lượt` },
          { label: 'Khung giờ phân tích', value: <span>4 ca (<InlineMath latex="T_1 \dots T_4" />) + Cuối tuần (<InlineMath latex="T_5" />)</span> },
          { label: 'Đặc trưng thể loại', value: <span><InlineMath latex="M_u^C" /> từ Bước 1</span> }
        ]}
        deepDiveContent={<FormulaCard stepId={2} />}
        conclusion={
          output ? (
            <span>
              Đã tạo thành công vectơ người dùng <InlineMath latex="M_u = (M_u^C, M_u^T)" /> gồm {output.userVectors[dataset.users[0]?.id]?.combinedMu.length || 0} chiều cho toàn bộ {dataset.users.length} người dùng.
            </span>
          ) : undefined
        }
        isCompleted={!!output}
        canRun={canRun}
        onRunStep={onRunStep}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        prevStepName="Bước 1: Sở thích thể loại"
        nextStepName="Bước 3: Mô hình nhóm"
      >
        {mainTableContent}
      </GuidedStepLayout>
    );
  }

  return (
    <div className="step-feature-container">
      <StepSummary
        purpose={
          <span>
            Phân tích thói quen thời gian ghé thăm thành 4 khung giờ trong ngày (<InlineMath latex="T_1 \dots T_4" />) và tỷ lệ cuối tuần (<InlineMath latex="T_5" />), sau đó ghép nối với <InlineMath latex="M_u^C" /> để tạo vectơ đặc trưng tổng hợp <InlineMath latex="M_u = (M_u^C, M_u^T)" /> (Công thức 4, 5 &amp; 6).
          </span>
        }
        conclusion={
          output ? (
            <span>
              Đã tạo thành công vectơ người dùng <InlineMath latex="M_u" /> gồm {output.userVectors[dataset.users[0]?.id]?.combinedMu.length || 0} đặc trưng cho từng người dùng.
            </span>
          ) : undefined
        }
        isCompleted={!!output}
      />
      {mainTableContent}
    </div>
  );
};
