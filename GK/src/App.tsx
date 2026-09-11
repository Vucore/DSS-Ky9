import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import {
  StepId,
  SelectedTraceState,
  CalculationTraceMeta,
  Dataset,
  SimMode,
  AppMode
} from './domain/types';
import {
  createInitialState,
  executeStep,
  executeAll,
  invalidateDownstream,
  getStepStatuses
} from './algorithm/pipeline';
import { INITIAL_MOCK_DATASET, getFreshMockDataset } from './data/mockDataset';

import { AlgorithmStepper } from './components/AlgorithmStepper';
import { TraceInspector } from './components/TraceInspector';
import { TraceHoverCard } from './components/TraceHoverCard';
import { MathView } from './components/MathView';
import { InlineMath } from './components/InlineMath';
import { StepInputLineageCard } from './components/StepInputLineageCard';

// Code-splitting via React.lazy for non-critical chunks
const Step0Dataset = lazy(() => import('./features/steps/Step0Dataset').then((m) => ({ default: m.Step0Dataset })));
const Step1Category = lazy(() => import('./features/steps/Step1Category').then((m) => ({ default: m.Step1Category })));
const Step2Time = lazy(() => import('./features/steps/Step2Time').then((m) => ({ default: m.Step2Time })));
const Step3Group = lazy(() => import('./features/steps/Step3Group').then((m) => ({ default: m.Step3Group })));
const Step4Similarity = lazy(() => import('./features/steps/Step4Similarity').then((m) => ({ default: m.Step4Similarity })));
const Step5CF = lazy(() => import('./features/steps/Step5CF').then((m) => ({ default: m.Step5CF })));
const Step6Divergence = lazy(() => import('./features/steps/Step6Divergence').then((m) => ({ default: m.Step6Divergence })));
const Step7Ranking = lazy(() => import('./features/steps/Step7Ranking').then((m) => ({ default: m.Step7Ranking })));

import {
  BookOpen,
  Sparkles,
  HelpCircle,
  X,
  AlertCircle,
  RotateCcw,
  Sun,
  Moon
} from 'lucide-react';

