import React from 'react';
import { Dataset, Step6Output, SelectedTraceState, AppMode } from '../../domain/types';
import { MatrixTable, MatrixCell } from '../../components/MatrixTable';
import { ResultTable, ResultRow } from '../../components/ResultTable';
import { StepSummary } from '../../components/StepSummary';
import { GuidedStepLayout } from '../../components/GuidedStepLayout';
import { FormulaCard } from '../../components/FormulaCard';
import { InlineMath } from '../../components/InlineMath';
import { Play } from 'lucide-react';
import { toMathId, toMathSet, cleanEntityName } from '../../domain/notationRegistry';

interface Step6DivergenceProps {
  dataset: Dataset;
  output?: Step6Output;
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

export const Step6Divergence: React.FC<Step6DivergenceProps> = ({
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

  const rowHeaders = currentGroup.memberUserIds.map((mId) => {
    const u = dataset.users.find((x) => x.id === mId);
    return {
      key: mId,
      label: (
        <span>
          {cleanEntityName(u?.name || mId)}{' '}
          <span className="text-xs text-muted font-mono">(<InlineMath latex={toMathId(mId)} />)</span>
        </span>
      )
    };
  });

  const colHeaders = dataset.pois.map((p) => ({
    key: p.id,
    label: cleanEntityName(p.name),
    badge: <InlineMath latex={toMathId(p.id)} />
  }));

  const deltaCells: Record<string, Record<string, MatrixCell>> = {};
  if (output) {
    for (const mId of currentGroup.memberUserIds) {
      deltaCells[mId] = {};
      for (const poi of dataset.pois) {
        const cellData = output.memberProbabilities[mId]?.[poi.id];
        deltaCells[mId][poi.id] = {
          rowKey: mId,
          colKey: poi.id,
          value: cellData?.delta ?? 0,
          formatted: (cellData?.delta ?? 0).toFixed(4),
          trace: cellData?.trace
        };
      }
    }
  }

  const divRows: ResultRow[] = output
    ? dataset.pois.map((poi) => {
        const divData = output.groupDivergences[poi.id];
        return {
          key: poi.id,
          label: (
            <span>
              {cleanEntityName(poi.name)}{' '}
              <span className="text-xs text-muted font-mono">(<InlineMath latex={toMathId(poi.id)} />)</span>
            </span>
          ),
          sublabel: `Tổng chênh lệch cặp đôi: ${divData.sumDifferences.toFixed(4)}`,
          values: [
            {
              columnKey: 'pairs',
              display: (
                <span className="text-xs text-muted">
                  {divData.pairs
                    .map((p, idx) => (
                      <span key={idx} style={{ marginRight: '8px' }}>
                        |<InlineMath latex={toMathId(p.u1)} /> &minus; <InlineMath latex={toMathId(p.u2)} />|: {p.diff.toFixed(3)}
                      </span>
                    ))}
                </span>
              )
            },
            { columnKey: 'factor', display: <code>{divData.scalingFactor.toFixed(4)}</code> },
            {
              columnKey: 'divergence',
              display: (
                <span className="badge badge-rose font-bold">
                  {divData.divergence.toFixed(4)}
                </span>
              ),
              trace: divData.trace
            }
          ],
          trace: divData.trace
        };
      })
    : [];

  const selectedCellCoords = selectedEntityId && selectedEntityId.includes('_')
    ? {
        rowKey: selectedEntityId.split('_')[0],
        colKey: selectedEntityId.split('_')[1]
      }
    : null;

  const mainContent = output ? (
    <>
      <MatrixTable
        title={<>Xác suất ghé thăm POI của thành viên <InlineMath latex="\delta(u, l)" /> qua bạn bè <InlineMath latex="A_u" /> (Công thức 16)</>}
        subtitle={<>Tỷ lệ bạn bè của thành viên <InlineMath latex="u" /> đã từng check-in tại địa điểm <InlineMath latex="l" /> trong tập Train. Rê chuột hoặc nhấp ô để xem chi tiết.</>}
        rowHeaders={rowHeaders}
        colHeaders={colHeaders}
        cells={deltaCells}
        selectedCell={selectedCellCoords}
        onHoverCell={(cell, e) => {
          if (cell.trace) {
            const u = dataset.users.find((x) => x.id === cell.rowKey);
            const p = dataset.pois.find((x) => x.id === cell.colKey);
            (onHoverTrace || onSelectTrace)({
              stepId: 6,
              entityId: `${cell.rowKey}_${cell.colKey}`,
              trace: cell.trace,
              label: <>Xác suất <InlineMath latex={`\\delta(${u?.name || cell.rowKey}, ${p?.name || cell.colKey})`} /></>,
              position: e ? { x: e.clientX, y: e.clientY } : undefined
            });
          }
        }}
        onSelectCell={(cell) => {
          if (cell.trace) {
            const u = dataset.users.find((x) => x.id === cell.rowKey);
            const p = dataset.pois.find((x) => x.id === cell.colKey);
            onSelectTrace({
              stepId: 6,
              entityId: `${cell.rowKey}_${cell.colKey}`,
              trace: cell.trace,
              label: <>Xác suất <InlineMath latex={`\\delta(${u?.name || cell.rowKey}, ${p?.name || cell.colKey})`} /></>
            });
          }
        }}
        onLeaveCell={onLeaveTrace}
      />

      <div style={{ marginTop: '20px' }}>
        <ResultTable
          title={<>Mức độ bất đồng nội bộ nhóm đối với địa điểm <InlineMath latex="d_{g, l}" /> (Công thức 15)</>}
          subtitle={<>Độ chênh lệch tuyệt đối trung bình <InlineMath latex="|\delta(u, l) - \delta(u', l)|" /> giữa tất cả các cặp thành viên trong nhóm <InlineMath latex="g" />. Rê chuột hoặc nhấp để xem chi tiết.</>}
          columns={[
            { key: 'pairs', label: 'Chênh lệch từng cặp thành viên' },
            { key: 'factor', label: <>Hệ số <InlineMath latex="\frac{2}{n(n-1)}" /></>, align: 'right' },
            { key: 'divergence', label: <>Độ bất đồng <InlineMath latex="d_{g, l}" /></>, align: 'right' }
          ]}
          rows={divRows}
          selectedKey={selectedEntityId}
          onHoverTrace={(tr, lbl, e) =>
            (onHoverTrace || onSelectTrace)({
              stepId: 6,
              entityId: divRows.find((r) => r.trace === tr)?.key || 'div',
              trace: tr,
              label: lbl,
              position: e ? { x: e.clientX, y: e.clientY } : undefined
            })
          }
          onSelectTrace={(tr, lbl) =>
            onSelectTrace({
              stepId: 6,
              entityId: divRows.find((r) => r.trace === tr)?.key || 'div',
              trace: tr,
              label: lbl
            })
          }
          onLeaveTrace={onLeaveTrace}
        />
      </div>
    </>
  ) : (
    <div className="placeholder-step-box">
      <p>Bước 6 chưa được thực thi.</p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!canRun}
        onClick={onRunStep}
      >
        <Play size={16} fill="currentColor" />
        <span>Chạy Bước 6 ngay</span>
      </button>
    </div>
  );

  if (appMode === 'guided') {
    return (
      <GuidedStepLayout
        stepId={6}
        stepName="Độ bất đồng nội bộ nhóm (Intragroup Divergence)"
        whyText={
          <span>
            Đo lường mức độ xung đột sở thích <InlineMath latex="d_{g, l}" /> giữa mọi cặp thành viên trong nhóm đối với từng địa điểm nhằm hình thành cơ chế phạt, tránh đề xuất những nơi gây tranh cãi hoặc làm mất lòng thành viên.
          </span>
        }
        inputs={[
          { label: 'Thành viên nhóm', value: <InlineMath latex={toMathSet(currentGroup?.memberUserIds || [])} /> },
          { label: <span>Mạng lưới bạn bè <InlineMath latex="A_u" /></span>, value: 'Tập bạn bè tin cậy' },
          { label: <span>Số cặp so sánh <InlineMath latex="\frac{n(n-1)}{2}" /></span>, value: `${(currentGroup.memberUserIds.length * (currentGroup.memberUserIds.length - 1)) / 2} cặp` }
        ]}
        deepDiveContent={<FormulaCard stepId={6} />}
        conclusion={
          output ? (
            <span>
              Đã lượng hóa xong độ bất đồng nội bộ nhóm <InlineMath latex="d_{g, l}" /> cho toàn bộ {dataset.pois.length} POI dựa trên mạng lưới bạn bè <InlineMath latex="A_u" />.
            </span>
          ) : undefined
        }
        isCompleted={!!output}
        canRun={canRun}
        onRunStep={onRunStep}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        prevStepName="Bước 5: Lọc cộng tác"
        nextStepName="Bước 7: Xếp hạng Top-N cuối cùng"
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
            Tính toán xác suất ghé thăm của thành viên <InlineMath latex="\delta(u, l)" /> thông qua bạn bè <InlineMath latex="A_u" />, sau đó đo lường độ chênh lệch tuyệt đối trung bình giữa mọi cặp thành viên trong nhóm <InlineMath latex="d_{g, l} = \frac{2}{n(n - 1)} \sum_{u < u'} |\delta(u, l) - \delta(u', l)|" /> (Công thức 15 &amp; 16).
          </span>
        }
        conclusion={
          output ? (
            <span>
              Đã lượng hóa xong độ bất đồng nội bộ nhóm <InlineMath latex="d_{g, l}" /> cho toàn bộ {dataset.pois.length} POI dựa trên mạng lưới bạn bè <InlineMath latex="A_u" />.
            </span>
          ) : undefined
        }
        isCompleted={!!output}
      />
      {mainContent}
    </div>
  );
};
