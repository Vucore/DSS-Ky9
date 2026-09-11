import React from 'react';
import { CalculationTraceMeta } from '../domain/types';

export interface ResultRow {
  key: string;
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  badge?: { text: React.ReactNode; variant: 'emerald' | 'indigo' | 'amber' | 'muted' | 'rose' };
  values: {
    columnKey: string;
    display: React.ReactNode;
    trace?: CalculationTraceMeta;
  }[];
  trace?: CalculationTraceMeta;
}

interface ResultTableProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  columns: { key: string; label: React.ReactNode; align?: 'left' | 'center' | 'right' }[];
  rows: ResultRow[];
  selectedKey?: string | null;
  onSelectTrace?: (trace: CalculationTraceMeta, label: React.ReactNode) => void;
  onHoverTrace?: (trace: CalculationTraceMeta, label: React.ReactNode, e?: React.MouseEvent) => void;
  onLeaveTrace?: () => void;
}

export const ResultTable: React.FC<ResultTableProps> = ({
  title,
  subtitle,
  columns,
  rows,
  selectedKey,
  onSelectTrace,
  onHoverTrace,
  onLeaveTrace
}) => {
  return (
    <div className="card result-table-card" onMouseLeave={onLeaveTrace}>
      <div className="card-header">
        <div>
          <h4 className="card-title">{title}</h4>
          {subtitle && <p className="card-description">{subtitle}</p>}
        </div>
        <span className="badge badge-indigo">Rê chuột xem card nổi · Nhấp để mở thanh bên phải</span>
      </div>

      <div className="table-scroll-wrapper">
        <table className="data-table" onMouseLeave={onLeaveTrace}>
          <thead onMouseEnter={onLeaveTrace}>
            <tr>
              <th>Đối tượng / Thực thể</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ textAlign: col.align || 'left' }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = selectedKey === row.key;
              return (
                <tr
                  key={row.key}
                  className={isSelected ? 'row-selected' : ''}
                  style={{ cursor: row.trace ? 'pointer' : 'default' }}
                  onMouseEnter={(e) => {
                    if (row.trace) {
                      onHoverTrace?.(row.trace, row.label, e);
                    } else {
                      onLeaveTrace?.();
                    }
                  }}
                  onMouseMove={(e) => {
                    if (row.trace) {
                      onHoverTrace?.(row.trace, row.label, e);
                    }
                  }}
                  onMouseLeave={() => {
                    onLeaveTrace?.();
                  }}
                  onClick={() => row.trace && onSelectTrace && onSelectTrace(row.trace, row.label)}
                  title={row.trace ? 'Rê chuột để xem nhanh · Nhấp để mở thanh chi tiết bên phải' : undefined}
                >
                  <td onMouseEnter={() => { if (!row.trace) onLeaveTrace?.(); }}>
                    <div className="font-medium">{row.label}</div>
                    {row.sublabel && <div className="text-muted text-xs">{row.sublabel}</div>}
                    {row.badge && (
                      <span className={`badge badge-${row.badge.variant}`} style={{ marginTop: '4px' }}>
                        {row.badge.text}
                      </span>
                    )}
                  </td>
                  {columns.map((col) => {
                    const colVal = row.values.find((v) => v.columnKey === col.key);
                    return (
                      <td
                        key={col.key}
                        style={{ textAlign: col.align || 'left' }}
                        onMouseEnter={(e) => {
                          if (colVal?.trace) {
                            e.stopPropagation();
                            onHoverTrace?.(colVal.trace, `${row.label} - ${col.label}`, e);
                          } else if (!row.trace) {
                            onLeaveTrace?.();
                          }
                        }}
                        onMouseMove={(e) => {
                          if (colVal?.trace) {
                            e.stopPropagation();
                            onHoverTrace?.(colVal.trace, `${row.label} - ${col.label}`, e);
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (colVal?.trace) {
                            e.stopPropagation();
                          }
                          onLeaveTrace?.();
                        }}
                        onClick={(e) => {
                          if (colVal?.trace) {
                            e.stopPropagation();
                            onSelectTrace && onSelectTrace(colVal.trace, `${row.label} - ${col.label}`);
                          }
                        }}
                      >
                        {colVal?.trace ? (
                          <span className="clickable-metric" title="Rê chuột hoặc nhấp để kiểm tra chi tiết phép tính này">
                            {colVal.display}
                          </span>
                        ) : (
                          colVal?.display ?? '—'
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
