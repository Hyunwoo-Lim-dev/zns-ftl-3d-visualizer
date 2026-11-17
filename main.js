// 1. 기본 3D 장면(Scene), 카메라, 렌더러 설정
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 6, 9);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// 마우스 회전 및 줌 컨트롤
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 조명 추가
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// 2. 스토리지 상태 배열 (4 Zones x 4 Pages)
// 0: Empty(회색), 1: Valid(초록), 2: Invalid(빨강)
const ZONES = 4;
const PAGES = 4;
const state = Array.from({ length: ZONES }, () => Array(PAGES).fill(0));
const cubeMeshes = Array.from({ length: ZONES }, () => Array(PAGES).fill(null));

const COLORS = {
  0: 0x64748b, // Empty (회색)
  1: 0x22c55e, // Valid (초록색)
  2: 0xef4444  // Invalid (빨간색)
};

// 3. 3D 큐브 16개 생성 및 배치
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

// 4. 배열 상태를 3D 큐브 색깔과 HUD 텍스트에 반영하는 함수
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
  document.getElementById('valid-count').textContent = valid;
  document.getElementById('invalid-count').textContent = invalid;
  document.getElementById('empty-count').textContent = empty;
}

// '+ Write Data' 버튼 테스트
document.getElementById('btn-write').addEventListener('click', () => {
  for (let z = 0; z < ZONES; z++) {
    for (let p = 0; p < PAGES; p++) {
      if (state[z][p] === 0) {
        state[z][p] = 1;
        updateVisuals();
        return;
      }
    }
  }
});

// 창 크기 조절 대응
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 애니메이션 루프
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();