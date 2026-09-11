import React from 'react';
import { Dataset, Step1Output, SelectedTraceState, AppMode } from '../../domain/types';
import { MatrixTable, MatrixCell } from '../../components/MatrixTable';
import { StepSummary } from '../../components/StepSummary';
import { GuidedStepLayout } from '../../components/GuidedStepLayout';
import { FormulaCard } from '../../components/FormulaCard';
import { InlineMath } from '../../components/InlineMath';
import { Play } from 'lucide-react';
import { toMathId, cleanEntityName } from '../../domain/notationRegistry';

interface Step1CategoryProps {
  dataset: Dataset;
  output?: Step1Output;
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

export const Step1Category: React.FC<Step1CategoryProps> = ({
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

  const colHeaders = dataset.categories.map((c) => ({
    key: c.id,
    label: cleanEntityName(c.name),
    badge: <InlineMath latex={toMathId(c.id)} />
  }));

  const cells: Record<string, Record<string, MatrixCell>> = {};
  if (output) {
    for (const u of dataset.users) {
      cells[u.id] = {};
      for (const c of dataset.categories) {
        const trace = output.preferences[u.id]?.[c.id];
        cells[u.id][c.id] = {
          rowKey: u.id,
          colKey: c.id,
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
          Ma trận độ ưa thích thể loại của người dùng <InlineMath latex="M_u^C" /> (Công thức 2 &amp; 3)
        </>
      }
      subtitle="Tính toán theo cơ chế TF-IDF từ lịch sử check-in Train. Rê chuột hoặc nhấp vào ô bất kỳ để mở bảng chi tiết phép tính."
      rowHeaders={rowHeaders}
      colHeaders={colHeaders}
      cells={cells}
      selectedCell={selectedCellCoords}
      onHoverCell={(cell, e) => {
        if (cell.trace) {
          const u = dataset.users.find((x) => x.id === cell.rowKey);
          const cat = dataset.categories.find((x) => x.id === cell.colKey);
          (onHoverTrace || onSelectTrace)({
            stepId: 1,
            entityId: `${cell.rowKey}_${cell.colKey}`,
            trace: cell.trace,
            label: `${u?.name} - ${cat?.name}`,
            position: e ? { x: e.clientX, y: e.clientY } : undefined
          });
        }
      }}
      onSelectCell={(cell) => {
        if (cell.trace) {
          const u = dataset.users.find((x) => x.id === cell.rowKey);
          const cat = dataset.categories.find((x) => x.id === cell.colKey);
          onSelectTrace({
            stepId: 1,
            entityId: `${cell.rowKey}_${cell.colKey}`,
            trace: cell.trace,
            label: `${u?.name} - ${cat?.name}`
          });
        }
      }}
      onLeaveCell={onLeaveTrace}
    />
  ) : (
    <div className="placeholder-step-box">
      <p>Bước 1 chưa được thực thi.</p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!canRun}
        onClick={onRunStep}
      >
        <Play size={16} fill="currentColor" />
        <span>Chạy Bước 1 ngay</span>
      </button>
    </div>
  );

  if (appMode === 'guided') {
    return (
      <GuidedStepLayout
        stepId={1}
        stepName="Độ ưa thích thể loại của người dùng (Category Preference)"
        whyText={
          <span>
            Chuyển đổi các lượt check-in thô thành vectơ sở thích thể loại <InlineMath latex="M_u^C" /> của từng người dùng thông qua cơ chế trọng số TF-IDF, xác định mức độ say mê của người dùng với từng loại hình POI.
          </span>
        }
        inputs={[
          { label: 'Check-in Train', value: `${dataset.checkIns.length} lượt` },
          { label: 'Tập thể loại', value: `${dataset.categories.length} thể loại` }
        ]}
        deepDiveContent={<FormulaCard stepId={1} />}
        conclusion={
          output ? (
            <span>
              Đã xây dựng thành công vectơ đặc trưng <InlineMath latex="M_u^C" /> gồm {output.categoryIds.length} chiều cho toàn bộ {dataset.users.length} người dùng.
            </span>
          ) : undefined
        }
        isCompleted={!!output}
        canRun={canRun}
        onRunStep={onRunStep}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        prevStepName="Bước 0: Dữ liệu"
        nextStepName="Bước 2: Sở thích thời gian"
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
            Chuyển đổi lịch sử check-in <InlineMath latex="R" /> thành vectơ độ ưa thích thể loại <InlineMath latex="M_u^C" /> của từng người dùng thông qua cơ chế trọng số TF-IDF (Công thức 2 &amp; 3).
          </span>
        }
        conclusion={
          output ? (
            <span>
              Đã xây dựng thành công vectơ đặc trưng <InlineMath latex="M_u^C" /> gồm {output.categoryIds.length} chiều cho toàn bộ {dataset.users.length} người dùng.
            </span>
          ) : undefined
        }
        isCompleted={!!output}
      />
      {mainTableContent}
    </div>
  );
};
