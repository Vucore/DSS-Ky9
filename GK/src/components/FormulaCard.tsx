import React, { useState } from 'react';
import { MathView } from './MathView';
import { InlineMath } from './InlineMath';
import { AlertTriangle, BookOpen, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { StepId } from '../domain/types';

interface FormulaTab {
  id: string;
  label: React.ReactNode;
  latex: string;
  eqNumber: string;
}

interface FormulaInfo {
  stepId: StepId;
  equationNumber: string;
  title: React.ReactNode;
  latex: string;
  subTabs?: FormulaTab[];
  section: string;
  description: React.ReactNode;
  variables: { symbol: string; meaning: React.ReactNode }[];
  ambiguityNote?: {
    type: 'warning' | 'info';
    title: React.ReactNode;
    content: React.ReactNode;
  };
}

const FORMULA_REGISTRY: Record<StepId, FormulaInfo> = {
  0: {
    stepId: 0,
    equationNumber: 'Mục 3.1 & Bảng 1',
    title: <>Bộ dữ liệu đầu vào &amp; Định nghĩa nền tảng</>,
    latex: `U = \\{u_1, \\dots, u_n\\}, \\quad L = \\{l_1, \\dots, l_m\\}, \\quad R \\in \\mathbb{N}^{n \\times m}, \\quad g \\subseteq U`,
    section: 'Mục 3.1 — Dữ liệu Check-in & Các định nghĩa',
    description: (
      <>
        Định nghĩa tập người dùng <InlineMath latex="U" />, tập địa điểm POI <InlineMath latex="L" />, các thể loại <InlineMath latex="C" />, ma trận check-in <InlineMath latex="R" />, nhóm mục tiêu <InlineMath latex="g" /> và tập bạn bè <InlineMath latex="A_u" />.
      </>
    ),
    variables: [
      { symbol: 'U', meaning: <>Tập hợp tất cả người dùng trong hệ thống: <InlineMath latex="U = \{u_1, \dots, u_n\}" /></> },
      { symbol: 'L', meaning: <>Tập hợp các địa điểm POI ứng viên: <InlineMath latex="L = \{l_1, \dots, l_m\}" /></> },
      { symbol: 'C', meaning: <>Tập hợp các thể loại địa điểm: <InlineMath latex="C = \{c_1, \dots, c_{|C|}\}" /></> },
      { symbol: 'r_{u, l}', meaning: <>Tần suất người dùng <InlineMath latex="u" /> ghé thăm địa điểm <InlineMath latex="l" /></> },
      { symbol: 'g', meaning: <>Nhóm người dùng mục tiêu cần gợi ý (<InlineMath latex="g \subseteq U" />)</> },
      { symbol: 'A_u', meaning: <>Tập bạn bè / người dùng tương đồng của thành viên <InlineMath latex="u" /> (cho Công thức 16)</> }
    ],
    ambiguityNote: {
      type: 'info',
      title: <>Giả định về Tập bạn bè (<InlineMath latex="A_u" />)</>,
      content: (
        <>
          Nhằm phục vụ phiên bản mô phỏng tương tác độc lập không cần mạng xã hội đồ thị phức tạp, tập bạn bè <InlineMath latex="A_u" /> được cấu hình tường minh và xác định trong dữ liệu mẫu.
        </>
      )
    }
  },
  1: {
    stepId: 1,
    equationNumber: 'Công thức (2) & (3)',
    title: <>Mô hình độ ưa thích thể loại của người dùng <InlineMath latex="M_u^C" /></>,
    latex: `p_{u, c} = \\frac{\\sum_{k=1}^m r_{u, l_k} f_{l_k, c}}{\\sum_{k=1}^m r_{u, l_k}} \\times \\log \\left( \\frac{\\sum_{k=1}^m \\sum_{i=1}^{|C|} f_{l_k, c_i}}{\\sum_{k=1}^m f_{l_k, c}} \\right), \\quad M_u^C = (p_{u, c_1}, \\dots, p_{u, c_{|C|}})`,
    section: 'Mục 3.3 (1) — Xây dựng độ ưa thích của người dùng đối với thể loại',
    description: (
      <>
        Tính toán mức độ ưa thích của người dùng <InlineMath latex="u" /> đối với thể loại <InlineMath latex="c" /> theo nguyên lý TF-IDF, cân bằng giữa tần suất check-in và độ hiếm của thể loại trong danh mục.
      </>
    ),
    variables: [
      { symbol: 'r_{u, l_k}', meaning: <>Tần suất người dùng <InlineMath latex="u" /> ghé thăm địa điểm <InlineMath latex="l_k" /></> },
      { symbol: 'f_{l_k, c}', meaning: <>Chỉ số thể loại: bằng 1 nếu địa điểm <InlineMath latex="l_k" /> thuộc thể loại <InlineMath latex="c" />, ngược lại bằng 0</> },
      { symbol: '\\text{TF}', meaning: <>Tỷ lệ check-in vào thể loại <InlineMath latex="c" /> so với tổng số check-in của người dùng <InlineMath latex="u" /></> },
      { symbol: '\\text{IDF}', meaning: <>Logarit tỷ lệ tổng số nhãn thể loại trên số địa điểm có thể loại <InlineMath latex="c" /></> },
      { symbol: 'M_u^C', meaning: <>Vectơ độ ưa thích thể loại của người dùng <InlineMath latex="u" /></> }
    ]
  },
  2: {
    stepId: 2,
    equationNumber: 'Công thức (4), (5) & (6)',
    title: <>Mô hình độ ưa thích thời gian của người dùng <InlineMath latex="M_u^T" /></>,
    latex: `p_{u, t_k} = \\frac{n_{u, t_k}}{\\sum_{j=1}^4 n_{u, t_j}}, \\quad p_{u, t_5} = \\frac{n_{u, \\text{cuối tuần}}}{\\sum_{j=1}^4 n_{u, t_j}}, \\quad M_u = (M_u^C, M_u^T)`,
    section: 'Mục 3.3 (2) — Xây dựng độ ưa thích của người dùng đối với thời gian',
    description: (
      <>
        Phân chia thời gian ghé thăm thành 4 khung giờ trong ngày (<InlineMath latex="T_1" />: sáng, <InlineMath latex="T_2" />: chiều, <InlineMath latex="T_3" />: tối, <InlineMath latex="T_4" />: đêm) và tỷ lệ cuối tuần <InlineMath latex="T_5" />, sau đó nối với vectơ thể loại để tạo vectơ tổng hợp <InlineMath latex="M_u = (M_u^C, M_u^T)" />.
      </>
    ),
    variables: [
      { symbol: 'T_1', meaning: 'Khung giờ buổi sáng (07:00 – 12:00)' },
      { symbol: 'T_2', meaning: 'Khung giờ buổi chiều (13:00 – 18:00)' },
      { symbol: 'T_3', meaning: 'Khung giờ buổi tối (19:00 – 24:00)' },
      { symbol: 'T_4', meaning: 'Khung giờ đêm (01:00 – 06:00)' },
      { symbol: 'T_5', meaning: <>Tỷ lệ cuối tuần: <InlineMath latex="\frac{n_{u, \text{cuối tuần}}}{\sum_{j=1}^4 n_{u, t_j}}" /></> },
      { symbol: 'M_u', meaning: <>Vectơ đặc trưng người dùng tích hợp cả sở thích thể loại <InlineMath latex="M_u^C" /> và thói quen thời gian <InlineMath latex="M_u^T" /></> }
    ]
  },
  3: {
    stepId: 3,
    equationNumber: 'Công thức (7), (8) & (9)',
    title: <>Xây dựng mô hình độ ưa thích của nhóm <InlineMath latex="M_g" /></>,
    latex: `\\eta_u^g = \\frac{|L_u \\cap L_{u, g}|}{|L_u|}, \\quad p_{g, m_k} = \\frac{\\sum_{u \\in g} p_{u, m_k} \\times \\eta_u^g}{\\sum_{u \\in g} \\eta_u^g}, \\quad M_g = (p_{g, m_1}, \\dots, p_{g, m_K})`,
    section: 'Mục 3.4 — Xây dựng mô hình độ ưa thích của nhóm',
    description: (
      <>
        Tính toán hệ số gắn kết / tầm ảnh hưởng <InlineMath latex="\eta_u^g" /> của từng thành viên dựa trên độ trùng lặp địa điểm đã ghé thăm với các thành viên khác, sau đó tổng hợp có trọng số thành vectơ nhóm <InlineMath latex="M_g" />.
      </>
    ),
    variables: [
      { symbol: 'L_u', meaning: <>Tập các địa điểm POI mà thành viên <InlineMath latex="u" /> đã ghé thăm</> },
      { symbol: 'L_{u, g}', meaning: <>Hợp các địa điểm được ghé thăm bởi các thành viên khác trong nhóm <InlineMath latex="g" /> (trừ <InlineMath latex="u" />)</> },
      { symbol: '\\eta_u^g', meaning: <>Hệ số gắn kết / mức độ quan trọng của thành viên <InlineMath latex="u" /> trong nhóm <InlineMath latex="g" /></> },
      { symbol: 'p_{g, m_k}', meaning: <>Điểm ưa thích tổng hợp của nhóm đối với đặc trưng <InlineMath latex="m_k" /></> },
      { symbol: 'M_g', meaning: <>Vectơ đặc trưng đại diện cho nhóm ảo <InlineMath latex="g" /></> }
    ]
  },
  4: {
    stepId: 4,
    equationNumber: 'Công thức (10), (11), (12) & (13)',
    title: <>Độ tương đồng Nhóm - Người dùng &amp; Lọc ngưỡng <InlineMath latex="\theta" /></>,
    latex: `\\operatorname{sim}^m_{g, v} = \\frac{\\sum p_{g, m_i} p_{v, m_i}}{\\|M_g\\| \\|M_v\\|}, \\quad \\operatorname{sim}^u_{g, v} = \\frac{1}{|g|} \\sum_{u \\in g} \\frac{\\sum r_{u, l_k} r_{v, l_k}}{\\|R_u\\| \\|R_v\\|}, \\quad \\operatorname{sim}_{g, v} = \\operatorname{sim}^m_{g, v} + \\operatorname{sim}^u_{g, v}`,
    subTabs: [
      {
        id: 'simM',
        label: <>Cosine đặc trưng <InlineMath latex="\operatorname{sim}^m_{g, v}" /> (CT 10)</>,
        latex: `\\operatorname{sim}^m_{g, v} = \\frac{\\sum_{i=1}^M p_{g, m_i} p_{v, m_i}}{\\sqrt{\\sum_{i=1}^M (p_{g, m_i})^2} \\sqrt{\\sum_{i=1}^M (p_{v, m_i})^2}}`,
        eqNumber: 'Công thức (10)'
      },
      {
        id: 'simU',
        label: <>Cosine check-in <InlineMath latex="\operatorname{sim}^u_{g, v}" /> (CT 11)</>,
        latex: `\\operatorname{sim}^u_{g, v} = \\frac{1}{n(g)} \\sum_{u \\in g} \\frac{\\sum_{k=1}^m r_{u, l_k} r_{v, l_k}}{\\sqrt{\\sum_{k=1}^m (r_{u, l_k})^2} \\sqrt{\\sum_{k=1}^m (r_{v, l_k})^2}}`,
        eqNumber: 'Công thức (11)'
      },
      {
        id: 'combined',
        label: <>Kết hợp &amp; Ngưỡng <InlineMath latex="\theta" /> (CT 12–13)</>,
        latex: `\\operatorname{sim}_{g, v} = \\operatorname{sim}^m_{g, v} + \\operatorname{sim}^u_{g, v}, \\quad \\operatorname{sim}_{g, v} = 0 \\text{ nếu } \\operatorname{sim}_{g, v} < \\theta`,
        eqNumber: 'Công thức (12) & (13)'
      }
    ],
    section: 'Mục 3.5 (1, 2, 3) — Tính toán độ tương đồng & Lọc ngưỡng',
    description: (
      <>
        Kết hợp độ tương đồng cosine đặc trưng (<InlineMath latex="\operatorname{sim}^m_{g, v}" />) và độ tương đồng check-in lịch sử trung bình (<InlineMath latex="\operatorname{sim}^u_{g, v}" />). Người dùng có độ tương đồng nhỏ hơn ngưỡng <InlineMath latex="\theta" /> sẽ bị loại bỏ (gán bằng 0).
      </>
    ),
    variables: [
      { symbol: '\\operatorname{sim}^m_{g, v}', meaning: <>Độ tương đồng cosine giữa vectơ đặc trưng nhóm <InlineMath latex="M_g" /> và người dùng <InlineMath latex="v" /></> },
      { symbol: '\\operatorname{sim}^u_{g, v}', meaning: <>Độ tương đồng check-in trung bình giữa các thành viên nhóm <InlineMath latex="g" /> và người dùng <InlineMath latex="v" /></> },
      { symbol: '\\operatorname{sim}_{g, v}', meaning: <>Độ tương đồng tổng hợp giữa nhóm <InlineMath latex="g" /> và người dùng <InlineMath latex="v" /></> },
      { symbol: '\\theta', meaning: <>Ngưỡng tương đồng: <InlineMath latex="\operatorname{sim}_{g, v} = 0" /> nếu <InlineMath latex="\operatorname{sim}_{g, v} < \theta" /> (Công thức 13)</> }
    ],
    ambiguityNote: {
      type: 'warning',
      title: 'Điểm mơ hồ toán học trong Công thức (12)',
      content: (
        <>
          Văn bản bài báo viết: &ldquo;we normalize the sum of the two and get the similarity&rdquo; (chuẩn hóa tổng của cả hai), nhưng công thức in ra lại là phép cộng <InlineMath latex="\operatorname{sim}_{g, v} = \operatorname{sim}^m_{g, v} + \operatorname{sim}^u_{g, v}" /> (miền giá trị [0, 2]). Visualizer cung cấp chế độ Bám sát bài báo (mặc định) và chế độ Chuẩn hóa trung bình qua tùy chọn ở Bước 0 &amp; Bước 4.
        </>
      )
    }
  },
  5: {
    stepId: 5,
    equationNumber: 'Công thức (14)',
    title: <>Gợi ý nhóm dựa trên lọc cộng tác (CF) <InlineMath latex="f_{g, l}" /></>,
    latex: `f_{g, l} = \\frac{\\sum_{v \\in U} \\operatorname{sim}_{g, v} \\times r_{v, l}}{\\sum_{v \\in U} \\operatorname{sim}_{g, v}}`,
    section: 'Mục 3.5 (3) — Gợi ý nhóm dựa trên thuật toán lọc cộng tác',
    description: (
      <>
        Dự đoán điểm ưa thích đồng thuận của nhóm cho địa điểm <InlineMath latex="l" /> bằng cách tổng hợp lượt ghé thăm của các người dùng tương đồng (đã vượt qua ngưỡng <InlineMath latex="\theta" />) theo trọng số tương đồng.
      </>
    ),
    variables: [
      { symbol: 'f_{g, l}', meaning: <>Điểm ưa thích từ lọc cộng tác của nhóm <InlineMath latex="g" /> đối với địa điểm ứng viên <InlineMath latex="l" /></> },
      { symbol: '\\operatorname{sim}_{g, v}', meaning: <>Độ tương đồng sau lọc ngưỡng (<InlineMath latex="\ge \theta" />) của người dùng <InlineMath latex="v" /> với nhóm <InlineMath latex="g" /></> },
      { symbol: 'r_{v, l}', meaning: <>Chỉ số ghé thăm nhị phân (1 nếu người dùng <InlineMath latex="v" /> từng ghé thăm <InlineMath latex="l" />, ngược lại 0)</> }
    ]
  },
  6: {
    stepId: 6,
    equationNumber: 'Công thức (15) & (16)',
    title: <>Mô hình độ bất đồng nội bộ nhóm (Divergence) <InlineMath latex="d_{g, l}" /></>,
    latex: `\\delta(u, l) = \\frac{1}{|A_u|} \\sum_{v \\in A_u} r(v, l), \\quad d_{g, l} = \\frac{2}{n(n - 1)} \\sum_{u < u'} |\\delta(u, l) - \\delta(u', l)|`,
    subTabs: [
      {
        id: 'delta',
        label: <>Xác suất qua bạn bè <InlineMath latex="\delta(u, l)" /> (CT 16)</>,
        latex: `\\delta(u, l) = \\frac{1}{|A_u|} \\sum_{v \\in A_u} r(v, l)`,
        eqNumber: 'Công thức (16)'
      },
      {
        id: 'divergence',
        label: <>Độ bất đồng cặp đôi <InlineMath latex="d_{g, l}" /> (CT 15)</>,
        latex: `d_{g, l} = \\frac{2}{n(n - 1)} \\sum_{u < u'} |\\delta(u, l) - \\delta(u', l)|`,
        eqNumber: 'Công thức (15)'
      }
    ],
    section: 'Mục 3.5 (4) — Gợi ý nhóm dựa trên độ bất đồng nội bộ nhóm',
    description: (
      <>
        Tính xác suất ghé thăm <InlineMath latex="\delta(u, l)" /> của thành viên <InlineMath latex="u" /> đối với địa điểm <InlineMath latex="l" /> thông qua bạn bè <InlineMath latex="A_u" />, sau đó đo lường độ chênh lệch tuyệt đối trung bình giữa mọi cặp thành viên trong nhóm <InlineMath latex="g" />.
      </>
    ),
    variables: [
      { symbol: 'A_u', meaning: <>Tập bạn bè / người dùng tương đồng của thành viên <InlineMath latex="u" /></> },
      { symbol: '\\delta(u, l)', meaning: <>Tỷ lệ bạn bè của thành viên <InlineMath latex="u" /> đã từng ghé thăm địa điểm <InlineMath latex="l" /></> },
      { symbol: 'n', meaning: <>Kích thước nhóm <InlineMath latex="g" /> (<InlineMath latex="|g|" />)</> },
      { symbol: '\\frac{2}{n(n-1)}', meaning: <>Hệ số chuẩn hóa cho toàn bộ <InlineMath latex="\frac{n(n-1)}{2}" /> cặp đôi thành viên phân biệt</> },
      { symbol: 'd_{g, l}', meaning: <>Mức độ bất đồng nội bộ của nhóm <InlineMath latex="g" /> đối với địa điểm <InlineMath latex="l" /></> }
    ]
  },
  7: {
    stepId: 7,
    equationNumber: 'Công thức (17) & Thuật toán 1',
    title: <>Điểm ưu tiên CFID cuối cùng <InlineMath latex="f'_{g, l}" /> &amp; Xếp hạng Top-N</>,
    latex: `f'_{g, l} = \\alpha f_{g, l} - (1 - \\alpha) d_{g, l}`,
    section: 'Mục 3.5 (4) & Thuật toán 1 — Điểm số khuyến nghị cuối cùng',
    description: (
      <>
        Cân bằng giữa điểm đồng thuận lọc cộng tác <InlineMath latex="f_{g, l}" /> và hình phạt bất đồng nội bộ <InlineMath latex="d_{g, l}" /> thông qua tham số <InlineMath latex="\alpha" />, sau đó sắp xếp giảm dần để chọn ra danh sách Top-N.
      </>
    ),
    variables: [
      { symbol: "f'_{g, l}", meaning: <>Điểm số ưu tiên tổng hợp cuối cùng của nhóm <InlineMath latex="g" /> cho địa điểm <InlineMath latex="l" /></> },
      { symbol: '\\alpha', meaning: <>Hệ số điều phối (<InlineMath latex="0 \le \alpha \le 1" />) giữa lọc cộng tác và hình phạt bất đồng</> },
      { symbol: 'f_{g, l}', meaning: <>Điểm số đồng thuận từ lọc cộng tác (Công thức 14)</> },
      { symbol: 'd_{g, l}', meaning: <>Độ bất đồng nội bộ nhóm (Công thức 15)</> },
      { symbol: 'N', meaning: 'Số lượng địa điểm khuyến nghị hàng đầu cần xuất ra' }
    ]
  }
};

export const FormulaCard: React.FC<{ stepId: StepId }> = ({ stepId }) => {
  const info = FORMULA_REGISTRY[stepId] || FORMULA_REGISTRY[0];
  const [activeSubTab, setActiveSubTab] = useState<string>(info.subTabs ? info.subTabs[0].id : '');
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

  const displayedLatex = info.subTabs
    ? info.subTabs.find((t) => t.id === activeSubTab)?.latex || info.latex
    : info.latex;

  const displayedEqNumber = info.subTabs
    ? info.subTabs.find((t) => t.id === activeSubTab)?.eqNumber || info.equationNumber
    : info.equationNumber;

  return (
    <div className="card formula-card">
      <div className="card-header">
        <div className="header-title-group">
          <span className="badge badge-eq">{displayedEqNumber}</span>
          <h3 className="card-title">{info.title}</h3>
        </div>
        <span className="section-pill">
          <BookOpen size={14} />
          {info.section}
        </span>
      </div>

      {/* Sub-tabs cho bước có nhiều công thức (như Bước 4, Bước 6) */}
      {info.subTabs && (
        <div className="formula-subtab-row">
          {info.subTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`subtab-btn ${activeSubTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveSubTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Khu vực hiển thị công thức chính */}
      <div className="math-display-container">
        <MathView latex={displayedLatex} displayMode={true} />
      </div>

      <p className="card-description">{info.description}</p>

      {/* Nút bật/tắt accordion chú giải và giả định */}
      <button
        type="button"
        className="formula-accordion-toggle"
        onClick={() => setIsAccordionOpen(!isAccordionOpen)}
      >
        <span>
          {isAccordionOpen
            ? 'Thu gọn danh mục ký hiệu & giả định toán học'
            : 'Xem chi tiết ký hiệu toán học & giả định bài báo'}
        </span>
        {isAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Nội dung Accordion có thể mở rộng */}
      {isAccordionOpen && (
        <div className="formula-accordion-body">
          {info.ambiguityNote && (
            <div className={`callout callout-${info.ambiguityNote.type}`} style={{ marginBottom: '16px' }}>
              <div className="callout-header">
                {info.ambiguityNote.type === 'warning' ? (
                  <AlertTriangle size={18} className="callout-icon" />
                ) : (
                  <Info size={18} className="callout-icon" />
                )}
                <strong>{info.ambiguityNote.title}</strong>
              </div>
              <p className="callout-content">{info.ambiguityNote.content}</p>
            </div>
          )}

          <div className="variable-legend">
            <h4 className="legend-title">Biến số &amp; Ký hiệu toán học chuẩn</h4>
            <div className="legend-grid">
              {info.variables.map((v, i) => (
                <div key={i} className="legend-item">
                  <span className="legend-symbol">
                    <InlineMath latex={v.symbol} />
                  </span>
                  <span className="legend-meaning">{v.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
