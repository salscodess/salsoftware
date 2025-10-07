# 3D Cube Chess

A unique chess variant played on a 3D cube where pieces can move across faces, with selective rotation mechanics and full mobile support.

## Features

### 1. Cross-Face Chess Movement
- **Traditional Rules**: Standard chess movement rules apply within each face
- **Edge Transitions**: Pieces can seamlessly move to adjacent faces when their movement reaches an edge
- **Spatial Continuity**: Face adjacency is mapped to maintain logical spatial relationships
- **Supported Pieces**: Currently implemented for Rooks and Pawns, extensible to other pieces

#### Face Adjacency Map
```
Front Face:
  ↑ Top | ↓ Bottom | ← Left | → Right

Back Face:
  ↑ Top | ↓ Bottom | ← Right | → Left

Top Face:
  ↑ Back | ↓ Front | ← Left | → Right

Bottom Face:
  ↑ Front | ↓ Back | ← Left | → Right

Left Face:
  ↑ Top | ↓ Bottom | ← Back | → Front

Right Face:
  ↑ Top | ↓ Bottom | ← Front | → Back
```

### 2. Selective Rotation System
Players can rotate individual rows or columns instead of the entire cube:

#### View Rotation Mode (Default)
- Rotate the entire cube view with mouse drag or touch
- Zoom with scroll wheel or pinch gesture
- Does not affect piece positions

#### Row Rotation Mode
- Select a specific row (0-7)
- Rotate pieces horizontally around the cube
- Moves through: Front → Left → Back → Right → Front
- Useful for strategic repositioning

#### Column Rotation Mode
- Select a specific column (0-7)
- Rotate pieces vertically around the cube
- Moves through: Front → Top → Back → Bottom → Front
- Enables vertical tactical maneuvers

### 3. Mobile Support

#### Responsive Design
- Breakpoints at 768px (tablet) and 480px (mobile)
- Adaptive layout that maximizes playable area
- Touch-optimized button sizes and spacing

#### Touch Controls
- **Tap**: Select pieces and make moves
- **Drag**: Rotate cube view (in view rotation mode)
- **Pinch**: Zoom in/out
- **Two-finger gestures**: Supported for zoom

#### Collapsible Menu
- Hamburger menu button on mobile devices
- Slide-up animation for controls panel
- Keeps the game board unobstructed
- Easy access to all game options

### 4. Game Mechanics

#### Standard Chess Rules
- All traditional piece movements (within faces)
- Check and checkmate detection
- Turn-based gameplay
- AI opponent (simple random move selection)

#### Special Features
- Rubik's Twist: Rotate the entire cube after a move
- Visual indicators for selected pieces (blue highlight)
- Valid move indicators (green squares)
- Check warnings

## Controls

### Desktop
- **Rotate View**: Click + drag on the cube
- **Zoom**: Scroll wheel
- **Select Piece**: Click on a piece
- **Move**: Click on a valid (green) square

### Mobile
- **Menu**: Tap the hamburger icon (☰) to access controls
- **Rotate View**: Touch + drag on the cube
- **Zoom**: Pinch gesture
- **Select Piece**: Tap on a piece
- **Move**: Tap on a valid (green) square

## Technical Implementation

### Files
- `cubechess.html`: Entry point with basic HTML structure
- `cubechess.js`: Game logic, 3D rendering, and event handling
- `cubechess.css`: Styling, responsive design, and animations

### Key Functions

#### Movement System
```javascript
getAdjacentFacePosition(face, row, col, direction)
// Returns the corresponding position on an adjacent face
// Handles edge-to-edge transitions for cross-face movement

getValidMoves(faces, face, row, col)
// Calculates valid moves including cross-face options
// Respects traditional chess rules plus cube mechanics
```

#### Rotation System
```javascript
rotateRow(rowIndex, clockwise)
// Rotates a horizontal row around the cube
// Cycles pieces through 4 faces

rotateColumn(colIndex, clockwise)
// Rotates a vertical column around the cube
// Handles coordinate transformations for back face
```

#### Rendering
- Canvas 2D with pseudo-3D projection
- Depth sorting for proper face visibility
- Back-face culling for performance
- Responsive canvas sizing

### Browser Compatibility
- Modern browsers with ES6 support
- Canvas 2D support required
- Touch events for mobile devices
- Tested on Chrome, Firefox, Safari, and Edge

## Future Enhancements

Potential additions for future versions:
- Complete cross-face movement for all piece types (Knight, Bishop, Queen, King)
- Multi-path movement options when crossing faces
- Enhanced AI with strategic cube rotation
- Multiplayer support
- Move history and undo functionality
- Custom cube themes and piece styles
- Game save/load functionality

## Development Notes

### Code Structure
- Self-contained IIFE pattern
- No external dependencies
- Event-driven architecture
- Modular function organization

### Performance Considerations
- Efficient canvas clearing and redrawing
- Depth sorting only when needed
- Touch event passive listeners where appropriate
- Minimal DOM manipulation

### Accessibility
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard-friendly button controls
- High contrast visual indicators

## Credits

Developed as part of the SalSoftware project.
