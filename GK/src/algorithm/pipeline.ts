import {
  Dataset,
  PipelineState,
  StepId,
  StepStatus
} from '../domain/types';
import { getFreshMockDataset } from '../data/mockDataset';
import { computeCategoryPreferences } from './categoryPreference';
import { computeTimePreferences } from './timePreference';
import { computeGroupPreference } from './groupPreference';
import { computeGroupUserSimilarity } from './similarity';
import { computeCollaborativeFiltering } from './collaborativeFiltering';
import { computeIntragroupDivergence } from './divergence';
import { computeFinalRanking } from './finalScore';

export const STEP_DEFINITIONS: {
  id: StepId;
  name: string;
  shortName: string;
  equations: string[];
  description: string;
}[] = [
  {
    id: 0,
    name: 'Bộ dữ liệu đầu vào & Tham số',
    shortName: 'Dữ liệu',
    equations: ['Bảng 1'],
    description: 'Lượt check-in, Địa điểm POI, Thể loại, Nhóm, Tập bạn bè Au và Tham số thuật toán'
  },
  {
    id: 1,
    name: 'Độ ưa thích thể loại của người dùng',
    shortName: 'Ưa thích thể loại',
    equations: ['Công thức (2)', 'Công thức (3)'],
    description: 'Vectơ độ ưa thích của người dùng đối với các thể loại địa điểm M_u^C theo cơ chế TF-IDF'
  },
  {
    id: 2,
    name: 'Độ ưa thích thời gian của người dùng',
    shortName: 'Ưa thích thời gian',
    equations: ['Công thức (4)', 'Công thức (5)', 'Công thức (6)'],
    description: 'Phân chia 4 khung giờ trong ngày T1..T4 và tỷ lệ cuối tuần T5, kết hợp tạo vectơ M_u'
  },
  {
    id: 3,
    name: 'Mô hình ưa thích của nhóm',
    shortName: 'Ưa thích nhóm',
    equations: ['Công thức (7)', 'Công thức (8)', 'Công thức (9)'],
    description: 'Hệ số gắn kết thành viên \\eta_u^g và vectơ đặc trưng nhóm M_g'
  },
  {
    id: 4,
    name: 'Độ tương đồng Nhóm - Người dùng',
    shortName: 'Độ tương đồng',
    equations: ['Công thức (10)', 'Công thức (11)', 'Công thức (12)', 'Công thức (13)'],
    description: 'Cosine đặc trưng sim^m, cosine check-in sim^u, tương đồng kết hợp & ngưỡng lọc \\theta'
  },
  {
    id: 5,
    name: 'Lọc cộng tác (Collaborative Filtering)',
    shortName: 'Điểm CF',
    equations: ['Công thức (14)'],
    description: 'Dự đoán điểm ưa thích của nhóm f_{g,l} cho từng địa điểm POI theo người dùng tương đồng'
  },
  {
    id: 6,
    name: 'Độ bất đồng nội bộ nhóm (Divergence)',
    shortName: 'Độ bất đồng',
    equations: ['Công thức (15)', 'Công thức (16)'],
    description: 'Xác suất ghé thăm \\delta(u,l) qua bạn bè A_u và độ bất đồng cặp đôi d_{g,l}'
  },
  {
    id: 7,
    name: 'Xếp hạng khuyến nghị CFID cuối cùng',
    shortName: 'Xếp hạng Top-N',
    equations: ['Công thức (17)', 'Thuật toán 1'],
    description: "Điểm cân bằng f'_{g,l} = \\alpha \\times f_{g,l} - (1 - \\alpha) \\times d_{g,l} và xuất Top-N POI"
  }
];

export function createInitialState(dataset?: Dataset): PipelineState {
  const d = dataset ? JSON.parse(JSON.stringify(dataset)) : getFreshMockDataset();
  return {
    dataset: d,
    currentStepId: 0,
    selectedTrace: null
  };
}

export function canExecuteStep(state: PipelineState, stepId: StepId): boolean {
  switch (stepId) {
    case 0:
      return true;
    case 1:
      return true;
    case 2:
      return !!state.step1Output;
    case 3:
      return !!state.step2Output;
    case 4:
      return !!state.step2Output && !!state.step3Output;
    case 5:
      return !!state.step4Output;
    case 6:
      return true;
    case 7:
      return !!state.step5Output && !!state.step6Output;
    default:
      return false;
  }
}

