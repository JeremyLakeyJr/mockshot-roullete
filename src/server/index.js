/**
 * Buckshot Roulette Server
 * Handles multiplayer game rooms and state management
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configure CORS based on environment
const corsOrigin = process.env.NODE_ENV === 'production' 
  ? process.env.CORS_ORIGIN || false  // In production, require explicit origin or same-origin
  : "*";  // Development allows all origins for testing

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"]
  }
});

// Serve static files from dist folder in production
app.use(express.static(join(__dirname, '../../dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../../dist/index.html'));
});

// Game configuration
const GAME_CONFIG = {
  INITIAL_HEALTH: 3,
  MIN_SHELLS: 2,
  MAX_SHELLS: 8,
  LIVE_RATIO_MIN: 0.3,
  LIVE_RATIO_MAX: 0.6
};

const SHELL_TYPE = {
  LIVE: 'live',
  BLANK: 'blank'
};

const GAME_STATE = {
  WAITING: 'waiting',
  LOADING: 'loading',
  PLAYER_TURN: 'player_turn',
  OPPONENT_TURN: 'opponent_turn',
  GAME_OVER: 'game_over'
};

// Room storage
const rooms = new Map();

/**
 * Generate secure random number using crypto
 */
function secureRandom() {
  return crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF;
}

/**
 * Generate unbiased random integer in range [0, max) using rejection sampling
 * This avoids modulo bias that occurs with simple multiplication
 */
function secureRandomInt(max) {
  if (max <= 0) return 0;
  
  // Calculate the largest multiple of max that fits in 32 bits
  const maxUint32 = 0xFFFFFFFF;
  const limit = maxUint32 - (maxUint32 % max);
  
  let value;
  do {
    value = crypto.randomBytes(4).readUInt32BE(0);
  } while (value >= limit);
  
  return value % max;
}

/**
 * Generate a unique room code
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(secureRandomInt(chars.length));
  }
  return code;
}

/**
 * Create a new game state
 */
function createGameState() {
  return {
    players: [
      { id: 0, name: 'Player 1', health: GAME_CONFIG.INITIAL_HEALTH, socketId: null },
      { id: 1, name: 'Player 2', health: GAME_CONFIG.INITIAL_HEALTH, socketId: null }
    ],
    currentPlayerIndex: 0,
    chamber: [],
    currentChamberIndex: 0,
    roundNumber: 1,
    state: GAME_STATE.WAITING,
    lastShotResult: null,
    liveCount: 0,
    blankCount: 0
  };
}

/**
 * Load chamber with random shells
 */
function loadChamber(gameState) {
  // Use unbiased random for shell count
  const shellRange = GAME_CONFIG.MAX_SHELLS - GAME_CONFIG.MIN_SHELLS + 1;
  const totalShells = secureRandomInt(shellRange) + GAME_CONFIG.MIN_SHELLS;

  // Calculate live shell count range based on ratio constraints
  // Min live = ceil(totalShells * 0.3), Max live = floor(totalShells * 0.6)
  const minLive = Math.max(1, Math.ceil(totalShells * GAME_CONFIG.LIVE_RATIO_MIN));
  const maxLive = Math.floor(totalShells * GAME_CONFIG.LIVE_RATIO_MAX);
  const liveRange = Math.max(1, maxLive - minLive + 1);
  
  // Use unbiased random to select live count within the valid range
  gameState.liveCount = secureRandomInt(liveRange) + minLive;
  gameState.blankCount = totalShells - gameState.liveCount;

  // Create shells array
  gameState.chamber = [];
  for (let i = 0; i < gameState.liveCount; i++) {
    gameState.chamber.push(SHELL_TYPE.LIVE);
  }
  for (let i = 0; i < gameState.blankCount; i++) {
    gameState.chamber.push(SHELL_TYPE.BLANK);
  }

  // Fisher-Yates shuffle using unbiased random for secure randomization
  for (let i = gameState.chamber.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [gameState.chamber[i], gameState.chamber[j]] = [gameState.chamber[j], gameState.chamber[i]];
  }

  gameState.currentChamberIndex = 0;
  gameState.state = GAME_STATE.PLAYER_TURN;

  return {
    totalShells,
    liveCount: gameState.liveCount,
    blankCount: gameState.blankCount
  };
}

