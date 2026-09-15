import { Dataset } from '../domain/types';

export const INITIAL_MOCK_DATASET: Dataset = {
  users: [
    { id: 'u1', name: 'An (u1)' },
    { id: 'u2', name: 'Bình (u2)' },
    { id: 'u3', name: 'Cường (u3)' },
    { id: 'u4', name: 'Dũng (u4)' },
    { id: 'u5', name: 'Hương (u5)' }
  ],
  pois: [
    { id: 'l1', name: 'Cà phê Blue Bottle (l1)', categories: ['c1'] },
    { id: 'l2', name: 'Công viên Trung tâm (l2)', categories: ['c2'] },
    { id: 'l3', name: 'Nhà hàng Pizza Joe (l3)', categories: ['c3'] },
    { id: 'l4', name: 'Quán Bar Skyline Rooftop (l4)', categories: ['c4'] },
    { id: 'l5', name: 'Bảo tàng Nghệ thuật Hiện đại (l5)', categories: ['c5'] },
    { id: 'l6', name: 'Tổ hợp Thể thao & Bowling (l6)', categories: ['c6'] }
  ],
  categories: [
    { id: 'c1', name: 'Quán cà phê (c1)' },
    { id: 'c2', name: 'Công viên & Ngoài trời (c2)' },
    { id: 'c3', name: 'Nhà hàng ẩm thực (c3)' },
    { id: 'c4', name: 'Quán bar & Đời sống về đêm (c4)' },
    { id: 'c5', name: 'Bảo tàng & Văn hóa (c5)' },
    { id: 'c6', name: 'Thể thao & Giải trí (c6)' }
  ],
  checkIns: [
    // =========================================================================
    // DỮ LIỆU HUẤN LUYỆN (TRAIN SET: Trước mốc 2021-05-15T00:00:00Z)
    // Các công thức từ Công thức (2) đến Công thức (16) CHỈ ĐƯỢC DÙNG tập này.
    // =========================================================================

    // Thành viên u1 (An): Thường xuyên ghé quán cà phê l1, công viên l2
    { id: 'ck1', userId: 'u1', poiId: 'l1', hour: 9, dayOfWeek: 3, timestamp: '2021-05-12T09:00:00Z' }, // T1, ngày thường
    { id: 'ck2', userId: 'u1', poiId: 'l2', hour: 14, dayOfWeek: 6, timestamp: '2021-05-08T14:00:00Z' }, // T2, cuối tuần
    { id: 'ck3', userId: 'u1', poiId: 'l1', hour: 10, dayOfWeek: 0, timestamp: '2021-05-09T10:00:00Z' }, // T1, cuối tuần

    // Thành viên u2 (Bình): Thường xuyên ghé quán cà phê l1, nhà hàng l3
    { id: 'ck4', userId: 'u2', poiId: 'l1', hour: 10, dayOfWeek: 2, timestamp: '2021-05-11T10:00:00Z' }, // T1, ngày thường
    { id: 'ck5', userId: 'u2', poiId: 'l3', hour: 19, dayOfWeek: 5, timestamp: '2021-05-14T19:00:00Z' }, // T3, ngày thường
    { id: 'ck6', userId: 'u2', poiId: 'l1', hour: 11, dayOfWeek: 4, timestamp: '2021-05-13T11:00:00Z' }, // T1, ngày thường

    // Thành viên u3 (Cường): Trung thành với quán cà phê l1
    { id: 'ck7', userId: 'u3', poiId: 'l1', hour: 9, dayOfWeek: 1, timestamp: '2021-05-10T09:00:00Z' }, // T1, ngày thường
    { id: 'ck8', userId: 'u3', poiId: 'l1', hour: 10, dayOfWeek: 3, timestamp: '2021-05-12T10:00:00Z' }, // T1, ngày thường
    { id: 'ck9', userId: 'u3', poiId: 'l1', hour: 10, dayOfWeek: 0, timestamp: '2021-05-09T10:00:00Z' }, // T1, cuối tuần

    // Người dùng ngoài u4 (Dũng): Cùng sở thích cà phê l1, đã khám phá quán bar rooftop l4
    { id: 'ck10', userId: 'u4', poiId: 'l1', hour: 9, dayOfWeek: 2, timestamp: '2021-05-11T09:00:00Z' }, // T1, ngày thường
    { id: 'ck11', userId: 'u4', poiId: 'l4', hour: 21, dayOfWeek: 5, timestamp: '2021-05-14T21:00:00Z' }, // T3, ngày thường
    { id: 'ck12', userId: 'u4', poiId: 'l4', hour: 22, dayOfWeek: 0, timestamp: '2021-05-09T22:00:00Z' }, // T3, cuối tuần

    // Người dùng ngoài u5 (Hương): Cùng gu cà phê l1, cũng khám phá l4 và bảo tàng l5
    { id: 'ck13', userId: 'u5', poiId: 'l1', hour: 10, dayOfWeek: 4, timestamp: '2021-05-13T10:00:00Z' }, // T1, ngày thường
    { id: 'ck14', userId: 'u5', poiId: 'l4', hour: 20, dayOfWeek: 3, timestamp: '2021-05-12T20:00:00Z' }, // T3, ngày thường
    { id: 'ck15', userId: 'u5', poiId: 'l5', hour: 15, dayOfWeek: 6, timestamp: '2021-05-08T15:00:00Z' }  // T2, cuối tuần
  ],
  groups: [
    {
      id: 'g1',
      name: 'Nhóm Khám Phá Cuối Tuần (g1)',
      memberUserIds: ['u1', 'u2', 'u3']
    }
  ],
  selectedGroupId: 'g1',
  friendSets: {
    u1: ['u2', 'u4'],
    u2: ['u3', 'u4'],
    u3: ['u1', 'u5'],
    u4: ['u1', 'u2'],
    u5: ['u3']
  },
  hyperparameters: {
    theta: 0.6,
    alpha: 0.7,
    topN: 3,
    logBase: 'ln',
    simMode: 'paper_sum'
  }
};

