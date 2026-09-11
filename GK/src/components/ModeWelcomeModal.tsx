import React from 'react';
import { AppMode } from '../domain/types';
import { Trophy, BookOpen, Sliders, ArrowRight, X, Sparkles } from 'lucide-react';

interface ModeWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: AppMode) => void;
}

export const ModeWelcomeModal: React.FC<ModeWelcomeModalProps> = ({
  isOpen,
  onClose,
  onSelectMode
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay modal-welcome-overlay" onClick={onClose}>
      <div
        className="modal-card modal-welcome-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
      >
        <div className="modal-welcome-header">
          <div className="badge badge-indigo">
            <Sparkles size={13} style={{ marginRight: '4px' }} />
            CFID Algorithm Visualizer
          </div>
          <button
            type="button"
            className="btn-icon text-muted"
            onClick={onClose}
            aria-label="Đóng cửa sổ chào mừng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-welcome-body">
          <h2 id="welcome-modal-title" className="welcome-title">
            Chào mừng bạn đến với Không gian Khám phá CFID
          </h2>
          <p className="welcome-subtitle">
            Hệ thống mô phỏng trực quan thuật toán Lọc cộng tác kết hợp Độ bất đồng nội bộ nhóm (Appl. Sci. 2021). Vui lòng chọn trải nghiệm phù hợp với mục tiêu của bạn:
          </p>

          <div className="welcome-cards-grid">
            {/* Card 1: Xem kết quả Top-N ngay */}
            <div
              className="welcome-choice-card choice-result"
              onClick={() => onSelectMode('result')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectMode('result')}
            >
              <div className="choice-icon-badge icon-gold">
                <Trophy size={24} />
              </div>
              <div className="choice-content">
                <div className="choice-tag">Khuyên dùng cho người mới</div>
                <h3 className="choice-title">Xem Top-N POI mới</h3>
                <p className="choice-desc">
                  Tự động thực thi toàn bộ quy trình và xem ngay 3 địa điểm mới lý tưởng nhất cho nhóm mục tiêu kèm tóm tắt lý do gợi ý trong dưới 1 phút.
                </p>
              </div>
              <div className="choice-footer">
                <span className="choice-action-text">Xem kết quả ngay</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Card 2: Học thuật toán từng bước */}
            <div
              className="welcome-choice-card choice-guided"
              onClick={() => onSelectMode('guided')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectMode('guided')}
            >
              <div className="choice-icon-badge icon-indigo">
                <BookOpen size={24} />
              </div>
              <div className="choice-content">
                <div className="choice-tag">Dành cho học tập &amp; Nghiên cứu</div>
                <h3 className="choice-title">Học thuật toán từng bước</h3>
                <p className="choice-desc">
                  Khám phá lộ trình 7 bước tuần tự: từ sở thích cá nhân, mô hình nhóm, lọc láng giềng CF đến độ bất đồng nội bộ với công thức và bảng ma trận minh bạch.
                </p>
              </div>
              <div className="choice-footer">
                <span className="choice-action-text">Bắt đầu từ Bước 1</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Card 3: Tùy chỉnh dữ liệu */}
            <div
              className="welcome-choice-card choice-configure"
              onClick={() => onSelectMode('configure')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectMode('configure')}
            >
              <div className="choice-icon-badge icon-emerald">
                <Sliders size={24} />
              </div>
              <div className="choice-content">
                <div className="choice-tag">Cấu hình nâng cao</div>
                <h3 className="choice-title">Tùy chỉnh Dữ liệu &amp; Tham số</h3>
                <p className="choice-desc">
                  Xem và chỉnh sửa trực tiếp các lượt check-in, cấu hình mốc thời gian Train/Test, chính sách loại trừ POI đã đi hoặc điều chỉnh ngưỡng tương đồng.
                </p>
              </div>
              <div className="choice-footer">
                <span className="choice-action-text">Mở Bước 0</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
