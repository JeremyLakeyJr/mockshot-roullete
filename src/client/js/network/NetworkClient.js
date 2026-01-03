/**
 * Network Client for Buckshot Roulette Multiplayer
 * Handles Socket.io communication with the server
 */

import { io } from 'socket.io-client';

export class NetworkClient {
  constructor() {
    this.socket = null;
    this.roomCode = null;
    this.playerId = null;
    this.isHost = false;
    this.callbacks = {};
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      // Connect to server
      this.socket = io(window.location.origin, {
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.playerId = this.socket.id;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        reject(error);
      });

      this.setupEventListeners();
    });
  }

  setupEventListeners() {
    // Room events
    this.socket.on('room_created', (data) => {
      this.roomCode = data.roomCode;
      this.isHost = true;
      this.callbacks.onRoomCreated?.(data);
    });

    this.socket.on('room_joined', (data) => {
      this.roomCode = data.roomCode;
      this.isHost = false;
      this.callbacks.onRoomJoined?.(data);
    });

    this.socket.on('opponent_joined', (data) => {
      this.callbacks.onOpponentJoined?.(data);
    });

    this.socket.on('opponent_left', () => {
      this.callbacks.onOpponentLeft?.();
    });

    this.socket.on('room_error', (data) => {
      this.callbacks.onRoomError?.(data);
    });

    // Game events
    this.socket.on('game_start', (data) => {
      this.callbacks.onGameStart?.(data);
    });

    this.socket.on('game_state', (data) => {
      this.callbacks.onGameState?.(data);
    });

    this.socket.on('round_start', (data) => {
      this.callbacks.onRoundStart?.(data);
    });

    this.socket.on('shot_result', (data) => {
      this.callbacks.onShotResult?.(data);
    });

    this.socket.on('item_result', (data) => {
      this.callbacks.onItemResult?.(data);
    });

    this.socket.on('game_over', (data) => {
      this.callbacks.onGameOver?.(data);
    });

    this.socket.on('turn_change', (data) => {
      this.callbacks.onTurnChange?.(data);
    });

    // Error handling
    this.socket.on('error', (data) => {
      this.callbacks.onError?.(data);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.callbacks.onDisconnect?.();
    });
  }

  // Room actions
  createRoom() {
    if (!this.connected) return;
    this.socket.emit('create_room');
  }

  joinRoom(roomCode) {
    if (!this.connected) return;
    this.socket.emit('join_room', { roomCode: roomCode.toUpperCase() });
  }

  leaveRoom() {
    if (!this.connected || !this.roomCode) return;
    this.socket.emit('leave_room', { roomCode: this.roomCode });
    this.roomCode = null;
    this.isHost = false;
  }

  // Game actions
  startGame() {
    if (!this.connected || !this.roomCode || !this.isHost) return;
    this.socket.emit('start_game', { roomCode: this.roomCode });
  }

  shoot(target) {
    if (!this.connected || !this.roomCode) return;
    this.socket.emit('shoot', { 
      roomCode: this.roomCode, 
      target: target 
    });
  }

  useItem(itemIndex) {
    if (!this.connected || !this.roomCode) return;
    this.socket.emit('use_item', { 
      roomCode: this.roomCode, 
      itemIndex: itemIndex 
    });
  }

  requestReload() {
    if (!this.connected || !this.roomCode) return;
    this.socket.emit('request_reload', { roomCode: this.roomCode });
  }

  // Utility
  setCallback(event, callback) {
    this.callbacks[event] = callback;
  }

  getPlayerId() {
    return this.playerId;
  }

  getRoomCode() {
    return this.roomCode;
  }

  isConnected() {
    return this.connected;
  }

  isRoomHost() {
    return this.isHost;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.roomCode = null;
    this.playerId = null;
    this.isHost = false;
  }
}

export default NetworkClient;
