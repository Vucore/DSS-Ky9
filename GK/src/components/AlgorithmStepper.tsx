import React from 'react';
import { StepId, StepStatus } from '../domain/types';
import { STEP_DEFINITIONS } from '../algorithm/pipeline';
import { InlineMath } from './InlineMath';
import {
  Check,
  Play,
  RotateCcw,
  FastForward,
  RefreshCw,
  Lock,
  ArrowRight
} from 'lucide-react';

interface AlgorithmStepperProps {
  currentStepId: StepId;
  stepStatuses: StepStatus[];
  onSelectStep: (stepId: StepId) => void;
  onRunStep: (stepId: StepId) => void;
  onRunAll: () => void;
  onReset: () => void;
  onLoadDemo: () => void;
}

interface StepNodeInfo {
  stepId: StepId;
  label: string;
  sublabel: React.ReactNode;
  plainTitle: string;
}

const STEP_NODES: StepNodeInfo[] = [
  { stepId: 0, label: '0. Dữ liệu', sublabel: 'Check-in & Tham số', plainTitle: 'Bước 0: Dữ liệu & Tham số' },
  {
    stepId: 1,
    label: '1. Thể loại',
    sublabel: <>TF-IDF <InlineMath latex="M_u^C" /></>,
    plainTitle: 'Bước 1: Ưa thích thể loại (Công thức 1-4)'
  },
  {
    stepId: 2,
    label: '2. Thời gian',
    sublabel: <>Khung giờ <InlineMath latex="M_u^T" /></>,
    plainTitle: 'Bước 2: Ưa thích thời gian (Công thức 5-7)'
  },
  {
    stepId: 3,
    label: '3. Nhóm',
    sublabel: <>Gắn kết <InlineMath latex="M_g" /></>,
    plainTitle: 'Bước 3: Sở thích nhóm (Công thức 8-11)'
  },
  {
    stepId: 4,
    label: '4. Tương đồng',
    sublabel: <>Lọc <InlineMath latex="K_g (\theta)" /></>,
    plainTitle: 'Bước 4: Tương đồng nhóm - người dùng (Công thức 12-13)'
  },
  {
    stepId: 5,
    label: '5. Điểm CF',
    sublabel: <>Dự đoán <InlineMath latex="f_{g, l}" /></>,
    plainTitle: 'Bước 5: Lọc cộng tác (Công thức 14)'
  },
  {
    stepId: 6,
    label: '6. Bất đồng',
    sublabel: <>Hình phạt <InlineMath latex="d_{g, l}" /></>,
    plainTitle: 'Bước 6: Độ bất đồng nội bộ (Công thức 15-16)'
  },
  {
    stepId: 7,
    label: '7. Top-N',
    sublabel: <>Pareto <InlineMath latex="\alpha" /></>,
    plainTitle: 'Bước 7: Top-N Đề xuất (Công thức 17)'
  }
];

export const AlgorithmStepper: React.FC<AlgorithmStepperProps> = ({
  currentStepId,
  stepStatuses,
  onSelectStep,
  onRunStep,
  onRunAll,
  onReset,
  onLoadDemo
}) => {
  const currentStatus = stepStatuses.find((s) => s.stepId === currentStepId);
  const canRunCurrent = currentStatus?.canRun && currentStepId > 0;
  const currentDef = STEP_DEFINITIONS.find((d) => d.id === currentStepId);

  return (
    <div className="stepper-wrapper pipeline-map-container card">
      {/* Action Controls Toolbar */}
      <div className="stepper-toolbar">
        <div className="toolbar-left">
          <div className="guided-progress-indicator">
            <span className="progress-badge">
              {currentStepId === 0 ? 'Bước 0' : `Bước ${currentStepId} / 7`}
            </span>
            <strong className="progress-title" style={{ marginLeft: '8px' }}>
              : {currentDef?.name || 'Khởi tạo'}
            </strong>
          </div>
        </div>

        <div className="toolbar-actions">
          <button
            id="btn-run-step"
            className="btn btn-primary"
            disabled={!canRunCurrent}
            onClick={() => onRunStep(currentStepId)}
            title={canRunCurrent ? `Chạy Bước ${currentStepId}` : 'Chưa đủ điều kiện tiên quyết hoặc đang ở Bước 0'}
          >
            <Play size={16} fill="currentColor" />
            <span>Chạy Bước {currentStepId > 0 ? currentStepId : ''}</span>
          </button>

          <button
            id="btn-run-all"
            className="btn btn-secondary"
            onClick={onRunAll}
            title="Thực thi tuần tự toàn bộ các bước (Bước 1-7)"
          >
            <FastForward size={16} />
            <span>Chạy toàn bộ</span>
          </button>

          <button
            id="btn-reset"
            className="btn btn-outline"
            onClick={onReset}
            title="Đặt lại kết quả thuật toán về Bước 0"
          >
            <RotateCcw size={16} />
            <span>Đặt lại</span>
          </button>

          <button
            id="btn-load-demo"
            className="btn btn-outline"
            onClick={onLoadDemo}
            title="Nạp lại bộ dữ liệu mẫu chuẩn của bài báo"
          >
            <RefreshCw size={16} />
            <span>Nạp mẫu</span>
          </button>
        </div>
      </div>

      {/* Stepper Steps Row merged with Pipeline Map Track */}
      <div className="pipeline-map-scroll">
        <div className="pipeline-map-track">
          {STEP_NODES.map((node, index) => {
            const status = stepStatuses.find((s) => s.stepId === node.stepId);
            const isCompleted = status?.isCompleted ?? false;
            const canRun = status?.canRun ?? false;
            const isActive = currentStepId === node.stepId;
            const isClickable = isCompleted || canRun || isActive || node.stepId === 0;

            let stateClass = 'step-blocked';
            if (isActive) stateClass = 'node-active step-active';
            else if (isCompleted) stateClass = 'node-completed step-completed';
            else if (canRun) stateClass = 'step-ready';

            return (
              <React.Fragment key={node.stepId}>
                <button
                  type="button"
                  id={`step-tab-${node.stepId}`}
                  className={`pipeline-node-btn step-card ${stateClass} ${!isClickable ? 'step-disabled' : ''}`}
                  disabled={!isClickable}
                  onClick={() => onSelectStep(node.stepId)}
                  title={node.plainTitle}
                >
                  <div className="node-marker">
                    {isCompleted ? (
                      <Check size={12} strokeWidth={3} />
                    ) : canRun && !isActive ? (
                      <Play size={10} fill="currentColor" />
                    ) : !canRun && !isActive && node.stepId > 0 ? (
                      <Lock size={10} />
                    ) : (
                      <span>{node.stepId}</span>
                    )}
                  </div>

                  <div className="node-texts">
                    <span className="node-label">{node.label}</span>
                    <span className="node-sublabel">{node.sublabel}</span>
                  </div>
                </button>

                {index < STEP_NODES.length - 1 && (
                  <div className={`pipeline-connector ${isCompleted ? 'connector-completed' : ''}`}>
                    <ArrowRight size={12} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

