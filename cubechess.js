// Rubik's Cube Simulator - Pure CSS 3D (No external libraries)
(() => {
  // Cube colors (RGB hex values)
  const COLORS = {
    WHITE: '#ffffff',
    YELLOW: '#ffff00',
    RED: '#ff0000',
    ORANGE: '#ff6600',
    BLUE: '#0000ff',
    GREEN: '#00ff00',
    BLACK: '#000000',
  };

  // Cube state - 3x3x3 grid
  // Position: [x, y, z] where -1, 0, 1 represent left/center/right, bottom/middle/top, back/center/front
  const cubeState = [];
  
  // Initialize cube state
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        cubeState.push({
          x, y, z,
          rotation: { x: 0, y: 0, z: 0 },
          colors: {
            front: z === 1 ? COLORS.WHITE : COLORS.BLACK,
            back: z === -1 ? COLORS.YELLOW : COLORS.BLACK,
            right: x === 1 ? COLORS.RED : COLORS.BLACK,
            left: x === -1 ? COLORS.ORANGE : COLORS.BLACK,
            top: y === 1 ? COLORS.BLUE : COLORS.BLACK,
            bottom: y === -1 ? COLORS.GREEN : COLORS.BLACK,
          }
        });
      }
    }
  }

  // State
  let moves = 0;
  let isAnimating = false;
  let cubeRotationX = -25;
  let cubeRotationY = 35;
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };

  // DOM elements
  const cubeContainer = document.getElementById('cube-container');
  const moveCount = document.getElementById('move-count');
  const faceButtons = document.querySelectorAll('.face-btn');
  const scrambleBtn = document.getElementById('scramble-btn');
  const resetBtn = document.getElementById('reset-btn');

  // Initialize
  function init() {
    renderCube();
    setupEventListeners();
    updateCubeRotation();
  }

  // Create a single cubie element
  function createCubieElement(cubie, index) {
    const cubieEl = document.createElement('div');
    cubieEl.className = 'cubie';
    cubieEl.dataset.index = index;
    
    // Calculate position offset (100px spacing)
    const offsetX = cubie.x * 100;
    const offsetY = -cubie.y * 100; // Invert Y for CSS
    const offsetZ = cubie.z * 100;
    
    const rotX = cubie.rotation.x;
    const rotY = cubie.rotation.y;
    const rotZ = cubie.rotation.z;
    
    cubieEl.style.transform = `translate3d(${offsetX}px, ${offsetY}px, ${offsetZ}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;
    
    // Create 6 faces
    const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
    faces.forEach(face => {
      const faceEl = document.createElement('div');
      faceEl.className = `cubie-face ${face}`;
      faceEl.style.backgroundColor = cubie.colors[face];
      cubieEl.appendChild(faceEl);
    });
    
    return cubieEl;
  }

  // Render the entire cube
  function renderCube() {
    cubeContainer.innerHTML = '';
    cubeState.forEach((cubie, index) => {
      const cubieEl = createCubieElement(cubie, index);
      cubeContainer.appendChild(cubieEl);
    });
  }

  // Update cube container rotation
  function updateCubeRotation() {
    cubeContainer.style.transform = `rotateX(${cubeRotationX}deg) rotateY(${cubeRotationY}deg)`;
  }

  // Setup event listeners
  function setupEventListeners() {
    // Mouse drag for rotation
    cubeContainer.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Touch support
    cubeContainer.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    // Face rotation buttons
    faceButtons.forEach(button => {
      button.addEventListener('click', handleFaceRotation);
    });

    // Action buttons
    scrambleBtn.addEventListener('click', scrambleCube);
    resetBtn.addEventListener('click', resetCube);
  }

  // Mouse event handlers
  function handleMouseDown(e) {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }

  function handleMouseMove(e) {
    if (!isDragging) return;

    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    cubeRotationY += deltaX * 0.5;
    cubeRotationX += deltaY * 0.5;

    // Clamp rotation
    cubeRotationX = Math.max(-90, Math.min(90, cubeRotationX));

    updateCubeRotation();
    previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  function handleMouseUp() {
    isDragging = false;
  }

  // Touch event handlers
  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      isDragging = true;
      previousMousePosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
      e.preventDefault();
    }
  }

  function handleTouchMove(e) {
    if (!isDragging || e.touches.length !== 1) return;

    const deltaX = e.touches[0].clientX - previousMousePosition.x;
    const deltaY = e.touches[0].clientY - previousMousePosition.y;

    cubeRotationY += deltaX * 0.5;
    cubeRotationX += deltaY * 0.5;

    // Clamp rotation
    cubeRotationX = Math.max(-90, Math.min(90, cubeRotationX));

    updateCubeRotation();
    previousMousePosition = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }

  function handleTouchEnd() {
    isDragging = false;
  }

  // Handle face rotation button click
  function handleFaceRotation(e) {
    if (isAnimating) return;

    const button = e.currentTarget;
    const face = button.dataset.face;
    const direction = button.dataset.dir;

    rotateFace(face, direction === 'cw');
  }

  // Update move counter
  function updateMoveCount() {
    moveCount.textContent = moves;
  }

  // Rotate a face
  function rotateFace(face, clockwise) {
    if (isAnimating) return;

    isAnimating = true;
    moves++;
    updateMoveCount();

    // Disable all buttons
    faceButtons.forEach(btn => btn.disabled = true);
    scrambleBtn.disabled = true;
    resetBtn.disabled = true;

    // Determine which cubies to rotate and the rotation axis
    let filterFn, axis, dir;
    
    switch (face) {
      case 'front':
        filterFn = c => c.z === 1;
        axis = 'z';
        dir = clockwise ? 1 : -1;
        break;
      case 'back':
        filterFn = c => c.z === -1;
        axis = 'z';
        dir = clockwise ? -1 : 1;
        break;
      case 'right':
        filterFn = c => c.x === 1;
        axis = 'x';
        dir = clockwise ? 1 : -1;
        break;
      case 'left':
        filterFn = c => c.x === -1;
        axis = 'x';
        dir = clockwise ? -1 : 1;
        break;
      case 'top':
        filterFn = c => c.y === 1;
        axis = 'y';
        dir = clockwise ? 1 : -1;
        break;
      case 'bottom':
        filterFn = c => c.y === -1;
        axis = 'y';
        dir = clockwise ? -1 : 1;
        break;
    }

    // Get indices of cubies to rotate
    const indicesToRotate = [];
    cubeState.forEach((cubie, index) => {
      if (filterFn(cubie)) {
        indicesToRotate.push(index);
      }
    });

    // Animate rotation
    animateFaceRotation(indicesToRotate, axis, dir);
  }

  // Animate face rotation
  function animateFaceRotation(indices, axis, direction) {
    const duration = 300;
    const startTime = Date.now();
    const targetAngle = direction * 90;

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const currentAngle = targetAngle * eased;

      // Update DOM elements
      indices.forEach(index => {
        const cubieEl = cubeContainer.children[index];
        const cubie = cubeState[index];
        
        const offsetX = cubie.x * 100;
        const offsetY = -cubie.y * 100;
        const offsetZ = cubie.z * 100;
        
        let rotX = cubie.rotation.x;
        let rotY = cubie.rotation.y;
        let rotZ = cubie.rotation.z;
        
        if (axis === 'x') rotX += currentAngle;
        if (axis === 'y') rotY += currentAngle;
        if (axis === 'z') rotZ += currentAngle;
        
        cubieEl.style.transform = `translate3d(${offsetX}px, ${offsetY}px, ${offsetZ}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Update state after animation
        updateStateAfterRotation(indices, axis, direction);
        renderCube();
        
        // Re-enable buttons
        faceButtons.forEach(btn => btn.disabled = false);
        scrambleBtn.disabled = false;
        resetBtn.disabled = false;
        isAnimating = false;
      }
    }

    animate();
  }

  // Update cube state after rotation
  function updateStateAfterRotation(indices, axis, direction) {
    // Update rotations
    indices.forEach(index => {
      const cubie = cubeState[index];
      if (axis === 'x') cubie.rotation.x += direction * 90;
      if (axis === 'y') cubie.rotation.y += direction * 90;
      if (axis === 'z') cubie.rotation.z += direction * 90;
    });

    // Update positions
    indices.forEach(index => {
      const cubie = cubeState[index];
      let { x, y, z } = cubie;

      if (axis === 'x') {
        const newY = direction > 0 ? -z : z;
        const newZ = direction > 0 ? y : -y;
        cubie.y = newY;
        cubie.z = newZ;
      } else if (axis === 'y') {
        const newX = direction > 0 ? z : -z;
        const newZ = direction > 0 ? -x : x;
        cubie.x = newX;
        cubie.z = newZ;
      } else if (axis === 'z') {
        const newX = direction > 0 ? -y : y;
        const newY = direction > 0 ? x : -x;
        cubie.x = newX;
        cubie.y = newY;
      }
    });

    // Update colors (rotate the color mapping)
    indices.forEach(index => {
      const cubie = cubeState[index];
      const colors = { ...cubie.colors };

      if (axis === 'x') {
        if (direction > 0) {
          cubie.colors.front = colors.bottom;
          cubie.colors.top = colors.front;
          cubie.colors.back = colors.top;
          cubie.colors.bottom = colors.back;
        } else {
          cubie.colors.front = colors.top;
          cubie.colors.bottom = colors.front;
          cubie.colors.back = colors.bottom;
          cubie.colors.top = colors.back;
        }
      } else if (axis === 'y') {
        if (direction > 0) {
          cubie.colors.front = colors.right;
          cubie.colors.left = colors.front;
          cubie.colors.back = colors.left;
          cubie.colors.right = colors.back;
        } else {
          cubie.colors.front = colors.left;
          cubie.colors.right = colors.front;
          cubie.colors.back = colors.right;
          cubie.colors.left = colors.back;
        }
      } else if (axis === 'z') {
        if (direction > 0) {
          cubie.colors.top = colors.right;
          cubie.colors.left = colors.top;
          cubie.colors.bottom = colors.left;
          cubie.colors.right = colors.bottom;
        } else {
          cubie.colors.top = colors.left;
          cubie.colors.right = colors.top;
          cubie.colors.bottom = colors.right;
          cubie.colors.left = colors.bottom;
        }
      }
    });
  }

  // Reset cube to solved state
  function resetCube() {
    if (isAnimating) return;

    // Reset all cubie states
    let index = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          cubeState[index].x = x;
          cubeState[index].y = y;
          cubeState[index].z = z;
          cubeState[index].rotation = { x: 0, y: 0, z: 0 };
          cubeState[index].colors = {
            front: z === 1 ? COLORS.WHITE : COLORS.BLACK,
            back: z === -1 ? COLORS.YELLOW : COLORS.BLACK,
            right: x === 1 ? COLORS.RED : COLORS.BLACK,
            left: x === -1 ? COLORS.ORANGE : COLORS.BLACK,
            top: y === 1 ? COLORS.BLUE : COLORS.BLACK,
            bottom: y === -1 ? COLORS.GREEN : COLORS.BLACK,
          };
          index++;
        }
      }
    }

    moves = 0;
    updateMoveCount();
    renderCube();
  }

  // Scramble cube
  function scrambleCube() {
    if (isAnimating) return;

    const moveCount = 20;
    const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
    let count = 0;

    function doRandomMove() {
      if (count >= moveCount) return;

      const randomFace = faces[Math.floor(Math.random() * faces.length)];
      const randomDir = Math.random() > 0.5;

      rotateFace(randomFace, randomDir);
      count++;

      setTimeout(doRandomMove, 350);
    }

    doRandomMove();
  }

  // Initialize when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

