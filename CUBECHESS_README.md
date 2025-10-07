# 3D Cube Chess

A unique chess game implementation where the chess board is played on a 3D rotating cube with fully rendered 3D chess pieces.

## Features

### 1. 3D Chess Pieces
All chess pieces are rendered as distinct 3D models using Three.js geometries:
- **Pawn**: Sphere on cylindrical body
- **Rook**: Castle-like structure with battlements
- **Knight**: L-shaped with distinctive head
- **Bishop**: Pointed cone top with sphere
- **Queen**: Crown with multiple points and sphere
- **King**: Cross on top of crown

Each piece type has a unique 3D geometry that makes it easily distinguishable on the board.

### 2. Legal Move Visualization
When you click on a chess piece, the application displays all legal moves for that piece:
- Valid move squares are highlighted with semi-transparent green circles
- The number of available moves is displayed in the message area
- Only pieces of the current player's color can be selected
- Legal move indicators disappear when another action is taken

### 3. Interactive Gameplay
- **Click to Select**: Click on any of your pieces to see legal moves
- **Click to Move**: Click on a green indicator to move the selected piece
- **Turn-Based**: Alternates between white and black players
- **Move Counter**: Tracks the total number of moves made
- **AI Opponent**: After white's move, black automatically makes a move

### 4. 3D Controls
- **Rotate Cube**: Left-click and drag anywhere on the canvas to rotate the cube
- **Zoom**: Use mouse wheel to zoom in and out (limited range: 3-15 units)
- **Smooth Rotation**: Cube rotation includes momentum for natural feel
- **Reset View**: Button to return camera to default position

### 5. Sample Visualization
The "Generate Sample Image" button demonstrates the legal move system by:
1. Selecting a piece from the current player
2. Displaying all its legal moves
3. Rotating the cube to an optimal viewing angle
4. Showing a confirmation message

### 6. Chess Logic
Complete implementation of standard chess rules:
- **Pawn**: Forward movement (1 or 2 squares from start), diagonal captures
- **Rook**: Horizontal and vertical movement
- **Knight**: L-shaped jumps (2+1 squares)
- **Bishop**: Diagonal movement
- **Queen**: Combination of rook and bishop movements
- **King**: One square in any direction

Pieces cannot move through other pieces (except knights), and captures are properly handled.

## File Structure

```
cubechess.html      - Main HTML page with UI structure
cubechess.css       - Styling and responsive design
cubechess.js        - Game logic, 3D rendering, and interactions
three.min.js        - Three.js library for 3D graphics
```

## Technical Details

### Three.js Integration
- Scene with perspective camera
- Multiple light sources (ambient, directional, point lights)
- Shadow mapping for realistic piece shadows
- Raycaster for mouse picking and selection

### Board Structure
- 8x8 chess board on each cube face (6 faces total)
- Currently implements chess on the front face
- Can be extended to include pieces on other faces for unique gameplay

### Performance
- Efficient raycasting for piece selection
- Optimized rendering loop
- Smooth 60 FPS animation
- Low-poly piece geometries for performance

### AI System
The AI opponent uses a simple random move selection:
1. Finds all black pieces
2. Calculates legal moves for each piece
3. Randomly selects one valid move
4. Executes the move after a 500ms delay

Future enhancements could include:
- Minimax algorithm with alpha-beta pruning
- Position evaluation
- Opening book
- Difficulty levels

## Browser Compatibility

Works in all modern browsers that support:
- WebGL (for Three.js rendering)
- ES6 JavaScript
- HTML5 Canvas

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Controls Reference

| Action | Control |
|--------|---------|
| Rotate Cube | Left-click + Drag |
| Zoom In/Out | Mouse Wheel |
| Select Piece | Left-click on piece |
| Move Piece | Left-click on green indicator |
| New Game | Click "New Game" button |
| Reset View | Click "Reset View" button |
| Sample Demo | Click "Generate Sample Image" button |

## Future Enhancements

Potential features for future development:
1. **Cross-face movement**: Allow pieces to move between cube faces
2. **Rubik's Cube mechanics**: Rotate cube faces with pieces
3. **Multiplayer**: Online multiplayer support
4. **Stronger AI**: Implement chess engine with evaluation
5. **Move history**: Track and display move notation
6. **Undo/Redo**: Allow taking back moves
7. **Save/Load**: Save game state to continue later
8. **Themes**: Different board and piece color schemes
9. **Sound effects**: Audio feedback for moves and captures
10. **Animations**: Smooth piece movement animations

## Development Notes

### Adding New Piece Designs
To modify piece geometries, edit the `createChessPiece()` function in `cubechess.js`. Each piece uses a combination of Three.js primitive geometries (cylinders, spheres, cones, boxes).

### Extending to Multiple Faces
To add pieces on other cube faces, modify the `initializeChessBoard()` function to populate additional faces with pieces. You'll also need to implement cross-face movement logic.

### Modifying Chess Rules
Chess move logic is separated by piece type in individual functions:
- `getPawnMoves()`
- `getRookMoves()`
- `getKnightMoves()`
- `getBishopMoves()`
- `getQueenMoves()`
- `getKingMoves()`

### Styling
All visual styling is in `cubechess.css`. The UI uses backdrop filters for a modern glassmorphism effect and includes responsive breakpoints for mobile devices.

## Credits

- Three.js library for 3D rendering
- Chess rules implementation based on standard FIDE rules
- UI design inspired by modern web applications

## License

Part of the Salsoftware project. See main repository for license details.