export function App() {
  const [pipelineState, setPipelineState] = useState(() => createInitialState(INITIAL_MOCK_DATASET));
  const appMode: AppMode = 'guided';
  const [activeStepId, setActiveStepId] = useState<StepId>(0);

  // Card tính toán nổi ngay tại vị trí con trỏ chuột khi hover
  const [hoveredTrace, setHoveredTrace] = useState<{
    trace: CalculationTraceMeta;
    label: React.ReactNode;
    x: number;
    y: number;
  } | null>(null);

  // Thanh bên phải khi click (giữ nguyên giao diện bên phải)
  const [selectedTrace, setSelectedTrace] = useState<SelectedTraceState | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showInvalidationBanner, setShowInvalidationBanner] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('cfid_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('cfid_theme', theme);
    } catch {}
  }, [theme]);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  // Tự động tắt card nổi khi người dùng chuyển sang cửa sổ khác
  useEffect(() => {
    const handleBlur = () => {
      setHoveredTrace(null);
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Tự động tính toán trước pipeline để sẵn sàng số liệu kế thừa
  useMemo(() => {
    if (!pipelineState.step7Output) {
      try {
        const computed = executeAll(pipelineState);
        setPipelineState(computed);
      } catch (e) {
        console.error('Initial pipeline execution error', e);
      }
    }
  }, []);

  const stepStatuses = useMemo(() => getStepStatuses(pipelineState), [pipelineState]);

  // Đóng hoàn toàn bảng chi tiết tính toán ở thanh bên phải
  const handleCloseTrace = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredTrace(null);
    setIsDrawerOpen(false);
    setSelectedTrace(null);
  };

  // Chuyển tab bước: nếu chuyển bước thì đóng drawer và tắt card nổi
  const handleSelectStep = (stepId: StepId) => {
    setActiveStepId(stepId);
    handleCloseTrace();
  };

  // Kích hoạt khi RÊ CHUỘT (hover): hiển thị card tính toán ngay tại vị trí chuột
  const handleHoverTrace = (traceState: SelectedTraceState) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    const posX = traceState.position?.x ?? 500;
    const posY = traceState.position?.y ?? 250;
    setHoveredTrace({
      trace: traceState.trace,
      label: traceState.label,
      x: posX,
      y: posY
    });
  };

  // Kích hoạt khi RỜI CHUỘT (leave): tắt card nổi ngay khi không còn hover
  const handleLeaveTrace = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    // Độ trễ 80ms giúp lướt giữa các ô không bị giật, nhưng rời khỏi là tắt ngay
    hoverTimerRef.current = setTimeout(() => {
      setHoveredTrace(null);
    }, 80);
  };

  // Kích hoạt khi NHẤP CHUỘT (click): mở và giữ nguyên giao diện thanh bên phải
  const handleSelectTrace = (traceState: SelectedTraceState) => {
    // Ẩn card nổi hover để nhường chỗ hiển thị
    setHoveredTrace(null);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    // Nếu nhấp lại chính đối tượng đang mở trên drawer -> toggle đóng
    if (isDrawerOpen && selectedTrace?.entityId === traceState.entityId) {
      setIsDrawerOpen(false);
      setSelectedTrace(null);
      return;
    }
    setSelectedTrace(traceState);
    setIsDrawerOpen(true);
  };

  // Chạy một bước đơn lẻ
  const handleRunStep = (stepId: StepId) => {
    try {
      const nextState = executeStep(pipelineState, stepId);
      setPipelineState(nextState);
      setActiveStepId(stepId);
    } catch (err: any) {
      alert(`Lỗi khi thực thi Bước ${stepId}: ${err?.message}`);
    }
  };

  // Chạy toàn bộ quy trình từ Bước 1 đến Bước 7
  const handleRunAll = () => {
    try {
      const nextState = executeAll(pipelineState);
      setPipelineState(nextState);
      setActiveStepId(7);
      setShowInvalidationBanner(false);
      if (nextState.step7Output?.rankings[0]?.trace) {
        setSelectedTrace({
          stepId: 7,
          entityId: nextState.step7Output.rankings[0].poiId,
          trace: nextState.step7Output.rankings[0].trace,
          label: `Hạng #1 - ${nextState.step7Output.rankings[0].poiName}`
        });
      }
    } catch (err: any) {
      alert(`Lỗi khi chạy toàn bộ quy trình: ${err?.message}`);
    }
  };

  // Đặt lại thuật toán về Bước 0
  const handleReset = () => {
    setPipelineState(createInitialState(pipelineState.dataset));
    setActiveStepId(0);
    handleCloseTrace();
    setShowInvalidationBanner(false);
  };

  // Nạp lại bộ dữ liệu mẫu chuẩn
  const handleLoadDemo = () => {
    const demo = getFreshMockDataset();
    const fresh = createInitialState(demo);
    const computed = executeAll(fresh);
    setPipelineState(computed);
    setActiveStepId(7);
    handleCloseTrace();
    setShowInvalidationBanner(false);
  };

  // Cập nhật bộ dữ liệu (reactive invalidation)
  const handleUpdateDataset = (updatedDataset: Dataset) => {
    const invalidated = invalidateDownstream(pipelineState, 0);
    setPipelineState({
      ...invalidated,
      dataset: updatedDataset
    });
    handleCloseTrace();
    setShowInvalidationBanner(true);
  };

  // Chuyển đổi chế độ tương đồng (paper_sum vs normalized_avg)
  const handleUpdateSimMode = (mode: SimMode, suggestedTheta?: number) => {
    const updated: Dataset = {
      ...pipelineState.dataset,
      hyperparameters: {
        ...pipelineState.dataset.hyperparameters,
        simMode: mode,
        theta: suggestedTheta ?? (mode === 'paper_sum' ? 0.6 : 0.3)
      }
    };
    const invalidated = invalidateDownstream({ ...pipelineState, dataset: updated }, 3);
    setPipelineState(invalidated);
    if (selectedTrace && selectedTrace.stepId >= 4) {
      setSelectedTrace(null);
      setIsDrawerOpen(false);
    }
  };

  // Điều hướng Bước kế tiếp trong Guided mode
  const handleNextStep = () => {
    if (activeStepId < 7) {
      const nextId = (activeStepId + 1) as StepId;
      setActiveStepId(nextId);
      setIsDrawerOpen(false);
    } else {
      setActiveStepId(1);
    }
  };

  // Điều hướng Bước trước trong Guided mode
  const handlePrevStep = () => {
    if (activeStepId > 0) {
      const prevId = (activeStepId - 1) as StepId;
      setActiveStepId(prevId);
      setIsDrawerOpen(false);
    }
  };

  return (
    <div className="app-layout">
      {/* 1. Header chính */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo-group">
            <div className="logo-icon">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="app-title-row">
                <h1 className="app-title">Mô Phỏng Thuật Toán CFID</h1>
                <span className="badge badge-indigo">CF with Intragroup Divergence</span>
              </div>
              <p className="app-subtitle">
                Gợi ý địa điểm POI cho nhóm kết hợp Lọc cộng tác &amp; Độ bất đồng nội bộ (Appl. Sci. 2021)
              </p>
            </div>
          </div>

          {/* Chế độ duy nhất: Học từng bước */}
          <div className="mode-switcher-container" role="status" aria-label="Chế độ học từng bước">
            <div className="mode-pill-btn mode-pill-active" style={{ cursor: 'default' }}>
              <BookOpen size={14} />
              <span>Học từng bước</span>
            </div>
          </div>

          <div className="header-meta-group">
            <button
              type="button"
              className="btn btn-outline btn-sm theme-toggle-btn"
              onClick={handleToggleTheme}
              title={theme === 'light' ? 'Chuyển sang giao diện Tối' : 'Chuyển sang giao diện Sáng'}
              aria-label="Chuyển đổi màu sắc giao diện sáng tối"
            >
              {theme === 'light' ? <Sun size={15} className="text-amber" /> : <Moon size={15} className="text-accent" />}
              <span>{theme === 'light' ? 'Giao diện Sáng' : 'Giao diện Tối'}</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowDocModal(true)}
              title="Ghi chú về tính mơ hồ trong bài báo &amp; Giả định toán học"
            >
              <HelpCircle size={15} />
              <span>Ghi chú bài báo</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Vùng nội dung chính */}
      <main className="main-content">
        {/* Stepper điều phối quy trình tích hợp Pipeline Map Track */}
        <AlgorithmStepper
          currentStepId={activeStepId}
          stepStatuses={stepStatuses}
          onSelectStep={handleSelectStep}
          onRunStep={handleRunStep}
          onRunAll={handleRunAll}
          onReset={handleReset}
          onLoadDemo={handleLoadDemo}
        />

        {/* Khung nội dung bước */}
        <div className="stage-container">
          <Suspense fallback={<div className="card loading-box"><p>Đang tải mô-đun bước...</p></div>}>
            {/* Khối Thông tin Đầu vào Toán học & Dòng Kế thừa liên bước (Luôn nằm trên cùng mọi bước) */}
            <StepInputLineageCard
              stepId={activeStepId}
              dataset={pipelineState.dataset}
              pipelineState={pipelineState}
            />

            {/* Bước 0: Cấu hình dữ liệu */}
            {activeStepId === 0 && (
              <Step0Dataset
                dataset={pipelineState.dataset}
                onUpdateDataset={handleUpdateDataset}
              />
            )}

            {/* Bước 1: Ưa thích thể loại */}
            {activeStepId === 1 && (
              <Step1Category
                dataset={pipelineState.dataset}
                output={pipelineState.step1Output}
                canRun={stepStatuses[1].canRun}
                appMode={appMode}
                onRunStep={() => handleRunStep(1)}
                onHoverTrace={handleHoverTrace}
                onSelectTrace={handleSelectTrace}
                onLeaveTrace={handleLeaveTrace}
                selectedEntityId={selectedTrace?.stepId === 1 ? selectedTrace.entityId : undefined}
                onPrevStep={handlePrevStep}
                onNextStep={handleNextStep}
              />
            )}

            {/* Bước 2: Ưa thích thời gian */}
            {activeStepId === 2 && (
              <Step2Time
                dataset={pipelineState.dataset}
                output={pipelineState.step2Output}
                canRun={stepStatuses[2].canRun}
                appMode={appMode}
                onRunStep={() => handleRunStep(2)}
                onHoverTrace={handleHoverTrace}
                onSelectTrace={handleSelectTrace}
                onLeaveTrace={handleLeaveTrace}
                selectedEntityId={selectedTrace?.stepId === 2 ? selectedTrace.entityId : undefined}
                onPrevStep={handlePrevStep}
                onNextStep={handleNextStep}
              />
            )}

            {/* Bước 3: Mô hình nhóm */}
            {activeStepId === 3 && (
              <Step3Group
                dataset={pipelineState.dataset}
                output={pipelineState.step3Output}
                canRun={stepStatuses[3].canRun}
                appMode={appMode}
                onRunStep={() => handleRunStep(3)}
                onHoverTrace={handleHoverTrace}
                onSelectTrace={handleSelectTrace}
                onLeaveTrace={handleLeaveTrace}
                selectedEntityId={selectedTrace?.stepId === 3 ? selectedTrace.entityId : undefined}
                onPrevStep={handlePrevStep}
                onNextStep={handleNextStep}
              />
            )}

            {/* Bước 4: Tương đồng nhóm - người dùng */}
            {activeStepId === 4 && (
              <Step4Similarity
                dataset={pipelineState.dataset}
                output={pipelineState.step4Output}
                canRun={stepStatuses[4].canRun}
                appMode={appMode}
                onRunStep={() => handleRunStep(4)}
                onHoverTrace={handleHoverTrace}
                onSelectTrace={handleSelectTrace}
                onLeaveTrace={handleLeaveTrace}
                selectedEntityId={selectedTrace?.stepId === 4 ? selectedTrace.entityId : undefined}
                onUpdateSimMode={handleUpdateSimMode}
                onPrevStep={handlePrevStep}
                onNextStep={handleNextStep}
              />
            )}

            {/* Bước 5: Lọc cộng tác */}
            {activeStepId === 5 && (
              <Step5CF
                dataset={pipelineState.dataset}
                output={pipelineState.step5Output}
                canRun={stepStatuses[5].canRun}
                appMode={appMode}
                onRunStep={() => handleRunStep(5)}
                onHoverTrace={handleHoverTrace}
                onSelectTrace={handleSelectTrace}
                onLeaveTrace={handleLeaveTrace}
                selectedEntityId={selectedTrace?.stepId === 5 ? selectedTrace.entityId : undefined}
                onPrevStep={handlePrevStep}
                onNextStep={handleNextStep}
              />
            )}

            {/* Bước 6: Độ bất đồng nội bộ */}
            {activeStepId === 6 && (
              <Step6Divergence
                dataset={pipelineState.dataset}
                output={pipelineState.step6Output}
                canRun={stepStatuses[6].canRun}
                appMode={appMode}
                onRunStep={() => handleRunStep(6)}
                onHoverTrace={handleHoverTrace}
                onSelectTrace={handleSelectTrace}
                onLeaveTrace={handleLeaveTrace}
                selectedEntityId={selectedTrace?.stepId === 6 ? selectedTrace.entityId : undefined}
                onPrevStep={handlePrevStep}
                onNextStep={handleNextStep}
              />
            )}

            {/* Bước 7: Xếp hạng Top-N */}
            {activeStepId === 7 && (
              <Step7Ranking
                dataset={pipelineState.dataset}
                output={pipelineState.step7Output}
                canRun={stepStatuses[7].canRun}
                appMode={appMode}
                onRunStep={() => handleRunStep(7)}
                onHoverTrace={handleHoverTrace}
                onSelectTrace={handleSelectTrace}
                onLeaveTrace={handleLeaveTrace}
                selectedEntityId={selectedTrace?.stepId === 7 ? selectedTrace.entityId : undefined}
                onPrevStep={handlePrevStep}
                onNextStep={handleNextStep}
              />
            )}
          </Suspense>
        </div>
      </main>

      {/* 3. Card tính toán nổi ngay tại vị trí chuột hover */}
      {hoveredTrace && (
        <TraceHoverCard
          trace={hoveredTrace.trace}
          label={hoveredTrace.label}
          x={hoveredTrace.x}
          y={hoveredTrace.y}
        />
      )}

      {/* 4. On-demand Slide Drawer thanh bên phải khi nhấp chuột (click) */}
      <TraceInspector
        isOpen={isDrawerOpen}
        currentStepId={activeStepId}
        selectedTrace={selectedTrace}
        onClose={handleCloseTrace}
      />

      {/* 4. Banner thông báo Invalidation khi người dùng chỉnh sửa dữ liệu */}
      {showInvalidationBanner && (
        <aside className="invalidation-banner" role="status" aria-live="polite">
          <AlertCircle size={18} className="text-amber" />
          <span>Dữ liệu đã thay đổi · Các bước tiếp theo cần được tính toán lại</span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleRunAll}
          >
            <RotateCcw size={13} />
            <span>Chạy lại ngay</span>
          </button>
          <button
            type="button"
            className="btn-icon text-muted"
            onClick={() => setShowInvalidationBanner(false)}
            aria-label="Đóng thông báo"
          >
            <X size={15} />
          </button>
        </aside>
      )}


      {/* 6. Documentation Modal */}
      {showDocModal && (
        <div className="modal-overlay" onClick={() => setShowDocModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-title-group">
                <BookOpen size={20} className="text-accent" />
                <h3 className="modal-title">Ghi chú bài báo &amp; Các quyết định toán học</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowDocModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="doc-section">
                <h4>1. Đề xuất POI mới cho nhóm: Loại trừ check-in Train</h4>
                <p>
                  Khái niệm POI mới được áp dụng chặt chẽ theo lịch sử huấn luyện của nhóm: <MathView latex="L_{\text{candidate}}(g) = L \setminus \bigcup_{u \in g} L_u^{\text{train}}" />. Mọi địa điểm mà ít nhất một thành viên nhóm đã từng ghé thăm trong tập Train đều bị loại bỏ khỏi danh sách gợi ý. Hệ thống cung cấp chế độ đối chứng <strong>Tất cả POI</strong> để kiểm tra công thức nguyên bản.
                </p>
              </div>

              <div className="doc-section">
                <h4>2. Công thức (12): Phép cộng hay Chuẩn hóa trung bình?</h4>
                <p>
                  <strong>Văn bản bài báo (trang 8):</strong> <em>&ldquo;Furthermore, we normalize the sum of the two and get the similarity between g and v. In summary, the preference similarity between group g and any user v is as follows: <InlineMath latex="\operatorname{sim}_{g, v} = \operatorname{sim}^m_{g, v} + \operatorname{sim}^u_{g, v}" /> (12)&rdquo;</em>
                </p>
                <p>
                  <strong>Thực thi trong hệ thống:</strong> Hệ thống cung cấp chế độ <strong>Bám sát bài báo</strong> (mặc định theo công thức in: <MathView latex="\operatorname{sim} = \operatorname{sim}^m + \operatorname{sim}^u \in [0, 2]" />) cũng như chế độ <strong>Chuẩn hóa trung bình</strong> (<MathView latex="\operatorname{sim} = \frac{\operatorname{sim}^m + \operatorname{sim}^u}{2} \in [0, 1]" />). Bạn có thể chuyển đổi trực tiếp tại thanh Bối cảnh hoặc ở Bước 4.
                </p>
              </div>

              <div className="doc-section">
                <h4>3. Lỗi in ấn mẫu số trong Công thức (11)</h4>
                <p>
                  <strong>Công thức in trong bài báo:</strong> Mẫu số in nhầm chỉ số <MathView latex="\sqrt{\sum (r_{u, ll})^2}" />. Đây là lỗi sắp chữ in ấn cho <InlineMath latex="l_k" />. Hệ thống đã chuẩn hóa mẫu số cosine chính xác: <MathView latex="\sqrt{\sum_{k=1}^m (r_{u, l_k})^2} \sqrt{\sum_{k=1}^m (r_{v, l_k})^2}" />.
                </p>
              </div>

              <div className="doc-section">
                <h4>4. Chính sách láng giềng tự thân (Self-neighbor)</h4>
                <p>
                  Khi tính lọc cộng tác trong Công thức (14), việc giữ thành viên nhóm trong tập láng giềng có thể dẫn đến hiện tượng nhóm tự bỏ phiếu cho chính mình. Hệ thống mặc định loại bỏ thành viên nhóm (<MathView latex="v \notin g" />) khỏi tập láng giềng CF, và cung cấp tùy chọn bật lại để đối chứng học thuật.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowDocModal(false)}>
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