/**
 * Fixture bộ dữ liệu 4 POI gốc (dùng đối chứng kiểm thử công thức số học nguyên bản)
 */
export const ORIGINAL_4POI_FIXTURE: Dataset = {
  users: [
    { id: 'u1', name: 'An (u1)' },
    { id: 'u2', name: 'Bình (u2)' },
    { id: 'u3', name: 'Cường (u3)' },
    { id: 'u4', name: 'Dũng (u4)' },
    { id: 'u5', name: 'Hương (u5)' }
  ],
  pois: [
    { id: 'l1', name: 'Cà phê Blue Bottle (l1)', categories: ['c1'] },
    { id: 'l2', name: 'Công viên Trung tâm (l2)', categories: ['c2'] },
    { id: 'l3', name: 'Nhà hàng Pizza Joe (l3)', categories: ['c3'] },
    { id: 'l4', name: 'Quán Bar Skyline Rooftop (l4)', categories: ['c4'] }
  ],
  categories: [
    { id: 'c1', name: 'Quán cà phê (c1)' },
    { id: 'c2', name: 'Công viên & Ngoài trời (c2)' },
    { id: 'c3', name: 'Nhà hàng ẩm thực (c3)' },
    { id: 'c4', name: 'Quán bar & Đời sống về đêm (c4)' }
  ],
  checkIns: [
    { id: 'ck1', userId: 'u1', poiId: 'l1', hour: 9, dayOfWeek: 3, timestamp: '2021-05-12T09:00:00Z' },
    { id: 'ck2', userId: 'u1', poiId: 'l2', hour: 14, dayOfWeek: 6, timestamp: '2021-05-08T14:00:00Z' },
    { id: 'ck3', userId: 'u1', poiId: 'l3', hour: 20, dayOfWeek: 4, timestamp: '2021-05-13T20:00:00Z' },
    { id: 'ck4', userId: 'u1', poiId: 'l1', hour: 10, dayOfWeek: 0, timestamp: '2021-05-09T10:00:00Z' },

    { id: 'ck5', userId: 'u2', poiId: 'l1', hour: 10, dayOfWeek: 2, timestamp: '2021-05-11T10:00:00Z' },
    { id: 'ck6', userId: 'u2', poiId: 'l3', hour: 19, dayOfWeek: 5, timestamp: '2021-05-14T19:00:00Z' },
    { id: 'ck7', userId: 'u2', poiId: 'l4', hour: 23, dayOfWeek: 6, timestamp: '2021-05-08T23:00:00Z' },

    { id: 'ck8', userId: 'u3', poiId: 'l2', hour: 15, dayOfWeek: 0, timestamp: '2021-05-09T15:00:00Z' },
    { id: 'ck9', userId: 'u3', poiId: 'l3', hour: 20, dayOfWeek: 1, timestamp: '2021-05-10T20:00:00Z' },
    { id: 'ck10', userId: 'u3', poiId: 'l4', hour: 21, dayOfWeek: 6, timestamp: '2021-05-08T21:00:00Z' },

    { id: 'ck11', userId: 'u4', poiId: 'l1', hour: 9, dayOfWeek: 1, timestamp: '2021-05-10T09:00:00Z' },
    { id: 'ck12', userId: 'u4', poiId: 'l3', hour: 19, dayOfWeek: 3, timestamp: '2021-05-12T19:00:00Z' },
    { id: 'ck13', userId: 'u4', poiId: 'l4', hour: 22, dayOfWeek: 0, timestamp: '2021-05-09T22:00:00Z' },

    { id: 'ck14', userId: 'u5', poiId: 'l2', hour: 3, dayOfWeek: 3, timestamp: '2021-05-12T03:00:00Z' },
    { id: 'ck15', userId: 'u5', poiId: 'l4', hour: 4, dayOfWeek: 5, timestamp: '2021-05-14T04:00:00Z' }
  ],
  groups: [
    {
      id: 'g1',
      name: 'Nhóm Khám Phá Cuối Tuần (g1)',
      memberUserIds: ['u1', 'u2', 'u3']
    }
  ],
  selectedGroupId: 'g1',
  friendSets: {
    u1: ['u2', 'u4'],
    u2: ['u1', 'u3', 'u4'],
    u3: ['u2', 'u5'],
    u4: ['u1', 'u2'],
    u5: ['u3']
  },
  hyperparameters: {
    theta: 0.6,
    alpha: 0.7,
    topN: 3,
    logBase: 'ln',
    simMode: 'paper_sum'
  }
};

/**
 * Trả về bản sao mới của bộ dữ liệu mẫu chuẩn (5 Users x 6 POIs)
 */
export function getFreshMockDataset(): Dataset {
  return JSON.parse(JSON.stringify(INITIAL_MOCK_DATASET));
}
