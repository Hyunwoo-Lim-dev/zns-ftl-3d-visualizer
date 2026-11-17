# zns-ftl-3d-visualizer

차세대 **ZNS(Zoned Namespaces) SSD**와 기존 **Block-level FTL SSD**의 데이터 쓰기 및 가비지 컬렉션(GC) 동작 원리를 웹 브라우저에서 직관적으로 비교할 수 있는 3D 시뮬레이터입니다.

## 주요 기능
- **3D 스토리지 시각화 (`Three.js`)**: 4개의 Zone과 16개의 Page 블록 상태를 3D 큐브 색상(`Empty`: 회색, `Valid`: 초록색, `Invalid`: 빨간색)으로 실시간 렌더링
- **Conventional FTL 시뮬레이션**: 덮어쓰기 불가로 인한 Invalid 파편화 및 가비지 컬렉션(GC) 시 유효 데이터 이주로 인한 **WAF(쓰기 증폭 지수) 상승** 재현
- **ZNS-FTL 시뮬레이션**: 구역(Zone) 단위 순차 쓰기 및 **Zone Reset**을 통해 불필요한 데이터 복사 없이 `WAF = 1.00`을 유지하는 원리 시연

## 실행 방법
1. 저장소를 클론합니다.
   ```bash
   git clone [https://github.com/Hyunwoo-Lim-dev/zns-ftl-3d-visualizer.git](https://github.com/Hyunwoo-Lim-dev/zns-ftl-3d-visualizer.git)
