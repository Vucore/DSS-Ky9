import React, { useState } from 'react';
import { StepId } from '../domain/types';
import { Play, ArrowRight, ArrowLeft, Lightbulb, ChevronDown, ChevronUp, CheckCircle, Database } from 'lucide-react';

interface InputChip {
  label: React.ReactNode;
  value: React.ReactNode;
}

interface GuidedStepLayoutProps {
  stepId: StepId;
  stepName: React.ReactNode;
  whyText: React.ReactNode;
  inputs: InputChip[];
  children: React.ReactNode;
  deepDiveContent?: React.ReactNode;
  conclusion?: React.ReactNode;
  isCompleted: boolean;
  canRun: boolean;
  onRunStep?: () => void;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  prevStepName?: string;
  nextStepName?: string;
}

export const GuidedStepLayout: React.FC<GuidedStepLayoutProps> = ({
  stepId,
  stepName,
  whyText,
  inputs,
  children,
  deepDiveContent,
  conclusion,
  isCompleted,
  canRun,
  onRunStep,
  onPrevStep,
  onNextStep,
  prevStepName,
  nextStepName
}) => {
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);

  return (
    <div className="guided-step-container">
      {/* 1. Header & Tại sao cần bước này? */}
      <div className="card guided-header-card">
        <div className="guided-step-tag">
          <span className="badge badge-indigo font-semibold">
            Bước {stepId} / 7
          </span>
          <h3 className="guided-step-title">{stepName}</h3>
        </div>

        <div className="guided-why-block">
          <div className="why-icon">
            <Lightbulb size={18} className="text-amber" />
          </div>
          <div className="why-content">
            <strong className="why-label">Mục đích khoa học của bước này:</strong>
            <p className="why-text">{whyText}</p>
          </div>
        </div>

        {/* 2. Đầu vào từ bước trước (Inputs chips) */}
        {inputs.length > 0 && (
          <div className="guided-inputs-row">
            <div className="inputs-label">
              <Database size={13} className="text-muted" />
              <span>Dữ liệu đầu vào:</span>
            </div>
            <div className="inputs-chips">
              {inputs.map((chip, idx) => (
                <div key={idx} className="input-chip">
                  <span className="chip-key">{chip.label}:</span>
                  <span className="chip-val">{chip.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Vùng tính toán và bảng kết quả chính */}
      <div className="guided-main-content">
        {children}
      </div>

      {/* 4. Xem sâu hơn (Deep dive accordion: công thức phụ, notation registry) */}
      {deepDiveContent && (
        <div className="card accordion-card deepdive-card" style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="accordion-header-btn"
            onClick={() => setIsDeepDiveOpen(!isDeepDiveOpen)}
            aria-expanded={isDeepDiveOpen}
          >
            <div className="accordion-title-group">
              <h4 className="accordion-title">
                Khám phá chi tiết công thức &amp; Ký hiệu toán học (Deep Dive)
              </h4>
              <span className="badge badge-muted">Tài liệu học thuật</span>
            </div>
            <div className="accordion-action-group">
              <span className="text-xs text-muted">
                {isDeepDiveOpen ? 'Thu gọn' : 'Xem công thức đầy đủ'}
              </span>
              {isDeepDiveOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          {isDeepDiveOpen && (
            <div className="accordion-content">
              {deepDiveContent}
            </div>
          )}
        </div>
      )}

      {/* 5. Kết luận số liệu sau khi hoàn thành */}
      {isCompleted && conclusion && (
        <div className="card guided-conclusion-card" style={{ marginTop: '16px' }}>
          <div className="conclusion-icon">
            <CheckCircle size={18} className="text-emerald" />
          </div>
          <div className="conclusion-text">
            <strong>Kết luận bước {stepId}:</strong> {conclusion}
          </div>
        </div>
      )}

      {/* 6. Thanh điều hướng chân trang (Next / Prev navigation) */}
      <div className="guided-footer-nav" style={{ marginTop: '20px' }}>
        <div className="nav-left">
          {onPrevStep && prevStepName && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onPrevStep}
            >
              <ArrowLeft size={16} />
              <span>Quay lại: {prevStepName}</span>
            </button>
          )}
        </div>

        <div className="nav-right">
          {!isCompleted && canRun && onRunStep && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onRunStep}
            >
              <Play size={16} fill="currentColor" />
              <span>Thực thi Bước {stepId}</span>
            </button>
          )}

          {isCompleted && onNextStep && nextStepName && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onNextStep}
            >
              <span>Tiếp tục sang: {nextStepName}</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
