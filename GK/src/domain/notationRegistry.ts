/**
 * Registry tập trung toàn bộ ký hiệu toán học chuẩn theo bài báo CFID:
 * "A Collaborative Filtering Algorithm with Intragroup Divergence for POI Group Recommendation"
 * (Appl. Sci. 2021, 11, 5416)
 */

export interface MathSymbolDefinition {
  latex: string;
  name: string;
  description: string;
  equationReference?: string;
}

export const NOTATIONS = {
  // Tập hợp & Thực thể nền tảng (Mục 3.1)
  U: {
    latex: 'U',
    name: 'Tập người dùng',
    description: 'Tập hợp tất cả người dùng trong hệ thống: U = {u_1, ..., u_n}'
  },
  L: {
    latex: 'L',
    name: 'Tập địa điểm POI',
    description: 'Tập hợp tất cả địa điểm ứng viên: L = {l_1, ..., l_m}'
  },
  C: {
    latex: 'C',
    name: 'Tập thể loại POI',
    description: 'Tập hợp các thể loại địa điểm: C = {c_1, ..., c_{|C|}}'
  },
  group: {
    latex: 'g',
    name: 'Nhóm người dùng',
    description: 'Nhóm người dùng mục tiêu cần khuyến nghị (g ⊆ U)'
  },
  r_u_l: {
    latex: 'r_{u, l}',
    name: 'Lượt check-in',
    description: 'Tần suất hoặc chỉ số người dùng u ghé thăm địa điểm l'
  },
  Au: {
    latex: 'A_u',
    name: 'Tập bạn bè Au',
    description: 'Tập bạn bè / người dùng tương đồng của thành viên u',
    equationReference: 'Công thức (16)'
  },

  // Bước 1: Ưa thích thể loại (Eq. 2, 3)
  p_u_c: {
    latex: 'p_{u, c}',
    name: 'Độ ưa thích thể loại của người dùng',
    description: 'Mức độ ưa thích của người dùng u đối với thể loại c theo TF-IDF',
    equationReference: 'Công thức (2)'
  },
  MuC: {
    latex: 'M_u^C',
    name: 'Vectơ độ ưa thích thể loại của người dùng',
    description: 'Vectơ đặc trưng thể loại của người dùng u',
    equationReference: 'Công thức (3)'
  },

  // Bước 2: Ưa thích thời gian (Eq. 4, 5, 6)
  p_u_tk: {
    latex: 'p_{u, t_k}',
    name: 'Độ ưa thích khung giờ trong ngày',
    description: 'Tỷ lệ ghé thăm trong khung giờ t_k (T1: sáng, T2: chiều, T3: tối, T4: đêm)',
    equationReference: 'Công thức (4)'
  },
  p_u_t5: {
    latex: 'p_{u, t_5}',
    name: 'Độ ưa thích cuối tuần',
    description: 'Tỷ lệ ghé thăm vào hai ngày cuối tuần (Thứ Bảy, Chủ Nhật)',
    equationReference: 'Công thức (5)'
  },
  MuT: {
    latex: 'M_u^T',
    name: 'Vectơ thói quen thời gian',
    description: 'Vectơ đặc trưng thời gian của người dùng u gồm 5 chiều (T1..T5)'
  },
  Mu: {
    latex: 'M_u',
    name: 'Vectơ đặc trưng tổng hợp người dùng',
    description: 'Vectơ kết hợp thể loại và thời gian: M_u = (M_u^C, M_u^T)',
    equationReference: 'Công thức (6)'
  },

  // Bước 3: Mô hình ưa thích của nhóm (Eq. 7, 8, 9)
  eta_u_g: {
    latex: '\\eta_u^g',
    name: 'Hệ số gắn kết thành viên',
    description: 'Mức độ quan trọng / gắn kết của thành viên u trong nhóm g',
    equationReference: 'Công thức (7)'
  },
  p_g_mk: {
    latex: 'p_{g, m_k}',
    name: 'Đặc trưng thứ k của nhóm',
    description: 'Giá trị đặc trưng thứ k tổng hợp có trọng số của nhóm g',
    equationReference: 'Công thức (8)'
  },
  Mg: {
    latex: 'M_g',
    name: 'Vectơ đặc trưng nhóm',
    description: 'Vectơ đặc trưng đại diện cho nhóm ảo g: M_g = (p_{g, m_1}, ..., p_{g, m_K})',
    equationReference: 'Công thức (9)'
  },

  // Bước 4: Tương đồng nhóm - người dùng & Ngưỡng lọc (Eq. 10, 11, 12, 13)
  simM: {
    latex: '\\operatorname{sim}^m_{g, v}',
    name: 'Cosine tương đồng đặc trưng',
    description: 'Độ tương đồng cosine giữa vectơ đặc trưng nhóm M_g và người dùng v',
    equationReference: 'Công thức (10)'
  },
  simU: {
    latex: '\\operatorname{sim}^u_{g, v}',
    name: 'Cosine tương đồng check-in',
    description: 'Độ tương đồng check-in lịch sử trung bình giữa các thành viên nhóm và v',
    equationReference: 'Công thức (11)'
  },
  sim: {
    latex: '\\operatorname{sim}_{g, v}',
    name: 'Tương đồng kết hợp',
    description: 'Độ tương đồng tổng hợp giữa nhóm g và người dùng v',
    equationReference: 'Công thức (12)'
  },
  theta: {
    latex: '\\theta',
    name: 'Ngưỡng tương đồng theta',
    description: 'Ngưỡng lọc người dùng tương đồng (gán 0 nếu sim_{g, v} < theta)',
    equationReference: 'Công thức (13)'
  },

  // Bước 5: Lọc cộng tác (Eq. 14)
  f_g_l: {
    latex: 'f_{g, l}',
    name: 'Điểm lọc cộng tác (CF score)',
    description: 'Điểm ưa thích đồng thuận của nhóm g đối với địa điểm ứng viên l',
    equationReference: 'Công thức (14)'
  },

  // Bước 6: Độ bất đồng nội bộ nhóm (Eq. 15, 16)
  delta_u_l: {
    latex: '\\delta(u, l)',
    name: 'Xác suất ghé thăm qua bạn bè',
    description: 'Tỷ lệ bạn bè của thành viên u đã từng ghé thăm địa điểm l',
    equationReference: 'Công thức (16)'
  },
  d_g_l: {
    latex: 'd_{g, l}',
    name: 'Độ bất đồng nội bộ nhóm',
    description: 'Mức độ bất đồng cặp đôi trung bình của các thành viên trong nhóm với l',
    equationReference: 'Công thức (15)'
  },

  // Bước 7: Điểm số CFID & Xếp hạng cuối cùng (Eq. 17)
  alpha: {
    latex: '\\alpha',
    name: 'Hệ số điều phối alpha',
    description: 'Trọng số cân bằng (0 <= alpha <= 1) giữa lọc cộng tác và độ bất đồng'
  },
  f_prime_g_l: {
    latex: "f'_{g, l}",
    name: 'Điểm khuyến nghị CFID cuối cùng',
    description: "Điểm ưu tiên cuối cùng: f'_{g,l} = alpha * f_{g,l} - (1 - alpha) * d_{g,l}",
    equationReference: 'Công thức (17)'
  },
  L_candidate: {
    latex: 'L_{\\text{candidate}}(g)',
    name: 'Tập địa điểm ứng viên hợp lệ',
    description: 'Tập hợp các địa điểm POI mà chưa thành viên nào trong nhóm từng ghé thăm'
  }
} as const;

