/* Tetris - Vanilla JS
   - Arrow keys or WASD for movement
   - Z or Q for CCW rotate, Up/W for CW rotate
   - Space for hard drop
   - P or Esc to pause
*/

(() => {
  const COLS = 10;
  const ROWS = 20;
  const CELL_SIZE = 30;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  canvas.width = COLS * CELL_SIZE;
  canvas.height = ROWS * CELL_SIZE;

  const scoreEl = document.getElementById('score');
  const linesEl = document.getElementById('lines');
  const levelEl = document.getElementById('level');

  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlaySubtitle = document.getElementById('overlaySubtitle');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');

  const BASE_SHAPES = {
    I: [
      [0,0,0,0],
      [1,1,1,1],
      [0,0,0,0],
      [0,0,0,0],
    ],
    J: [
      [1,0,0],
      [1,1,1],
      [0,0,0],
    ],
    L: [
      [0,0,1],
      [1,1,1],
      [0,0,0],
    ],
    O: [
      [1,1],
      [1,1],
    ],
    S: [
      [0,1,1],
      [1,1,0],
      [0,0,0],
    ],
    T: [
      [0,1,0],
      [1,1,1],
      [0,0,0],
    ],
    Z: [
      [1,1,0],
      [0,1,1],
      [0,0,0],
    ],
  };

  const TYPE_ORDER = ['I','J','L','O','S','T','Z'];

  // Nice distinct colors per piece type
  const TYPE_COLOR = {
    I: '#00F0F0', // cyan
    J: '#0000F0', // blue
    L: '#F0A000', // orange
    O: '#F0F000', // yellow
    S: '#00F000', // green
    T: '#A000F0', // purple
    Z: '#F00000', // red
  };

  // Game State
  const state = {
    grid: createGrid(ROWS, COLS, 0),
    current: null,
    nextQueue: [],
    bag: [],
    score: 0,
    lines: 0,
    level: 1,
    lastTime: 0,
    dropAccumulator: 0,
    dropInterval: 1000, // ms
    playing: false,
    paused: false,
    gameOver: false,
  };

  // Utility: create 2D grid
  function createGrid(r, c, val = 0) {
    return Array.from({ length: r }, () => Array(c).fill(val));
  }

  // Rotate NxN (or rectangular) matrix clockwise
  function rotateMatrixCW(mat) {
    const rows = mat.length;
    const cols = mat[0].length;
    const res = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        res[x][rows - 1 - y] = mat[y][x];
      }
    }
    return res;
  }

  function rotateN(mat, n) {
    let r = mat;
    n = ((n % 4) + 4) % 4;
    for (let i = 0; i < n; i++) r = rotateMatrixCW(r);
    return r;
  }

  function getTopOffset(shape) {
    // number of empty rows at the top
    let offset = 0;
    for (let y = 0; y < shape.length; y++) {
      if (shape[y].some(v => v === 1)) break;
      offset++;
    }
    return offset;
  }

  function newPiece() {
    if (state.nextQueue.length < 3) refillNextQueue();
    const type = state.nextQueue.shift();
    const base = BASE_SHAPES[type];
    const shape = rotateN(base, 0);
    const spawnX = Math.floor((COLS - shape[0].length) / 2);
    const spawnY = -getTopOffset(shape);
    return {
      type,
      rotation: 0,
      shape,
      x: spawnX,
      y: spawnY,
      color: TYPE_COLOR[type],
    };
  }

  function refillNextQueue() {
    if (state.bag.length === 0) {
      state.bag = shuffle([...TYPE_ORDER]);
    }
    // move from bag to queue
    while (state.bag.length && state.nextQueue.length < 5) {
      state.nextQueue.push(state.bag.pop());
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function collides(shape, offX, offY) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const gridX = offX + x;
        const gridY = offY + y;
        if (gridX < 0 || gridX >= COLS) return true;
        if (gridY >= ROWS) return true;
        if (gridY < 0) continue; // above board is allowed
        if (state.grid[gridY][gridX]) return true;
      }
    }
    return false;
  }

  function mergePiece() {
    const { shape, x, y, color } = state.current;
    for (let j = 0; j < shape.length; j++) {
      for (let i = 0; i < shape[j].length; i++) {
        if (!shape[j][i]) continue;
        const gx = x + i;
        const gy = y + j;
        if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
          state.grid[gy][gx] = color;
        }
      }
    }
  }

  function clearLines() {
    let linesCleared = 0;
    outer: for (let y = ROWS - 1; y >= 0; y--) {
      for (let x = 0; x < COLS; x++) {
        if (!state.grid[y][x]) continue outer;
      }
      // full row
      const row = state.grid.splice(y, 1)[0];
      state.grid.unshift(Array(COLS).fill(0));
      linesCleared++;
      y++; // recheck same y because rows shifted down
    }
    if (linesCleared > 0) {
      // classic-ish scoring
      const lineScores = [0, 100, 300, 500, 800];
      state.score += lineScores[linesCleared];
      state.lines += linesCleared;

      // level up every 10 lines
      const newLevel = Math.floor(state.lines / 10) + 1;
      if (newLevel !== state.level) {
        state.level = newLevel;
        updateDropInterval();
      }
      updateHUD();
    }
  }

  function updateDropInterval() {
    // basic speed curve: faster each level
    // Level 1 => 1000ms, each level reduces ~75ms, min 100ms
    const base = 1000;
    const step = 75;
    state.dropInterval = Math.max(100, base - (state.level - 1) * step);
  }

  function hardDrop() {
    if (!state.playing || state.paused) return;
    let drops = 0;
    while (!collides(state.current.shape, state.current.x, state.current.y + 1)) {
      state.current.y++;
      drops++;
    }
    if (drops > 0) {
      state.score += drops * 2; // bonus for hard drop distance
      updateHUD();
    }
    lockPiece();
  }

  function softDropStep() {
    // Attempt single step down for soft drop
    if (!collides(state.current.shape, state.current.x, state.current.y + 1)) {
      state.current.y++;
      state.score += 1; // soft drop point
      updateHUD();
    } else {
      lockPiece();
    }
  }

  function lockPiece() {
    mergePiece();
    clearLines();
    state.current = newPiece();
    // If new piece immediately collides => game over
    if (collides(state.current.shape, state.current.x, state.current.y)) {
      setGameOver();
    }
  }

  function rotateCurrent(dir = 1) {
    const base = BASE_SHAPES[state.current.type];
    const newRot = ((state.current.rotation + dir) % 4 + 4) % 4;
    const rotated = rotateN(base, newRot);

    const kicks = [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: -1 },
    ];

    for (const k of kicks) {
      const nx = state.current.x + k.x;
      const ny = state.current.y + k.y;
      if (!collides(rotated, nx, ny)) {
        state.current.shape = rotated;
        state.current.rotation = newRot;
        state.current.x = nx;
        state.current.y = ny;
        return;
      }
    }
    // if all kicks fail, no rotation
  }

  function move(dx) {
    const nx = state.current.x + dx;
    if (!collides(state.current.shape, nx, state.current.y)) {
      state.current.x = nx;
    }
  }

  function step(delta) {
    if (!state.playing || state.paused || state.gameOver) return;
    state.dropAccumulator += delta;
    if (state.dropAccumulator >= state.dropInterval) {
      state.dropAccumulator = 0;
      if (!collides(state.current.shape, state.current.x, state.current.y + 1)) {
        state.current.y++;
      } else {
        lockPiece();
      }
    }
  }

  function render() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw settled grid
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = state.grid[y][x];
        if (c) drawCell(x, y, c);
      }
    }

    // Draw current piece
    if (state.current) {
      const { shape, x, y, color } = state.current;
      for (let j = 0; j < shape.length; j++) {
        for (let i = 0; i < shape[j].length; i++) {
          if (!shape[j][i]) continue;
          const gx = x + i;
          const gy = y + j;
          if (gy < 0) continue; // above board not drawn
          drawCell(gx, gy, color);
        }
      }
    }

    // Draw inner border outline (visual)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    ctx.restore();
  }

  function drawCell(x, y, color) {
    const px = x * CELL_SIZE;
    const py = y * CELL_SIZE;

    // base
    ctx.fillStyle = color;
    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

    // bevel
    const grd = ctx.createLinearGradient(px, py, px + CELL_SIZE, py + CELL_SIZE);
    grd.addColorStop(0, 'rgba(255,255,255,0.22)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    grd.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = grd;
    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

    // inner border
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
  }

  function updateHUD() {
    scoreEl.textContent = String(state.score);
    linesEl.textContent = String(state.lines);
    levelEl.textContent = String(state.level);
  }

  // Game Loop
  function loop(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    const delta = timestamp - state.lastTime;
    state.lastTime = timestamp;

    step(delta);
    render();
    requestAnimationFrame(loop);
  }

  // Controls
  window.addEventListener('keydown', (e) => {
    if (!state.playing && !state.gameOver) return; // ignore if not started
    const k = e.key.toLowerCase();

    if (k === 'escape' || k === 'p') {
      togglePause();
      e.preventDefault();
      return;
    }
    if (state.paused) return;

    switch (k) {
      case 'arrowleft':
      case 'a':
        move(-1);
        e.preventDefault();
        break;
      case 'arrowright':
      case 'd':
        move(1);
        e.preventDefault();
        break;
      case 'arrowdown':
      case 's':
        softDropStep();
        e.preventDefault();
        break;
      case 'arrowup':
      case 'w':
      case 'x': // alt rotate CW
      case 'k':
        rotateCurrent(1);
        e.preventDefault();
        break;
      case 'z':
      case 'q':
        rotateCurrent(-1);
        e.preventDefault();
        break;
      case ' ':
        hardDrop();
        e.preventDefault();
        break;
      default:
        break;
    }
  });

  // Buttons
  startBtn.addEventListener('click', () => {
    if (state.gameOver) resetGame();
    startGame();
  });

  pauseBtn.addEventListener('click', () => {
    togglePause();
  });

  restartBtn.addEventListener('click', () => {
    resetGame();
    startGame();
  });

  // Game state helpers
  function startGame() {
    overlay.classList.remove('visible');
    if (!state.playing) {
      state.playing = true;
      state.paused = false;
      if (!state.current) {
        state.current = newPiece();
      }
      state.lastTime = 0;
    }
  }

  function togglePause() {
    if (!state.playing || state.gameOver) return;
    state.paused = !state.paused;
    if (state.paused) {
      showOverlay('Paused', 'Press Start to resume or press P/Esc.', 'Resume');
    } else {
      overlay.classList.remove('visible');
    }
  }

  function setGameOver() {
    state.gameOver = true;
    state.playing = false;
    state.paused = false;
    showOverlay('Game Over', `Score: ${state.score} • Lines: ${state.lines}`, 'Play Again');
  }

  function resetGame() {
    state.grid = createGrid(ROWS, COLS, 0);
    state.current = null;
    state.nextQueue = [];
    state.bag = [];
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.dropAccumulator = 0;
    state.dropInterval = 1000;
    state.playing = false;
    state.paused = false;
    state.gameOver = false;
    updateHUD();
  }

  function showOverlay(title, subtitle, btnLabel = 'Start Game') {
    overlayTitle.textContent = title;
    overlaySubtitle.textContent = subtitle;
    startBtn.textContent = btnLabel;
    overlay.classList.add('visible');
  }

  // Initialize
  showOverlay('Tetris', 'Clear lines by stacking blocks. Use arrow keys or WASD.', 'Start Game');
  updateHUD();
  requestAnimationFrame(loop);
})();
