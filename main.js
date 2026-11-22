// 1. 기본 3D 장면(Scene), 카메라, 렌더러 설정
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 6, 9);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// 2. 스토리지 상태 및 시뮬레이션 변수
// 0: Empty(회색), 1: Valid(초록), 2: Invalid(빨강)
const ZONES = 4;
const PAGES = 4;
let state = Array.from({ length: ZONES }, () => Array(PAGES).fill(0));
const cubeMeshes = Array.from({ length: ZONES }, () => Array(PAGES).fill(null));

let isZnsMode = false; // false: Conventional FTL, true: ZNS-FTL
let hostWrites = 0;    // 사용자가 요청한 쓰기 횟수
let nandWrites = 0;    // 실제 SSD 내부에서 발생한 쓰기 횟수 (GC 복사 포함)

const COLORS = {
  0: 0x64748b, // Empty (회색)
  1: 0x22c55e, // Valid (초록색)
  2: 0xef4444  // Invalid (빨간색)
};

// 3. 3D 큐브 16개 생성
const geometry = new THREE.BoxGeometry(1.1, 0.6, 1.1);
for (let z = 0; z < ZONES; z++) {
  for (let p = 0; p < PAGES; p++) {
    const material = new THREE.MeshStandardMaterial({ color: COLORS[0] });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set((p - 1.5) * 1.4, 0, (z - 1.5) * 1.4);
    scene.add(cube);
    cubeMeshes[z][p] = cube;
  }
}

// 4. 화면(3D 큐브 색상 + 좌측 HUD 수치) 동기화 함수
function updateVisuals() {
  let valid = 0, invalid = 0, empty = 0;
  for (let z = 0; z < ZONES; z++) {
    for (let p = 0; p < PAGES; p++) {
      const s = state[z][p];
      cubeMeshes[z][p].material.color.setHex(COLORS[s]);
      if (s === 1) valid++;
      else if (s === 2) invalid++;
      else empty++;
    }
  }
  document.getElementById('mode-text').textContent = isZnsMode ? 'ZNS-FTL (순차 쓰기)' : 'Conventional FTL';
  document.getElementById('valid-count').textContent = valid;
  document.getElementById('invalid-count').textContent = invalid;
  document.getElementById('empty-count').textContent = empty;

  const waf = hostWrites === 0 ? 1.0 : (nandWrites / hostWrites);
  document.getElementById('waf-text').textContent = waf.toFixed(2);
}

// 5. 초기화 함수
function resetSimulation() {
  state = Array.from({ length: ZONES }, () => Array(PAGES).fill(0));
  hostWrites = 0;
  nandWrites = 0;
  updateVisuals();
}

// [버튼 1] Mode: FTL <-> ZNS 전환
document.getElementById('btn-mode').addEventListener('click', () => {
  isZnsMode = !isZnsMode;
  resetSimulation();
});

// [버튼 2] + Write Data (데이터 쓰기)
document.getElementById('btn-write').addEventListener('click', () => {
  for (let z = 0; z < ZONES; z++) {
    for (let p = 0; p < PAGES; p++) {
      if (state[z][p] === 0) {
        state[z][p] = 1;
        hostWrites++;
        nandWrites++;
        updateVisuals();
        return;
      }
    }
  }
  alert('저장 공간이 가득 찼습니다! Trigger GC / Zone Reset을 실행하세요.');
});

// [버튼 3] Update Data (기존 데이터 수정)
document.getElementById('btn-update').addEventListener('click', () => {
  const validCells = [];
  const emptyCells = [];
  for (let z = 0; z < ZONES; z++) {
    for (let p = 0; p < PAGES; p++) {
      if (state[z][p] === 1) validCells.push({ z, p });
      if (state[z][p] === 0) emptyCells.push({ z, p });
    }
  }
  if (validCells.length === 0) {
    alert('수정할 Valid(초록색) 데이터가 없습니다. 먼저 Write Data를 눌러주세요.');
    return;
  }
  if (emptyCells.length === 0) {
    alert('빈 공간이 부족합니다! Trigger GC / Zone Reset을 실행하세요.');
    return;
  }

  // 시연 시 0번 Zone(첫째 줄)에 Valid와 Invalid가 섞여 GC 시 WAF 상승이 확실히 보이도록 앞쪽 Valid 우선 선택
  const target = validCells[0];
  state[target.z][target.p] = 2;

  const dest = emptyCells[0];
  state[dest.z][dest.p] = 1;

  hostWrites++;
  nandWrites++;
  updateVisuals();
});

// [버튼 4] Trigger GC (기존 FTL) / Zone Reset (ZNS 모드)
document.getElementById('btn-gc').addEventListener('click', () => {
  if (isZnsMode) {
    // ZNS 모드: Invalid가 포함된 가장 앞선 Zone을 유효 데이터 복사 없이 통째로 Reset (WAF = 1.00 유지)
    for (let z = 0; z < ZONES; z++) {
      if (state[z].includes(2) || state[z].includes(1)) {
        state[z] = Array(PAGES).fill(0);
        updateVisuals();
        return;
      }
    }
  } else {
    // Conventional FTL 모드: Invalid가 가장 많은 Zone 선택 -> 남은 Valid 데이터를 다른 빈칸으로 복사(WAF 증가!) 후 Zone 초기화
    let victimZone = -1;
    let maxInvalid = 0;
    for (let z = 0; z < ZONES; z++) {
      const invCount = state[z].filter(v => v === 2).length;
      if (invCount > maxInvalid) {
        maxInvalid = invCount;
        victimZone = z;
      }
    }
    if (victimZone === -1) {
      alert('가비지 컬렉션할 Invalid(빨간색) 블록이 없습니다.');
      return;
    }

    // 희생 Zone 안의 살아남은 Valid 블록 개수만큼 다른 Zone 빈칸으로 이주(복사) 발생
    const survivingValids = state[victimZone].filter(v => v === 1).length;
    state[victimZone] = Array(PAGES).fill(0);

    let moved = 0;
    for (let z = 0; z < ZONES && moved < survivingValids; z++) {
      if (z === victimZone) continue;
      for (let p = 0; p < PAGES && moved < survivingValids; p++) {
        if (state[z][p] === 0) {
          state[z][p] = 1;
          nandWrites++; // GC로 인한 내부 추가 쓰기 -> WAF 상승 원인!
          moved++;
        }
      }
    }
    updateVisuals();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