export type NotationKey = keyof typeof NOTATIONS;

/**
 * Chuyển đổi định danh thực thể (ví dụ: u1, l1, c1, t1, T1, ck1...) sang định dạng KaTeX chuẩn có chỉ số dưới.
 * Ví dụ:
 *  'u1' -> 'u_1'
 *  'l1' -> 'l_1'
 *  'c1' -> 'c_1'
 *  'T1' -> 'T_1'
 *  'ck1' -> '\\text{ck}_1'
 */
export function toMathId(id: string): string {
  if (!id) return '';
  const trimmed = id.trim();
  // Nếu đã chứa gạch dưới (ví dụ: u_1, l_1) thì giữ nguyên
  if (trimmed.includes('_')) return trimmed;

  const match = trimmed.match(/^([a-zA-Z]+)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const num = match[2];
    return prefix.length === 1 ? `${prefix}_${num}` : `\\text{${prefix}}_{${num}}`;
  }
  return trimmed;
}

/**
 * Định dạng một mảng định danh thực thể thành tập hợp toán học KaTeX.
 * Ví dụ: ['u1', 'u2', 'u3'] -> '\\{u_1, u_2, u_3\\}'
 */
export function toMathSet(ids: string[]): string {
  if (!ids || ids.length === 0) return '\\emptyset';
  return `\\{${ids.map(toMathId).join(', ')}\\}`;
}

/**
 * Làm sạch tên thực thể, loại bỏ hậu tố mã lặp trong ngoặc đơn (ví dụ: "Alice (u1)" -> "Alice")
 */
export function cleanEntityName(name: string): string {
  if (!name) return '';
  return name.replace(/\s*\([a-zA-Z]+\d+\)$/, '').trim();
}

