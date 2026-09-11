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
        origin: 'Số địa điểm chung mà cả thành viên này và các thành viên khác trong nhóm đều từng đến'
      });
    }
    if (inputs.Lu_count !== undefined) {
      items.push({
        symbol: '|L_u|',
        value: String(inputs.Lu_count),
        origin: 'Tổng số địa điểm mà thành viên này đã từng ghé thăm trong lịch sử'
      });
    }
    return items;
  }

  if (fn.includes('(8)') || fn.includes('(9)')) {
    items.push({
      symbol: 'p_{u, m_k}',
      value: 'Đặc trưng thành viên',
      origin: 'Đặc trưng sở thích của từng thành viên nhóm (kế thừa từ Bước 1 & Bước 2)'
    });
    items.push({
      symbol: '\\eta_u^g',
      value: 'Trọng số thân thuộc',
      origin: 'Độ gắn bó của thành viên với nhóm tính theo tỷ lệ địa điểm chung (từ Bước 3.1)'
    });
    if (inputs.effectiveSum !== undefined) {
      items.push({
        symbol: '\\sum \\eta_u^g',
        value: Number(inputs.effectiveSum).toFixed(4),
        origin: 'Tổng trọng số thân thuộc của tất cả các thành viên trong nhóm'
      });
    }
    return items;
  }

  // 4. Bước 4: Độ tương đồng nhóm & người dùng (Công thức 10, 11, 12, 13)
  if (fn.includes('(10)')) {
    if (intermediate.dotProduct !== undefined) {
      items.push({
        symbol: 'M_g \\cdot M_v',
        value: Number(intermediate.dotProduct).toFixed(4),
        origin: 'Tích vô hướng giữa vector đặc trưng sở thích của nhóm và người dùng'
      });
    }
    if (intermediate.normGroup !== undefined && intermediate.normUser !== undefined) {
      const normProd = Number(intermediate.normGroup) * Number(intermediate.normUser);
      items.push({
        symbol: '\\|M_g\\| \\times \\|M_v\\|',
        value: normProd.toFixed(4),
        origin: 'Tích độ dài chuẩn Euclidean của hai vector sở thích'
      });
    }
    return items;
  }

  if (fn.includes('(11)')) {
    items.push({
      symbol: '\\operatorname{sim}(u, v)',
      value: 'Cosine nhị phân',
      origin: 'Độ tương đồng cosine theo lịch sử check-in với từng thành viên nhóm (1 = đã đi, 0 = chưa đi)'
    });
    if (inputs.numMembers !== undefined) {
      items.push({
        symbol: '|g|',
        value: String(inputs.numMembers),
        origin: 'Số lượng thành viên trong nhóm mục tiêu (lấy trung bình cộng)'
      });
    }
    return items;
  }

  if (fn.includes('(12)') || fn.includes('(13)')) {
    if (inputs.simM !== undefined) {
      items.push({
        symbol: '\\operatorname{sim}^m_{g, v}',
        value: Number(inputs.simM).toFixed(4),
        origin: 'Độ tương đồng đặc trưng sở thích (kế thừa từ Công thức 10)'
      });
    }
    if (inputs.simU !== undefined) {
      items.push({
        symbol: '\\operatorname{sim}^u_{g, v}',
        value: Number(inputs.simU).toFixed(4),
        origin: 'Độ tương đồng lịch sử check-in trung bình (kế thừa từ Công thức 11)'
      });
    }
    if (inputs.threshold !== undefined) {
      items.push({
        symbol: '\\theta',
        value: String(inputs.threshold),
        origin: 'Ngưỡng lọc người dùng tương đồng (tham số do người dùng thiết lập)'
      });
    }
    return items;
  }

  // 5. Bước 5: Điểm đồng thuận lọc cộng tác (Công thức 14)
  if (fn.includes('(14)')) {
    items.push({
      symbol: '\\operatorname{sim}_{g, v}',
      value: 'Người dùng hợp lệ',
      origin: 'Trọng số tương đồng của các người dùng vượt qua ngưỡng lọc θ (kế thừa từ Bước 4)'
    });
    items.push({
      symbol: 'r_{v, l}',
      value: '1 hoặc 0',
      origin: 'Trạng thái check-in: 1 nếu người dùng đã từng ghé thăm địa điểm, 0 nếu chưa'
    });
    if (trace.denominator !== undefined) {
      items.push({
        symbol: '\\sum \\operatorname{sim}_{g, v}',
        value: Number(trace.denominator).toFixed(4),
        origin: 'Tổng độ tương đồng của tất cả các người dùng hợp lệ tham gia đánh giá địa điểm'
      });
    }
    return items;
  }

  // 6. Bước 6: Bất đồng quan điểm nội bộ nhóm (Công thức 15, 16)
  if (fn.includes('(15)') || fn.includes('(16)')) {
    items.push({
      symbol: '\\delta(u, l)',
      value: 'Xác suất ghé thăm',
      origin: 'Tỷ lệ bạn bè của thành viên u đã từng đến địa điểm l (dựa trên tập bạn bè Au)'
    });
    if (inputs.pairCount !== undefined) {
      items.push({
        symbol: 'n(n-1)/2',
        value: String(inputs.pairCount),
        origin: 'Tổng số cặp thành viên phân biệt trong nhóm (dùng để tính độ lệch trung bình)'
      });
    }
    return items;
  }

  // 7. Bước 7: Điểm xếp hạng khuyến nghị CFID cuối cùng (Công thức 17)
  if (fn.includes('(17)')) {
    if (inputs.alpha !== undefined) {
      items.push({
        symbol: '\\alpha',
        value: String(inputs.alpha),
        origin: 'Trọng số ưu tiên sở thích lọc cộng tác (tham số thiết lập, mặc định 0.7)'
      });
    }
    if (inputs.oneMinusAlpha !== undefined) {
      items.push({
        symbol: '1 - \\alpha',
        value: Number(inputs.oneMinusAlpha).toFixed(2),
        origin: 'Trọng số phạt mức độ bất đồng nội bộ nhóm (1 - α)'
      });
    }
    if (inputs.cfScore !== undefined) {
      items.push({
        symbol: 'f_{g, l}',
        value: Number(inputs.cfScore).toFixed(4),
        origin: 'Điểm đồng thuận lọc cộng tác kế thừa trực tiếp từ Bước 5'
      });
    }
    if (inputs.divergence !== undefined) {
      items.push({
        symbol: 'd_{g, l}',
        value: Number(inputs.divergence).toFixed(4),
        origin: 'Mức độ bất đồng quan điểm trong nhóm kế thừa trực tiếp từ Bước 6'
      });
    }
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
