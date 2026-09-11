import React from 'react';
import { CalculationTraceMeta } from '../domain/types';

export interface MatrixCell {
  rowKey: string;
  colKey: string;
  value: number;
  formatted?: string;
  trace?: CalculationTraceMeta;
}

interface MatrixTableProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rowHeaders: { key: string; label: React.ReactNode; badge?: React.ReactNode }[];
  colHeaders: { key: string; label: React.ReactNode; badge?: React.ReactNode }[];
  cells: Record<string, Record<string, MatrixCell>>;
  selectedCell?: { rowKey: string; colKey: string } | null;
  onSelectCell?: (cell: MatrixCell) => void;
  onHoverCell?: (cell: MatrixCell, e?: React.MouseEvent) => void;
  onLeaveCell?: () => void;
  minVal?: number;
  maxVal?: number;
}

export const MatrixTable: React.FC<MatrixTableProps> = ({
  title,
  subtitle,
  rowHeaders,
  colHeaders,
  cells,
  selectedCell,
  onSelectCell,
  onHoverCell,
  onLeaveCell,
  minVal = 0,
  maxVal = 1
}) => {
  return (
    <div className="card matrix-table-card" onMouseLeave={onLeaveCell}>
      <div className="card-header">
        <div>
          <h4 className="card-title">{title}</h4>
          {subtitle && <p className="card-description">{subtitle}</p>}
        </div>
        <span className="badge badge-indigo">Rê chuột xem card nổi · Nhấp để mở thanh bên phải</span>
      </div>

      <div className="table-scroll-wrapper">
        <table className="data-table matrix-table" onMouseLeave={onLeaveCell}>
          <thead onMouseEnter={onLeaveCell}>
            <tr>
              <th className="sticky-col">Hàng \ Cột</th>
              {colHeaders.map((col) => (
                <th key={col.key} className="text-center">
                  <div>{col.label}</div>
                  {col.badge && <span className="badge badge-muted">{col.badge}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowHeaders.map((row) => (
              <tr key={row.key}>
                <td className="sticky-col font-medium" onMouseEnter={onLeaveCell}>
                  <div>{row.label}</div>
                  {row.badge && <span className="badge badge-emerald">{row.badge}</span>}
                </td>
                {colHeaders.map((col) => {
                  const cell = cells[row.key]?.[col.key];
                  const val = cell?.value ?? 0;
                  const isSelected =
                    selectedCell?.rowKey === row.key && selectedCell?.colKey === col.key;

                  // Chuẩn hóa giá trị cho độ đậm heatmap
                  const range = maxVal - minVal;
                  const normalized = range > 0 ? Math.max(0, Math.min(1, (val - minVal) / range)) : 0;
                  const bgOpacity = (normalized * 0.45).toFixed(2);

                  return (
                    <td
                      key={col.key}
                      className={`matrix-cell ${isSelected ? 'cell-selected' : ''}`}
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${bgOpacity})`,
                        cursor: cell?.trace ? 'pointer' : 'default'
                      }}
                      onMouseEnter={(e) => {
                        if (cell?.trace) {
                          onHoverCell?.(cell, e);
                        } else {
                          onLeaveCell?.();
                        }
                      }}
                      onMouseMove={(e) => {
                        if (cell?.trace) {
                          onHoverCell?.(cell, e);
                        }
                      }}
                      onMouseLeave={() => {
                        onLeaveCell?.();
                      }}
                      onClick={() => cell && onSelectCell && onSelectCell(cell)}
                      title={cell?.trace ? 'Rê chuột để xem nhanh · Nhấp để mở thanh chi tiết bên phải' : undefined}
                    >
                      <span className="cell-val">
                        {cell?.formatted || val.toFixed(4)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
