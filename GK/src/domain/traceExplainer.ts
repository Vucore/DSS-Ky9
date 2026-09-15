import { CalculationTraceMeta } from './types';

export interface NumberOriginItem {
  symbol: string; // KaTeX math symbol or label
  value: string;  // Numerical value
  origin: string; // Explanation of where this number was retrieved from
}

/**
 * Trích xuất và lý giải nguồn gốc từng con số trong phép tính thuật toán CFID
 */
export function getTraceNumberOrigins(trace: CalculationTraceMeta): NumberOriginItem[] {
  const items: NumberOriginItem[] = [];
  const inputs = trace.inputs || {};
  const intermediate = trace.intermediateValues || {};
  const fn = trace.formulaNumber || '';

  // 1. Bước 1: Sở thích danh mục người dùng (Công thức 2, 3)
  if (fn.includes('(2)') || fn.includes('(3)')) {
    if (inputs.userCatCheckins !== undefined) {
      items.push({
        symbol: 'r_{u, c}',
        value: String(inputs.userCatCheckins),
        origin: 'Số lượt người dùng đã check-in vào danh mục này (tổng hợp từ bảng check-in R ban đầu)'
      });
    }
    if (inputs.totalUserCheckins !== undefined) {
      items.push({
        symbol: '\\sum r_{u, l_k}',
        value: String(inputs.totalUserCheckins),
        origin: 'Tổng số lượt check-in của người dùng trên toàn bộ mọi địa điểm'
      });
    }
    if (inputs.totalCategoryAssignments !== undefined) {
      items.push({
        symbol: '\\sum f',
        value: String(inputs.totalCategoryAssignments),
        origin: 'Tổng số lượt gán danh mục của toàn bộ POI trong hệ thống (độ bao phủ danh mục)'
      });
    }
    if (inputs.catPoiCount !== undefined) {
      items.push({
        symbol: '\\sum f_{l_k, c}',
        value: String(inputs.catPoiCount),
        origin: 'Số lượng địa điểm (POI) trong hệ thống thuộc danh mục này'
      });
    }
    if (intermediate.tf !== undefined) {
      items.push({
        symbol: '\\text{TF}',
        value: Number(intermediate.tf).toFixed(4),
        origin: 'Tần suất check-in danh mục = Số lượt check-in danh mục / Tổng số lượt check-in'
      });
    }
    if (intermediate.idf !== undefined) {
      items.push({
        symbol: '\\text{IDF}',
        value: Number(intermediate.idf).toFixed(4),
        origin: 'Nghịch đảo tần suất địa điểm = ln(Tổng gán danh mục / Số POI của danh mục)'
      });
    }
    return items;
  }

  // 2. Bước 2: Sở thích thời gian (Công thức 4, 5, 6)
  if (fn.includes('(4)') || fn.includes('(5)') || fn.includes('(6)')) {
    if (inputs.slotVisits !== undefined) {
      items.push({
        symbol: 'n_{u, t_k}',
        value: String(inputs.slotVisits),
        origin: 'Số lượt check-in trong khung giờ này (trích xuất từ mốc thời gian check-in)'
      });
      items.push({
        symbol: '\\sum n_{u, t_k}',
        value: String(inputs.totalSlotVisits),
        origin: 'Tổng số lượt check-in của người dùng trong cả 4 khung giờ ban ngày'
      });
    } else if (inputs.weekendVisits !== undefined) {
      items.push({
        symbol: 'n_{u, \\text{cuối tuần}}',
        value: String(inputs.weekendVisits),
        origin: 'Số lượt check-in của người dùng vào Thứ Bảy & Chủ Nhật'
      });
      items.push({
        symbol: '\\sum n_{u, t}',
        value: String(inputs.totalVisits),
        origin: 'Tổng tất cả các lượt check-in của người dùng trong toàn bộ thời gian'
      });
    }
    return items;
  }

  // 3. Bước 3: Mô hình sở thích nhóm (Công thức 7, 8, 9)
  if (fn.includes('(7)')) {
    if (inputs.intersect_count !== undefined) {
      items.push({
        symbol: '|L_u \\cap L_{u, g}|',
        value: String(inputs.intersect_count),
        origin: 'Số địa điểm chung mà cả thành viên này và các thành viên khác trong nhóm đều từng đến (giao tập từ ma trận check-in R)'
      });
    }
    if (inputs.Lu_count !== undefined) {
      items.push({
        symbol: '|L_u|',
        value: String(inputs.Lu_count),
        origin: 'Tổng số địa điểm mà thành viên này đã từng ghé thăm trong tập dữ liệu Train'
      });
    }
    items.push({
      symbol: '\\eta_u^g',
      value: Number(trace.value).toFixed(4),
      origin: 'Hệ số gắn kết thành viên = |L_u ∩ L_{u,g}| / |L_u|'
    });
    return items;
  }

  if (fn.includes('(8)') || fn.includes('(9)')) {
    const memberValues = inputs.memberValues as Record<string, number> | undefined;
    const memberWeights = inputs.memberWeights as Record<string, number> | undefined;

    if (memberValues && memberWeights) {
      for (const [uid, val] of Object.entries(memberValues)) {
        const w = memberWeights[uid] ?? 1;
        const prod = val * w;
        items.push({
          symbol: `p_{${uid}, m_k} \\cdot \\eta_{${uid}}^g`,
          value: prod.toFixed(4),
          origin: `Thành viên ${uid}: Đặc trưng cá nhân p = ${val.toFixed(3)} (từ Bước 2: Mu) × trọng số gắn kết η = ${w.toFixed(3)} (từ Bước 3: Công thức 7) = ${prod.toFixed(4)}`
        });
      }
    } else {
      items.push({
        symbol: 'p_{u, m_k}',
        value: 'Đặc trưng',
        origin: 'Đặc trưng sở thích của từng thành viên nhóm (kế thừa từ Bước 1 & Bước 2)'
      });
      items.push({
        symbol: '\\eta_u^g',
        value: 'Trọng số',
        origin: 'Độ gắn bó của thành viên với nhóm tính theo tỷ lệ địa điểm chung (từ Công thức 7)'
      });
    }

    if (inputs.effectiveSum !== undefined) {
      items.push({
        symbol: '\\sum_{u \\in g} \\eta_u^g',
        value: Number(inputs.effectiveSum).toFixed(4),
        origin: 'Mẫu số: Tổng trọng số gắn kết của tất cả các thành viên trong nhóm'
      });
    }
    items.push({
      symbol: 'p_{g, m_k}',
      value: Number(trace.value).toFixed(4),
      origin: 'Kết quả: Giá trị đặc trưng mk tổng hợp cho nhóm ảo Mg (chuyển tiếp sang Bước 4)'
    });
    return items;
  }

  // 4. Bước 4: Độ tương đồng nhóm & người dùng (Công thức 10, 11, 12, 13)
  if (fn.includes('(10)')) {
    if (intermediate.dotProduct !== undefined) {
      items.push({
        symbol: 'M_g \\cdot M_v',
        value: Number(intermediate.dotProduct).toFixed(4),
        origin: 'Tích vô hướng giữa vectơ nhóm Mg (từ Bước 3) và vectơ người dùng ứng viên Mv (từ Bước 2)'
      });
    }
    if (intermediate.normGroup !== undefined) {
      items.push({
        symbol: '\\|M_g\\|',
        value: Number(intermediate.normGroup).toFixed(4),
        origin: 'Độ dài chuẩn Euclidean của vectơ sở thích nhóm Mg (từ Bước 3)'
      });
    }
    if (intermediate.normUser !== undefined) {
      items.push({
        symbol: '\\|M_v\\|',
        value: Number(intermediate.normUser).toFixed(4),
        origin: 'Độ dài chuẩn Euclidean của người dùng ứng viên v (vectơ Mv từ Bước 2)'
      });
    }
    if (intermediate.normGroup !== undefined && intermediate.normUser !== undefined) {
      const normProd = Number(intermediate.normGroup) * Number(intermediate.normUser);
      items.push({
        symbol: '\\|M_g\\| \\times \\|M_v\\|',
        value: normProd.toFixed(4),
        origin: 'Mẫu số chuẩn hóa Cosine: Tích hai độ dài chuẩn'
      });
    }
    items.push({
      symbol: '\\operatorname{sim}^m_{g, v}',
      value: Number(trace.value).toFixed(4),
      origin: 'Kết quả: Độ tương đồng đặc trưng sở thích giữa nhóm g và người dùng ứng viên v'
    });
    return items;
  }

  if (fn.includes('(11)')) {
    const memberBreakdown = inputs.memberBreakdown as Array<{ memberId: string; cosine: number; expr: string }> | undefined;
    if (memberBreakdown && memberBreakdown.length > 0) {
      for (const mb of memberBreakdown) {
        items.push({
          symbol: `\\operatorname{sim}(${mb.memberId}, v)`,
          value: mb.cosine.toFixed(4),
          origin: `Cosine lịch sử check-in giữa thành viên ${mb.memberId} và người dùng ứng viên v (1 = đã đi, 0 = chưa đi)`
        });
      }
    }
    if (inputs.groupSize !== undefined) {
      items.push({
        symbol: '|g|',
        value: String(inputs.groupSize),
        origin: 'Số lượng thành viên trong nhóm mục tiêu (dùng để lấy trung bình cộng)'
      });
    }
    items.push({
      symbol: '\\operatorname{sim}^u_{g, v}',
      value: Number(trace.value).toFixed(4),
      origin: 'Kết quả: Độ tương đồng lịch sử check-in trung bình giữa nhóm g và người dùng ứng viên v'
    });
    return items;
  }

  if (fn.includes('(12)') || fn.includes('(13)')) {
    if (inputs.simM !== undefined) {
      items.push({
        symbol: '\\operatorname{sim}^m_{g, v}',
        value: Number(inputs.simM).toFixed(4),
        origin: 'Độ tương đồng đặc trưng sở thích với người dùng v (kế thừa từ Công thức 10)'
      });
    }
    if (inputs.simU !== undefined) {
      items.push({
        symbol: '\\operatorname{sim}^u_{g, v}',
        value: Number(inputs.simU).toFixed(4),
        origin: 'Độ tương đồng lịch sử check-in trung bình với người dùng v (kế thừa từ Công thức 11)'
      });
    }
    items.push({
      symbol: '\\operatorname{sim}_{g, v}',
      value: Number(trace.value).toFixed(4),
      origin: inputs.simMode === 'normalized_avg'
        ? 'Độ tương đồng tổng hợp giữa nhóm g và người dùng v = (sim^m + sim^u) / 2'
        : 'Độ tương đồng tổng hợp giữa nhóm g và người dùng v = sim^m + sim^u (theo bài báo)'
    });
    if (inputs.threshold !== undefined) {
      const passes = inputs.passesThreshold ?? (Number(trace.value) >= Number(inputs.threshold));
      items.push({
        symbol: '\\theta',
        value: String(inputs.threshold),
        origin: `Ngưỡng lọc láng giềng. Đánh giá: ${passes ? '✓ ĐẠT (người dùng v được chọn vào tập cố vấn Kg ở Bước 5)' : '✗ LOẠI (người dùng v không tham gia Bước 5)'}`
      });
    }
    return items;
  }

  // 5. Bước 5: Điểm đồng thuận lọc cộng tác (Công thức 14)
  if (fn.includes('(14)')) {
    const contributingUsers = inputs.contributingUsers as Array<{ userId: string; sim: number; hasVisited: boolean; contribution: number }> | undefined;
    if (contributingUsers && contributingUsers.length > 0) {
      for (const cu of contributingUsers) {
        items.push({
          symbol: `\\operatorname{sim}_{g, ${cu.userId}} \\times r_{${cu.userId}, l}`,
          value: cu.contribution.toFixed(4),
          origin: `Người dùng láng giềng v = ${cu.userId}: Độ tương đồng sim = ${cu.sim.toFixed(3)} (từ Bước 4) × check-in r = ${cu.hasVisited ? 1 : 0} (${cu.hasVisited ? 'đã đến' : 'chưa đến'}) = ${cu.contribution.toFixed(4)}`
        });
      }
    }
    if (trace.numerator !== undefined) {
      items.push({
        symbol: '\\sum \\operatorname{sim}_{g, v} \\cdot r_{v, l}',
        value: Number(trace.numerator).toFixed(4),
        origin: 'Tử số: Tổng điểm đóng góp của các láng giềng v ∈ Kg đã từng check-in địa điểm này'
      });
    }
    if (trace.denominator !== undefined) {
      items.push({
        symbol: '\\sum_{v \\in K_g} \\operatorname{sim}_{g, v}',
        value: Number(trace.denominator).toFixed(4),
        origin: 'Mẫu số: Tổng độ tương đồng của toàn bộ láng giềng v trong tập cố vấn Kg (kế thừa từ Bước 4)'
      });
    }
    items.push({
      symbol: 'f_{g, l}',
      value: Number(trace.value).toFixed(4),
      origin: 'Kết quả: Điểm đồng thuận lọc cộng tác của nhóm cho địa điểm này (chuyển tiếp sang Bước 7)'
    });
    return items;
  }

  // 6. Bước 6: Bất đồng quan điểm nội bộ nhóm (Công thức 15, 16)
  if (fn.includes('(16)')) {
    if (inputs.friendSetAu !== undefined && Array.isArray(inputs.friendSetAu)) {
      items.push({
        symbol: '|A_u|',
        value: String(inputs.friendSetAu.length),
        origin: `Tổng số bạn bè của thành viên u trong mạng xã hội Au: [${inputs.friendSetAu.join(', ')}] (tập các bạn bè v ∈ Au)`
      });
    }
    if (inputs.friendsVisited !== undefined && Array.isArray(inputs.friendsVisited)) {
      items.push({
        symbol: '\\sum_{v \\in A_u} r_{v, l}',
        value: String(inputs.friendsVisited.length),
        origin: `Số bạn bè v ∈ Au đã từng check-in địa điểm này: [${inputs.friendsVisited.join(', ') || 'Không có'}] (từ ma trận R)`
      });
    }
    items.push({
      symbol: '\\delta(u, l)',
      value: Number(trace.value).toFixed(4),
      origin: 'Kết quả: Xác suất thành viên u ủng hộ địa điểm l dựa trên mạng lưới bạn bè Au'
    });
    return items;
  }

  if (fn.includes('(15)')) {
    const pairs = inputs.pairs as Array<{ u1: string; u2: string; delta1: number; delta2: number; diff: number }> | undefined;
    if (pairs && pairs.length > 0) {
      for (const p of pairs) {
        items.push({
          symbol: `|\\delta(${p.u1}, l) - \\delta(${p.u2}, l)|`,
          value: p.diff.toFixed(4),
          origin: `Chênh lệch giữa thành viên ${p.u1} (δ = ${p.delta1.toFixed(3)}) và ${p.u2} (δ = ${p.delta2.toFixed(3)}): |${p.delta1.toFixed(3)} - ${p.delta2.toFixed(3)}| = ${p.diff.toFixed(4)}`
        });
      }
    }
    if (inputs.sumDifferences !== undefined) {
      items.push({
        symbol: '\\sum |\\Delta|',
        value: Number(inputs.sumDifferences).toFixed(4),
        origin: 'Tổng độ chênh lệch tuyệt đối giữa tất cả các cặp thành viên trong nhóm'
      });
    }
    if (inputs.numPairs !== undefined) {
      const pairVal = Number(inputs.numPairs) > 0 ? (1 / Number(inputs.numPairs)).toFixed(4) : '0';
      items.push({
        symbol: '\\frac{2}{n(n-1)}',
        value: pairVal,
        origin: `Hệ số chuẩn hóa trung bình 2 / (n(n - 1)) = 1 / ${inputs.numPairs} ≈ ${pairVal} cho ${inputs.numPairs} cặp thành viên phân biệt`
      });
    }
    items.push({
      symbol: 'd_{g, l}',
      value: Number(trace.value).toFixed(4),
      origin: 'Kết quả: Mức độ bất đồng quan điểm nội bộ nhóm về địa điểm này (chuyển tiếp sang Bước 7 làm điểm phạt)'
    });
    return items;
  }

  // 7. Bước 7: Điểm xếp hạng khuyến nghị CFID cuối cùng (Công thức 17)
  if (fn.includes('(17)')) {
    if (inputs.alpha !== undefined) {
      items.push({
        symbol: '\\alpha',
        value: String(inputs.alpha),
        origin: 'Trọng số ưu tiên sở thích lọc cộng tác (tham số thiết lập, mặc định 0.70)'
      });
    }
    if (inputs.oneMinusAlpha !== undefined) {
      items.push({
        symbol: '1 - \\alpha',
        value: Number(inputs.oneMinusAlpha).toFixed(2),
        origin: 'Trọng số phạt mức độ bất đồng nội bộ nhóm (1 - α, mặc định 0.30)'
      });
    }
    if (inputs.cfScore !== undefined) {
      items.push({
        symbol: 'f_{g, l}',
        value: Number(inputs.cfScore).toFixed(4),
        origin: 'Điểm đồng thuận lọc cộng tác nhóm (kế thừa trực tiếp từ Bước 5)'
      });
    }
    if (inputs.divergence !== undefined) {
      items.push({
        symbol: 'd_{g, l}',
        value: Number(inputs.divergence).toFixed(4),
        origin: 'Mức độ bất đồng quan điểm trong nhóm (kế thừa trực tiếp từ Bước 6)'
      });
    }
    if (inputs.weightedCf !== undefined) {
      items.push({
        symbol: '\\alpha \\cdot f_{g, l}',
        value: Number(inputs.weightedCf).toFixed(4),
        origin: 'Thành phần điểm cộng: Điểm lọc cộng tác sau nhân trọng số α'
      });
    }
    if (inputs.weightedDivergence !== undefined) {
      items.push({
        symbol: '(1 - \\alpha) \\cdot d_{g, l}',
        value: Number(inputs.weightedDivergence).toFixed(4),
        origin: 'Thành phần điểm trừ: Điểm phạt bất đồng sau nhân trọng số (1 - α)'
      });
    }
    items.push({
      symbol: 'f\'_{g, l}',
      value: Number(trace.value).toFixed(4),
      origin: 'Kết quả: Điểm khuyến nghị CFID Pareto tổng hợp cuối cùng dùng để xếp hạng Top-k'
    });
    return items;
  }

  // Fallback: Trích xuất các trường từ inputs và intermediateValues
  for (const [key, val] of Object.entries(inputs)) {
    if (typeof val === 'number' || typeof val === 'string') {
      items.push({
        symbol: key,
        value: typeof val === 'number' ? val.toFixed(4) : String(val),
        origin: `Giá trị đầu vào của biến ${key}`
      });
    }
  }

  return items;
}