/**
 * Get remaining shell counts (without revealing order)
 */
function getRemainingShellCounts(gameState) {
  let live = 0;
  let blank = 0;
  for (let i = gameState.currentChamberIndex; i < gameState.chamber.length; i++) {
    if (gameState.chamber[i] === SHELL_TYPE.LIVE) live++;
    else blank++;
  }
  return { live, blank, total: live + blank };
}

/**
 * Get sanitized game state for clients (no chamber info)
 */
function getClientState(gameState, forPlayerIndex = null) {
  return {
    players: gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      health: p.health
    })),
    currentPlayerIndex: gameState.currentPlayerIndex,
    state: gameState.state,
    roundNumber: gameState.roundNumber,
    remainingShells: getRemainingShellCounts(gameState),
    lastShotResult: gameState.lastShotResult,
    winner: gameState.winner || null
  };
}

/**
 * Process a shot action
 */
function processShot(gameState, shooterIndex, target) {
  if (gameState.state !== GAME_STATE.PLAYER_TURN && 
      gameState.state !== GAME_STATE.OPPONENT_TURN) {
    return { error: 'Not in shooting phase' };
  }

  if (shooterIndex !== gameState.currentPlayerIndex) {
    return { error: 'Not your turn' };
  }

  if (gameState.currentChamberIndex >= gameState.chamber.length) {
    return { error: 'No shells remaining' };
  }

  const currentShell = gameState.chamber[gameState.currentChamberIndex];
  gameState.currentChamberIndex++;

  const targetIndex = target === 'self' 
    ? shooterIndex 
    : (shooterIndex + 1) % 2;

  let damage = 0;
  let keepTurn = false;

  if (currentShell === SHELL_TYPE.LIVE) {
    damage = 1;
    gameState.players[targetIndex].health -= damage;
  } else if (target === 'self') {
    // Shooting self with blank = keep turn
    keepTurn = true;
  }

  gameState.lastShotResult = {
    shooter: shooterIndex,
    target: targetIndex,
    shellType: currentShell,
    damage,
    keepTurn,
    targetHealth: gameState.players[targetIndex].health
  };

  // Check for game over
  const deadPlayer = gameState.players.find(p => p.health <= 0);
  if (deadPlayer) {
    gameState.state = GAME_STATE.GAME_OVER;
    gameState.winner = gameState.players.find(p => p.health > 0);
    return { ...gameState.lastShotResult, gameOver: true, winner: gameState.winner };
  }

  // Check if chamber is empty
  if (gameState.currentChamberIndex >= gameState.chamber.length) {
    gameState.roundNumber++;
    return { 
      ...gameState.lastShotResult, 
      chamberEmpty: true,
      needsReload: true
    };
  }

  // Determine next turn
  if (!keepTurn) {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 2;
  }
  
  gameState.state = gameState.currentPlayerIndex === 0 
    ? GAME_STATE.PLAYER_TURN 
    : GAME_STATE.OPPONENT_TURN;

  return gameState.lastShotResult;
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Create room
  socket.on('create_room', () => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      players: [socket.id],
      gameState: createGameState()
    };
    room.gameState.players[0].socketId = socket.id;
    
    rooms.set(roomCode, room);
    socket.join(roomCode);
    
    socket.emit('room_created', { 
      roomCode,
      playerIndex: 0
    });
    
    console.log(`Room created: ${roomCode}`);
  });

  // Join room
  socket.on('join_room', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('room_error', { message: 'Room not found' });
      return;
    }
    
    if (room.players.length >= 2) {
      socket.emit('room_error', { message: 'Room is full' });
      return;
    }
    
    room.players.push(socket.id);
    room.gameState.players[1].socketId = socket.id;
    socket.join(roomCode);
    
    socket.emit('room_joined', {
      roomCode,
      playerIndex: 1
    });
    
    // Notify host that opponent joined
    const hostSocket = room.players[0];
    io.to(hostSocket).emit('opponent_joined', {
      playerIndex: 1
    });
    
    console.log(`Player joined room: ${roomCode}`);
  });

  // Start game
  socket.on('start_game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.players.length < 2) {
      socket.emit('error', { message: 'Need 2 players to start' });
      return;
    }
    
    // Reset game state
    room.gameState = createGameState();
    room.gameState.players[0].socketId = room.players[0];
    room.gameState.players[1].socketId = room.players[1];
    
    // Load chamber
    const loadResult = loadChamber(room.gameState);
    
    // Send game start to all players
    room.players.forEach((playerId, index) => {
      io.to(playerId).emit('game_start', {
        playerIndex: index,
        state: getClientState(room.gameState)
      });
    });
    
    // Send round start info
    io.to(roomCode).emit('round_start', {
      totalShells: loadResult.totalShells,
      liveCount: loadResult.liveCount,
      blankCount: loadResult.blankCount
    });
    
    console.log(`Game started in room: ${roomCode}`);
  });

  // Handle shot
  socket.on('shoot', ({ roomCode, target }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Determine player index
    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex === -1) {
      socket.emit('error', { message: 'Not in this room' });
      return;
    }
    
    // Process the shot
    const result = processShot(room.gameState, playerIndex, target);
    
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }
    
    // Broadcast result to all players
    io.to(roomCode).emit('shot_result', { result });
    
    // If game over, send game over event
    if (result.gameOver) {
      room.players.forEach((playerId, index) => {
        io.to(playerId).emit('game_over', {
          isWinner: result.winner.id === index,
          winner: result.winner
        });
      });
    } 
    // If needs reload, reload and broadcast
    else if (result.needsReload) {
      setTimeout(() => {
        const loadResult = loadChamber(room.gameState);
        io.to(roomCode).emit('round_start', {
          totalShells: loadResult.totalShells,
          liveCount: loadResult.liveCount,
          blankCount: loadResult.blankCount
        });
        io.to(roomCode).emit('game_state', { 
          state: getClientState(room.gameState) 
        });
      }, 1500);
    }
    // Send updated state
    else {
      io.to(roomCode).emit('turn_change', {
        state: getClientState(room.gameState)
      });
    }
  });

  // Request reload
  socket.on('request_reload', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const loadResult = loadChamber(room.gameState);
    
    io.to(roomCode).emit('round_start', {
      totalShells: loadResult.totalShells,
      liveCount: loadResult.liveCount,
      blankCount: loadResult.blankCount
    });
    
    io.to(roomCode).emit('game_state', { 
      state: getClientState(room.gameState) 
    });
  });

  // Leave room
  socket.on('leave_room', ({ roomCode }) => {
    handlePlayerLeave(socket, roomCode);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Find and clean up any rooms the player was in
    for (const [roomCode, room] of rooms.entries()) {
      if (room.players.includes(socket.id)) {
        handlePlayerLeave(socket, roomCode);
      }
    }
  });
});

function handlePlayerLeave(socket, roomCode) {
  const room = rooms.get(roomCode);
  
  if (!room) return;
  
  const playerIndex = room.players.indexOf(socket.id);
  if (playerIndex === -1) return;
  
  room.players.splice(playerIndex, 1);
  socket.leave(roomCode);
  
  // Notify remaining player
  if (room.players.length > 0) {
    io.to(room.players[0]).emit('opponent_left');
  }
  
  // Clean up empty rooms
  if (room.players.length === 0) {
    rooms.delete(roomCode);
    console.log(`Room deleted: ${roomCode}`);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Buckshot Roulette server running on port ${PORT}`);
});

export default app;
