import React from 'react';
import { Dataset } from '../../domain/types';
import { InputTable } from '../../components/InputTable';
import { StepSummary } from '../../components/StepSummary';
import { InlineMath } from '../../components/InlineMath';

interface Step0DatasetProps {
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
}

export const Step0Dataset: React.FC<Step0DatasetProps> = ({
  dataset,
  onUpdateDataset
}) => {
  const currentGroup = dataset.groups.find((g) => g.id === dataset.selectedGroupId) || dataset.groups[0];

  return (
    <div className="step-feature-container">
      <StepSummary
        purpose={
          <span>
            Khởi tạo không gian dữ liệu không-thời gian: tập người dùng <InlineMath latex="U" />, địa điểm <InlineMath latex="L" />, thể loại <InlineMath latex="C" />, lịch sử check-in <InlineMath latex="R" />, nhóm mục tiêu <InlineMath latex="g" /> và tập bạn bè <InlineMath latex="A_u" /> theo đúng mô hình bài báo.
          </span>
        }
        conclusion={
          <span>
            Không gian dữ liệu đã sẵn sàng: {dataset.users.length} người dùng, {dataset.pois.length} địa điểm POI, {dataset.checkIns.length} lượt check-in và nhóm mục tiêu {currentGroup?.name}.
          </span>
        }
        isCompleted={true}
      />

      {/* Bảng dữ liệu đầu vào chi tiết với các Tab */}
      <InputTable
        dataset={dataset}
        onUpdateDataset={onUpdateDataset}
      />
    </div>
  );
};