export function getStepStatuses(state: PipelineState): StepStatus[] {
  return STEP_DEFINITIONS.map((def) => {
    let isCompleted = false;
    switch (def.id) {
      case 0:
        isCompleted = true;
        break;
      case 1:
        isCompleted = !!state.step1Output;
        break;
      case 2:
        isCompleted = !!state.step2Output;
        break;
      case 3:
        isCompleted = !!state.step3Output;
        break;
      case 4:
        isCompleted = !!state.step4Output;
        break;
      case 5:
        isCompleted = !!state.step5Output;
        break;
      case 6:
        isCompleted = !!state.step6Output;
        break;
      case 7:
        isCompleted = !!state.step7Output;
        break;
    }
    return {
      stepId: def.id,
      name: def.name,
      equations: def.equations,
      isCompleted,
      canRun: canExecuteStep(state, def.id)
    };
  });
}

/**
 * Thực thi một bước đơn lẻ trong pipeline trực tiếp trên dataset.
 */
export function executeStep(state: PipelineState, stepId: StepId): PipelineState {
  const next = { ...state };
  const dataset = next.dataset;

  switch (stepId) {
    case 1: {
      next.step1Output = computeCategoryPreferences(dataset);
      next.currentStepId = 1;
      break;
    }
    case 2: {
      if (!next.step1Output) {
        throw new Error('Không thể chạy Bước 2 khi chưa có kết quả Bước 1.');
      }
      next.step2Output = computeTimePreferences(dataset, next.step1Output);
      next.currentStepId = 2;
      break;
    }
    case 3: {
      if (!next.step2Output) {
        throw new Error('Không thể chạy Bước 3 khi chưa có kết quả Bước 2.');
      }
      next.step3Output = computeGroupPreference(dataset, next.step2Output);
      next.currentStepId = 3;
      break;
    }
    case 4: {
      if (!next.step2Output || !next.step3Output) {
        throw new Error('Không thể chạy Bước 4 khi chưa có kết quả Bước 2 và Bước 3.');
      }
      next.step4Output = computeGroupUserSimilarity(dataset, next.step2Output, next.step3Output);
      next.currentStepId = 4;
      break;
    }
    case 5: {
      if (!next.step4Output) {
        throw new Error('Không thể chạy Bước 5 khi chưa có kết quả Bước 4.');
      }
      next.step5Output = computeCollaborativeFiltering(dataset, next.step4Output);
      next.currentStepId = 5;
      break;
    }
    case 6: {
      next.step6Output = computeIntragroupDivergence(dataset);
      next.currentStepId = 6;
      break;
    }
    case 7: {
      if (!next.step5Output || !next.step6Output) {
        throw new Error('Không thể chạy Bước 7 khi chưa có kết quả Bước 5 và Bước 6.');
      }
      next.step7Output = computeFinalRanking(
        next.dataset,
        next.step5Output,
        next.step6Output
      );
      next.currentStepId = 7;
      break;
    }
    default:
      break;
  }

  return next;
}

/**
 * Chạy toàn bộ các bước từ Bước 1 đến Bước 7 tuần tự.
 */
export function executeAll(state: PipelineState): PipelineState {
  let s = { ...state };
  s = executeStep(s, 1);
  s = executeStep(s, 2);
  s = executeStep(s, 3);
  s = executeStep(s, 4);
  s = executeStep(s, 5);
  s = executeStep(s, 6);
  s = executeStep(s, 7);
  return s;
}

/**
 * Cơ chế vô hiệu hoá kết quả các bước phía sau khi dữ liệu đầu vào hoặc bước phía trước thay đổi.
 */
export function invalidateDownstream(state: PipelineState, changedStepId: StepId): PipelineState {
  const next = { ...state };
  if (changedStepId <= 0) {
    next.step1Output = undefined;
    next.step2Output = undefined;
    next.step3Output = undefined;
    next.step4Output = undefined;
    next.step5Output = undefined;
    next.step6Output = undefined;
    next.step7Output = undefined;
  } else if (changedStepId === 1) {
    next.step2Output = undefined;
    next.step3Output = undefined;
    next.step4Output = undefined;
    next.step5Output = undefined;
    next.step7Output = undefined;
  } else if (changedStepId === 2) {
    next.step3Output = undefined;
    next.step4Output = undefined;
    next.step5Output = undefined;
    next.step7Output = undefined;
  } else if (changedStepId === 3) {
    next.step4Output = undefined;
    next.step5Output = undefined;
    next.step7Output = undefined;
  } else if (changedStepId === 4) {
    next.step5Output = undefined;
    next.step7Output = undefined;
  } else if (changedStepId === 5) {
    next.step7Output = undefined;
  } else if (changedStepId === 6) {
    next.step7Output = undefined;
  }
  return next;
}
