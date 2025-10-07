/**
 * 3D Cube Chess - A chess game played on the faces of a 3D cube
 * 
 * @file cubechess.js
 * @description Main game logic for 3D Cube Chess application
 * @version 1.0.0
 * 
 * Features:
 * - 3D rendered chess pieces using Three.js with distinct geometries for each piece type
 * - Legal move visualization with green circular indicators
 * - Interactive piece selection and movement
 * - Cube rotation with mouse drag and zoom with mouse wheel
 * - Simple AI opponent that makes random legal moves
 * - Turn-based gameplay with move counter
 * - Sample visualization functionality
 * 
 * Technical Stack:
 * - Three.js r128 for 3D graphics rendering
 * - Vanilla JavaScript (ES6+)
 * - WebGL for hardware-accelerated graphics
 * 
 * Chess Rules Implemented:
 * - Standard FIDE chess piece movements
 * - Piece capture mechanics
 * - Turn alternation between white and black
 * - Basic collision detection (pieces cannot move through others)
 * 
 * @author Salsoftware
 * @see CUBECHESS_README.md for detailed documentation
 */

(function() {
    'use strict';

    // Three.js scene setup
    let scene, camera, renderer, cube, raycaster, mouse;
    let selectedPiece = null;
    let legalMoveIndicators = [];
    let pieces = [];
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let rotationVelocity = { x: 0, y: 0 };
    let currentTurn = 'white'; // 'white' or 'black'
    let moveCount = 0;
    let aiEnabled = true;
    let gameBoard = {};

    // Chess piece types
    const PIECE_TYPES = {
        PAWN: 'pawn',
        ROOK: 'rook',
        KNIGHT: 'knight',
        BISHOP: 'bishop',
        QUEEN: 'queen',
        KING: 'king'
    };

    // Cube face definitions (6 faces)
    const CUBE_FACES = ['front', 'back', 'left', 'right', 'top', 'bottom'];
    
    // Board size (8x8 chess board per face)
    const BOARD_SIZE = 8;
    const SQUARE_SIZE = 0.25;
    const CUBE_SIZE = BOARD_SIZE * SQUARE_SIZE;

    /**
     * Initialize the 3D scene
     */
    function init() {
        // Scene setup
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        // Camera setup
        camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(3, 3, 5);
        camera.lookAt(0, 0, 0);

        // Renderer setup
        const container = document.getElementById('game-container');
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Raycaster for mouse picking
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);

        // Point lights for better piece visibility
        const pointLight1 = new THREE.PointLight(0x4fc3f7, 0.5);
        pointLight1.position.set(-3, 2, 3);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x764ba2, 0.5);
        pointLight2.position.set(3, 2, -3);
        scene.add(pointLight2);

        // Create the cube with chess boards
        createCube();

        // Initialize chess pieces
        initializeChessBoard();

        // Event listeners
        setupEventListeners();

        // Start animation loop
        animate();

        // Show welcome message
        showMessage('Welcome to 3D Cube Chess! Click a piece to see legal moves.');
    }

    /**
     * Create the 3D cube with chess board faces
     */
    function createCube() {
        cube = new THREE.Group();
        
        // Create each face of the cube with a chess board pattern
        CUBE_FACES.forEach((face, index) => {
            const faceGroup = createChessBoardFace(face);
            cube.add(faceGroup);
        });

        scene.add(cube);
    }

    /**
     * Create a chess board face
     */
    function createChessBoardFace(faceName) {
        const faceGroup = new THREE.Group();
        faceGroup.name = faceName;

        // Position and rotate the face
        const halfCube = CUBE_SIZE / 2;
        switch(faceName) {
            case 'front':
                faceGroup.position.z = halfCube;
                break;
            case 'back':
                faceGroup.position.z = -halfCube;
                faceGroup.rotation.y = Math.PI;
                break;
            case 'left':
                faceGroup.position.x = -halfCube;
                faceGroup.rotation.y = -Math.PI / 2;
                break;
            case 'right':
                faceGroup.position.x = halfCube;
                faceGroup.rotation.y = Math.PI / 2;
                break;
            case 'top':
                faceGroup.position.y = halfCube;
                faceGroup.rotation.x = -Math.PI / 2;
                break;
            case 'bottom':
                faceGroup.position.y = -halfCube;
                faceGroup.rotation.x = Math.PI / 2;
                break;
        }

        // Create chess board squares
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const isLight = (row + col) % 2 === 0;
                const color = isLight ? 0xeeeed2 : 0x769656;
                
                const squareGeometry = new THREE.PlaneGeometry(SQUARE_SIZE, SQUARE_SIZE);
                const squareMaterial = new THREE.MeshStandardMaterial({
                    color: color,
                    side: THREE.DoubleSide
                });
                const square = new THREE.Mesh(squareGeometry, squareMaterial);
                
                // Position the square
                const x = (col - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE;
                const y = (row - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE;
                square.position.set(x, y, 0.001);
                
                // Store square info
                square.userData = {
                    face: faceName,
                    row: row,
                    col: col,
                    isSquare: true
                };
                
                faceGroup.add(square);
            }
        }

        return faceGroup;
    }

    /**
     * Create a 3D chess piece
     */
    function createChessPiece(type, color, face, row, col) {
        const pieceGroup = new THREE.Group();
        let geometry, material;

        // Color for the pieces
        const pieceColor = color === 'white' ? 0xf0f0f0 : 0x303030;
        material = new THREE.MeshStandardMaterial({
            color: pieceColor,
            metalness: 0.3,
            roughness: 0.7
        });

        // Create different geometries for different pieces
        switch(type) {
            case PIECE_TYPES.PAWN:
                // Pawn: sphere on cylinder
                const pawnBase = new THREE.CylinderGeometry(0.08, 0.1, 0.05, 16);
                const pawnBody = new THREE.CylinderGeometry(0.06, 0.08, 0.15, 16);
                const pawnHead = new THREE.SphereGeometry(0.06, 16, 16);
                
                const baseMesh = new THREE.Mesh(pawnBase, material);
                baseMesh.position.y = 0.025;
                pieceGroup.add(baseMesh);
                
                const bodyMesh = new THREE.Mesh(pawnBody, material);
                bodyMesh.position.y = 0.125;
                pieceGroup.add(bodyMesh);
                
                const headMesh = new THREE.Mesh(pawnHead, material);
                headMesh.position.y = 0.23;
                pieceGroup.add(headMesh);
                break;

            case PIECE_TYPES.ROOK:
                // Rook: box-like castle
                const rookBase = new THREE.CylinderGeometry(0.1, 0.12, 0.05, 4);
                const rookBody = new THREE.CylinderGeometry(0.09, 0.1, 0.2, 4);
                const rookTop = new THREE.BoxGeometry(0.2, 0.08, 0.2);
                
                pieceGroup.add(new THREE.Mesh(rookBase, material));
                
                const rBody = new THREE.Mesh(rookBody, material);
                rBody.position.y = 0.125;
                pieceGroup.add(rBody);
                
                const rTop = new THREE.Mesh(rookTop, material);
                rTop.position.y = 0.27;
                pieceGroup.add(rTop);
                break;

            case PIECE_TYPES.KNIGHT:
                // Knight: distinctive L-shape
                const knightBase = new THREE.CylinderGeometry(0.1, 0.12, 0.05, 16);
                const knightBody = new THREE.ConeGeometry(0.08, 0.25, 16);
                const knightHead = new THREE.BoxGeometry(0.1, 0.08, 0.06);
                
                pieceGroup.add(new THREE.Mesh(knightBase, material));
                
                const kBody = new THREE.Mesh(knightBody, material);
                kBody.position.y = 0.15;
                pieceGroup.add(kBody);
                
                const kHead = new THREE.Mesh(knightHead, material);
                kHead.position.set(0.05, 0.25, 0);
                kHead.rotation.z = Math.PI / 6;
                pieceGroup.add(kHead);
                break;

            case PIECE_TYPES.BISHOP:
                // Bishop: pointed top
                const bishopBase = new THREE.CylinderGeometry(0.1, 0.12, 0.05, 16);
                const bishopBody = new THREE.CylinderGeometry(0.07, 0.1, 0.2, 16);
                const bishopTop = new THREE.ConeGeometry(0.07, 0.1, 16);
                const bishopBall = new THREE.SphereGeometry(0.04, 16, 16);
                
                pieceGroup.add(new THREE.Mesh(bishopBase, material));
                
                const bBody = new THREE.Mesh(bishopBody, material);
                bBody.position.y = 0.125;
                pieceGroup.add(bBody);
                
                const bTop = new THREE.Mesh(bishopTop, material);
                bTop.position.y = 0.275;
                pieceGroup.add(bTop);
                
                const bBall = new THREE.Mesh(bishopBall, material);
                bBall.position.y = 0.35;
                pieceGroup.add(bBall);
                break;

            case PIECE_TYPES.QUEEN:
                // Queen: crown with points
                const queenBase = new THREE.CylinderGeometry(0.11, 0.13, 0.05, 16);
                const queenBody = new THREE.CylinderGeometry(0.08, 0.11, 0.2, 16);
                const queenCrown = new THREE.CylinderGeometry(0.09, 0.09, 0.05, 8);
                const queenBall = new THREE.SphereGeometry(0.05, 16, 16);
                
                pieceGroup.add(new THREE.Mesh(queenBase, material));
                
                const qBody = new THREE.Mesh(queenBody, material);
                qBody.position.y = 0.125;
                pieceGroup.add(qBody);
                
                const qCrown = new THREE.Mesh(queenCrown, material);
                qCrown.position.y = 0.275;
                pieceGroup.add(qCrown);
                
                const qBall = new THREE.Mesh(queenBall, material);
                qBall.position.y = 0.35;
                pieceGroup.add(qBall);
                break;

            case PIECE_TYPES.KING:
                // King: cross on top
                const kingBase = new THREE.CylinderGeometry(0.11, 0.13, 0.05, 16);
                const kingBody = new THREE.CylinderGeometry(0.08, 0.11, 0.2, 16);
                const kingCrown = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8);
                const kingCross1 = new THREE.BoxGeometry(0.03, 0.1, 0.03);
                const kingCross2 = new THREE.BoxGeometry(0.08, 0.03, 0.03);
                
                pieceGroup.add(new THREE.Mesh(kingBase, material));
                
                const kgBody = new THREE.Mesh(kingBody, material);
                kgBody.position.y = 0.125;
                pieceGroup.add(kgBody);
                
                const kgCrown = new THREE.Mesh(kingCrown, material);
                kgCrown.position.y = 0.28;
                pieceGroup.add(kgCrown);
                
                const kgCross1 = new THREE.Mesh(kingCross1, material);
                kgCross1.position.y = 0.38;
                pieceGroup.add(kgCross1);
                
                const kgCross2 = new THREE.Mesh(kingCross2, material);
                kgCross2.position.y = 0.38;
                pieceGroup.add(kgCross2);
                break;
        }

        // Position the piece on the board
        positionPieceOnBoard(pieceGroup, face, row, col);

        // Store piece metadata
        pieceGroup.userData = {
            type: type,
            color: color,
            face: face,
            row: row,
            col: col,
            isPiece: true,
            hasMoved: false
        };

        pieceGroup.castShadow = true;
        pieceGroup.receiveShadow = true;

        return pieceGroup;
    }

    /**
     * Position a piece on the board
     */
    function positionPieceOnBoard(piece, face, row, col) {
        const faceGroup = cube.children.find(child => child.name === face);
        if (!faceGroup) return;

        const x = (col - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE;
        const y = (row - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE;
        piece.position.set(x, y, 0.02);

        faceGroup.add(piece);
    }

    /**
     * Initialize the chess board with pieces
     */
    function initializeChessBoard() {
        pieces = [];
        gameBoard = {};

        // Only set up pieces on the front face for simplicity
        // You can extend this to other faces
        const face = 'front';

        // Initialize board state
        for (let face of CUBE_FACES) {
            gameBoard[face] = {};
            for (let row = 0; row < BOARD_SIZE; row++) {
                gameBoard[face][row] = {};
            }
        }

        // White pieces (bottom two rows)
        // Pawns
        for (let col = 0; col < BOARD_SIZE; col++) {
            const pawn = createChessPiece(PIECE_TYPES.PAWN, 'white', face, 6, col);
            pieces.push(pawn);
            gameBoard[face][6][col] = pawn;
        }

        // Back row
        const whiteBackRow = [
            PIECE_TYPES.ROOK, PIECE_TYPES.KNIGHT, PIECE_TYPES.BISHOP, PIECE_TYPES.QUEEN,
            PIECE_TYPES.KING, PIECE_TYPES.BISHOP, PIECE_TYPES.KNIGHT, PIECE_TYPES.ROOK
        ];
        for (let col = 0; col < BOARD_SIZE; col++) {
            const piece = createChessPiece(whiteBackRow[col], 'white', face, 7, col);
            pieces.push(piece);
            gameBoard[face][7][col] = piece;
        }

        // Black pieces (top two rows)
        // Pawns
        for (let col = 0; col < BOARD_SIZE; col++) {
            const pawn = createChessPiece(PIECE_TYPES.PAWN, 'black', face, 1, col);
            pieces.push(pawn);
            gameBoard[face][1][col] = pawn;
        }

        // Back row
        const blackBackRow = [
            PIECE_TYPES.ROOK, PIECE_TYPES.KNIGHT, PIECE_TYPES.BISHOP, PIECE_TYPES.QUEEN,
            PIECE_TYPES.KING, PIECE_TYPES.BISHOP, PIECE_TYPES.KNIGHT, PIECE_TYPES.ROOK
        ];
        for (let col = 0; col < BOARD_SIZE; col++) {
            const piece = createChessPiece(blackBackRow[col], 'black', face, 0, col);
            pieces.push(piece);
            gameBoard[face][0][col] = piece;
        }
    }

    /**
     * Calculate legal moves for a piece
     */
    function getLegalMoves(piece) {
        const moves = [];
        const { type, color, face, row, col } = piece.userData;

        // Check if it's this piece's turn
        if (color !== currentTurn) return moves;

        switch(type) {
            case PIECE_TYPES.PAWN:
                moves.push(...getPawnMoves(piece));
                break;
            case PIECE_TYPES.ROOK:
                moves.push(...getRookMoves(piece));
                break;
            case PIECE_TYPES.KNIGHT:
                moves.push(...getKnightMoves(piece));
                break;
            case PIECE_TYPES.BISHOP:
                moves.push(...getBishopMoves(piece));
                break;
            case PIECE_TYPES.QUEEN:
                moves.push(...getQueenMoves(piece));
                break;
            case PIECE_TYPES.KING:
                moves.push(...getKingMoves(piece));
                break;
        }

        return moves;
    }

    /**
     * Get pawn moves
     */
    function getPawnMoves(piece) {
        const moves = [];
        const { color, face, row, col, hasMoved } = piece.userData;
        const direction = color === 'white' ? -1 : 1;

        // Forward move
        const newRow = row + direction;
        if (isValidPosition(face, newRow, col) && !gameBoard[face][newRow][col]) {
            moves.push({ face, row: newRow, col });

            // Double move from starting position
            if (!hasMoved) {
                const doubleRow = row + direction * 2;
                if (isValidPosition(face, doubleRow, col) && !gameBoard[face][doubleRow][col]) {
                    moves.push({ face, row: doubleRow, col });
                }
            }
        }

        // Diagonal captures
        for (let colOffset of [-1, 1]) {
            const captureCol = col + colOffset;
            if (isValidPosition(face, newRow, captureCol)) {
                const targetPiece = gameBoard[face][newRow][captureCol];
                if (targetPiece && targetPiece.userData.color !== color) {
                    moves.push({ face, row: newRow, col: captureCol });
                }
            }
        }

        return moves;
    }

    /**
     * Get rook moves
     */
    function getRookMoves(piece) {
        const moves = [];
        const { color, face, row, col } = piece.userData;

        // Vertical and horizontal directions
        const directions = [
            [0, 1], [0, -1], [1, 0], [-1, 0]
        ];

        for (let [dRow, dCol] of directions) {
            let newRow = row + dRow;
            let newCol = col + dCol;

            while (isValidPosition(face, newRow, newCol)) {
                const targetPiece = gameBoard[face][newRow][newCol];
                
                if (!targetPiece) {
                    moves.push({ face, row: newRow, col: newCol });
                } else {
                    if (targetPiece.userData.color !== color) {
                        moves.push({ face, row: newRow, col: newCol });
                    }
                    break;
                }

                newRow += dRow;
                newCol += dCol;
            }
        }

        return moves;
    }

    /**
     * Get knight moves
     */
    function getKnightMoves(piece) {
        const moves = [];
        const { color, face, row, col } = piece.userData;

        // L-shaped moves
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (let [dRow, dCol] of knightMoves) {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (isValidPosition(face, newRow, newCol)) {
                const targetPiece = gameBoard[face][newRow][newCol];
                if (!targetPiece || targetPiece.userData.color !== color) {
                    moves.push({ face, row: newRow, col: newCol });
                }
            }
        }

        return moves;
    }

    /**
     * Get bishop moves
     */
    function getBishopMoves(piece) {
        const moves = [];
        const { color, face, row, col } = piece.userData;

        // Diagonal directions
        const directions = [
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];

        for (let [dRow, dCol] of directions) {
            let newRow = row + dRow;
            let newCol = col + dCol;

            while (isValidPosition(face, newRow, newCol)) {
                const targetPiece = gameBoard[face][newRow][newCol];
                
                if (!targetPiece) {
                    moves.push({ face, row: newRow, col: newCol });
                } else {
                    if (targetPiece.userData.color !== color) {
                        moves.push({ face, row: newRow, col: newCol });
                    }
                    break;
                }

                newRow += dRow;
                newCol += dCol;
            }
        }

        return moves;
    }

    /**
     * Get queen moves (combination of rook and bishop)
     */
    function getQueenMoves(piece) {
        return [...getRookMoves(piece), ...getBishopMoves(piece)];
    }

    /**
     * Get king moves
     */
    function getKingMoves(piece) {
        const moves = [];
        const { color, face, row, col } = piece.userData;

        // All adjacent squares
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (let [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (isValidPosition(face, newRow, newCol)) {
                const targetPiece = gameBoard[face][newRow][newCol];
                if (!targetPiece || targetPiece.userData.color !== color) {
                    moves.push({ face, row: newRow, col: newCol });
                }
            }
        }

        return moves;
    }

    /**
     * Check if a position is valid on the board
     */
    function isValidPosition(face, row, col) {
        return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
    }

    /**
     * Display legal moves for a piece
     */
    function showLegalMoves(piece) {
        // Clear previous indicators
        clearLegalMoveIndicators();

        const legalMoves = getLegalMoves(piece);
        
        legalMoves.forEach(move => {
            const indicator = createLegalMoveIndicator(move.face, move.row, move.col);
            legalMoveIndicators.push(indicator);
        });

        if (legalMoves.length > 0) {
            showMessage(`${piece.userData.color} ${piece.userData.type} - ${legalMoves.length} legal moves available`);
        } else {
            showMessage(`No legal moves for this piece`);
        }
    }

    /**
     * Create a legal move indicator
     */
    function createLegalMoveIndicator(face, row, col) {
        const geometry = new THREE.CircleGeometry(SQUARE_SIZE * 0.3, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const indicator = new THREE.Mesh(geometry, material);
        indicator.userData.isLegalMoveIndicator = true;

        const faceGroup = cube.children.find(child => child.name === face);
        if (faceGroup) {
            const x = (col - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE;
            const y = (row - BOARD_SIZE / 2 + 0.5) * SQUARE_SIZE;
            indicator.position.set(x, y, 0.005);
            faceGroup.add(indicator);
        }

        return indicator;
    }

    /**
     * Clear legal move indicators
     */
    function clearLegalMoveIndicators() {
        legalMoveIndicators.forEach(indicator => {
            if (indicator.parent) {
                indicator.parent.remove(indicator);
            }
        });
        legalMoveIndicators = [];
    }

    /**
     * Move a piece to a new position
     */
    function movePiece(piece, targetFace, targetRow, targetCol) {
        const { face, row, col } = piece.userData;

        // Remove piece from old position
        if (gameBoard[face] && gameBoard[face][row]) {
            delete gameBoard[face][row][col];
        }

        // Remove captured piece if any
        if (gameBoard[targetFace][targetRow][targetCol]) {
            const capturedPiece = gameBoard[targetFace][targetRow][targetCol];
            if (capturedPiece.parent) {
                capturedPiece.parent.remove(capturedPiece);
            }
            pieces = pieces.filter(p => p !== capturedPiece);
        }

        // Update piece position
        piece.userData.face = targetFace;
        piece.userData.row = targetRow;
        piece.userData.col = targetCol;
        piece.userData.hasMoved = true;

        // Move piece visually
        if (piece.parent) {
            piece.parent.remove(piece);
        }
        positionPieceOnBoard(piece, targetFace, targetRow, targetCol);

        // Update board state
        gameBoard[targetFace][targetRow][targetCol] = piece;

        // Update game state
        moveCount++;
        currentTurn = currentTurn === 'white' ? 'black' : 'white';
        updateUI();

        // Clear selection
        selectedPiece = null;
        clearLegalMoveIndicators();

        // AI move if enabled
        if (aiEnabled && currentTurn === 'black') {
            setTimeout(() => makeAIMove(), 500);
        }
    }

    /**
     * Simple AI move (random legal move)
     */
    function makeAIMove() {
        const blackPieces = pieces.filter(p => p.userData.color === 'black');
        
        // Find all possible moves
        let allMoves = [];
        blackPieces.forEach(piece => {
            const moves = getLegalMoves(piece);
            moves.forEach(move => {
                allMoves.push({ piece, move });
            });
        });

        if (allMoves.length > 0) {
            // Pick a random move
            const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
            movePiece(randomMove.piece, randomMove.move.face, randomMove.move.row, randomMove.move.col);
            showMessage('AI made a move');
        } else {
            showMessage('AI has no legal moves - Stalemate!');
        }
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Mouse events for piece selection and cube rotation
        renderer.domElement.addEventListener('mousedown', onMouseDown, false);
        renderer.domElement.addEventListener('mousemove', onMouseMove, false);
        renderer.domElement.addEventListener('mouseup', onMouseUp, false);
        renderer.domElement.addEventListener('wheel', onMouseWheel, false);

        // Button events
        document.getElementById('newGameBtn').addEventListener('click', newGame);
        document.getElementById('generateSampleBtn').addEventListener('click', generateSampleImage);
        document.getElementById('resetViewBtn').addEventListener('click', resetView);

        // Window resize
        window.addEventListener('resize', onWindowResize, false);
    }

    /**
     * Mouse down event
     */
    function onMouseDown(event) {
        event.preventDefault();

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Check for piece selection (left click)
        if (event.button === 0) {
            const intersects = raycaster.intersectObjects(scene.children, true);
            
            for (let intersect of intersects) {
                let obj = intersect.object;
                
                // Traverse up to find if this is part of a piece
                while (obj.parent && !obj.userData.isPiece) {
                    obj = obj.parent;
                }

                if (obj.userData.isPiece) {
                    // Select piece and show legal moves
                    selectedPiece = obj;
                    showLegalMoves(obj);
                    return;
                } else if (obj.userData.isLegalMoveIndicator) {
                    // Move selected piece to this position
                    if (selectedPiece) {
                        // Find which square this indicator is on
                        const parent = obj.parent;
                        const face = parent.name;
                        const x = obj.position.x;
                        const y = obj.position.y;
                        
                        const col = Math.floor((x + CUBE_SIZE / 2) / SQUARE_SIZE);
                        const row = Math.floor((y + CUBE_SIZE / 2) / SQUARE_SIZE);
                        
                        movePiece(selectedPiece, face, row, col);
                    }
                    return;
                }
            }

            // Clicked on empty space - clear selection
            selectedPiece = null;
            clearLegalMoveIndicators();
        }

        // Start dragging for rotation (right click or left click with no selection)
        if (event.button === 2 || event.button === 0) {
            isDragging = true;
            previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
    }

    /**
     * Mouse move event
     */
    function onMouseMove(event) {
        if (isDragging) {
            const deltaX = event.clientX - previousMousePosition.x;
            const deltaY = event.clientY - previousMousePosition.y;

            rotationVelocity.y = deltaX * 0.005;
            rotationVelocity.x = deltaY * 0.005;

            previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
    }

    /**
     * Mouse up event
     */
    function onMouseUp(event) {
        isDragging = false;
    }

    /**
     * Mouse wheel event for zoom
     */
    function onMouseWheel(event) {
        event.preventDefault();
        
        const zoomSpeed = 0.1;
        const delta = event.deltaY > 0 ? 1 : -1;
        
        camera.position.multiplyScalar(1 + delta * zoomSpeed);
        
        // Limit zoom
        const distance = camera.position.length();
        if (distance < 3) {
            camera.position.setLength(3);
        } else if (distance > 15) {
            camera.position.setLength(15);
        }
    }

    /**
     * Window resize event
     */
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * New game
     */
    function newGame() {
        // Clear existing pieces
        pieces.forEach(piece => {
            if (piece.parent) {
                piece.parent.remove(piece);
            }
        });

        // Reset game state
        currentTurn = 'white';
        moveCount = 0;
        selectedPiece = null;
        clearLegalMoveIndicators();

        // Reinitialize board
        initializeChessBoard();
        updateUI();
        showMessage('New game started!');
    }

    /**
     * Generate sample image showing legal moves
     */
    function generateSampleImage() {
        showMessage('Generating sample image...');
        
        // Find a piece to demonstrate
        const demoPiece = pieces.find(p => p.userData.color === currentTurn);
        if (demoPiece) {
            selectedPiece = demoPiece;
            showLegalMoves(demoPiece);
            
            // Rotate cube to show the piece better
            const targetRotation = { x: Math.PI / 6, y: Math.PI / 4 };
            animateRotation(targetRotation, () => {
                showMessage('Sample visualization complete! This shows legal moves for the selected piece.');
            });
        }
    }

    /**
     * Animate cube rotation
     */
    function animateRotation(target, callback) {
        const duration = 1000; // ms
        const startTime = Date.now();
        const startRotation = {
            x: cube.rotation.x,
            y: cube.rotation.y
        };

        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease in-out
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : -1 + (4 - 2 * progress) * progress;

            cube.rotation.x = startRotation.x + (target.x - startRotation.x) * eased;
            cube.rotation.y = startRotation.y + (target.y - startRotation.y) * eased;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (callback) {
                callback();
            }
        }

        animate();
    }

    /**
     * Reset camera view
     */
    function resetView() {
        camera.position.set(3, 3, 5);
        camera.lookAt(0, 0, 0);
        cube.rotation.set(0, 0, 0);
        rotationVelocity = { x: 0, y: 0 };
        showMessage('View reset');
    }

    /**
     * Update UI elements
     */
    function updateUI() {
        document.getElementById('turn-indicator').textContent = 
            `${currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)}'s Turn`;
        document.getElementById('move-count').textContent = `Moves: ${moveCount}`;
    }

    /**
     * Show message to user
     */
    function showMessage(text) {
        const messageArea = document.getElementById('message-area');
        messageArea.textContent = text;
        messageArea.classList.add('active');
        
        setTimeout(() => {
            messageArea.classList.remove('active');
        }, 3000);
    }

    /**
     * Animation loop
     */
    function animate() {
        requestAnimationFrame(animate);

        // Apply rotation velocity with damping
        if (Math.abs(rotationVelocity.x) > 0.001 || Math.abs(rotationVelocity.y) > 0.001) {
            cube.rotation.x += rotationVelocity.x;
            cube.rotation.y += rotationVelocity.y;
            
            // Damping
            rotationVelocity.x *= 0.95;
            rotationVelocity.y *= 0.95;
        }

        renderer.render(scene, camera);
    }

    // Disable context menu on right click
    document.addEventListener('contextmenu', event => event.preventDefault());

    // Start the application
    window.addEventListener('DOMContentLoaded', init);

})();
