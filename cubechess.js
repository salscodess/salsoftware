/* 3D Cube Chess - Vanilla JS with Canvas 2D (Pseudo-3D) 
 * 
 * Features:
 * - Cross-face chess piece movement: Pieces can transition between cube faces
 * - Selective rotation: Rotate individual rows or columns instead of the entire cube
 * - Mobile support: Touch controls, pinch-to-zoom, and responsive design
 * - Collapsible menu: Hamburger menu on mobile for better screen utilization
 * 
 * Movement System:
 * - Traditional chess rules apply within each face
 * - Pieces at edge positions can move to adjacent faces based on direction
 * - Face adjacency mapping maintains spatial continuity across the cube
 * 
 * Rotation Modes:
 * - View Rotation: Rotate the entire cube view (default)
 * - Row Rotation: Rotate a specific horizontal row across faces
 * - Column Rotation: Rotate a specific vertical column across faces
 */

(function() {
  'use strict';

  // === Constants and Piece Definitions ===
  const COLORS = {
    WHITE: 'white',
    BLACK: 'black',
  };
  const PIECES = {
    PAWN: 'P', ROOK: 'R', KNIGHT: 'N', BISHOP: 'B', QUEEN: 'Q', KING: 'K'
  };
  const FACE_NAMES = ['front', 'back', 'left', 'right', 'top', 'bottom'];
  const FACE_COLORS = {
    front: '#f6f7fb',
    back: '#e7e9f6',
    left: '#e9f7f2',
    right: '#f7f1e9',
    top: '#f3e9f7',
    bottom: '#f7e9eb'
  };
  const PIECE_COLORS = {
    white: '#fafafa',
    black: '#151515'
  };

  // === Game State ===
  let gameState = {
    faces: {},
    currentTurn: COLORS.WHITE,
    selectedSquare: null,
    possibleMoves: [],
    inCheck: false,
    gameOver: false,
    aiThinking: false,
    rotationX: -20,
    rotationY: 45,
    scale: 1.0,
    dragStart: null,
    rotationMode: 'view',    // 'view', 'row', 'column'
    selectedRotationAxis: null,
  };

  // === Canvas/DOM Setup ===
  let ctx, canvas;
  const root = document.getElementById('root');

  // === Utility Functions ===

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // === Cube Model and Rendering ===

  function createCubeFaces() {
    // Each face is an 8x8 array
    const faces = {};
    for (const name of FACE_NAMES) {
      faces[name] = Array.from({ length: 8 }, () => Array(8).fill(null));
    }
    // Place pieces (classic chess, white on front, black on back)
    // White pieces
    faces.front[7] = [
      { type: PIECES.ROOK, color: COLORS.WHITE },
      { type: PIECES.KNIGHT, color: COLORS.WHITE },
      { type: PIECES.BISHOP, color: COLORS.WHITE },
      { type: PIECES.QUEEN, color: COLORS.WHITE },
      { type: PIECES.KING, color: COLORS.WHITE },
      { type: PIECES.BISHOP, color: COLORS.WHITE },
      { type: PIECES.KNIGHT, color: COLORS.WHITE },
      { type: PIECES.ROOK, color: COLORS.WHITE },
    ];
    for (let i = 0; i < 8; i++) {
      faces.front[6][i] = { type: PIECES.PAWN, color: COLORS.WHITE };
    }
    // Black pieces
    faces.back[0] = [
      { type: PIECES.ROOK, color: COLORS.BLACK },
      { type: PIECES.KNIGHT, color: COLORS.BLACK },
      { type: PIECES.BISHOP, color: COLORS.BLACK },
      { type: PIECES.QUEEN, color: COLORS.BLACK },
      { type: PIECES.KING, color: COLORS.BLACK },
      { type: PIECES.BISHOP, color: COLORS.BLACK },
      { type: PIECES.KNIGHT, color: COLORS.BLACK },
      { type: PIECES.ROOK, color: COLORS.BLACK },
    ];
    for (let i = 0; i < 8; i++) {
      faces.back[1][i] = { type: PIECES.PAWN, color: COLORS.BLACK };
    }
    return faces;
  }

  // === Rendering Functions ===

  function drawCube() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pseudo-3D projection
    const w = Math.min(canvas.width, canvas.height) * 0.6 * gameState.scale;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const cubeSize = w;
    // Cube face order: back, bottom, left, right, top, front (for correct painter's order)
    const drawOrder = ['back', 'bottom', 'left', 'right', 'top', 'front'];
    for (const face of drawOrder) {
      drawFace(face, cx, cy, cubeSize);
    }
    // Overlay selection
    if (gameState.selectedSquare) {
      highlightSquare(gameState.selectedSquare.face, gameState.selectedSquare.row, gameState.selectedSquare.col, '#51a8e3');
    }
    // Overlay possible moves
    for (const move of gameState.possibleMoves) {
      highlightSquare(move.face, move.row, move.col, '#2ecd72');
    }
    canvas.clickableSquares = [];
    for (const face of FACE_NAMES) {
      for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
        if (squareIsVisible(face, row, col)) {
          canvas.clickableSquares.push({
            face, row, col,
            projected: squarePolygon(face, row, col, cx, cy, cubeSize)
          });
        }
      }
    }
  }

  function drawFace(face, cx, cy, cubeSize) {
    // Calculate 2D projection of face corners
    const faceMatrix = getFaceMatrix(face, cubeSize / 2, gameState.rotationX, gameState.rotationY);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        // Project corners
        const points = [];
        for (const [dy, dx] of [
          [row / 8, col / 8],
          [row / 8, (col + 1) / 8],
          [(row + 1) / 8, (col + 1) / 8],
          [(row + 1) / 8, col / 8],
        ]) {
          const v = faceMatrix([
            (dx - 0.5) * cubeSize,
            (dy - 0.5) * cubeSize,
            0
          ]);
          points.push([cx + v[0], cy + v[1]]);
        }
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < 4; i++) {
          ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.closePath();
        // Fill square
        ctx.fillStyle = (row + col) % 2 === 0 ? FACE_COLORS[face] : '#b0b4c9';
        ctx.globalAlpha = 0.93;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = '#20264c';
        ctx.lineWidth = 0.85;
        ctx.stroke();
        // Draw piece
        const piece = gameState.faces[face][row][col];
        if (piece) {
          drawPiece(piece, points, face);
        }
      }
    }
  }

  function getFaceMatrix(face, half, rotX, rotY) {
    // Return a function that projects a [x,y,z] to 2D after cube rotation and face orientation
    const rad = Math.PI / 180;
    const M = (angleX, angleY) => ([x, y, z]) => {
      // 3D rotation matrix: first Y, then X
      const cosY = Math.cos(angleY * rad), sinY = Math.sin(angleY * rad);
      const cosX = Math.cos(angleX * rad), sinX = Math.sin(angleX * rad);
      let nx = x * cosY - z * sinY;
      let nz = x * sinY + z * cosY;
      let ny = y * cosX - nz * sinX;
      nz = y * sinX + nz * cosX;
      return [nx, ny, nz];
    };
    // Face orientation matrix
    const faceRot = {
      front: [0, 0],
      back: [0, 180],
      left: [0, -90],
      right: [0, 90],
      top: [-90, 0],
      bottom: [90, 0],
    }[face];
    return ([x, y, z]) => {
      let v = [x, y, z];
      v = M(...faceRot)(v);
      v = M(rotX, rotY)(v);
      return [v[0], v[1]];
    };
  }

  function drawPiece(piece, points, face) {
    // Draw piece symbol in center of polygon
    const x = (points[0][0] + points[2][0]) / 2;
    const y = (points[0][1] + points[2][1]) / 2;
    ctx.save();
    ctx.font = '19px Arial Black, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PIECE_COLORS[piece.color];
    let symbol = '';
    switch (piece.type) {
      case PIECES.PAWN: symbol = '♟'; break;
      case PIECES.ROOK: symbol = '♜'; break;
      case PIECES.KNIGHT: symbol = '♞'; break;
      case PIECES.BISHOP: symbol = '♝'; break;
      case PIECES.QUEEN: symbol = '♛'; break;
      case PIECES.KING: symbol = '♚'; break;
    }
    ctx.shadowColor = face === 'front' ? '#555' : '#111';
    ctx.shadowBlur = 4;
    ctx.fillText(symbol, x, y);
    ctx.restore();
  }

  function highlightSquare(face, row, col, color) {
    const w = Math.min(canvas.width, canvas.height) * 0.6 * gameState.scale;
    const cx = canvas.width / 2, cy = canvas.height / 2, cubeSize = w;
    const points = squarePolygon(face, row, col, cx, cy, cubeSize);
    ctx.save();
    ctx.globalAlpha = 0.33;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function squarePolygon(face, row, col, cx, cy, cubeSize) {
    const faceMatrix = getFaceMatrix(face, cubeSize / 2, gameState.rotationX, gameState.rotationY);
    const points = [];
    for (const [dy, dx] of [
      [row / 8, col / 8],
      [row / 8, (col + 1) / 8],
      [(row + 1) / 8, (col + 1) / 8],
      [(row + 1) / 8, col / 8],
    ]) {
      const v = faceMatrix([
        (dx - 0.5) * cubeSize,
        (dy - 0.5) * cubeSize,
        0
      ]);
      points.push([cx + v[0], cy + v[1]]);
    }
    return points;
  }

  function squareIsVisible(face, row, col) {
    // Only display squares on faces that are facing camera
    const rotY = ((gameState.rotationY % 360) + 360) % 360;
    if (face === 'front' && (rotY < 90 || rotY > 270)) return true;
    if (face === 'back' && (rotY > 90 && rotY < 270)) return true;
    if (face === 'left' && (rotY > 180)) return true;
    if (face === 'right' && (rotY < 180)) return true;
    if (face === 'top' && gameState.rotationX < -20) return true;
    if (face === 'bottom' && gameState.rotationX > 20) return true;
    return false;
  }

  // === Mouse/Touch and UI Handling ===

  function isPointInPolygon(p, poly) {
    let c = false, n = poly.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      if (((poly[i][1] > p.y) !== (poly[j][1] > p.y)) &&
        p.x < (poly[j][0] - poly[i][0]) * (p.y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0]) c = !c;
    }
    return c;
  }

  // === Chess Rules and Move Generation ===

  // Helper function to get adjacent face and position when moving off an edge
  function getAdjacentFacePosition(face, row, col, direction) {
    const adjacency = {
      'front': { up: ['top', 7, col], down: ['bottom', 0, col], left: ['left', row, 7], right: ['right', row, 0] },
      'back': { up: ['top', 0, 7 - col], down: ['bottom', 7, 7 - col], left: ['right', row, 7], right: ['left', row, 0] },
      'right': { up: ['top', row, 7], down: ['bottom', row, 7], left: ['front', row, 7], right: ['back', row, 7] },
      'left': { up: ['top', row, 0], down: ['bottom', row, 0], left: ['back', row, 0], right: ['front', row, 0] },
      'top': { up: ['back', 0, 7 - col], down: ['front', 0, col], left: ['left', 0, col], right: ['right', 0, col] },
      'bottom': { up: ['front', 7, col], down: ['back', 7, 7 - col], left: ['left', 7, col], right: ['right', 7, col] }
    };
    const adj = adjacency[face]?.[direction];
    if (!adj) return null;
    return { face: adj[0], row: adj[1], col: adj[2] };
  }

  // Helper to get the next position in a direction (within face or crossing to adjacent face)
  function getNextPosition(face, row, col, dRow, dCol) {
    const newRow = row + dRow;
    const newCol = col + dCol;
    
    // Still within the same face
    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
      return { face, row: newRow, col: newCol };
    }
    
    // Crossing to an adjacent face
    let direction = null;
    if (newRow < 0) direction = 'up';
    else if (newRow >= 8) direction = 'down';
    else if (newCol < 0) direction = 'left';
    else if (newCol >= 8) direction = 'right';
    
    if (direction) {
      return getAdjacentFacePosition(face, row, col, direction);
    }
    
    return null;
  }

  // Get all positions along a path with collision detection
  function getPathPositions(faces, startFace, startRow, startCol, dRow, dCol, maxSteps = 8) {
    const positions = [];
    let currentPos = { face: startFace, row: startRow, col: startCol };
    
    for (let step = 0; step < maxSteps; step++) {
      const nextPos = getNextPosition(currentPos.face, currentPos.row, currentPos.col, dRow, dCol);
      if (!nextPos) break;
      
      const piece = faces[nextPos.face][nextPos.row][nextPos.col];
      
      // Stop if we hit a piece
      if (piece) {
        // Can capture if different color
        if (piece.color !== faces[startFace][startRow][startCol].color) {
          positions.push(nextPos);
        }
        break;
      }
      
      positions.push(nextPos);
      currentPos = nextPos;
      
      // If we just crossed a face boundary, we need to recalculate the direction vector
      // For now, continue in the same relative direction
    }
    
    return positions;
  }

  // Chess move validation with cross-face movement support and collision detection
  function getValidMoves(faces, face, row, col) {
    const piece = faces[face][row][col];
    if (!piece) return [];
    const moves = [];
    
    switch (piece.type) {
      case PIECES.PAWN: {
        const direction = piece.color === COLORS.WHITE ? -1 : 1;
        const newRow = row + direction;
        
        // Forward move on same face
        if (newRow >= 0 && newRow < 8 && !faces[face][newRow][col]) {
          moves.push({ face, row: newRow, col });
        } else if (newRow < 0 || newRow >= 8) {
          // Try to move to adjacent face
          const dir = newRow < 0 ? 'up' : 'down';
          const adjPos = getAdjacentFacePosition(face, row, col, dir);
          if (adjPos && !faces[adjPos.face][adjPos.row][adjPos.col]) {
            moves.push(adjPos);
          }
        }
        
        // Diagonal captures on same face
        if (newRow >= 0 && newRow < 8) {
          if (col > 0 && faces[face][newRow][col - 1] &&
            faces[face][newRow][col - 1].color !== piece.color) {
            moves.push({ face, row: newRow, col: col - 1 });
          }
          if (col < 7 && faces[face][newRow][col + 1] &&
            faces[face][newRow][col + 1].color !== piece.color) {
            moves.push({ face, row: newRow, col: col + 1 });
          }
        }
        break;
      }
      
      case PIECES.ROOK: {
        // Move in 4 directions with collision detection and cross-face support
        const directions = [
          [-1, 0], // up
          [1, 0],  // down
          [0, -1], // left
          [0, 1]   // right
        ];
        
        for (const [dRow, dCol] of directions) {
          moves.push(...getPathPositions(faces, face, row, col, dRow, dCol));
        }
        break;
      }
      
      case PIECES.BISHOP: {
        // Move diagonally in 4 directions with collision detection
        const directions = [
          [-1, -1], // up-left
          [-1, 1],  // up-right
          [1, -1],  // down-left
          [1, 1]    // down-right
        ];
        
        for (const [dRow, dCol] of directions) {
          moves.push(...getPathPositions(faces, face, row, col, dRow, dCol));
        }
        break;
      }
      
      case PIECES.QUEEN: {
        // Combination of rook and bishop moves
        const directions = [
          [-1, 0], [1, 0], [0, -1], [0, 1],  // rook moves
          [-1, -1], [-1, 1], [1, -1], [1, 1]  // bishop moves
        ];
        
        for (const [dRow, dCol] of directions) {
          moves.push(...getPathPositions(faces, face, row, col, dRow, dCol));
        }
        break;
      }
      
      case PIECES.KNIGHT: {
        // Knight moves in L-shape: 2 squares in one direction, 1 in perpendicular
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        for (const [dRow, dCol] of knightMoves) {
          const newRow = row + dRow;
          const newCol = col + dCol;
          
          // Check if within same face
          if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const target = faces[face][newRow][newCol];
            if (!target || target.color !== piece.color) {
              moves.push({ face, row: newRow, col: newCol });
            }
          } else {
            // Handle cross-face knight moves
            const nextPos = getNextPosition(face, row, col, dRow, dCol);
            if (nextPos) {
              const target = faces[nextPos.face][nextPos.row][nextPos.col];
              if (!target || target.color !== piece.color) {
                moves.push(nextPos);
              }
            }
          }
        }
        break;
      }
      
      case PIECES.KING: {
        // King moves one square in any direction
        const directions = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],           [0, 1],
          [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dRow, dCol] of directions) {
          const newRow = row + dRow;
          const newCol = col + dCol;
          
          // Check if within same face
          if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const target = faces[face][newRow][newCol];
            if (!target || target.color !== piece.color) {
              moves.push({ face, row: newRow, col: newCol });
            }
          } else {
            // Handle cross-face king moves
            const nextPos = getNextPosition(face, row, col, dRow, dCol);
            if (nextPos) {
              const target = faces[nextPos.face][nextPos.row][nextPos.col];
              if (!target || target.color !== piece.color) {
                moves.push(nextPos);
              }
            }
          }
        }
        break;
      }
    }
    
    return moves;
  }

  // === Rotation System ===

  // Animation state for slice rotations
  let animationState = {
    active: false,
    progress: 0,
    duration: 500, // milliseconds
    type: null, // 'row' or 'column'
    index: null,
    clockwise: null,
    startTime: null,
    originalFaces: null
  };

  function rotateRow(rowIndex, clockwise) {
    if (gameState.aiThinking || animationState.active) return;
    
    // Start animation
    animationState = {
      active: true,
      progress: 0,
      duration: 500,
      type: 'row',
      index: rowIndex,
      clockwise: clockwise,
      startTime: Date.now(),
      originalFaces: deepClone(gameState.faces)
    };
    
    // Perform the actual rotation (Rubik's cube style - 4 faces)
    const front = gameState.faces['front'];
    const back = gameState.faces['back'];
    const left = gameState.faces['left'];
    const right = gameState.faces['right'];
    const temp = [];
    
    if (clockwise) {
      temp.push(...right[rowIndex]);
      right[rowIndex] = [...front[rowIndex]];
      front[rowIndex] = [...left[rowIndex]];
      left[rowIndex] = [...back[rowIndex]];
      back[rowIndex] = [...temp];
    } else {
      temp.push(...left[rowIndex]);
      left[rowIndex] = [...front[rowIndex]];
      front[rowIndex] = [...right[rowIndex]];
      right[rowIndex] = [...back[rowIndex]];
      back[rowIndex] = [...temp];
    }
    
    animateRotation();
  }

  function rotateColumn(colIndex, clockwise) {
    if (gameState.aiThinking || animationState.active) return;
    
    // Start animation
    animationState = {
      active: true,
      progress: 0,
      duration: 500,
      type: 'column',
      index: colIndex,
      clockwise: clockwise,
      startTime: Date.now(),
      originalFaces: deepClone(gameState.faces)
    };
    
    // Perform the actual rotation (Rubik's cube style - 4 faces with coordinate transformation for back)
    const front = gameState.faces['front'];
    const top = gameState.faces['top'];
    const back = gameState.faces['back'];
    const bottom = gameState.faces['bottom'];
    const temp = [];
    
    if (clockwise) {
      for (let i = 0; i < 8; i++) temp.push(bottom[i][colIndex]);
      for (let i = 0; i < 8; i++) bottom[i][colIndex] = front[i][colIndex];
      for (let i = 0; i < 8; i++) front[i][colIndex] = top[i][colIndex];
      for (let i = 0; i < 8; i++) top[i][colIndex] = back[7 - i][7 - colIndex];
      for (let i = 0; i < 8; i++) back[i][7 - colIndex] = temp[7 - i];
    } else {
      for (let i = 0; i < 8; i++) temp.push(top[i][colIndex]);
      for (let i = 0; i < 8; i++) top[i][colIndex] = front[i][colIndex];
      for (let i = 0; i < 8; i++) front[i][colIndex] = bottom[i][colIndex];
      for (let i = 0; i < 8; i++) bottom[i][colIndex] = back[7 - i][7 - colIndex];
      for (let i = 0; i < 8; i++) back[i][7 - colIndex] = temp[7 - i];
    }
    
    animateRotation();
  }

  function animateRotation() {
    if (!animationState.active) return;
    
    const elapsed = Date.now() - animationState.startTime;
    animationState.progress = Math.min(elapsed / animationState.duration, 1.0);
    
    // Easing function for smooth animation
    const easeProgress = easeInOutCubic(animationState.progress);
    
    // Temporarily adjust rotation for visual feedback during animation
    const rotationAmount = easeProgress * 90 * (animationState.clockwise ? 1 : -1);
    
    if (animationState.type === 'row') {
      // Visual feedback: slightly rotate the view during row rotation
      const originalRotY = gameState.rotationY;
      gameState.rotationY = originalRotY + rotationAmount * 0.1;
    } else if (animationState.type === 'column') {
      // Visual feedback: slightly rotate the view during column rotation
      const originalRotX = gameState.rotationX;
      gameState.rotationX = originalRotX + rotationAmount * 0.1;
    }
    
    drawCube();
    
    if (animationState.progress < 1.0) {
      requestAnimationFrame(animateRotation);
    } else {
      // Animation complete
      animationState.active = false;
      
      // Reset view rotation after animation
      if (animationState.type === 'row') {
        gameState.rotationY -= 90 * (animationState.clockwise ? 1 : -1) * 0.1;
      } else if (animationState.type === 'column') {
        gameState.rotationX -= 90 * (animationState.clockwise ? 1 : -1) * 0.1;
      }
      
      drawCube();
    }
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // === UI Rendering and Controls ===

  function updateUI() {
    const turnText = gameState.currentTurn === COLORS.WHITE ? 'White (You)' : 'Black (AI)';
    root.innerHTML = `
      <div class="game-container">
        <div class="header">
          <button class="menu-toggle" id="menu-toggle" aria-label="Toggle menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <h1>3D Cube Chess</h1>
          <div class="header-info">
            <div class="turn-indicator">Turn: ${turnText}</div>
          </div>
        </div>
        <div class="canvas-wrapper">
          <canvas id="cubeCanvas"></canvas>
          <div class="controls-panel" id="controls-panel">
            <h3>Controls</h3>
            <ul>
              <li><strong>Rotate View:</strong> Click + drag</li>
              <li><strong>Zoom:</strong> Scroll wheel / Pinch</li>
              <li><strong>Select Piece:</strong> Click/Tap on piece</li>
              <li><strong>Move:</strong> Click/Tap on green square</li>
            </ul>
            <div class="status-message" style="display: none;"></div>
            <div class="rotation-controls">
              <h4>Selective Rotation</h4>
              <div class="rotation-mode-selector">
                <label>
                  <input type="radio" name="rotationMode" value="view" checked>
                  <span>View Rotation</span>
                </label>
                <label>
                  <input type="radio" name="rotationMode" value="row">
                  <span>Rotate Row</span>
                </label>
                <label>
                  <input type="radio" name="rotationMode" value="column">
                  <span>Rotate Column</span>
                </label>
              </div>
              <div id="row-rotation-controls" style="display: none;">
                <label for="row-select">Select Row (0-7):</label>
                <input type="number" id="row-select" min="0" max="7" value="0">
                <div class="rotation-buttons">
                  <button class="btn" id="rotate-row-cw">Rotate CW</button>
                  <button class="btn" id="rotate-row-ccw">Rotate CCW</button>
                </div>
              </div>
              <div id="column-rotation-controls" style="display: none;">
                <label for="col-select">Select Column (0-7):</label>
                <input type="number" id="col-select" min="0" max="7" value="0">
                <div class="rotation-buttons">
                  <button class="btn" id="rotate-col-cw">Rotate CW</button>
                  <button class="btn" id="rotate-col-ccw">Rotate CCW</button>
                </div>
              </div>
            </div>
            <div class="twist-controls" style="display: none;">
              <h4>Rubik's Twist (Your Move)</h4>
              <div class="twist-buttons">
                <button class="twist-btn" id="twist-cw">Twist CW</button>
                <button class="twist-btn" id="twist-ccw">Twist CCW</button>
              </div>
            </div>
            <button class="btn" id="new-game" style="margin-top: 17px;">New Game</button>
          </div>
        </div>
      </div>
    `;
    canvas = document.getElementById('cubeCanvas');
    ctx = canvas.getContext('2d');
    // Set canvas size
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 70;
    };
    updateCanvasSize();

    // Initialize game
    gameState.faces = createCubeFaces();

    // Rotation mode selector
    const rotationModeInputs = document.querySelectorAll('input[name="rotationMode"]');
    rotationModeInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        gameState.rotationMode = e.target.value;
        document.getElementById('row-rotation-controls').style.display =
          gameState.rotationMode === 'row' ? 'block' : 'none';
        document.getElementById('column-rotation-controls').style.display =
          gameState.rotationMode === 'column' ? 'block' : 'none';
      });
    });

    // Row/Column rotation controls
    document.getElementById('rotate-row-cw')?.addEventListener('click', () => {
      const row = parseInt(document.getElementById('row-select').value);
      rotateRow(row, true);
    });
    document.getElementById('rotate-row-ccw')?.addEventListener('click', () => {
      const row = parseInt(document.getElementById('row-select').value);
      rotateRow(row, false);
    });
    document.getElementById('rotate-col-cw')?.addEventListener('click', () => {
      const col = parseInt(document.getElementById('col-select').value);
      rotateColumn(col, true);
    });
    document.getElementById('rotate-col-ccw')?.addEventListener('click', () => {
      const col = parseInt(document.getElementById('col-select').value);
      rotateColumn(col, false);
    });

    // Menu toggle for mobile
    const menuToggle = document.getElementById('menu-toggle');
    const controlsPanel = document.getElementById('controls-panel');
    menuToggle.addEventListener('click', () => {
      controlsPanel.classList.toggle('open');
    });

    // Mouse/Touch event handlers
    let touchStartDistance = 0;

    const getEventCoords = (event) => {
      if (event.touches) {
        return { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }
      return { x: event.clientX, y: event.clientY };
    };

    const handlePointerDown = (event) => {
      if (event.touches && event.touches.length === 2) {
        // Pinch zoom start
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        touchStartDistance = Math.sqrt(dx * dx + dy * dy);
        event.preventDefault();
      } else {
        const coords = getEventCoords(event);
        gameState.dragStart = coords;
      }
    };

    const handlePointerMove = (event) => {
      if (event.touches && event.touches.length === 2) {
        // Pinch zoom
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const scaleFactor = distance / touchStartDistance;
        gameState.scale *= scaleFactor;
        gameState.scale = Math.max(0.5, Math.min(2.0, gameState.scale));
        touchStartDistance = distance;
        drawCube();
        event.preventDefault();
      } else if (gameState.dragStart && gameState.rotationMode === 'view') {
        const coords = getEventCoords(event);
        const dx = coords.x - gameState.dragStart.x;
        const dy = coords.y - gameState.dragStart.y;

        gameState.rotationY += dx * 0.5;
        gameState.rotationX += dy * 0.5;

        gameState.dragStart = coords;
        drawCube();
      }
    };

    const handlePointerUp = () => {
      gameState.dragStart = null;
      touchStartDistance = 0;
    };

    const handlePointerClick = (event) => {
      if (event.touches && event.touches.length > 1) return;

      const rect = canvas.getBoundingClientRect();
      const coords = getEventCoords(event);
      const x = coords.x - rect.left;
      const y = coords.y - rect.top;

      if (!canvas.clickableSquares) return;

      // Find clicked square
      for (const square of canvas.clickableSquares) {
        const points = square.projected;
        if (isPointInPolygon({ x, y }, points)) {
          handleSquareClick(square.face, square.row, square.col);
          break;
        }
      }
    };

    // Event listeners
    canvas.addEventListener('click', handlePointerClick);
    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mouseup', handlePointerUp);

    // Touch events
    canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
    canvas.addEventListener('touchend', handlePointerUp);

    canvas.addEventListener('wheel', onWheel);
    document.getElementById('new-game').addEventListener('click', newGame);
    document.getElementById('twist-cw').addEventListener('click', () => handleTwist(true));
    document.getElementById('twist-ccw').addEventListener('click', () => handleTwist(false));

    window.addEventListener('resize', () => {
      updateCanvasSize();
      drawCube();
    });

    drawCube();
  }

  // === Game Logic ===

  function handleSquareClick(face, row, col) {
    if (gameState.gameOver || gameState.aiThinking) return;
    const piece = gameState.faces[face][row][col];
    if (gameState.selectedSquare) {
      // Try to move selected piece
      for (const move of gameState.possibleMoves) {
        if (move.face === face && move.row === row && move.col === col) {
          makeMove(gameState.selectedSquare, move);
          gameState.selectedSquare = null;
          gameState.possibleMoves = [];
          drawCube();
          return;
        }
      }
      gameState.selectedSquare = null;
      gameState.possibleMoves = [];
      drawCube();
    } else if (piece && piece.color === gameState.currentTurn) {
      gameState.selectedSquare = { face, row, col };
      gameState.possibleMoves = getValidMoves(gameState.faces, face, row, col);
      drawCube();
    }
  }

  function makeMove(from, to) {
    // Simple move (no castling, promotion, en passant for now)
    const faces = gameState.faces;
    faces[to.face][to.row][to.col] = faces[from.face][from.row][from.col];
    faces[from.face][from.row][from.col] = null;
    // Switch turn
    gameState.currentTurn = gameState.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    // TODO: Update inCheck, checkmate, AI move, etc.
  }

  function handleTwist(clockwise) {
    // Placeholder: twist does nothing yet
    // TODO: Implement Rubik's cube slice twist logic
  }

  function onWheel(event) {
    gameState.scale += event.deltaY * -0.001;
    gameState.scale = Math.max(0.5, Math.min(2.0, gameState.scale));
    drawCube();
  }

  function newGame() {
    gameState.faces = createCubeFaces();
    gameState.currentTurn = COLORS.WHITE;
    gameState.selectedSquare = null;
    gameState.possibleMoves = [];
    gameState.inCheck = false;
    gameState.gameOver = false;
    drawCube();
  }

  // === Entry Point ===
  updateUI();

})();