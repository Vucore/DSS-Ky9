import React, { useState } from 'react';
import { Step7Output, CalculationTraceMeta } from '../domain/types';
import { InlineMath } from './InlineMath';
import { toMathId, cleanEntityName } from '../domain/notationRegistry';
import {
  Trophy,
  Award,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calculator,
  CheckCircle
} from 'lucide-react';

interface RankingTableProps {
  output: Step7Output;
  alpha: number;
  topN: number;
  onSelectTrace: (trace: CalculationTraceMeta, label: string) => void;
  onHoverTrace?: (trace: CalculationTraceMeta, label: string, e?: React.MouseEvent) => void;
  onLeaveTrace?: () => void;
  selectedPoiId?: string;
  defaultExpandTable?: boolean;
}

export const RankingTable: React.FC<RankingTableProps> = ({
  output,
  alpha,
  topN,
  onSelectTrace,
  onHoverTrace,
  onLeaveTrace,
  selectedPoiId,
  defaultExpandTable = false
}) => {
  const { rankings, topN: topNList } = output;
  const [isTableExpanded, setIsTableExpanded] = useState(defaultExpandTable);

  // Chọn POI đang kích hoạt (hoặc mặc định POI Hạng #1)
  const activePoiId = selectedPoiId || topNList[0]?.poiId;
  const activeRecord = rankings.find((r) => r.poiId === activePoiId) || rankings[0];

  const totalWeighted = activeRecord ? Math.max(0.0001, activeRecord.weightedCf + activeRecord.weightedDivergence) : 1;
  const cfPercent = activeRecord ? Math.round((activeRecord.weightedCf / totalWeighted) * 100) : 50;
  const divPercent = 100 - cfPercent;

  return (
    <div className="ranking-view-container" onMouseLeave={onLeaveTrace}>
      {/* Khối hiển thị Top-N địa điểm hàng đầu */}
      <div className="topn-showcase-grid">
        {topNList.map((item) => {
          const isWinner = item.rank === 1;
          const isSelected = item.poiId === activePoiId;
          const fullRecord = rankings.find((r) => r.poiId === item.poiId);

          return (
            <div
              key={item.poiId}
              className={`topn-card ${isWinner ? 'topn-winner' : ''} ${isSelected ? 'topn-card-selected' : ''}`}
              onMouseEnter={(e) =>
                fullRecord?.trace &&
                onHoverTrace?.(fullRecord.trace, `Hạng #${item.rank} - ${item.poiName}`, e)
              }
              onMouseMove={(e) =>
                fullRecord?.trace &&
                onHoverTrace?.(fullRecord.trace, `Hạng #${item.rank} - ${item.poiName}`, e)
              }
              onMouseLeave={() => {
                onLeaveTrace?.();
              }}
              onClick={() =>
                fullRecord?.trace &&
                onSelectTrace(fullRecord.trace, `Hạng #${item.rank} - ${item.poiName}`)
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && fullRecord?.trace) {
                  onSelectTrace(fullRecord.trace, `Hạng #${item.rank} - ${item.poiName}`);
                }
              }}
              aria-selected={isSelected}
              title="Rê chuột xem card nổi · Nhấp để mở thanh bên phải"
            >
              <div className="topn-rank-badge">
                {item.rank === 1 ? (
                  <Trophy size={18} className="text-gold" />
                ) : (
                  <Award size={18} className="text-silver" />
                )}
                <span>Hạng #{item.rank}</span>
              </div>

              <div className="topn-poi-title">
                {cleanEntityName(item.poiName)}{' '}
                <span className="text-xs font-mono font-normal opacity-75">(<InlineMath latex={toMathId(item.poiId)} />)</span>
              </div>
              <div className="topn-categories">
                {fullRecord?.categoryNames.join(', ')}
              </div>

              <div className="topn-score-row">
                <span className="topn-score-label">
                  Điểm cuối cùng <InlineMath latex="f'_{g, l}" />:
                </span>
                <span className="topn-score-val">{item.finalScore.toFixed(4)}</span>
              </div>

              <div className="topn-breakdown-row">
                <span className="text-emerald text-xs font-semibold">
                  CF: +{fullRecord?.weightedCf.toFixed(3)}
                </span>
                <span className="text-rose text-xs font-semibold">
                  Bất đồng: -{fullRecord?.weightedDivergence.toFixed(3)}
                </span>
              </div>

              <div className="topn-badge-status" style={{ marginTop: '6px' }}>
                {fullRecord?.isSeenByGroup ? (
                  <span className="badge badge-amber" title="Thành viên nhóm đã từng ghé thăm trong tập dữ liệu">
                    <CheckCircle size={12} style={{ marginRight: '4px' }} />
                    Nhóm đã đi
                  </span>
                ) : (
                  <span className="badge badge-emerald" title="Địa điểm mới đối với nhóm">
                    <CheckCircle size={12} style={{ marginRight: '4px' }} />
                    Địa điểm mới
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Recommendation Breakdown Banner */}
      {activeRecord && (
        <div className="card recommendation-breakdown-card" style={{ marginTop: '16px' }}>
          <div className="card-header">
            <div>
              <div className="badge badge-indigo" style={{ marginBottom: '4px' }}>
                Phân tích cơ cấu điểm đề xuất
              </div>
              <h4 className="card-title">
                Hạng #{activeRecord.rank}: {cleanEntityName(activeRecord.poiName)} (<InlineMath latex={`f'_{g, ${toMathId(activeRecord.poiId)}} = ${activeRecord.finalScore.toFixed(4)}`} />)
              </h4>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onMouseEnter={(e) =>
                activeRecord.trace &&
                onHoverTrace?.(activeRecord.trace, `Hạng #${activeRecord.rank} - ${activeRecord.poiName}`, e)
              }
              onMouseMove={(e) =>
                activeRecord.trace &&
                onHoverTrace?.(activeRecord.trace, `Hạng #${activeRecord.rank} - ${activeRecord.poiName}`, e)
              }
              onMouseLeave={() => {
                onLeaveTrace?.();
              }}
              onClick={() =>
                activeRecord.trace &&
                onSelectTrace(activeRecord.trace, `Hạng #${activeRecord.rank} - ${activeRecord.poiName}`)
              }
              title="Rê chuột xem card nổi · Nhấp để mở thanh bên phải"
            >
              <Calculator size={14} />
              <span>Xem chi tiết phép tính</span>
            </button>
          </div>

          <div className="breakdown-metrics-grid">
            <div className="metric-box bg-emerald-light">
              <span className="metric-box-label text-emerald">
                Đồng thuận Lọc cộng tác (+<InlineMath latex={`\\alpha f_{g,l}`} />)
              </span>
              <span className="metric-box-val text-emerald">
                +{activeRecord.weightedCf.toFixed(4)}
              </span>
              <small className="metric-box-hint">
                <InlineMath latex={`\\alpha = ${alpha}`} /> &times; CF: {activeRecord.cfScore.toFixed(4)}
              </small>
            </div>

            <div className="metric-box bg-rose-light">
              <span className="metric-box-label text-rose">
                Hình phạt Bất đồng (-<InlineMath latex={`(1 - \\alpha) d_{g,l}`} />)
              </span>
              <span className="metric-box-val text-rose">
                -{activeRecord.weightedDivergence.toFixed(4)}
              </span>
              <small className="metric-box-hint">
                <InlineMath latex={`(1 - ${alpha}) = ${(1 - alpha).toFixed(2)}`} /> &times; Div: {activeRecord.divergence.toFixed(4)}
              </small>
            </div>

            <div className="metric-box bg-indigo-light">
              <span className="metric-box-label text-indigo">
                Tỷ lệ đóng góp điểm số
              </span>
              <div className="score-balance-bar" style={{ marginTop: '8px', height: '12px' }}>
                <div className="bar-fill-cf" style={{ width: `${cfPercent}%` }} />
                <div className="bar-fill-div" style={{ width: `${divPercent}%` }} />
              </div>
              <div className="score-balance-labels">
                <span className="text-emerald text-xs font-bold">CF: {cfPercent}%</span>
                <span className="text-rose text-xs font-bold">Bất đồng: {divPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accordion: Bảng xếp hạng chi tiết toàn bộ POI ứng viên */}
      <div className="card accordion-card" style={{ marginTop: '16px' }} onMouseLeave={onLeaveTrace}>
        <button
          type="button"
          className="accordion-header-btn"
          onClick={() => setIsTableExpanded(!isTableExpanded)}
          aria-expanded={isTableExpanded}
        >
          <div className="accordion-title-group">
            <h4 className="accordion-title">
              Xem toàn bộ bảng xếp hạng các POI ứng viên <InlineMath latex="f'_{g, l}" /> (Công thức 17)
            </h4>
            <span className="badge badge-muted">
              {rankings.length} POI được xếp hạng
            </span>
          </div>
          <div className="accordion-action-group">
            <span className="text-xs text-muted">
              {isTableExpanded ? 'Thu gọn bảng' : 'Mở rộng xem chi tiết'}
            </span>
            {isTableExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {isTableExpanded && (
          <div className="accordion-content">
            <div className="table-scroll-wrapper">
              <table className="data-table" onMouseLeave={onLeaveTrace}>
                <thead onMouseEnter={onLeaveTrace}>
                  <tr>
                    <th style={{ width: '70px', textAlign: 'center' }}>Thứ hạng</th>
                    <th>Địa điểm ứng viên (POI)</th>
                    <th>Thể loại</th>
                    <th style={{ textAlign: 'right' }}>
                      <div className="metric-header text-emerald">
                        <TrendingUp size={14} />
                        <span>Điểm CF <InlineMath latex="f_{g, l}" /></span>
                      </div>
                    </th>
                    <th style={{ textAlign: 'right' }}>
                      <div className="metric-header text-rose">
                        <AlertTriangle size={14} />
                        <span>Độ bất đồng <InlineMath latex="d_{g, l}" /></span>
                      </div>
                    </th>
                    <th style={{ textAlign: 'right' }}>+ <InlineMath latex="\alpha \times f_{g, l}" /></th>
                    <th style={{ textAlign: 'right' }}>- <InlineMath latex="(1 - \alpha) \times d_{g, l}" /></th>
                    <th style={{ textAlign: 'right' }}>Điểm cuối <InlineMath latex="f'_{g, l}" /></th>
                    <th style={{ width: '140px' }}>Cân bằng điểm số</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((row) => {
                    const isTopN = row.rank <= topN;
                    const isRowSelected = row.poiId === activePoiId;
                    const totalScore = Math.max(0.0001, row.weightedCf + row.weightedDivergence);
                    const cfRatio = Math.round((row.weightedCf / totalScore) * 100);
                    const divRatio = 100 - cfRatio;

                    return (
                      <tr
                        key={row.poiId}
                        className={`ranking-row ${isTopN ? 'row-topn' : ''} ${isRowSelected ? 'row-selected' : ''}`}
                        onMouseEnter={(e) =>
                          row.trace &&
                          onHoverTrace?.(row.trace, `Hạng #${row.rank} - ${row.poiName}`, e)
                        }
                        onMouseMove={(e) =>
                          row.trace &&
                          onHoverTrace?.(row.trace, `Hạng #${row.rank} - ${row.poiName}`, e)
                        }
                        onMouseLeave={() => {
                          onLeaveTrace?.();
                        }}
                        onClick={() =>
                          onSelectTrace(row.trace, `Hạng #${row.rank} - ${row.poiName}`)
                        }
                        style={{ cursor: 'pointer' }}
                        title="Rê chuột xem card nổi · Nhấp để mở thanh bên phải"
                      >
                        <td style={{ textAlign: 'center' }}>
                          <span className={`rank-pill rank-pill-${row.rank}`}>
                            #{row.rank}
                          </span>
                        </td>
                        <td>
                          <div className="font-semibold">{cleanEntityName(row.poiName)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span className="text-xs font-mono text-muted"><InlineMath latex={toMathId(row.poiId)} /></span>
                            {row.isSeenByGroup ? (
                              <span className="badge badge-amber badge-xs" title="Nhóm đã từng ghé thăm trong tập dữ liệu">Nhóm đã đi</span>
                            ) : (
                              <span className="badge badge-emerald badge-xs" title="Địa điểm mới nhóm chưa ghé thăm">Địa điểm mới</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {row.categoryNames.map((c) => (
                            <span key={c} className="badge badge-indigo" style={{ marginRight: '4px' }}>
                              {c}
                            </span>
                          ))}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong className="text-emerald">{row.cfScore.toFixed(4)}</strong>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong className="text-rose">{row.divergence.toFixed(4)}</strong>
                        </td>
                        <td style={{ textAlign: 'right' }} className="text-emerald">
                          +{row.weightedCf.toFixed(4)}
                        </td>
                        <td style={{ textAlign: 'right' }} className="text-rose">
                          -{row.weightedDivergence.toFixed(4)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="final-score-badge">
                            {row.finalScore.toFixed(4)}
                          </span>
                        </td>
                        <td>
                          <div className="score-balance-bar" title={`Lọc cộng tác: ${cfRatio}% vs Bất đồng: ${divRatio}%`}>
                            <div className="bar-fill-cf" style={{ width: `${cfRatio}%` }} />
                            <div className="bar-fill-div" style={{ width: `${divRatio}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
