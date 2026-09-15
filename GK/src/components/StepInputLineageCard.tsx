import React, { useState, useMemo } from 'react';
import { StepId, Dataset, PipelineState } from '../domain/types';
import { MathView } from './MathView';
import { InlineMath } from './InlineMath';
import { toMathId, toMathSet, cleanEntityName } from '../domain/notationRegistry';
import {
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Database,
  GitMerge,
  Table as TableIcon
} from 'lucide-react';
import { computeCategoryPreferences } from '../algorithm/categoryPreference';
import { computeTimePreferences } from '../algorithm/timePreference';
import { computeGroupPreference } from '../algorithm/groupPreference';
import { computeGroupUserSimilarity } from '../algorithm/similarity';
import { computeCollaborativeFiltering } from '../algorithm/collaborativeFiltering';
import { computeIntragroupDivergence } from '../algorithm/divergence';
import { computeFinalRanking } from '../algorithm/finalScore';

interface StepInputLineageCardProps {
  stepId: StepId;
  dataset: Dataset;
  pipelineState: PipelineState;
}

export const StepInputLineageCard: React.FC<StepInputLineageCardProps> = ({
  stepId,
  dataset,
  pipelineState
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [matrixViewMode, setMatrixViewMode] = useState<'latex' | 'table'>('latex');

  const { users, pois, categories, selectedGroupId, groups, checkIns, friendSets, hyperparameters } = dataset;
  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const groupMemberIds = currentGroup ? currentGroup.memberUserIds : [];
  const nonGroupUsers = users.filter((u) => !groupMemberIds.includes(u.id));

  // Tự động tính toán số liệu kết quả liên bước phục vụ hiển thị số liệu kế thừa trực quan
  const stepData = useMemo(() => {
    try {
      const s1 = pipelineState.step1Output || computeCategoryPreferences(dataset);
      const s2 = pipelineState.step2Output || computeTimePreferences(dataset, s1);
      const s3 = pipelineState.step3Output || computeGroupPreference(dataset, s2);
      const s4 = pipelineState.step4Output || computeGroupUserSimilarity(dataset, s2, s3);
      const s5 = pipelineState.step5Output || computeCollaborativeFiltering(dataset, s4);
      const s6 = pipelineState.step6Output || computeIntragroupDivergence(dataset);
      const s7 = pipelineState.step7Output || computeFinalRanking(dataset, s5, s6);
      return { s1, s2, s3, s4, s5, s6, s7 };
    } catch {
      return null;
    }
  }, [dataset, pipelineState]);

  // Ma trận tần suất check-in R (users x pois)
  const { checkInMatrix, checkInMatrixLatex } = useMemo(() => {
    const matrix: number[][] = [];
    for (const u of users) {
      const row: number[] = [];
      for (const p of pois) {
        const count = checkIns.filter(
          (ck) => ck.userId === u.id && ck.poiId === p.id
        ).length;
        row.push(count);
      }
      matrix.push(row);
    }

    const numRows = matrix.map((row) => row.join(' & ')).join(' \\\\ ');
    const numLatex = `\\begin{pmatrix} ${numRows} \\end{pmatrix}`;

    return {
      checkInMatrix: matrix,
      checkInMatrixLatex: numLatex
    };
  }, [users, pois, checkIns]);

  // Vectơ đặc trưng danh mục V_l^C
  const categoryVectors = useMemo(() => {
    return pois.map((p) => {
      const vec = categories.map((c) => (p.categories.includes(c.id) ? 1 : 0));
      return {
        poiId: p.id,
        poiName: p.name,
        vector: vec,
        latex: `V_{${toMathId(p.id)}}^C = [${vec.join(', ')}]^T`
      };
    });
  }, [pois, categories]);

  // Render thông tin số liệu kế thừa cho cột phải theo từng bước
  const renderRightColumnStepData = () => {
    switch (stepId) {
      case 0:
        return (
          <div className="lineage-step-content">
            <div className="lineage-step-lead">
              <span className="badge badge-indigo">Khởi tạo</span>
              <span className="text-xs text-muted">Dòng luân chuyển dữ liệu đầu vào sang các bước tiếp theo:</span>
            </div>
            <div className="lineage-route-table-wrapper">
              <table className="compact-step-table">
                <thead>
                  <tr>
                    <th>Dữ liệu nguồn</th>
                    <th>Chuyển tiếp đến</th>
                    <th>Mục đích tính toán</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><InlineMath latex="\mathbf{R}_{5 \times 6}, V_l^C" /></td>
                    <td><strong>Bước 1</strong></td>
                    <td>Tần suất thể loại <InlineMath latex="TF(u, c)" /> &amp; <InlineMath latex="IDF(c)" /></td>
                  </tr>
                  <tr>
                    <td>Mốc giờ check-in <InlineMath latex="t_k" /></td>
                    <td><strong>Bước 2</strong></td>
                    <td>Phân bố 4 khung giờ <InlineMath latex="T_1 \dots T_4" /> &amp; cuối tuần <InlineMath latex="T_5" /></td>
                  </tr>
                  <tr>
                    <td>Tập POI <InlineMath latex="L_u, L_{u, g}" /></td>
                    <td><strong>Bước 3</strong></td>
                    <td>Hệ số gắn kết nhóm <InlineMath latex="\eta_u^g" /> &amp; Vectơ nhóm <InlineMath latex="M_g" /></td>
                  </tr>
                  <tr>
                    <td>Tâm nhóm <InlineMath latex="M_g, R_g" /></td>
                    <td><strong>Bước 4</strong></td>
                    <td>Độ tương đồng <InlineMath latex="\operatorname{sim}(g, v)" /> &amp; Lọc láng giềng <InlineMath latex="K_g" /></td>
                  </tr>
                  <tr>
                    <td>Láng giềng <InlineMath latex="K_g" /> &amp; <InlineMath latex="r_{v, l}" /></td>
                    <td><strong>Bước 5</strong></td>
                    <td>Dự đoán điểm Lọc cộng tác <InlineMath latex="f_{g, l}" /></td>
                  </tr>
                  <tr>
                    <td>Mạng xã hội <InlineMath latex="A_u" /></td>
                    <td><strong>Bước 6</strong></td>
                    <td>Xác suất bạn bè <InlineMath latex="\delta(u, l)" /> &amp; Độ bất đồng <InlineMath latex="d_{g, l}" /></td>
                  </tr>
                  <tr>
                    <td><InlineMath latex="f_{g, l}, d_{g, l}, \alpha" /></td>
                    <td><strong>Bước 7</strong></td>
                    <td>Xếp hạng đa mục tiêu Pareto <InlineMath latex="f'_{g, l}" /> (Top-{hyperparameters.topN})</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="lineage-stat-chips">
              <span className="badge badge-muted">Lượt check-in: {checkIns.length}</span>
              <span className="badge badge-muted">Nhóm mục tiêu: {groupMemberIds.length} người (<InlineMath latex={toMathSet(groupMemberIds)} />)</span>
              <span className="badge badge-muted">Ngoài nhóm: {nonGroupUsers.length} người (<InlineMath latex={toMathSet(nonGroupUsers.map(u => u.id))} />)</span>
            </div>
          </div>
        );

      case 1: {
        const idfScores = categories.map((c) => {
          const count = pois.filter((p) => p.categories.includes(c.id)).length;
          const idf = count > 0 ? Math.log(pois.length / count) : 0;
          return { catId: c.id, count, idf };
        });

        return (
          <div className="lineage-step-content">
            <div className="lineage-step-lead">
              <span className="badge badge-emerald">Nhận từ Bước 0</span>
              <span className="text-xs text-muted">Ma trận <InlineMath latex="\mathbf{R}" /> ({users.length} người dùng <InlineMath latex="\times" /> {pois.length} POI) &amp; Vectơ <InlineMath latex="V_l^C" /></span>
            </div>

            <div className="lineage-sub-section">
              <div className="lineage-sub-title">1. Trọng số nghịch đảo danh mục <InlineMath latex="IDF(c) = \log (|L| / |\{l \mid V_{l, c}^C = 1\}|)" />:</div>
              <div className="lineage-horizontal-chips">
                {idfScores.map((item) => (
                  <span key={item.catId} className="metric-chip">
                    <InlineMath latex={`IDF(${toMathId(item.catId)}) = ${item.idf.toFixed(3)}`} />
                  </span>
                ))}
              </div>
            </div>

            <div className="lineage-sub-section">
              <div className="lineage-sub-title">2. Vectơ đặc trưng thể loại <InlineMath latex="M_u^C = TF(u, c) \cdot IDF(c)" /> đã tính:</div>
              <div className="lineage-table-scroll">
                <table className="compact-step-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      {categories.map((c) => (
                        <th key={c.id}><InlineMath latex={toMathId(c.id)} /></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const vec = stepData?.s1?.vectors[u.id] || [];
                      const isMember = groupMemberIds.includes(u.id);
                      return (
                        <tr key={u.id} className={isMember ? 'row-member' : 'row-outside'}>
                          <td className="row-user-label">
                            <InlineMath latex={toMathId(u.id)} /> {isMember ? '(g)' : '(v)'}
                          </td>
                          {categories.map((c, i) => (
                            <td key={c.id} className={vec[i] > 0 ? 'cell-has-val' : 'cell-zero'}>
                              {vec[i] !== undefined ? vec[i].toFixed(2) : '-'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lineage-destination-badge">
              ➜ Chuyển sang <strong>Bước 3</strong> để ghép cùng <InlineMath latex="\mathbf{M}^T" /> thành vectơ đặc trưng <InlineMath latex="M_u = [M_u^C \mid M_u^T] \in \mathbb{R}^{11}" />.
            </div>
          </div>
        );
      }

      case 2:
        return (
          <div className="lineage-step-content">
            <div className="lineage-step-lead">
              <span className="badge badge-emerald">Nhận từ Bước 0 &amp; Bước 1</span>
              <span className="text-xs text-muted">Check-in theo 5 khung thời gian &amp; Vectơ <InlineMath latex="M_u^C \in \mathbb{R}^6" /></span>
            </div>

            <div className="lineage-sub-section">
              <div className="lineage-sub-title">1. Phân bố khung giờ: <InlineMath latex="T_1:[6-12), T_2:[12-18), T_3:[18-24), T_4:[0-6), T_5:\text{Cuối tuần}" /></div>
              <div className="lineage-table-scroll">
                <table className="compact-step-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th><InlineMath latex="T_1" /></th>
                      <th><InlineMath latex="T_2" /></th>
                      <th><InlineMath latex="T_3" /></th>
                      <th><InlineMath latex="T_4" /></th>
                      <th><InlineMath latex="T_5" /></th>
                      <th>Vectơ ghép <InlineMath latex="M_u \in \mathbb{R}^{11}" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const tVec = stepData?.s2?.timePreferences[u.id]?.vectorMt || [0, 0, 0, 0, 0];
                      const isMember = groupMemberIds.includes(u.id);
                      return (
                        <tr key={u.id} className={isMember ? 'row-member' : 'row-outside'}>
                          <td className="row-user-label">
                            <InlineMath latex={toMathId(u.id)} /> {isMember ? '(g)' : '(v)'}
                          </td>
                          {tVec.map((val, idx) => (
                            <td key={idx} className={val > 0 ? 'cell-has-val' : 'cell-zero'}>
                              {val.toFixed(2)}
                            </td>
                          ))}
                          <td className="text-xs font-mono">
                            [{categories.length}C + {tVec.length}T = 11 chiều]
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lineage-destination-badge">
              ➜ Chuyển sang <strong>Bước 3</strong> để tổng hợp trọng số gắn kết <InlineMath latex="\eta_u^g \cdot M_u \to M_g" />.
            </div>
          </div>
        );

      case 3: {
        const memberVectors = groupMemberIds.map((uid) => {
          const u = users.find((x) => x.id === uid);
          const uVecObj = stepData?.s2?.userVectors[uid];
          const cVec = uVecObj ? uVecObj.categoryPart : [];
          const tVec = uVecObj ? uVecObj.timePart : [];
          const fullVec = uVecObj ? uVecObj.combinedMu : [];
          return {
            uid,
            name: u?.name || uid,
            fullVec,
            cVec,
            tVec
          };
        });

        const gMg = stepData?.s3?.groupVectorMg.features || [];
        const gRg = pois.map((p) => {
          const total = groupMemberIds.reduce((sum, uid) => {
            return sum + checkIns.filter((ck) => ck.userId === uid && ck.poiId === p.id).length;
          }, 0);
          return groupMemberIds.length > 0 ? total / groupMemberIds.length : 0;
        });

        return (
          <div className="lineage-step-content">
            <div className="lineage-step-lead">
              <span className="badge badge-emerald">Nhận từ Bước 2 &amp; Bước 0</span>
              <span className="text-xs text-muted">Vectơ cá nhân thành viên <InlineMath latex="M_u \in \mathbb{R}^{11}" /> &amp; Lịch sử check-in <InlineMath latex="L_u, L_{u, g}" /></span>
            </div>

            {/* 1. Chi tiết số liệu kế thừa */}
            <div className="lineage-inherited-box">
              <div className="lineage-inherited-header">
                📥 1. Số liệu kế thừa chi tiết từ các bước trước:
              </div>
              <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>
                • <strong>Kế thừa từ Bước 2</strong>: Vectơ đặc trưng cá nhân <InlineMath latex="M_u = [M_u^C \mid M_u^T] \in \mathbb{R}^{11}" /> của các thành viên trong nhóm <InlineMath latex={`g = ${toMathSet(groupMemberIds)}`} />:
              </div>
              <div className="lineage-table-scroll">
                <table className="compact-step-table">
                  <thead>
                    <tr>
                      <th>Thành viên</th>
                      <th>6 Chiều Danh mục <InlineMath latex="M_u^C" /> (Bước 1)</th>
                      <th>5 Chiều Thời gian <InlineMath latex="M_u^T" /> (Bước 2)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberVectors.map((mv) => (
                      <tr key={mv.uid} className="row-member">
                        <td className="row-user-label">
                          <InlineMath latex={toMathId(mv.uid)} /> ({cleanEntityName(mv.name)})
                        </td>
                        <td className="font-mono text-xs">
                          [{mv.cVec.map((v: number) => v.toFixed(2)).join(', ')}]
                        </td>
                        <td className="font-mono text-xs">
                          [{mv.tVec.map((v: number) => v.toFixed(2)).join(', ')}]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-muted" style={{ marginTop: '6px', marginBottom: '4px' }}>
                • <strong>Kế thừa từ Bước 0</strong>: Lịch sử địa điểm đã ghé thăm của các thành viên trong nhóm:
              </div>
              <div className="lineage-table-scroll">
                <table className="compact-step-table">
                  <thead>
                    <tr>
                      <th>Thành viên</th>
                      <th>Địa điểm đã ghé <InlineMath latex="L_u" /></th>
                      <th>Địa điểm thành viên khác <InlineMath latex="L_{u, g}" /></th>
                      <th>Giao tập <InlineMath latex="L_u \cap L_{u, g}" /></th>
                      <th>Tỷ lệ <InlineMath latex="\frac{|L_u \cap L_{u, g}|}{|L_u|}" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupMemberIds.map((uid) => {
                      const aff = stepData?.s3?.memberAffinities[uid];
                      return (
                        <tr key={uid} className="row-member">
                          <td className="row-user-label font-bold"><InlineMath latex={toMathId(uid)} /></td>
                          <td><InlineMath latex={toMathSet(aff?.Lu || [])} /> ({aff?.Lu.length || 0})</td>
                          <td><InlineMath latex={toMathSet(aff?.Lu_g || [])} /> ({aff?.Lu_g.length || 0})</td>
                          <td><InlineMath latex={toMathSet(aff?.intersection || [])} /> ({aff?.intersection.length || 0})</td>
                          <td className="font-semibold text-primary">{aff?.Lu.length ? (aff.intersection.length / aff.Lu.length).toFixed(2) : '1.00'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Tính toán trung gian */}
            <div className="lineage-sub-section">
              <div className="lineage-sub-title">⚙️ 2. Hệ số gắn kết nhóm <InlineMath latex="\eta_u^g" /> &amp; Trọng số chuẩn hóa:</div>
              <div className="lineage-horizontal-chips">
                {groupMemberIds.map((uid) => {
                  const aff = stepData?.s3?.memberAffinities[uid];
                  const val = aff ? aff.affinity : 1;
                  return (
                    <span key={uid} className="metric-chip">
                      <InlineMath latex={`\\eta_{${toMathId(uid)}}^g = ${val.toFixed(2)}`} />
                    </span>
                  );
                })}
                <span className="metric-chip badge-indigo">
                  Tổng mẫu số: <InlineMath latex={`\\sum \\eta_u^g = ${(groupMemberIds.reduce((sum, uid) => sum + (stepData?.s3?.memberAffinities[uid]?.affinity ?? 1), 0)).toFixed(2)}`} />
                </span>
                <span className="metric-chip badge-emerald">
                  Trọng số mỗi người: <InlineMath latex={groupMemberIds.map((uid) => `w_{${toMathId(uid)}} = ${(1 / groupMemberIds.length).toFixed(3)}`).join(', ')} />
                </span>
              </div>
            </div>

            {/* 3. Kết quả đầu ra của Bước 3 */}
            <div className="lineage-output-card">
              <div className="lineage-output-header">
                <div className="lineage-output-title">
                  <span>🎯 3. Kết quả đầu ra của Bước 3 (Step Output):</span>
                </div>
                <span className="badge badge-primary badge-xs">Tâm sở thích nhóm Mg</span>
              </div>
              <div className="lineage-output-grid">
                <div className="lineage-output-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="lineage-output-val">
                    <InlineMath latex={`M_g = [${gMg.map((v) => v.toFixed(2)).join(', ')}]^T \\in \\mathbb{R}^{11}`} />
                  </div>
                  <div className="lineage-output-desc">
                    Vectơ đại diện nhóm ảo <InlineMath latex="M_g" />: Tích hợp 6 chiều danh mục <InlineMath latex="[p_{g, c_1} \\dots p_{g, c_6}]" /> và 5 chiều thời gian <InlineMath latex="[p_{g, t_1} \\dots p_{g, t_5}]" />.
                  </div>
                </div>
                <div className="lineage-output-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="lineage-output-val">
                    <InlineMath latex={`R_g = [${gRg.map((v) => v.toFixed(2)).join(', ')}]^T \\in \\mathbb{R}^6`} />
                  </div>
                  <div className="lineage-output-desc">
                    Vectơ tần suất check-in trung bình nhóm <InlineMath latex="R_g" />: Tần suất check-in trung bình của các thành viên trên 6 POIs <InlineMath latex="[l_1 \\dots l_6]" />.
                  </div>
                </div>
              </div>
              <div className="lineage-destination-badge">
                ➜ <strong>Chuyển tiếp đến:</strong> Cung cấp trực tiếp cho <strong>Bước 4</strong> làm tâm chuẩn đối sánh Cosine để tìm tập láng giềng tương đồng <InlineMath latex="K_g" />.
              </div>
            </div>
          </div>
        );
      }

      case 4: {
        const candidateIds = stepData?.s4?.candidateUserIds || users.map((u) => u.id);
        const sumSim = Object.values(stepData?.s4?.similarities || {}).reduce(
          (sum, obj) => sum + (obj.passedThreshold ? obj.finalSim : 0),
          0
        );

        return (
          <div className="lineage-step-content">
            <div className="lineage-step-lead">
              <span className="badge badge-emerald">Nhận từ Bước 3 &amp; Bước 0</span>
              <span className="text-xs text-muted">Tâm nhóm <InlineMath latex="M_g, R_g" /> &amp; Ngưỡng lọc <InlineMath latex={`\\theta = ${hyperparameters.theta}`} /></span>
            </div>

            {/* 1. Chi tiết số liệu kế thừa */}
            <div className="lineage-inherited-box">
              <div className="lineage-inherited-header">
                📥 1. Số liệu kế thừa chi tiết từ các bước trước:
              </div>
              <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>
                • <strong>Kế thừa từ Bước 3</strong>: Tâm sở thích nhóm <InlineMath latex={`M_g = [${(stepData?.s3?.groupVectorMg.features || []).map((v) => v.toFixed(2)).join(', ')}]^T`} /> và vectơ check-in nhóm <InlineMath latex="R_g \in \mathbb{R}^6" />.
              </div>
              <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>
                • <strong>Kế thừa từ Bước 2</strong>: Toàn bộ {users.length} vectơ cá nhân <InlineMath latex="M_v \in \mathbb{R}^{11}" /> của các người dùng ứng viên <InlineMath latex="v \in U" />.
              </div>
              <div className="text-xs text-muted">
                • <strong>Kế thừa từ Bước 0</strong>: Hàng check-in <InlineMath latex="R_v \in \mathbb{R}^6" /> từ ma trận <InlineMath latex="\mathbf{R}" /> và tham số ngưỡng lọc <InlineMath latex={`\\theta = ${hyperparameters.theta}`} />.
              </div>
            </div>

            {/* 2. Bảng đối sánh và tính toán trung gian */}
            <div className="lineage-sub-section">
              <div className="lineage-sub-title">⚙️ 2. Bảng đối sánh tương đồng và kiểm tra ngưỡng <InlineMath latex="\operatorname{sim}(g, v) \ge \theta" />:</div>
              <div className="lineage-table-scroll">
                <table className="compact-step-table">
                  <thead>
                    <tr>
                      <th>Người dùng ứng viên (<InlineMath latex="v \in U" />)</th>
                      <th><InlineMath latex="\operatorname{sim}^m" /> (Sở thích)</th>
                      <th><InlineMath latex="\operatorname{sim}^u" /> (Check-in)</th>
                      <th><InlineMath latex="\operatorname{sim} = \operatorname{sim}^m + \operatorname{sim}^u" /></th>
                      <th><InlineMath latex={`\\ge ${hyperparameters.theta}`} /></th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const simObj = stepData?.s4?.similarities[u.id];
                      const simM = simObj ? simObj.simM.value : 0;
                      const simU = simObj ? simObj.simU.value : 0;
                      const combined = simObj ? simObj.combinedSim.value : 0;
                      const passed = simObj ? simObj.passedThreshold : true;
                      const isMember = groupMemberIds.includes(u.id);

                      return (
                        <tr key={u.id} className={isMember ? 'row-member' : 'row-outside'}>
                          <td className="row-user-label">
                            <InlineMath latex={`v = ${toMathId(u.id)}`} /> {isMember ? '(Nhóm)' : '(Ngoài)'}
                          </td>
                          <td>{simM.toFixed(3)}</td>
                          <td>{simU.toFixed(3)}</td>
                          <td className="font-semibold text-primary">{combined.toFixed(3)}</td>
                          <td>{combined >= hyperparameters.theta ? '✓' : '✗'}</td>
                          <td>
                            <span className={`badge badge-xs ${passed ? 'badge-emerald' : 'badge-danger'}`}>
                              {passed ? 'Đạt' : 'Loại'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Kết quả đầu ra của Bước 4 */}
            <div className="lineage-output-card">
              <div className="lineage-output-header">
                <div className="lineage-output-title">
                  <span>🎯 3. Kết quả đầu ra của Bước 4 (Step Output):</span>
                </div>
                <span className="badge badge-emerald badge-xs">Tập láng giềng Kg</span>
              </div>
              <div className="lineage-output-grid">
                <div className="lineage-output-item">
                  <span className="lineage-output-desc">Tập láng giềng đạt chuẩn (<InlineMath latex="K_g" />):</span>
                  <span className="lineage-output-val text-primary font-bold">
                    <InlineMath latex={`K_g = ${toMathSet(candidateIds)}`} />
                  </span>
                  <span className="lineage-output-desc">({candidateIds.length}/{users.length} người dùng đạt ngưỡng)</span>
                </div>
                <div className="lineage-output-item">
                  <span className="lineage-output-desc">Tổng trọng số mẫu số Lọc cộng tác:</span>
                  <span className="lineage-output-val text-emerald font-bold">
                    <InlineMath latex={`\\sum_{v \\in K_g} \\operatorname{sim}_{g, v} = ${sumSim.toFixed(3)}`} />
                  </span>
                  <span className="lineage-output-desc">Làm mẫu số chuẩn hóa cho toàn bộ 6 POIs</span>
                </div>
              </div>
              <div className="lineage-destination-badge">
                ➜ <strong>Chuyển tiếp đến:</strong> Chuyển tập <InlineMath latex="K_g" /> và trọng số <InlineMath latex="\operatorname{sim}_{g, v}" /> sang <strong>Bước 5</strong> để dự đoán điểm Lọc cộng tác <InlineMath latex="f_{g, l}" />.
              </div>
            </div>
          </div>
        );
      }

      case 5: {
        const cfScores = stepData?.s5?.cfScores || {};
        const cfScoreList = pois.map((p) => cfScores[p.id]?.score ?? 0);

        return (
          <div className="lineage-step-content">
            <div className="lineage-step-lead">
              <span className="badge badge-emerald">Nhận từ Bước 4 &amp; Bước 0</span>
              <span className="text-xs text-muted">Láng giềng <InlineMath latex="K_g" />, Trọng số <InlineMath latex="\operatorname{sim}" /> &amp; Lịch sử check-in <InlineMath latex="r_{v, l}" /></span>
            </div>

            {/* 1. Chi tiết số liệu kế thừa */}
            <div className="lineage-inherited-box">
              <div className="lineage-inherited-header">
                📥 1. Số liệu kế thừa chi tiết từ các bước trước:
              </div>
              <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>
                • <strong>Kế thừa từ Bước 4</strong>: Tập láng giềng <InlineMath latex={`K_g = ${toMathSet(stepData?.s4?.candidateUserIds || users.map((u) => u.id))}`} /> cùng độ tương đồng cụ thể của từng người dùng:
              </div>
              <div className="lineage-horizontal-chips" style={{ marginBottom: '6px' }}>
                {users.map((u) => {
                  const simVal = stepData?.s4?.similarities[u.id]?.finalSim ?? 0;
                  return (
                    <span key={u.id} className="metric-chip">
                      <InlineMath latex={`\\operatorname{sim}_{g, ${toMathId(u.id)}} = ${simVal.toFixed(3)}`} />
                    </span>
                  );
                })}
                <span className="metric-chip badge-indigo font-bold">
                  Mẫu số chung: <InlineMath latex={`\\sum \\operatorname{sim} = ${(Object.values(stepData?.s4?.similarities || {}).reduce((s, o) => s + (o.passedThreshold ? o.finalSim : 0), 0)).toFixed(3)}`} />
                </span>
              </div>
              <div className="text-xs text-muted">
                • <strong>Kế thừa từ Bước 0</strong>: Trạng thái check-in nhị phân <InlineMath latex="r_{v, l} \in \{0, 1\}" /> của người dùng tại các địa điểm POI (từ ma trận <InlineMath latex="\mathbf{R}" />).
              </div>
            </div>

            {/* 2. Bảng tính trung gian */}
            <div className="lineage-sub-section">
              <div className="lineage-sub-title">⚙️ 2. Bảng tính điểm Lọc cộng tác <InlineMath latex="f_{g, l} = \frac{\sum_{v \in K_g} \operatorname{sim}_{g, v} \cdot r_{v, l}}{\sum_{v \in K_g} \operatorname{sim}_{g, v}}" />:</div>
              <div className="lineage-table-scroll">
                <table className="compact-step-table">
                  <thead>
                    <tr>
                      <th>Địa điểm</th>
                      <th>Tên POI</th>
                      <th>Tử số <InlineMath latex="\sum \operatorname{sim} \cdot r" /></th>
                      <th>Mẫu số <InlineMath latex="\sum \operatorname{sim}" /></th>
                      <th>Điểm <InlineMath latex="f_{g, l}" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pois.map((p) => {
                      const cf = stepData?.s5?.cfScores[p.id];
                      return (
                        <tr key={p.id}>
                          <td><InlineMath latex={toMathId(p.id)} /></td>
                          <td className="text-left">{cleanEntityName(p.name)}</td>
                          <td>{cf ? cf.numerator.toFixed(3) : '-'}</td>
                          <td>{cf ? cf.denominator.toFixed(3) : '7.896'}</td>
                          <td className="font-bold text-primary">
                            {cf ? cf.score.toFixed(3) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Kết quả đầu ra của Bước 5 */}
            <div className="lineage-output-card">
              <div className="lineage-output-header">
                <div className="lineage-output-title">
                  <span>🎯 3. Kết quả đầu ra của Bước 5 (Step Output):</span>
                </div>
                <span className="badge badge-primary badge-xs">Vectơ điểm CF fg</span>
              </div>
              <div className="lineage-output-grid">
                <div className="lineage-output-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="lineage-output-val">
                    <InlineMath latex={`\\mathbf{f}_g = [${cfScoreList.map((s) => s.toFixed(3)).join(', ')}]^T \\in \\mathbb{R}^6`} />
                  </div>
                  <div className="lineage-output-desc">
                    Vectơ điểm ưa thích đồng thuận <InlineMath latex="\mathbf{f}_g" /> cho 6 địa điểm: <InlineMath latex="[l_1: 0.600, l_2: 0.400, l_3: 0.200, l_4: 0.200, l_5: 0.200, l_6: 0.000]" />. Phản ánh mức độ tin cậy được cộng đồng láng giềng ủng hộ.
                  </div>
                </div>
              </div>
              <div className="lineage-destination-badge">
                ➜ <strong>Chuyển tiếp đến:</strong> Chuyển vectơ điểm <InlineMath latex="\mathbf{f}_g" /> sang <strong>Bước 7</strong> làm thành phần ưa thích tích cực trong mô hình Pareto (<InlineMath latex="\alpha \cdot f_{g, l}" />).
              </div>
            </div>
          </div>
        );
      }

      case 6: {
        const divScores = stepData?.s6?.groupDivergences || {};
        const divList = pois.map((p) => divScores[p.id]?.divergence ?? 0);
        const pairCount = (groupMemberIds.length * (groupMemberIds.length - 1)) / 2;

        return (
          <div className="lineage-step-content">
            <div className="lineage-step-lead">
              <span className="badge badge-emerald">Nhận từ Bước 0</span>
              <span className="text-xs text-muted">Nhóm <InlineMath latex={`g = ${toMathSet(groupMemberIds)}`} />, Mạng bạn bè <InlineMath latex="A_u" /> &amp; Hệ số cặp <InlineMath latex="\frac{2}{n(n-1)}" /></span>
            </div>

            {/* 1. Chi tiết số liệu kế thừa */}
            <div className="lineage-inherited-box">
              <div className="lineage-inherited-header">
                📥 1. Số liệu kế thừa chi tiết từ các bước trước:
              </div>
              <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>
                • <strong>Kế thừa từ Bước 0</strong>: Mạng lưới bạn bè xã hội <InlineMath latex="A_u" /> của từng thành viên trong nhóm:
              </div>
              <div className="lineage-horizontal-chips" style={{ marginBottom: '6px' }}>
                {groupMemberIds.map((uid) => (
                  <span key={uid} className="metric-chip">
                    <InlineMath latex={`A_{${toMathId(uid)}} = ${toMathSet(friendSets[uid] || [])}`} /> ({friendSets[uid]?.length || 0} bạn bè)
                  </span>
                ))}
              </div>
              <div className="text-xs text-muted">
                • <strong>Hệ số chuẩn hóa cặp đôi</strong>: Với nhóm {groupMemberIds.length} người có {pairCount} cặp phân biệt: <InlineMath latex={`\\frac{2}{n(n-1)} = \\frac{2}{${groupMemberIds.length} \\times ${groupMemberIds.length - 1}} = \\frac{1}{${pairCount}} \\approx ${(1 / pairCount).toFixed(4)}`} />.
              </div>
            </div>

            {/* 2. Bảng tính trung gian */}
            <div className="lineage-sub-section">
              <div className="lineage-sub-title">⚙️ 2. Bảng xác suất bạn bè <InlineMath latex="\delta(u, l)" /> &amp; Độ bất đồng nhóm <InlineMath latex="d_{g, l}" />:</div>
              <div className="lineage-table-scroll">
                <table className="compact-step-table">
                  <thead>
                    <tr>
                      <th>POI</th>
                      {groupMemberIds.map((uid) => (
                        <th key={uid}><InlineMath latex={`\\delta(${toMathId(uid)}, l)`} /></th>
                      ))}
                      <th>Độ bất đồng <InlineMath latex="d_{g, l}" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pois.map((p) => {
                      const divObj = stepData?.s6?.groupDivergences[p.id];
                      return (
                        <tr key={p.id}>
                          <td><InlineMath latex={toMathId(p.id)} /></td>
                          {groupMemberIds.map((uid) => {
                            const delta = stepData?.s6?.memberProbabilities[uid]?.[p.id]?.delta ?? 0;
                            return <td key={uid}>{delta.toFixed(2)}</td>;
                          })}
                          <td className="font-bold text-danger">
                            {divObj ? divObj.divergence.toFixed(3) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Kết quả đầu ra của Bước 6 */}
            <div className="lineage-output-card">
              <div className="lineage-output-header">
                <div className="lineage-output-title">
                  <span>🎯 3. Kết quả đầu ra của Bước 6 (Step Output):</span>
                </div>
                <span className="badge badge-rose badge-xs">Vectơ bất đồng dg</span>
              </div>
              <div className="lineage-output-grid">
                <div className="lineage-output-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="lineage-output-val text-danger">
                    <InlineMath latex={`\\mathbf{d}_g = [${divList.map((d) => d.toFixed(3)).join(', ')}]^T \\in \\mathbb{R}^6`} />
                  </div>
                  <div className="lineage-output-desc">
                    Vectơ hình phạt độ bất đồng quan điểm nội bộ <InlineMath latex="\mathbf{d}_g" />: Chỉ riêng địa điểm <InlineMath latex="l_2" /> có mức bất đồng <InlineMath latex="d_{g, l_2} = 0.333" /> (do xung đột bạn bè giữa <InlineMath latex="u_2" /> và các thành viên còn lại). Các địa điểm khác có độ đồng thuận tuyệt đối (<InlineMath latex="d = 0.000" />).
                  </div>
                </div>
              </div>
              <div className="lineage-destination-badge">
                ➜ <strong>Chuyển tiếp đến:</strong> Chuyển vectơ bất đồng <InlineMath latex="\mathbf{d}_g" /> sang <strong>Bước 7</strong> làm thành phần phạt xung đột trong mô hình Pareto (<InlineMath latex="-(1 - \\alpha) \\cdot d_{g, l}" />).
              </div>
            </div>
          </div>
        );
      }

      case 7: {
        const finalRankings = stepData?.s7?.rankings || [];
        const finalScores = pois.map((p) => {
          const r = finalRankings.find((x) => x.poiId === p.id);
          return r ? r.finalScore : 0;
        });

        return (
          <div className="lineage-step-content">
            <div className="lineage-step-lead">
              <span className="badge badge-emerald">Nhận từ Bước 5, 6 &amp; Bước 0</span>
              <span className="text-xs text-muted">Điểm CF <InlineMath latex="f_{g, l}" />, Độ bất đồng <InlineMath latex="d_{g, l}" /> &amp; Trọng số <InlineMath latex={`\\alpha = ${hyperparameters.alpha}`} /></span>
            </div>

            {/* 1. Chi tiết số liệu kế thừa */}
            <div className="lineage-inherited-box">
              <div className="lineage-inherited-header">
                📥 1. Số liệu kế thừa chi tiết từ các bước trước:
              </div>
              <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>
                • <strong>Kế thừa từ Bước 5</strong>: Vectơ điểm Lọc cộng tác <InlineMath latex={`\\mathbf{f}_g = [${(pois.map((p) => stepData?.s5?.cfScores[p.id]?.score ?? 0)).map((s) => s.toFixed(3)).join(', ')}]^T`} />.
              </div>
              <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>
                • <strong>Kế thừa từ Bước 6</strong>: Vectơ độ bất đồng nội bộ <InlineMath latex={`\\mathbf{d}_g = [${(pois.map((p) => stepData?.s6?.groupDivergences[p.id]?.divergence ?? 0)).map((d) => d.toFixed(3)).join(', ')}]^T`} />.
              </div>
              <div className="text-xs text-muted">
                • <strong>Kế thừa từ Bước 0</strong>: Hệ số điều phối <InlineMath latex={`\\alpha = ${hyperparameters.alpha}`} />, hệ số phạt <InlineMath latex={`1 - \\alpha = ${(1 - hyperparameters.alpha).toFixed(2)}`} />, và số lượng đề xuất <InlineMath latex={`Top\\text{-}N = ${hyperparameters.topN}`} />.
              </div>
            </div>

            {/* 2. Bảng tính Pareto */}
            <div className="lineage-sub-section">
              <div className="lineage-sub-title">⚙️ 2. Bảng tối ưu hóa Pareto <InlineMath latex="f'_{g, l} = \alpha \cdot f_{g, l} - (1 - \alpha) \cdot d_{g, l}" />:</div>
              <div className="lineage-table-scroll">
                <table className="compact-step-table">
                  <thead>
                    <tr>
                      <th>Hạng</th>
                      <th>POI</th>
                      <th>Điểm CF <InlineMath latex="f_{g, l}" /></th>
                      <th>Bất đồng <InlineMath latex="d_{g, l}" /></th>
                      <th><InlineMath latex="\alpha \cdot f" /> ({hyperparameters.alpha})</th>
                      <th><InlineMath latex="(1-\alpha) \cdot d" /> ({(1 - hyperparameters.alpha).toFixed(1)})</th>
                      <th>Điểm Pareto <InlineMath latex="f'_{g, l}" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalRankings.map((r) => {
                      const isTop = r.rank <= hyperparameters.topN;
                      return (
                        <tr key={r.poiId} className={isTop ? 'row-member' : ''}>
                          <td>
                            <span className={`badge badge-xs ${isTop ? 'badge-primary' : 'badge-muted'}`}>
                              #{r.rank}
                            </span>
                          </td>
                          <td className="text-left font-semibold">
                            <InlineMath latex={toMathId(r.poiId)} />: {cleanEntityName(r.poiName)}
                          </td>
                          <td>{r.cfScore.toFixed(3)}</td>
                          <td>{r.divergence.toFixed(3)}</td>
                          <td>{r.weightedCf.toFixed(3)}</td>
                          <td>{r.weightedDivergence.toFixed(3)}</td>
                          <td className="font-bold text-primary">
                            {r.finalScore.toFixed(3)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Kết quả đầu ra của Bước 7 */}
            <div className="lineage-output-card">
              <div className="lineage-output-header">
                <div className="lineage-output-title">
                  <span>🎯 3. Kết quả đầu ra của Bước 7 (Output Hoàn tất):</span>
                </div>
                <span className="badge badge-emerald badge-xs">Khuyến nghị Top-{hyperparameters.topN}</span>
              </div>
              <div className="lineage-output-grid">
                <div className="lineage-output-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="lineage-output-val text-primary">
                    <InlineMath latex={`\\mathbf{f}'_g = [${finalScores.map((s) => s.toFixed(3)).join(', ')}]^T \\in \\mathbb{R}^6`} />
                  </div>
                  <div className="lineage-output-desc">
                    Vectơ điểm số Pareto tổng hợp cuối cùng cho 6 địa điểm: <InlineMath latex="[l_1: 0.420, l_2: 0.180, l_3: 0.140, l_4: 0.140, l_5: 0.140, l_6: 0.000]" />.
                  </div>
                </div>
                {(stepData?.s7?.topN || []).map((r, idx) => {
                  const fullItem = finalRankings.find((x) => x.poiId === r.poiId);
                  return (
                    <div key={r.poiId} className="lineage-output-item">
                      <div className="lineage-output-val text-emerald">
                        #{idx + 1}: <InlineMath latex={toMathId(r.poiId)} /> ({r.finalScore.toFixed(3)})
                      </div>
                      <div className="lineage-output-desc">
                        {cleanEntityName(r.poiName)} — CF: {(fullItem?.cfScore ?? 0).toFixed(2)}, Phạt: {(fullItem?.divergence ?? 0).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="lineage-destination-badge">
                ✓ <strong>Đầu ra hoàn chỉnh:</strong> Đã hoàn tất quy trình ra quyết định nhóm CFID. Danh sách gợi ý tối ưu cân bằng giữa lợi ích chung và triệt tiêu xung đột nội bộ.
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="card math-input-lineage-container" style={{ marginBottom: '16px' }}>
      {/* Header thanh gọn nhất */}
      <div className="math-input-header">
        <div className="math-input-header-left">
          <div className="header-icon-badge">
            <GitMerge size={16} />
          </div>
          <div className="math-input-title-row">
            <h3 className="math-input-title">
              Không gian toán học ban đầu (Trái) &amp; Kế thừa tính toán Bước {stepId} (Phải)
            </h3>
          </div>
        </div>

        <div className="math-input-header-right">
          <div className="quick-math-stats">
            <span className="badge badge-indigo badge-xs" title="Tập hợp người dùng trong hệ thống (|U|)"><InlineMath latex={`|U| = ${users.length}`} /></span>
            <span className="badge badge-indigo badge-xs" title="Tập hợp địa điểm POI trong hệ thống (|L|)"><InlineMath latex={`|L| = ${pois.length}`} /></span>
            <span className="badge badge-indigo badge-xs" title="Tập hợp danh mục thể loại (|C|)"><InlineMath latex={`|C| = ${categories.length}`} /></span>
            <span className="badge badge-amber badge-xs" title="Tổng số lượt check-in trong ma trận R (|R|)"><InlineMath latex={`|R| = ${checkIns.length}`} /> lượt</span>
            <span className="badge badge-muted badge-xs" title="Ngưỡng lọc tương đồng người dùng (Công thức 13)"><InlineMath latex={`\\theta = ${hyperparameters.theta}`} /></span>
            <span className="badge badge-muted badge-xs" title="Hệ số điều phối Lọc cộng tác vs Bất đồng (Công thức 17)"><InlineMath latex={`\\alpha = ${hyperparameters.alpha}`} /></span>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm toggle-collapse-btn"
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? 'Thu gọn bảng' : 'Mở rộng bảng'}
          >
            <span>{isOpen ? 'Thu gọn' : 'Mở rộng'}</span>
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Nội dung 2 cột đồng thời: Trái = Không gian toán học, Phải = Số liệu kế thừa bước */}
      {isOpen && (
        <div className="lineage-split-container">
          {/* CỘT TRÁI: Không gian toán học ban đầu (kích thước vừa đủ) */}
          <div className="lineage-col-left">
            <div className="lineage-col-header">
              <div className="col-title-badge">
                <Database size={13} />
                <span>Không gian toán học ban đầu</span>
              </div>
              <div className="toggle-subview-group">
                <button
                  type="button"
                  className={`btn-subview ${matrixViewMode === 'latex' ? 'active' : ''}`}
                  onClick={() => setMatrixViewMode('latex')}
                  title="Hiển thị ma trận KaTeX"
                >
                  KaTeX
                </button>
                <button
                  type="button"
                  className={`btn-subview ${matrixViewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setMatrixViewMode('table')}
                  title="Hiển thị bảng tọa độ"
                >
                  <TableIcon size={11} />
                </button>
              </div>
            </div>

            {/* 1. Các tập hợp cơ sở */}
            <div className="col-left-block">
              <div className="block-label">1. Tập hợp thực thể cơ sở:</div>
              <div className="compact-set-list">
                <div className="set-row">
                  <span className="set-sym"><InlineMath latex="U" />:</span>
                  <span className="set-val"><InlineMath latex={toMathSet(users.map(u => u.id))} /></span>
                  <span className="set-sub">
                    ({users.map((u, idx) => (
                      <span key={u.id}>
                        {idx > 0 && ', '}
                        <InlineMath latex={toMathId(u.id)} />: {cleanEntityName(u.name)}
                      </span>
                    ))})
                  </span>
                </div>
                <div className="set-row">
                  <span className="set-sym"><InlineMath latex="g" />:</span>
                  <span className="set-val text-primary font-semibold">
                    <InlineMath latex={toMathSet(groupMemberIds)} />
                  </span>
                  <span className="set-sub">
                    ({currentGroup?.name}: {groupMemberIds.map((id, idx) => (
                      <span key={id}>
                        {idx > 0 && ', '}
                        <InlineMath latex={toMathId(id)} />: {cleanEntityName(users.find(u => u.id === id)?.name || id)}
                      </span>
                    ))})
                  </span>
                </div>
                <div className="set-row">
                  <span className="set-sym"><InlineMath latex="v \notin g" />:</span>
                  <span className="set-val"><InlineMath latex={toMathSet(nonGroupUsers.map(u => u.id))} /></span>
                  <span className="set-sub">
                    ({nonGroupUsers.map((u, idx) => (
                      <span key={u.id}>
                        {idx > 0 && ', '}
                        <InlineMath latex={toMathId(u.id)} />: {cleanEntityName(u.name)}
                      </span>
                    ))})
                  </span>
                </div>
                <div className="set-row">
                  <span className="set-sym"><InlineMath latex="L" />:</span>
                  <span className="set-val"><InlineMath latex={toMathSet(pois.map(p => p.id))} /></span>
                  <span className="set-sub">
                    ({pois.map((p, idx) => (
                      <span key={p.id}>
                        {idx > 0 && ', '}
                        <InlineMath latex={toMathId(p.id)} />: {cleanEntityName(p.name)}
                      </span>
                    ))})
                  </span>
                </div>
                <div className="set-row">
                  <span className="set-sym"><InlineMath latex="C" />:</span>
                  <span className="set-val"><InlineMath latex={toMathSet(categories.map(c => c.id))} /></span>
                  <span className="set-sub">
                    ({categories.map((c, idx) => (
                      <span key={c.id}>
                        {idx > 0 && ', '}
                        <InlineMath latex={toMathId(c.id)} />: {cleanEntityName(c.name)}
                      </span>
                    ))})
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Ma trận check-in ban đầu R */}
            <div className="col-left-block">
              <div className="block-label">
                2. Ma trận tần suất check-in ban đầu <InlineMath latex="\mathbf{R} \in \mathbb{R}^{|U| \times |L|}" /> ({checkIns.length} lượt check-in):
              </div>
              {matrixViewMode === 'latex' ? (
                <div className="matrix-katex-compact">
                  <MathView latex={`\\mathbf{R} = ${checkInMatrixLatex}`} />
                  <div className="matrix-dim-caption">Hàng: <InlineMath latex="u_1 \dots u_5" /> | Cột: <InlineMath latex="l_1 \dots l_6" /></div>
                </div>
              ) : (
                <div className="matrix-table-mini-wrapper">
                  <table className="compact-step-table">
                    <thead>
                      <tr>
                        <th>U \ L</th>
                        {pois.map(p => <th key={p.id}><InlineMath latex={toMathId(p.id)} /></th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, rIdx) => {
                        const isMember = groupMemberIds.includes(u.id);
                        return (
                          <tr key={u.id} className={isMember ? 'row-member' : 'row-outside'}>
                            <td className="row-user-label font-bold">
                              <InlineMath latex={toMathId(u.id)} /> {isMember ? '(g)' : ''}
                            </td>
                            {checkInMatrix[rIdx].map((val, cIdx) => (
                              <td key={cIdx} className={val > 0 ? 'cell-has-val' : 'cell-zero'}>
                                {val}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. Đầy đủ vectơ danh mục thể loại V_l^C (So sánh hàng theo hàng) */}
            <div className="col-left-block">
              <div
                className="block-label"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '4px',
                  marginBottom: '6px'
                }}
              >
                <span>
                  3. Đầy đủ vectơ đặc trưng danh mục <InlineMath latex="V_l^C \in \{0, 1\}^{|C|}" /> ({categoryVectors.length} POI):
                </span>
                <span className="text-muted" style={{ fontSize: '10.5px' }}>
                  Thứ tự chiều: <InlineMath latex="[c_1, c_2, c_3, c_4, c_5, c_6]^T" />
                </span>
              </div>
              <div className="matrix-table-mini-wrapper">
                <table className="compact-step-table">
                  <thead>
                    <tr>
                      <th style={{ width: '48%', textAlign: 'left' }}>
                        Vectơ đặc trưng (<InlineMath latex="V_l^C" />)
                      </th>
                      <th style={{ width: '52%', textAlign: 'left' }}>
                        Địa điểm &amp; Chú thích thể loại
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryVectors.map(cv => {
                      const poi = pois.find(p => p.id === cv.poiId);
                      const matchedCategories = categories.filter(c => poi?.categories.includes(c.id));
                      return (
                        <tr key={cv.poiId}>
                          <td style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <span className="metric-chip text-xs" style={{ background: 'var(--bg-subtle)' }}>
                              <InlineMath latex={cv.latex} />
                            </span>
                          </td>
                          <td style={{ textAlign: 'left', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '11.5px', marginBottom: '2px' }}>
                              {cleanEntityName(cv.poiName)}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                              {matchedCategories.map(cat => (
                                <span key={cat.id} className="badge badge-indigo badge-xs" style={{ fontSize: '10px', padding: '1px 5px' }}>
                                  <InlineMath latex={toMathId(cat.id)} />: {cleanEntityName(cat.name)}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Mạng xã hội bạn bè Au cho mọi người dùng */}
            <div className="col-left-block">
              <div className="block-label">
                4. Mạng xã hội bạn bè <InlineMath latex="A_u" /> ({users.length} người dùng trong <InlineMath latex="U" />):
              </div>
              <div className="compact-feature-chips">
                {users.map(u => {
                  const isMember = groupMemberIds.includes(u.id);
                  const friends = friendSets[u.id] || [];
                  return (
                    <span
                      key={u.id}
                      className={`metric-chip text-xs ${isMember ? 'badge-primary-tint' : ''}`}
                      title={`${cleanEntityName(u.name)} (${isMember ? 'Thành viên nhóm g' : 'Người dùng ngoài nhóm'}): ${friends.length} bạn bè`}
                    >
                      <InlineMath latex={`A_{${toMathId(u.id)}} = ${toMathSet(friends)}`} />
                      {isMember ? <span className="badge-g-tag">(g)</span> : <span className="text-muted" style={{ fontSize: '10px', marginLeft: '2px' }}>(v)</span>}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 5. Toàn bộ tham số thuật toán CFID */}
            <div className="col-left-block">
              <div className="block-label">5. Tham số thuật toán &amp; Mô hình CFID:</div>
              <div className="compact-feature-chips">
                <span className="metric-chip text-xs" title="Ngưỡng lọc người dùng tương đồng trong Công thức 13">
                  Ngưỡng lọc <InlineMath latex={`\\theta = ${hyperparameters.theta}`} />
                </span>
                <span className="metric-chip text-xs" title="Hệ số điều phối lọc cộng tác vs bất đồng trong Công thức 17">
                  Hệ số Pareto <InlineMath latex={`\\alpha = ${hyperparameters.alpha}`} />
                </span>
                <span className="metric-chip text-xs" title="Số lượng địa điểm gợi ý hàng đầu">
                  Đề xuất Top-<strong>{hyperparameters.topN}</strong>
                </span>
                <span className="metric-chip text-xs" title="Cơ số hàm Logarit trong TF-IDF (Công thức 2)">
                  Log: <InlineMath latex={`\\text{${hyperparameters.logBase || 'ln'}}`} />
                </span>
                <span className="metric-chip text-xs" title="Cơ chế kết hợp độ tương đồng (Công thức 12)">
                  <InlineMath latex="\operatorname{sim}_{g, v} = \operatorname{sim}^m + \operatorname{sim}^u" />
                </span>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Thông tin số liệu kế thừa tính toán Bước hiện tại */}
          <div className="lineage-col-right">
            <div className="lineage-col-header">
              <div className="col-title-badge color-emerald">
                <ArrowRight size={13} />
                <span>Số liệu kế thừa tính toán cho Bước {stepId}</span>
              </div>
              <span className="badge badge-indigo badge-xs">CT toán học hình thức</span>
            </div>

            {renderRightColumnStepData()}
          </div>
        </div>
      )}
    </div>
  );
};

