import React from 'react';
import { CheckCircle, Info } from 'lucide-react';

interface StepSummaryProps {
  purpose: React.ReactNode;
  conclusion?: React.ReactNode;
  isCompleted?: boolean;
}

export const StepSummary: React.FC<StepSummaryProps> = ({
  purpose,
  conclusion,
  isCompleted = false
}) => {
  return (
    <div className="step-summary-banner">
      <div className="summary-purpose-row">
        <div className="summary-icon-box info-icon-box">
          <Info size={16} />
        </div>
        <div className="summary-text-group">
          <span className="summary-heading">Mục đích bước:</span>
          <span className="summary-content">{purpose}</span>
        </div>
      </div>

      {isCompleted && conclusion && (
        <div className="summary-conclusion-row">
          <div className="summary-icon-box success-icon-box">
            <CheckCircle size={16} />
          </div>
          <div className="summary-text-group">
            <span className="summary-heading">Kết luận bước:</span>
            <span className="summary-content">{conclusion}</span>
          </div>
        </div>
      )}
    </div>
  );
};
