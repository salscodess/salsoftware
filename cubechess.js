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
  
  // Chess piece types
  const PIECES = {
    PAWN: 'P',
    ROOK: 'R',
    KNIGHT: 'N',
    BISHOP: 'B',
    QUEEN: 'Q',
    KING: 'K'
  };
  
  const COLORS = {
    WHITE: 'white',
    BLACK: 'black'
  };
  
  // Face names
  const FACES = ['front', 'back', 'right', 'left', 'top', 'bottom'];
  
  // Game state
  let gameState = {
    faces: {},                      // Chess board state for each cube face
    currentTurn: COLORS.WHITE,      // Current player turn
    selectedSquare: null,           // Currently selected square {face, row, col}
    possibleMoves: [],              // Valid moves for selected piece
    inCheck: false,                 // Whether current player's king is in check
    gameOver: false,                // Game over flag
    aiThinking: false,              // AI is processing a move
    rotationX: -20,                 // View rotation angle around X axis
    rotationY: 45,                  // View rotation angle around Y axis
    scale: 1.0,                     // View zoom scale
    dragStart: null,                // Mouse/touch drag start position
    rotationMode: 'view',           // Rotation mode: 'view', 'row', or 'column'
    selectedRotationAxis: null      // Selected row/column for selective rotation
  };
  
  // Canvas setup
  let canvas, ctx;
  const cubeSize = 200;
  const boardSquares = 8;
  
  // Initialize a standard chess board
  function createInitialBoard() {
    const board = [];
    const pieceOrder = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    
    for (let row = 0; row < 8; row++) {
      board[row] = [];
      for (let col = 0; col < 8; col++) {
        if (row === 0) {
          board[row][col] = { type: pieceOrder[col], color: COLORS.BLACK };
        } else if (row === 1) {
          board[row][col] = { type: PIECES.PAWN, color: COLORS.BLACK };
        } else if (row === 6) {
          board[row][col] = { type: PIECES.PAWN, color: COLORS.WHITE };
        } else if (row === 7) {
          board[row][col] = { type: pieceOrder[col], color: COLORS.WHITE };
        } else {
          board[row][col] = null;
        }
      }
    }
    return board;
  }
  
  // Initialize 6 faces of the cube with chess boards
  function createCubeFaces() {
    const faces = {};
    FACES.forEach((face, index) => {
      if (index === 0) { // Front face - main board
        faces[face] = createInitialBoard();
      } else {
        // Other faces start empty
        faces[face] = Array(8).fill(null).map(() => Array(8).fill(null));
      }
    });
    return faces;
  }
  
  // 3D projection utilities
  function rotateX(point, angle) {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: point.x,
      y: point.y * cos - point.z * sin,
      z: point.y * sin + point.z * cos
    };
  }
  
  function rotateY(point, angle) {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: point.x * cos + point.z * sin,
      y: point.y,
      z: -point.x * sin + point.z * cos
    };
  }
  
  function project(point) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const distance = 600;
    const scale = distance / (distance + point.z);
    
    return {
      x: centerX + point.x * scale * gameState.scale,
      y: centerY + point.y * scale * gameState.scale,
      z: point.z
    };
  }
  
  function transform3D(x, y, z) {
    let point = { x, y, z };
    point = rotateY(point, gameState.rotationY);
    point = rotateX(point, gameState.rotationX);
    return project(point);
  }
  
  // Get face vertices
  function getFaceVertices(face) {
    const half = cubeSize / 2;
    
    switch (face) {
      case 'front':
        return [
          { x: -half, y: -half, z: half },
          { x: half, y: -half, z: half },
          { x: half, y: half, z: half },
          { x: -half, y: half, z: half }
        ];
      case 'back':
        return [
          { x: half, y: -half, z: -half },
          { x: -half, y: -half, z: -half },
          { x: -half, y: half, z: -half },
          { x: half, y: half, z: -half }
        ];
      case 'right':
        return [
          { x: half, y: -half, z: half },
          { x: half, y: -half, z: -half },
          { x: half, y: half, z: -half },
          { x: half, y: half, z: half }
        ];
      case 'left':
        return [
          { x: -half, y: -half, z: -half },
          { x: -half, y: -half, z: half },
          { x: -half, y: half, z: half },
          { x: -half, y: half, z: -half }
        ];
      case 'top':
        return [
          { x: -half, y: -half, z: -half },
          { x: half, y: -half, z: -half },
          { x: half, y: -half, z: half },
          { x: -half, y: -half, z: half }
        ];
      case 'bottom':
        return [
          { x: -half, y: half, z: half },
          { x: half, y: half, z: half },
          { x: half, y: half, z: -half },
          { x: -half, y: half, z: -half }
        ];
    }
  }
  
  // Draw a chess square on a face
  function drawSquare(vertices, row, col, board, face) {
    const squareSize = cubeSize / 8;
    const v0 = vertices[0];
    const v1 = vertices[1];
    const v2 = vertices[2];
    const v3 = vertices[3];
    
    // Calculate square position
    const tx = col / 8;
    const ty = row / 8;
    const tw = 1 / 8;
    const th = 1 / 8;
    
    // Interpolate vertices
    const p0 = {
      x: v0.x + (v1.x - v0.x) * tx + (v3.x - v0.x) * ty,
      y: v0.y + (v1.y - v0.y) * tx + (v3.y - v0.y) * ty,
      z: v0.z + (v1.z - v0.z) * tx + (v3.z - v0.z) * ty
    };
    const p1 = {
      x: v0.x + (v1.x - v0.x) * (tx + tw) + (v3.x - v0.x) * ty,
      y: v0.y + (v1.y - v0.y) * (tx + tw) + (v3.y - v0.y) * ty,
      z: v0.z + (v1.z - v0.z) * (tx + tw) + (v3.z - v0.z) * ty
    };
    const p2 = {
      x: v0.x + (v1.x - v0.x) * (tx + tw) + (v3.x - v0.x) * (ty + th),
      y: v0.y + (v1.y - v0.y) * (tx + tw) + (v3.y - v0.y) * (ty + th),
      z: v0.z + (v1.z - v0.z) * (tx + tw) + (v3.z - v0.z) * (ty + th)
    };
    const p3 = {
      x: v0.x + (v1.x - v0.x) * tx + (v3.x - v0.x) * (ty + th),
      y: v0.y + (v1.y - v0.y) * tx + (v3.y - v0.y) * (ty + th),
      z: v0.z + (v1.z - v0.z) * tx + (v3.z - v0.z) * (ty + th)
    };
    
    const projected = [p0, p1, p2, p3].map(p => transform3D(p.x, p.y, p.z));
    
    // Determine color
    const isLight = (row + col) % 2 === 0;
    const isSelected = gameState.selectedSquare && 
      gameState.selectedSquare.face === face &&
      gameState.selectedSquare.row === row &&
      gameState.selectedSquare.col === col;
    const isPossibleMove = gameState.possibleMoves.some(
      m => m.face === face && m.row === row && m.col === col
    );
    
    let color;
    if (isSelected) {
      color = '#4a8be5';
    } else if (isPossibleMove) {
      color = '#27ae60';
    } else {
      color = isLight ? '#f0d9b5' : '#b58863';
    }
    
    // Draw square
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    ctx.lineTo(projected[1].x, projected[1].y);
    ctx.lineTo(projected[2].x, projected[2].y);
    ctx.lineTo(projected[3].x, projected[3].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Draw piece if present
    const piece = board[row][col];
    if (piece) {
      const centerX = (projected[0].x + projected[2].x) / 2;
      const centerY = (projected[0].y + projected[2].y) / 2;
      const avgZ = (p0.z + p1.z + p2.z + p3.z) / 4;
      
      ctx.fillStyle = piece.color === COLORS.WHITE ? '#f0f0f0' : '#1a1a1a';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const pieceSymbols = {
        'P': '♟', 'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚'
      };
      if (piece.color === COLORS.WHITE) {
        pieceSymbols.P = '♙'; pieceSymbols.R = '♖';
        pieceSymbols.N = '♘'; pieceSymbols.B = '♗';
        pieceSymbols.Q = '♕'; pieceSymbols.K = '♔';
      }
      
      ctx.fillText(pieceSymbols[piece.type] || piece.type, centerX, centerY);
    }
    
    return { projected, center: { x: (projected[0].x + projected[2].x) / 2, y: (projected[0].y + projected[2].y) / 2 }, face, row, col };
  }
  
  // Draw the cube
  function drawCube() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all faces with depth sorting
    const faceData = [];
    
    FACES.forEach(faceName => {
      const vertices = getFaceVertices(faceName);
      const transformedVertices = vertices.map(v => transform3D(v.x, v.y, v.z));
      
      // Calculate average Z for depth sorting
      const avgZ = transformedVertices.reduce((sum, v) => sum + v.z, 0) / transformedVertices.length;
      
      // Calculate normal to determine if face is visible
      const v1 = { x: transformedVertices[1].x - transformedVertices[0].x, y: transformedVertices[1].y - transformedVertices[0].y };
      const v2 = { x: transformedVertices[3].x - transformedVertices[0].x, y: transformedVertices[3].y - transformedVertices[0].y };
      const crossZ = v1.x * v2.y - v1.y * v2.x;
      
      faceData.push({ faceName, vertices, transformedVertices, avgZ, visible: crossZ < 0 });
    });
    
    // Sort by Z depth (back to front)
    faceData.sort((a, b) => a.avgZ - b.avgZ);
    
    // Draw faces
    const clickableSquares = [];
    
    faceData.forEach(({ faceName, vertices, transformedVertices, visible }) => {
      if (!visible) return; // Skip back-facing polygons
      
      // Draw face background
      ctx.fillStyle = '#8b4513';
      ctx.beginPath();
      ctx.moveTo(transformedVertices[0].x, transformedVertices[0].y);
      ctx.lineTo(transformedVertices[1].x, transformedVertices[1].y);
      ctx.lineTo(transformedVertices[2].x, transformedVertices[2].y);
      ctx.lineTo(transformedVertices[3].x, transformedVertices[3].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw squares
      const board = gameState.faces[faceName];
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const squareInfo = drawSquare(vertices, row, col, board, faceName);
          clickableSquares.push(squareInfo);
        }
      }
    });
    
    // Store for click detection
    canvas.clickableSquares = clickableSquares;
  }
  
  // Helper function to get adjacent face and position when moving off an edge
  // This enables pieces to transition seamlessly between cube faces
  // Returns: { face, row, col } or null if invalid
  // 
  // Face adjacency map:
  // - Front: connects to top (up), bottom (down), left (left), right (right)
  // - Back: connects to top (up), bottom (down), right (left), left (right)
  // - Top: connects to back (up), front (down), left (left), right (right)
  // - Bottom: connects to front (up), back (down), left (left), right (right)
  // - Left: connects to top (up), bottom (down), back (left), front (right)
  // - Right: connects to top (up), bottom (down), front (left), back (right)
  function getAdjacentFacePosition(face, row, col, direction) {
    // direction: 'up', 'down', 'left', 'right'
    // Returns { face, row, col } or null if invalid
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

  // Chess move validation with cross-face movement support
  function getValidMoves(faces, face, row, col) {
    const piece = faces[face][row][col];
    if (!piece) return [];
    
    const moves = [];
    
    switch (piece.type) {
      case PIECES.PAWN:
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
        
      case PIECES.ROOK:
        // Vertical and horizontal moves on same face
        for (let i = 0; i < 8; i++) {
          if (i !== row) {
            const target = faces[face][i][col];
            if (!target || target.color !== piece.color) {
              moves.push({ face, row: i, col });
            }
          }
          if (i !== col) {
            const target = faces[face][row][i];
            if (!target || target.color !== piece.color) {
              moves.push({ face, row, col: i });
            }
          }
        }
        
        // Add cross-face moves at edges
        if (row === 0) {
          const adjPos = getAdjacentFacePosition(face, row, col, 'up');
          if (adjPos && (!faces[adjPos.face][adjPos.row][adjPos.col] || 
              faces[adjPos.face][adjPos.row][adjPos.col].color !== piece.color)) {
            moves.push(adjPos);
          }
        }
        if (row === 7) {
          const adjPos = getAdjacentFacePosition(face, row, col, 'down');
          if (adjPos && (!faces[adjPos.face][adjPos.row][adjPos.col] || 
              faces[adjPos.face][adjPos.row][adjPos.col].color !== piece.color)) {
            moves.push(adjPos);
          }
        }
        if (col === 0) {
          const adjPos = getAdjacentFacePosition(face, row, col, 'left');
          if (adjPos && (!faces[adjPos.face][adjPos.row][adjPos.col] || 
              faces[adjPos.face][adjPos.row][adjPos.col].color !== piece.color)) {
            moves.push(adjPos);
          }
        }
        if (col === 7) {
          const adjPos = getAdjacentFacePosition(face, row, col, 'right');
          if (adjPos && (!faces[adjPos.face][adjPos.row][adjPos.col] || 
              faces[adjPos.face][adjPos.row][adjPos.col].color !== piece.color)) {
            moves.push(adjPos);
          }
        }
        break;
        
      case PIECES.KNIGHT:
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        knightMoves.forEach(([dr, dc]) => {
          const newR = row + dr;
          const newC = col + dc;
          if (newR >= 0 && newR < 8 && newC >= 0 && newC < 8) {
            const target = faces[face][newR][newC];
            if (!target || target.color !== piece.color) {
              moves.push({ face, row: newR, col: newC });
            }
          }
        });
        break;
        
      case PIECES.BISHOP:
        for (let i = 1; i < 8; i++) {
          const dirs = [
            [row + i, col + i], [row + i, col - i],
            [row - i, col + i], [row - i, col - i]
          ];
          dirs.forEach(([r, c]) => {
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
              const target = faces[face][r][c];
              if (!target || target.color !== piece.color) {
                moves.push({ face, row: r, col: c });
              }
            }
          });
        }
        break;
        
      case PIECES.QUEEN:
        for (let i = 0; i < 8; i++) {
          if (i !== row) {
            const target = faces[face][i][col];
            if (!target || target.color !== piece.color) {
              moves.push({ face, row: i, col });
            }
          }
          if (i !== col) {
            const target = faces[face][row][i];
            if (!target || target.color !== piece.color) {
              moves.push({ face, row, col: i });
            }
          }
        }
        for (let i = 1; i < 8; i++) {
          const dirs = [
            [row + i, col + i], [row + i, col - i],
            [row - i, col + i], [row - i, col - i]
          ];
          dirs.forEach(([r, c]) => {
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
              const target = faces[face][r][c];
              if (!target || target.color !== piece.color) {
                moves.push({ face, row: r, col: c });
              }
            }
          });
        }
        break;
        
      case PIECES.KING:
        const kingMoves = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1], [0, 1],
          [1, -1], [1, 0], [1, 1]
        ];
        kingMoves.forEach(([dr, dc]) => {
          const newR = row + dr;
          const newC = col + dc;
          if (newR >= 0 && newR < 8 && newC >= 0 && newC < 8) {
            const target = faces[face][newR][newC];
            if (!target || target.color !== piece.color) {
              moves.push({ face, row: newR, col: newC });
            }
          }
        });
        break;
    }
    
    return moves;
  }
  
  // Check if king is in check
  function isInCheck(faces, color) {
    let kingPos = null;
    for (const face of FACES) {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = faces[face][row][col];
          if (piece && piece.type === PIECES.KING && piece.color === color) {
            kingPos = { face, row, col };
            break;
          }
        }
        if (kingPos) break;
      }
      if (kingPos) break;
    }
    
    if (!kingPos) return false;
    
    for (const face of FACES) {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = faces[face][row][col];
          if (piece && piece.color !== color) {
            const moves = getValidMoves(faces, face, row, col);
            if (moves.some(m => m.face === kingPos.face && m.row === kingPos.row && m.col === kingPos.col)) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }
  
  // Simple AI
  function getAIMove(faces, color) {
    const allMoves = [];
    
    for (const face of FACES) {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = faces[face][row][col];
          if (piece && piece.color === color) {
            const moves = getValidMoves(faces, face, row, col);
            moves.forEach(move => {
              allMoves.push({
                from: { face, row, col },
                to: move
              });
            });
          }
        }
      }
    }
    
    if (allMoves.length === 0) return null;
    return allMoves[Math.floor(Math.random() * allMoves.length)];
  }
  
  // Make a move
  function makeMove(from, to) {
    const movingPiece = gameState.faces[from.face][from.row][from.col];
    gameState.faces[to.face][to.row][to.col] = movingPiece;
    gameState.faces[from.face][from.row][from.col] = null;
    
    gameState.selectedSquare = null;
    gameState.possibleMoves = [];
    
    // Switch turn
    const opponentColor = gameState.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    gameState.inCheck = isInCheck(gameState.faces, opponentColor);
    gameState.currentTurn = opponentColor;
    
    updateUI();
    drawCube();
    
    // Trigger AI move
    if (opponentColor === COLORS.BLACK) {
      gameState.aiThinking = true;
      updateUI();
      
      setTimeout(() => {
        const aiMove = getAIMove(gameState.faces, COLORS.BLACK);
        if (aiMove) {
          const aiPiece = gameState.faces[aiMove.from.face][aiMove.from.row][aiMove.from.col];
          gameState.faces[aiMove.to.face][aiMove.to.row][aiMove.to.col] = aiPiece;
          gameState.faces[aiMove.from.face][aiMove.from.row][aiMove.from.col] = null;
          
          gameState.currentTurn = COLORS.WHITE;
          gameState.inCheck = isInCheck(gameState.faces, COLORS.WHITE);
        }
        gameState.aiThinking = false;
        updateUI();
        drawCube();
      }, 1000);
    }
  }
  
  // Handle square click
  function handleSquareClick(face, row, col) {
    if (gameState.gameOver || gameState.aiThinking) return;
    
    const clickedPiece = gameState.faces[face][row][col];
    
    if (gameState.selectedSquare) {
      const isValidMove = gameState.possibleMoves.some(
        m => m.face === face && m.row === row && m.col === col
      );
      
      if (isValidMove) {
        makeMove(gameState.selectedSquare, { face, row, col });
      } else if (clickedPiece && clickedPiece.color === gameState.currentTurn) {
        gameState.selectedSquare = { face, row, col };
        gameState.possibleMoves = getValidMoves(gameState.faces, face, row, col);
        drawCube();
      } else {
        gameState.selectedSquare = null;
        gameState.possibleMoves = [];
        drawCube();
      }
    } else if (clickedPiece && clickedPiece.color === gameState.currentTurn) {
      gameState.selectedSquare = { face, row, col };
      gameState.possibleMoves = getValidMoves(gameState.faces, face, row, col);
      drawCube();
    }
  }
  
  // Handle canvas click
  function onCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (!canvas.clickableSquares) return;
    
    // Find clicked square
    for (const square of canvas.clickableSquares) {
      const points = square.projected;
      if (isPointInPolygon({ x, y }, points)) {
        handleSquareClick(square.face, square.row, square.col);
        break;
      }
    }
  }
  
  // Point in polygon test
  function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  
  // Handle mouse drag for rotation
  function onMouseDown(event) {
    gameState.dragStart = { x: event.clientX, y: event.clientY };
  }
  
  function onMouseMove(event) {
    if (!gameState.dragStart) return;
    
    const dx = event.clientX - gameState.dragStart.x;
    const dy = event.clientY - gameState.dragStart.y;
    
    gameState.rotationY += dx * 0.5;
    gameState.rotationX += dy * 0.5;
    
    gameState.dragStart = { x: event.clientX, y: event.clientY };
    drawCube();
  }
  
  function onMouseUp() {
    gameState.dragStart = null;
  }
  
  // Handle mouse wheel for zoom
  function onWheel(event) {
    event.preventDefault();
    gameState.scale *= event.deltaY > 0 ? 0.9 : 1.1;
    gameState.scale = Math.max(0.5, Math.min(2.0, gameState.scale));
    drawCube();
  }
  
  // Handle twist
  function handleTwist(clockwise) {
    if (gameState.inCheck || gameState.aiThinking) return;
    
    // Simple twist animation
    const originalRotY = gameState.rotationY;
    const targetRotY = originalRotY + (clockwise ? 90 : -90);
    const steps = 30;
    let step = 0;
    
    const animate = () => {
      step++;
      gameState.rotationY = originalRotY + (targetRotY - originalRotY) * (step / steps);
      drawCube();
      
      if (step < steps) {
        requestAnimationFrame(animate);
      } else {
        // Twist completed - switch turn
        gameState.currentTurn = gameState.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        updateUI();
        
        // Trigger AI
        if (gameState.currentTurn === COLORS.BLACK) {
          gameState.aiThinking = true;
          updateUI();
          
          setTimeout(() => {
            const aiMove = getAIMove(gameState.faces, COLORS.BLACK);
            if (aiMove) {
              const aiPiece = gameState.faces[aiMove.from.face][aiMove.from.row][aiMove.from.col];
              gameState.faces[aiMove.to.face][aiMove.to.row][aiMove.to.col] = aiPiece;
              gameState.faces[aiMove.from.face][aiMove.from.row][aiMove.from.col] = null;
              
              gameState.currentTurn = COLORS.WHITE;
              gameState.inCheck = isInCheck(gameState.faces, COLORS.WHITE);
            }
            gameState.aiThinking = false;
            updateUI();
            drawCube();
          }, 1000);
        }
      }
    };
    
    animate();
  }
  
  // Rotate a specific row across faces
  // Moves pieces horizontally around the cube (through front, left, back, right faces)
  // Parameters:
  //   rowIndex: Row number (0-7) to rotate
  //   clockwise: true for clockwise rotation, false for counter-clockwise
  function rotateRow(rowIndex, clockwise) {
    if (gameState.aiThinking) return;
    
    // For simplicity, rotate the row on the front face horizontally
    const front = gameState.faces['front'];
    const back = gameState.faces['back'];
    const left = gameState.faces['left'];
    const right = gameState.faces['right'];
    
    const temp = [];
    if (clockwise) {
      // Save right row
      temp.push(...right[rowIndex]);
      // Right <- Front
      right[rowIndex] = [...front[rowIndex]];
      // Front <- Left
      front[rowIndex] = [...left[rowIndex]];
      // Left <- Back
      left[rowIndex] = [...back[rowIndex]];
      // Back <- Temp (right)
      back[rowIndex] = [...temp];
    } else {
      // Save left row
      temp.push(...left[rowIndex]);
      // Left <- Front
      left[rowIndex] = [...front[rowIndex]];
      // Front <- Right
      front[rowIndex] = [...right[rowIndex]];
      // Right <- Back
      right[rowIndex] = [...back[rowIndex]];
      // Back <- Temp (left)
      back[rowIndex] = [...temp];
    }
    
    drawCube();
  }
  
  // Rotate a specific column across faces
  // Moves pieces vertically around the cube (through front, top, back, bottom faces)
  // Parameters:
  //   colIndex: Column number (0-7) to rotate
  //   clockwise: true for clockwise rotation, false for counter-clockwise
  // Note: Back face column indices are reversed to maintain spatial continuity
  function rotateColumn(colIndex, clockwise) {
    if (gameState.aiThinking) return;
    
    // Rotate column across front, top, back, bottom faces
    const front = gameState.faces['front'];
    const top = gameState.faces['top'];
    const back = gameState.faces['back'];
    const bottom = gameState.faces['bottom'];
    
    const temp = [];
    if (clockwise) {
      // Save bottom column
      for (let i = 0; i < 8; i++) temp.push(bottom[i][colIndex]);
      // Bottom <- Front
      for (let i = 0; i < 8; i++) bottom[i][colIndex] = front[i][colIndex];
      // Front <- Top
      for (let i = 0; i < 8; i++) front[i][colIndex] = top[i][colIndex];
      // Top <- Back (reversed)
      for (let i = 0; i < 8; i++) top[i][colIndex] = back[7 - i][7 - colIndex];
      // Back <- Temp (reversed)
      for (let i = 0; i < 8; i++) back[i][7 - colIndex] = temp[7 - i];
    } else {
      // Save top column
      for (let i = 0; i < 8; i++) temp.push(top[i][colIndex]);
      // Top <- Front
      for (let i = 0; i < 8; i++) top[i][colIndex] = front[i][colIndex];
      // Front <- Bottom
      for (let i = 0; i < 8; i++) front[i][colIndex] = bottom[i][colIndex];
      // Bottom <- Back (reversed)
      for (let i = 0; i < 8; i++) bottom[i][colIndex] = back[7 - i][7 - colIndex];
      // Back <- Temp (reversed)
      for (let i = 0; i < 8; i++) back[i][7 - colIndex] = temp[7 - i];
    }
    
    drawCube();
  }
  
  // Update UI
  function updateUI() {
    const turnText = gameState.currentTurn === COLORS.WHITE ? 'White (You)' : 'Black (AI)';
    const aiText = gameState.aiThinking ? ' - AI Thinking...' : '';
    document.querySelector('.turn-indicator').textContent = `Turn: ${turnText}${aiText}`;
    
    const statusMsg = document.querySelector('.status-message');
    if (gameState.inCheck) {
      statusMsg.classList.add('check-warning');
      statusMsg.textContent = '⚠ King in Check! You must move your king or block.';
      statusMsg.style.display = 'block';
    } else {
      statusMsg.classList.remove('check-warning');
      statusMsg.style.display = 'none';
    }
    
    const twistControls = document.querySelector('.twist-controls');
    if (!gameState.inCheck && gameState.currentTurn === COLORS.WHITE && !gameState.aiThinking) {
      twistControls.style.display = 'block';
    } else {
      twistControls.style.display = 'none';
    }
  }
  
  // New game
  function newGame() {
    gameState.faces = createCubeFaces();
    gameState.currentTurn = COLORS.WHITE;
    gameState.selectedSquare = null;
    gameState.possibleMoves = [];
    gameState.inCheck = false;
    gameState.gameOver = false;
    gameState.aiThinking = false;
    gameState.rotationX = -20;
    gameState.rotationY = 45;
    
    updateUI();
    drawCube();
  }
  
  // Initialize
  function init() {
    const root = document.getElementById('root');
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
            <div class="turn-indicator">Turn: White (You)</div>
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
                <button class="btn twist-btn" id="twist-cw">Twist Cube CW</button>
                <button class="btn twist-btn" id="twist-ccw">Twist Cube CCW</button>
              </div>
            </div>
            <div class="btn-group">
              <button class="btn primary" id="new-game">New Game</button>
            </div>
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
    // Toggles the visibility of the controls panel on mobile devices
    const menuToggle = document.getElementById('menu-toggle');
    const controlsPanel = document.getElementById('controls-panel');
    menuToggle.addEventListener('click', () => {
      controlsPanel.classList.toggle('open');
    });
    
    // Mouse/Touch event handlers
    // Unified event handling for both mouse and touch inputs
    // Supports pinch-to-zoom on touch devices
    let touchStartDistance = 0;
    
    // Get coordinates from mouse or touch event
    const getEventCoords = (event) => {
      if (event.touches) {
        return { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }
      return { x: event.clientX, y: event.clientY };
    };
    
    // Handle pointer down (mouse click or touch start)
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
    
    updateUI();
    drawCube();
  }
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
