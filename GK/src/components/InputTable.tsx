import React, { useState, useMemo } from 'react';
import { Dataset, Hyperparameters, CheckInEvent } from '../domain/types';
import { InlineMath } from './InlineMath';
import { MathView } from './MathView';
import { getFreshMockDataset } from '../data/mockDataset';
import { toMathId, toMathSet, cleanEntityName } from '../domain/notationRegistry';
import {
  Users,
  MapPin,
  Calendar,
  UserCheck,
  Sliders,
  AlertCircle,
  Plus,
  Trash2,
  RotateCcw,
  Table as TableIcon,
  Check
} from 'lucide-react';

interface InputTableProps {
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
}

export const InputTable: React.FC<InputTableProps> = ({ dataset, onUpdateDataset }) => {
  const [activeTab, setActiveTab] = useState<'params' | 'checkins' | 'pois' | 'friends' | 'users'>('params');
  const [matrixSubView, setMatrixSubView] = useState<'grid' | 'events'>('grid');

  // State cho thêm sự kiện check-in đơn lẻ
  const [newUserId, setNewUserId] = useState('u1');
  const [newPoiId, setNewPoiId] = useState('l1');
  const [newHour, setNewHour] = useState(12);
  const [newDay, setNewDay] = useState(0);

  const { users, pois, categories, checkIns, groups, selectedGroupId, friendSets, hyperparameters } = dataset;
  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  // 1. Cập nhật tham số thuật toán
  const handleParamChange = <K extends keyof Hyperparameters>(key: K, value: Hyperparameters[K]) => {
    onUpdateDataset({
      ...dataset,
      hyperparameters: {
        ...dataset.hyperparameters,
        [key]: value
      }
    });
  };

  // 2. Chuyển nhóm mục tiêu
  const handleGroupSelect = (groupId: string) => {
    onUpdateDataset({
      ...dataset,
      selectedGroupId: groupId
    });
  };

  // 3. Bật / tắt thành viên trong nhóm mục tiêu g
  const handleToggleGroupMember = (userId: string) => {
    const currentMembers = currentGroup.memberUserIds || [];
    const exists = currentMembers.includes(userId);
    let newMembers: string[];
    if (exists) {
      if (currentMembers.length <= 1) return; // Nhóm phải có ít nhất 1 thành viên
      newMembers = currentMembers.filter((id) => id !== userId);
    } else {
      newMembers = [...currentMembers, userId];
    }

    const updatedGroups = groups.map((g) =>
      g.id === currentGroup.id ? { ...g, memberUserIds: newMembers } : g
    );

    onUpdateDataset({
      ...dataset,
      groups: updatedGroups
    });
  };

  // 4. Nhập trực tiếp ô trên ma trận Check-in R (Users x POIs)
  const handleMatrixCellChange = (userId: string, poiId: string, newCountStr: string) => {
    const newCount = Math.max(0, parseInt(newCountStr, 10) || 0);
    const existingForCell = checkIns.filter(
      (ck) => ck.userId === userId && ck.poiId === poiId
    );
    const diff = newCount - existingForCell.length;
    if (diff === 0) return;

    let updatedCheckIns = [...checkIns];
    if (diff < 0) {
      let toRemove = -diff;
      updatedCheckIns = updatedCheckIns.filter((ck) => {
        if (ck.userId === userId && ck.poiId === poiId && toRemove > 0) {
          toRemove--;
          return false;
        }
        return true;
      });
    } else {
      const newItems: CheckInEvent[] = [];
      for (let i = 0; i < diff; i++) {
        const randHour = 9 + ((i * 3) % 12);
        const randDay = (i + 1) % 7;
        const hourStr = String(randHour).padStart(2, '0');
        const dayStr = String(10 + randDay).padStart(2, '0');
        newItems.push({
          id: `ck_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId,
          poiId,
          hour: randHour,
          dayOfWeek: randDay,
          timestamp: `2021-05-${dayStr}T${hourStr}:00:00Z`
        });
      }
      updatedCheckIns = [...updatedCheckIns, ...newItems];
    }

    onUpdateDataset({
      ...dataset,
      checkIns: updatedCheckIns
    });
  };

  // 5. Thêm sự kiện check-in chi tiết
  const handleAddCheckIn = () => {
    const hourStr = String(newHour).padStart(2, '0');
    const baseDay = 9 + Number(newDay);
    const dayStr = String(baseDay).padStart(2, '0');
    const isoTimestamp = `2021-05-${dayStr}T${hourStr}:00:00Z`;

    const newCk: CheckInEvent = {
      id: `ck_${Date.now()}`,
      userId: newUserId,
      poiId: newPoiId,
      hour: Number(newHour),
      dayOfWeek: Number(newDay),
      timestamp: isoTimestamp
    };

    onUpdateDataset({
      ...dataset,
      checkIns: [...dataset.checkIns, newCk]
    });
  };

  // 6. Xóa sự kiện check-in chi tiết
  const handleDeleteCheckIn = (ckId: string) => {
    onUpdateDataset({
      ...dataset,
      checkIns: dataset.checkIns.filter((ck) => ck.id !== ckId)
    });
  };

  // 7. Bật / tắt thể loại của POI (Vectơ V_l^C)
  const handleToggleCategory = (poiId: string, catId: string) => {
    const updatedPois = pois.map((p) => {
      if (p.id !== poiId) return p;
      const exists = p.categories.includes(catId);
      if (exists) {
        if (p.categories.length <= 1) return p; // POI phải có ít nhất 1 thể loại
        return { ...p, categories: p.categories.filter((c) => c !== catId) };
      } else {
        return { ...p, categories: [...p.categories, catId] };
      }
    });

    onUpdateDataset({
      ...dataset,
      pois: updatedPois
    });
  };

  // 8. Đổi tên POI
  const handleUpdatePoiName = (poiId: string, newName: string) => {
    const updatedPois = pois.map((p) => (p.id === poiId ? { ...p, name: newName } : p));
    onUpdateDataset({
      ...dataset,
      pois: updatedPois
    });
  };

  // 9. Đổi tên Thể loại
  const handleUpdateCategoryName = (catId: string, newName: string) => {
    const updatedCats = categories.map((c) => (c.id === catId ? { ...c, name: newName } : c));
    onUpdateDataset({
      ...dataset,
      categories: updatedCats
    });
  };

  // 10. Đổi tên Người dùng
  const handleUpdateUserName = (userId: string, newName: string) => {
    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, name: newName } : u));
    onUpdateDataset({
      ...dataset,
      users: updatedUsers
    });
  };

  // 11. Bật / tắt bạn bè trong tập A_u
  const handleToggleFriend = (userId: string, friendId: string) => {
    const currentFriends = friendSets[userId] || [];
    const exists = currentFriends.includes(friendId);
    const newFriends = exists
      ? currentFriends.filter((id) => id !== friendId)
      : [...currentFriends, friendId];

    onUpdateDataset({
      ...dataset,
      friendSets: {
        ...friendSets,
        [userId]: newFriends
      }
    });
  };

  // 12. Khôi phục dữ liệu mẫu ban đầu
  const handleResetToMock = () => {
    onUpdateDataset(getFreshMockDataset());
  };

  // Tính ma trận số học R và chuỗi LaTeX pmatrix
  const { matrixValues, matrixLatex, rowTotals, colTotals } = useMemo(() => {
    const values: number[][] = [];
    const rTotals: number[] = [];
    const cTotals: number[] = new Array(pois.length).fill(0);

    for (const u of users) {
      const row: number[] = [];
      let rSum = 0;
      for (let j = 0; j < pois.length; j++) {
        const p = pois[j];
        const count = checkIns.filter(
          (ck) => ck.userId === u.id && ck.poiId === p.id
        ).length;
        row.push(count);
        rSum += count;
        cTotals[j] += count;
      }
      values.push(row);
      rTotals.push(rSum);
    }

    const rowStrings = values.map((row) => row.join(' & ')).join(' \\\\ ');
    const latex = `\\mathbf{R} = \\begin{pmatrix} ${rowStrings} \\end{pmatrix}`;

    return { matrixValues: values, matrixLatex: latex, rowTotals: rTotals, colTotals: cTotals };
  }, [users, pois, checkIns]);

  return (
    <div className="input-table-container">
      {/* Thanh hành động trên cùng: Cảnh báo Reactive Invalidation & Nút Reset Mock */}
      <div className="input-header-action-bar">
        <div className="callout callout-info" style={{ margin: 0, flex: 1 }}>
          <div className="callout-header">
            <AlertCircle size={18} className="callout-icon" />
            <strong>Không gian Nhập liệu Trực quan (Matrix &amp; Vector Inputs)</strong>
          </div>
          <p className="callout-content">
            Mọi chỉnh sửa tham số, ma trận check-in <InlineMath latex="\mathbf{R}" />, vectơ nhãn <InlineMath latex="V_l^C" />, tập bạn bè <InlineMath latex="A_u" /> hoặc nhóm <InlineMath latex="g" /> đều tự động đặt lại các bước tính toán phía sau để đảm bảo tính nhất quán toán học.
          </p>
        </div>

        <button
          type="button"
          className="reset-mock-btn"
          onClick={handleResetToMock}
          title="Khôi phục toàn bộ dữ liệu mẫu 5 Users × 6 POIs ban đầu"
        >
          <RotateCcw size={15} />
          <span>Khôi phục dữ liệu mẫu ban đầu</span>
        </button>
      </div>

      {/* Thanh chuyển Tab chuyên đề */}
      <div className="tab-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'params' ? 'active' : ''}`}
          onClick={() => setActiveTab('params')}
        >
          <Sliders size={15} />
          <span>Tham số &amp; Nhóm ({groups[0]?.memberUserIds.length} TV)</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'checkins' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkins')}
        >
          <TableIcon size={15} />
          <span>Ma trận Check-in <InlineMath latex="\mathbf{R}" /> ({checkIns.length} lượt)</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'pois' ? 'active' : ''}`}
          onClick={() => setActiveTab('pois')}
        >
          <MapPin size={15} />
          <span>Vectơ Thể loại <InlineMath latex="V_l^C" /> ({pois.length} POI)</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          <UserCheck size={15} />
          <span>Mạng bạn bè <InlineMath latex="A_u" /> ({users.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={15} />
          <span>Người dùng <InlineMath latex="U" /> ({users.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: THAM SỐ THUẬT TOÁN & CẤU HÌNH NHÓM MỤC TIÊU g
          ========================================================================= */}
      {activeTab === 'params' && (
        <div className="tab-pane">
          <div className="card-grid-2">
            {/* Cột trái: Các siêu tham số */}
            <div className="card">
              <h4 className="card-title">Các tham số thuật toán CFID</h4>
              
              {/* Ngưỡng tương đồng theta */}
              <div className="form-group">
                <label className="form-label">
                  <span>Ngưỡng tương đồng <InlineMath latex="\theta" /> (Công thức 13):</span>
                  <strong className="text-accent">{hyperparameters.theta}</strong>
                </label>
                <div className="slider-input-combo">
                  <input
                    type="range"
                    min="0"
                    max={hyperparameters.simMode === 'paper_sum' ? '2.0' : '1.0'}
                    step="0.01"
                    value={hyperparameters.theta}
                    onChange={(e) => handleParamChange('theta', parseFloat(e.target.value))}
                    className="range-slider"
                  />
                  <input
                    type="number"
                    min="0"
                    max={hyperparameters.simMode === 'paper_sum' ? 2.0 : 1.0}
                    step="0.01"
                    value={hyperparameters.theta}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) handleParamChange('theta', Math.max(0, val));
                    }}
                    className="combo-number-input"
                  />
                </div>
                <small className="form-hint">
                  Ngưỡng lọc người dùng tương đồng. Ở chế độ bám sát bài báo (tổng), miền giá trị là [0, 2].
                </small>
              </div>

              {/* Hệ số alpha */}
              <div className="form-group">
                <label className="form-label">
                  <span>Hệ số điều phối <InlineMath latex="\alpha" /> (Công thức 17):</span>
                  <strong className="text-accent">{hyperparameters.alpha}</strong>
                </label>
                <div className="slider-input-combo">
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.01"
                    value={hyperparameters.alpha}
                    onChange={(e) => handleParamChange('alpha', parseFloat(e.target.value))}
                    className="range-slider"
                  />
                  <input
                    type="number"
                    min="0"
                    max="1.0"
                    step="0.01"
                    value={hyperparameters.alpha}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) handleParamChange('alpha', Math.min(1, Math.max(0, val)));
                    }}
                    className="combo-number-input"
                  />
                </div>
                <small className="form-hint">
                  Trọng số cân bằng giữa lọc cộng tác (<InlineMath latex="\alpha \times f_{g, l}" />) và hình phạt bất đồng (<InlineMath latex="(1 - \alpha) \times d_{g, l}" />).
                </small>
              </div>

              {/* Số lượng gợi ý Top-N */}
              <div className="form-group">
                <label className="form-label">Số lượng gợi ý Top-N:</label>
                <div className="slider-input-combo">
                  <select
                    value={hyperparameters.topN}
                    onChange={(e) => handleParamChange('topN', parseInt(e.target.value, 10))}
                    className="select-input"
                    style={{ flex: 1 }}
                  >
                    {pois.map((_, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        Top {idx + 1} địa điểm {idx + 1 === 3 ? '(Mặc định)' : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max={pois.length}
                    value={hyperparameters.topN}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) handleParamChange('topN', Math.min(pois.length, Math.max(1, val)));
                    }}
                    className="combo-number-input"
                  />
                </div>
              </div>
            </div>

            {/* Cột phải: Cài đặt toán học & Nhóm mục tiêu g */}
            <div className="card">
              <h4 className="card-title">Cài đặt toán học &amp; Nhóm mục tiêu <InlineMath latex="g" /></h4>

              <div className="form-group">
                <label className="form-label">Chế độ kết hợp tương đồng (Công thức 12):</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="simMode"
                      checked={hyperparameters.simMode === 'paper_sum'}
                      onChange={() => handleParamChange('simMode', 'paper_sum')}
                    />
                    <span>Bám sát bài báo (Tổng): <InlineMath latex="\operatorname{sim} = \operatorname{sim}^m + \operatorname{sim}^u \in [0, 2]" /></span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="simMode"
                      checked={hyperparameters.simMode === 'normalized_avg'}
                      onChange={() => handleParamChange('simMode', 'normalized_avg')}
                    />
                    <span>Chuẩn hóa (Trung bình): <InlineMath latex="\operatorname{sim} = \frac{\operatorname{sim}^m + \operatorname{sim}^u}{2} \in [0, 1]" /></span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cơ số Logarit IDF (Công thức 2):</label>
                <select
                  value={hyperparameters.logBase}
                  onChange={(e) => handleParamChange('logBase', e.target.value as any)}
                  className="select-input"
                >
                  <option value="ln">Logarit tự nhiên (ln) - Mặc định bài báo</option>
                  <option value="log10">Cơ số 10 (log10)</option>
                  <option value="log2">Cơ số 2 (log2)</option>
                </select>
              </div>

              {/* Lựa chọn nhóm nếu có nhiều hơn 1 nhóm */}
              {groups.length > 1 && (
                <div className="form-group">
                  <label className="form-label">Chọn Nhóm mục tiêu:</label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => handleGroupSelect(e.target.value)}
                    className="select-input"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tương tác chọn thành viên nhóm g */}
              <div className="form-group">
                <label className="form-label">
                  <span>Tùy chỉnh thành viên Nhóm mục tiêu <InlineMath latex="g" /> (nhấp để bật/tắt):</span>
                </label>
                <div className="member-chip-group">
                  {users.map((u) => {
                    const isMember = currentGroup.memberUserIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        className={`member-chip-toggle ${isMember ? 'is-member' : ''}`}
                        onClick={() => handleToggleGroupMember(u.id)}
                        title={isMember ? `Nhấp để đưa ${u.name} ra khỏi nhóm` : `Nhấp để thêm ${u.name} vào nhóm`}
                      >
                        {isMember && <Check size={13} />}
                        <span>{cleanEntityName(u.name)}</span>
                        <span className="text-xs font-mono" style={{ opacity: 0.8 }}>
                          (<InlineMath latex={toMathId(u.id)} />)
                        </span>
                      </button>
                    );
                  })}
                </div>
                <small className="form-hint" style={{ marginTop: '6px' }}>
                  Đang chọn {currentGroup.memberUserIds.length} thành viên trong nhóm: <InlineMath latex={toMathSet(currentGroup.memberUserIds)} />.
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MA TRẬN CHECK-IN R (LƯỚI MA TRẬN 2 CHIỀU)
          ========================================================================= */}
      {activeTab === 'checkins' && (
        <div className="tab-pane">
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 className="card-title">
                  Ma trận Tần suất Check-in <InlineMath latex="\mathbf{R} \in \mathbb{R}^{|U| \times |L|}" />
                </h4>
                <p className="card-description">
                  Nhập số lần ghé thăm <InlineMath latex="r_{u, l}" /> trực tiếp vào từng ô giao cắt giữa Người dùng <InlineMath latex="u \in U" /> và Địa điểm <InlineMath latex="l \in L" />.
                </p>
              </div>

              <div className="tab-bar" style={{ marginBottom: 0 }}>
                <button
                  type="button"
                  className={`tab-btn ${matrixSubView === 'grid' ? 'active' : ''}`}
                  onClick={() => setMatrixSubView('grid')}
                >
                  <TableIcon size={14} />
                  <span>Lưới Ma trận số học ({users.length} × {pois.length})</span>
                </button>
                <button
                  type="button"
                  className={`tab-btn ${matrixSubView === 'events' ? 'active' : ''}`}
                  onClick={() => setMatrixSubView('events')}
                >
                  <Calendar size={14} />
                  <span>Danh sách Sự kiện ({checkIns.length})</span>
                </button>
              </div>
            </div>

            {/* CHẾ ĐỘ 1: BẢNG MA TRẬN LƯỚI 2 CHIỀU */}
            {matrixSubView === 'grid' && (
              <div style={{ overflowX: 'auto' }}>
                <table className="matrix-editor-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', minWidth: '160px' }}>
                        Người dùng \ Địa điểm
                      </th>
                      {pois.map((p) => (
                        <th key={p.id} style={{ minWidth: '85px' }} title={p.name}>
                          <div><strong><InlineMath latex={toMathId(p.id)} /></strong></div>
                          <div className="text-xs text-muted" style={{ fontWeight: 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85px' }}>
                            {cleanEntityName(p.name)}
                          </div>
                        </th>
                      ))}
                      <th style={{ minWidth: '80px' }}>
                        Tổng <InlineMath latex="\sum_l r_{u, l}" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, rowIdx) => {
                      const isMember = currentGroup.memberUserIds.includes(u.id);
                      return (
                        <tr key={u.id} className={isMember ? 'row-member' : ''}>
                          <td style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600 }}>
                              {cleanEntityName(u.name)}{' '}
                              <span className="text-xs font-mono text-muted">(<InlineMath latex={toMathId(u.id)} />)</span>
                            </div>
                            <div className="text-xs text-muted">
                              {isMember ? (
                                <span className="text-emerald font-semibold">• Thành viên nhóm <InlineMath latex="g" /></span>
                              ) : (
                                <span>• Người dùng ngoài</span>
                              )}
                            </div>
                          </td>

                          {pois.map((p, colIdx) => {
                            const val = matrixValues[rowIdx]?.[colIdx] ?? 0;
                            return (
                              <td
                                key={p.id}
                                className={val > 0 ? 'matrix-cell-has-val' : ''}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  value={val}
                                  onChange={(e) => handleMatrixCellChange(u.id, p.id, e.target.value)}
                                  className="matrix-cell-input"
                                  title={`Lượt check-in của ${u.name} tại ${p.name}`}
                                />
                              </td>
                            );
                          })}

                          <td className="matrix-total-cell">
                            {rowTotals[rowIdx]}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Hàng tổng số theo cột */}
                    <tr style={{ background: 'var(--bg-subtle)' }}>
                      <td style={{ textAlign: 'left', fontWeight: 700 }}>
                        Tổng cột <InlineMath latex="\sum_u r_{u, l}" />
                      </td>
                      {colTotals.map((tot, idx) => (
                        <td key={idx} className="matrix-total-cell">
                          {tot}
                        </td>
                      ))}
                      <td className="matrix-total-cell" style={{ color: 'var(--accent-indigo)' }}>
                        {checkIns.length}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Khối hiển thị KaTeX của ma trận vừa sửa */}
                <div className="matrix-latex-preview-card">
                  <div className="text-xs text-muted" style={{ marginBottom: '6px', fontWeight: 600 }}>
                    Biểu diễn ma trận toán học KaTeX tương ứng (<InlineMath latex="|U| \times |L|" />):
                  </div>
                  <MathView latex={matrixLatex} displayMode={true} />
                </div>
              </div>
            )}

            {/* CHẾ ĐỘ 2: DANH SÁCH SỰ KIỆN CHI TIẾT */}
            {matrixSubView === 'events' && (
              <div>
                <div className="add-checkin-row">
                  <select value={newUserId} onChange={(e) => setNewUserId(e.target.value)} className="select-input">
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <select value={newPoiId} onChange={(e) => setNewPoiId(e.target.value)} className="select-input">
                    {pois.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={newHour}
                    onChange={(e) => setNewHour(parseInt(e.target.value, 10))}
                    className="number-input"
                    placeholder="Khung giờ (0-23)"
                  />
                  <select value={newDay} onChange={(e) => setNewDay(parseInt(e.target.value, 10))} className="select-input">
                    <option value={0}>Chủ Nhật (Cuối tuần)</option>
                    <option value={1}>Thứ Hai</option>
                    <option value={2}>Thứ Ba</option>
                    <option value={3}>Thứ Tư</option>
                    <option value={4}>Thứ Năm</option>
                    <option value={5}>Thứ Sáu</option>
                    <option value={6}>Thứ Bảy (Cuối tuần)</option>
                  </select>
                  <button type="button" className="btn btn-primary" onClick={handleAddCheckIn}>
                    <Plus size={16} />
                    <span>Thêm Sự kiện</span>
                  </button>
                </div>

                <table className="data-table" style={{ marginTop: '16px' }}>
                  <thead>
                    <tr>
                      <th>Mã sự kiện</th>
                      <th>Người dùng</th>
                      <th>Địa điểm POI</th>
                      <th>Giờ</th>
                      <th>Ngày trong tuần</th>
                      <th>Cuối tuần?</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkIns.map((ck) => {
                      const u = users.find((user) => user.id === ck.userId);
                      const p = pois.find((poi) => poi.id === ck.poiId);
                      const isWeekend = ck.dayOfWeek === 0 || ck.dayOfWeek === 6;
                      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                      return (
                        <tr key={ck.id}>
                          <td><code>{ck.id}</code></td>
                          <td>
                            {cleanEntityName(u?.name || ck.userId)}{' '}
                            <span className="text-xs font-mono text-muted">(<InlineMath latex={toMathId(ck.userId)} />)</span>
                          </td>
                          <td>
                            {cleanEntityName(p?.name || ck.poiId)}{' '}
                            <span className="text-xs font-mono text-muted">(<InlineMath latex={toMathId(ck.poiId)} />)</span>
                          </td>
                          <td>{ck.hour}:00</td>
                          <td>{dayNames[ck.dayOfWeek]}</td>
                          <td>
                            {isWeekend ? (
                              <span className="badge badge-emerald">Cuối tuần (T5)</span>
                            ) : (
                              <span className="badge badge-muted">Ngày thường</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-icon text-red"
                              onClick={() => handleDeleteCheckIn(ck.id)}
                              title="Xoá sự kiện check-in này"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: VECTƠ ĐẶC TRƯNG THỂ LOẠI POI V_l^C (NHÃN DANH MỤC)
          ========================================================================= */}
      {activeTab === 'pois' && (
        <div className="tab-pane">
          <div className="card">
            <h4 className="card-title">
              Vectơ Đặc trưng Thể loại của Địa điểm <InlineMath latex="V_l^C \in \{0, 1\}^{|C|}" />
            </h4>
            <p className="card-description">
              Tích chọn các ô để gán nhãn thể loại cho từng POI (ô tích = 1, ô bỏ = 0). Có thể sửa tên POI hoặc tên thể loại trực tiếp.
            </p>

            <div style={{ overflowX: 'auto', marginTop: '12px' }}>
              <table className="matrix-editor-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', minWidth: '180px' }}>Tên địa điểm POI</th>
                    {categories.map((c) => (
                      <th key={c.id} style={{ minWidth: '100px' }} title={c.name}>
                        <div><strong><InlineMath latex={toMathId(c.id)} /></strong></div>
                        <div className="text-xs text-muted" style={{ fontWeight: 'normal' }}>
                          {cleanEntityName(c.name)}
                        </div>
                      </th>
                    ))}
                    <th style={{ minWidth: '180px' }}>
                      Vectơ KaTeX <InlineMath latex="V_l^C" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pois.map((p) => {
                    const vec = categories.map((c) => (p.categories.includes(c.id) ? 1 : 0));
                    const vecLatex = `V_{${toMathId(p.id)}}^C = [${vec.join(', ')}]^T`;

                    return (
                      <tr key={p.id}>
                        <td style={{ textAlign: 'left' }}>
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => handleUpdatePoiName(p.id, e.target.value)}
                            className="inline-name-edit-input"
                            title="Nhấp để sửa tên POI"
                          />
                          <div className="text-xs text-muted" style={{ paddingLeft: '6px' }}>
                            Mã: <InlineMath latex={toMathId(p.id)} />
                          </div>
                        </td>

                        {categories.map((c) => {
                          const isAssigned = p.categories.includes(c.id);
                          return (
                            <td key={c.id} style={{ background: isAssigned ? 'rgba(99, 102, 241, 0.08)' : 'transparent' }}>
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() => handleToggleCategory(p.id, c.id)}
                                className="vector-checkbox"
                                title={`${p.name} thuộc thể loại ${c.name}?`}
                              />
                            </td>
                          );
                        })}

                        <td>
                          <InlineMath latex={vecLatex} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Chỉnh sửa nhãn tên thể loại */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <h5 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                Chỉnh sửa nhãn tên các Thể loại (<InlineMath latex="C" />):
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {categories.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span><InlineMath latex={toMathId(c.id)} />:</span>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => handleUpdateCategoryName(c.id, e.target.value)}
                      className="text-input"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: MẠNG LƯỚI BẠN BÈ A_u (MA TRẬN QUAN HỆ XÃ HỘI)
          ========================================================================= */}
      {activeTab === 'friends' && (
        <div className="tab-pane">
          <div className="card">
            <h4 className="card-title">
              Mạng lưới Bạn bè &amp; Người dùng tương đồng <InlineMath latex="A_u" /> (Công thức 16)
            </h4>
            <p className="card-description">
              Tích chọn ô giao cắt giữa người dùng <InlineMath latex="u" /> và <InlineMath latex="v" /> để thiết lập quan hệ bạn bè trong tập <InlineMath latex="A_u" />. Ô đường chéo bị vô hiệu hóa vì người dùng không thể tự làm bạn với chính mình.
            </p>

            <div style={{ overflowX: 'auto', marginTop: '12px' }}>
              <table className="matrix-editor-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', minWidth: '160px' }}>Người dùng \ Bạn bè</th>
                    {users.map((v) => (
                      <th key={v.id} style={{ minWidth: '70px' }}>
                        <div><strong><InlineMath latex={toMathId(v.id)} /></strong></div>
                        <div className="text-xs text-muted" style={{ fontWeight: 'normal' }}>
                          {cleanEntityName(v.name)}
                        </div>
                      </th>
                    ))}
                    <th style={{ minWidth: '180px' }}>
                      Tập hợp <InlineMath latex="A_u" />
                    </th>
                    <th style={{ minWidth: '80px' }}>
                      Số lượng <InlineMath latex="|A_u|" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const friends = friendSets[u.id] || [];
                    const isMember = currentGroup.memberUserIds.includes(u.id);
                    const setLatex = `A_{${toMathId(u.id)}} = ${toMathSet(friends)}`;

                    return (
                      <tr key={u.id} className={isMember ? 'row-member' : ''}>
                        <td style={{ textAlign: 'left' }}>
                          <strong>{cleanEntityName(u.name)}</strong>{' '}
                          <span className="text-xs font-mono text-muted">(<InlineMath latex={toMathId(u.id)} />)</span>
                          <div className="text-xs text-muted">
                            {isMember ? 'Thành viên nhóm' : 'Người dùng ngoài'}
                          </div>
                        </td>

                        {users.map((v) => {
                          const isSelf = u.id === v.id;
                          const isFriend = friends.includes(v.id);

                          return (
                            <td
                              key={v.id}
                              style={{
                                background: isSelf
                                  ? 'var(--bg-subtle)'
                                  : isFriend
                                  ? 'rgba(16, 185, 129, 0.08)'
                                  : 'transparent'
                              }}
                            >
                              {isSelf ? (
                                <span className="text-muted" style={{ fontSize: '12px' }}>—</span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isFriend}
                                  onChange={() => handleToggleFriend(u.id, v.id)}
                                  className="vector-checkbox"
                                  title={`${u.name} kết bạn với ${v.name}?`}
                                />
                              )}
                            </td>
                          );
                        })}

                        <td>
                          <InlineMath latex={setLatex} />
                        </td>

                        <td className="matrix-total-cell">
                          {friends.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: DANH SÁCH NGƯỜI DÙNG U
          ========================================================================= */}
      {activeTab === 'users' && (
        <div className="tab-pane">
          <div className="card">
            <h4 className="card-title">Danh sách Người dùng trong Hệ thống <InlineMath latex="U" /></h4>
            <p className="card-description">
              Có thể chỉnh sửa họ và tên người dùng trực tiếp trong bảng dưới đây.
            </p>

            <table className="data-table" style={{ marginTop: '12px' }}>
              <thead>
                <tr>
                  <th>Mã người dùng</th>
                  <th>Họ và tên (có thể sửa)</th>
                  <th>Vai trò trong nhóm</th>
                  <th>Tổng lượt check-in</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMember = currentGroup.memberUserIds.includes(u.id);
                  const count = checkIns.filter((ck) => ck.userId === u.id).length;
                  return (
                    <tr key={u.id}>
                      <td><InlineMath latex={toMathId(u.id)} /></td>
                      <td>
                        <input
                          type="text"
                          value={u.name}
                          onChange={(e) => handleUpdateUserName(u.id, e.target.value)}
                          className="inline-name-edit-input"
                          title="Nhấp để sửa tên người dùng"
                        />
                      </td>
                      <td>
                        {isMember ? (
                          <span className="badge badge-emerald">Thành viên nhóm (<InlineMath latex="g" />)</span>
                        ) : (
                          <span className="badge badge-muted">Người dùng bên ngoài</span>
                        )}
                      </td>
                      <td><strong>{count}</strong> lần ghé thăm</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
