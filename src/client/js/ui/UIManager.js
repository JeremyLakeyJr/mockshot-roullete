/**
 * UI Manager for Buckshot Roulette
 * Handles all UI elements and interactions
 */

import { ITEM_INFO } from '../game/ItemsManager.js';

export class UIManager {
  constructor() {
    this.elements = {};
    this.callbacks = {};
    this.currentScreen = 'menu';
  }

  init() {
    this.cacheElements();
    this.setupEventListeners();
  }

  cacheElements() {
    this.elements = {
      // Screens
      menuScreen: document.getElementById('menu-screen'),
      gameScreen: document.getElementById('game-screen'),
      resultScreen: document.getElementById('result-screen'),
      lobbyScreen: document.getElementById('lobby-screen'),

      // Menu buttons
      playAIButton: document.getElementById('play-ai-btn'),
      playPVPButton: document.getElementById('play-pvp-btn'),
      difficultySelect: document.getElementById('difficulty-select'),

      // Game HUD
      playerHealth: document.getElementById('player-health'),
      opponentHealth: document.getElementById('opponent-health'),
      playerName: document.getElementById('player-name'),
      opponentName: document.getElementById('opponent-name'),
      roundNumber: document.getElementById('round-number'),
      shellInfo: document.getElementById('shell-info'),
      turnIndicator: document.getElementById('turn-indicator'),
      playerItems: document.getElementById('player-items'),
      opponentItems: document.getElementById('opponent-items'),
      revealedShell: document.getElementById('revealed-shell'),
      
      // Action buttons
      shootSelfButton: document.getElementById('shoot-self-btn'),
      shootOpponentButton: document.getElementById('shoot-opponent-btn'),
      actionButtons: document.getElementById('action-buttons'),

      // Result screen
      resultTitle: document.getElementById('result-title'),
      resultMessage: document.getElementById('result-message'),
      playAgainButton: document.getElementById('play-again-btn'),
      mainMenuButton: document.getElementById('main-menu-btn'),

      // Lobby
      roomCodeInput: document.getElementById('room-code-input'),
      createRoomButton: document.getElementById('create-room-btn'),
      joinRoomButton: document.getElementById('join-room-btn'),
      lobbyBackButton: document.getElementById('lobby-back-btn'),
      lobbyStatus: document.getElementById('lobby-status'),
      roomCodeDisplay: document.getElementById('room-code-display'),

      // Messages
      messageOverlay: document.getElementById('message-overlay'),
      messageText: document.getElementById('message-text'),

      // Canvas container
      canvasContainer: document.getElementById('canvas-container')
    };
  }

  setupEventListeners() {
    // Menu buttons
    this.elements.playAIButton?.addEventListener('click', () => {
      this.callbacks.onPlayAI?.();
    });

    this.elements.playPVPButton?.addEventListener('click', () => {
      this.showScreen('lobby');
      this.callbacks.onPlayPVP?.();
    });

    this.elements.difficultySelect?.addEventListener('change', (e) => {
      this.callbacks.onDifficultyChange?.(e.target.value);
    });

    // Game buttons
    this.elements.shootSelfButton?.addEventListener('click', () => {
      this.callbacks.onShootSelf?.();
    });

    this.elements.shootOpponentButton?.addEventListener('click', () => {
      this.callbacks.onShootOpponent?.();
    });

    // Result buttons
    this.elements.playAgainButton?.addEventListener('click', () => {
      this.callbacks.onPlayAgain?.();
    });

    this.elements.mainMenuButton?.addEventListener('click', () => {
      this.showScreen('menu');
      this.callbacks.onMainMenu?.();
    });

    // Lobby buttons
    this.elements.createRoomButton?.addEventListener('click', () => {
      this.callbacks.onCreateRoom?.();
    });

    this.elements.joinRoomButton?.addEventListener('click', () => {
      const code = this.elements.roomCodeInput?.value.trim().toUpperCase();
      if (code) {
        this.callbacks.onJoinRoom?.(code);
      }
    });

    this.elements.lobbyBackButton?.addEventListener('click', () => {
      this.showScreen('menu');
      this.callbacks.onLobbyBack?.();
    });

    // Room code input formatting
    this.elements.roomCodeInput?.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    });
  }

  showScreen(screenName) {
    // Hide all screens
    Object.keys(this.elements).forEach(key => {
      if (key.endsWith('Screen') && this.elements[key]) {
        this.elements[key].classList.remove('active');
      }
    });

    // Show the target screen
    const screenElement = this.elements[`${screenName}Screen`];
    if (screenElement) {
      screenElement.classList.add('active');
    }

    this.currentScreen = screenName;
  }

  updateGameState(state) {
    if (!state) return;

    // Update health displays
    if (state.players && state.players.length >= 2) {
      this.updateHealth('player', state.players[0].health);
      this.updateHealth('opponent', state.players[1].health);
      
      if (this.elements.playerName) {
        this.elements.playerName.textContent = state.players[0].name;
      }
      if (this.elements.opponentName) {
        this.elements.opponentName.textContent = state.players[1].name;
      }
    }

    // Update round number
    if (this.elements.roundNumber) {
      const endlessText = state.endlessMode ? ' 💀' : '';
      this.elements.roundNumber.textContent = `Round ${state.roundNumber}${endlessText}`;
    }

    // Update shell info
    if (state.remainingShells && this.elements.shellInfo) {
      const { live, blank, total } = state.remainingShells;
      this.elements.shellInfo.innerHTML = `
        <span class="live-shells">🔴 ${live}</span>
        <span class="blank-shells">🔵 ${blank}</span>
        <span class="total-shells">Total: ${total}</span>
      `;
    }

    // Update revealed shell
    if (this.elements.revealedShell) {
      if (state.revealedShell) {
        const isLive = state.revealedShell === 'live';
        this.elements.revealedShell.textContent = isLive ? '🔍 LIVE!' : '🔍 BLANK';
        this.elements.revealedShell.className = `revealed-shell ${state.revealedShell}`;
        this.elements.revealedShell.style.display = 'block';
      } else {
        this.elements.revealedShell.style.display = 'none';
      }
    }

    // Update items
    if (state.playerItems) {
      this.updateItemsDisplay('player', state.playerItems, state.currentPlayerIndex === 0);
    }
    if (state.opponentItems) {
      this.updateItemsDisplay('opponent', state.opponentItems, false);
    }

    // Update turn indicator
    this.updateTurnIndicator(state.currentPlayerIndex, state.state);

    // Enable/disable action buttons based on turn
    this.setActionButtonsEnabled(state.currentPlayerIndex === 0 && 
      (state.state === 'player_turn' || state.state === 'opponent_turn'));
  }

  updateItemsDisplay(target, items, canUse) {
    const element = target === 'player' 
      ? this.elements.playerItems 
      : this.elements.opponentItems;

    if (!element) return;

    element.innerHTML = '';
    
    items.forEach((itemType, index) => {
      const itemInfo = ITEM_INFO[itemType];
      if (!itemInfo) return;

      const btn = document.createElement('button');
      btn.className = target === 'player' ? 'item-btn' : 'item-btn opponent-item';
      btn.textContent = itemInfo.icon;
      btn.disabled = !canUse || target !== 'player';
      btn.style.borderColor = itemInfo.color;
      
      // Tooltip
      const tooltip = document.createElement('span');
      tooltip.className = 'item-tooltip';
      tooltip.innerHTML = `<strong>${itemInfo.name}</strong><br>${itemInfo.description}`;
      btn.appendChild(tooltip);

      if (target === 'player' && canUse) {
        btn.addEventListener('click', () => {
          this.callbacks.onUseItem?.(index);
        });
      }

      element.appendChild(btn);
    });
  }

  updateHealth(target, health) {
    const element = target === 'player' 
      ? this.elements.playerHealth 
      : this.elements.opponentHealth;

    if (element) {
      element.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const heart = document.createElement('span');
        heart.className = i < health ? 'heart full' : 'heart empty';
        heart.textContent = i < health ? '❤️' : '🖤';
        element.appendChild(heart);
      }
    }
  }

  updateTurnIndicator(playerIndex, state) {
    if (!this.elements.turnIndicator) return;

    if (state === 'game_over') {
      this.elements.turnIndicator.textContent = 'Game Over';
      this.elements.turnIndicator.className = 'turn-indicator game-over';
    } else if (playerIndex === 0) {
      this.elements.turnIndicator.textContent = 'Your Turn';
      this.elements.turnIndicator.className = 'turn-indicator your-turn';
    } else {
      this.elements.turnIndicator.textContent = "Opponent's Turn";
      this.elements.turnIndicator.className = 'turn-indicator opponent-turn';
    }
  }

  setActionButtonsEnabled(enabled) {
    if (this.elements.shootSelfButton) {
      this.elements.shootSelfButton.disabled = !enabled;
    }
    if (this.elements.shootOpponentButton) {
      this.elements.shootOpponentButton.disabled = !enabled;
    }
    
    if (this.elements.actionButtons) {
      this.elements.actionButtons.classList.toggle('disabled', !enabled);
    }
  }

  showMessage(text, duration = 2000) {
    if (this.elements.messageText) {
      this.elements.messageText.textContent = text;
    }
    if (this.elements.messageOverlay) {
      this.elements.messageOverlay.classList.add('active');
      
      setTimeout(() => {
        this.elements.messageOverlay.classList.remove('active');
      }, duration);
    }
  }

  showResult(isWinner, message) {
    if (this.elements.resultTitle) {
      this.elements.resultTitle.textContent = isWinner ? 'VICTORY!' : 'DEFEAT';
      this.elements.resultTitle.className = isWinner ? 'victory' : 'defeat';
    }
    if (this.elements.resultMessage) {
      this.elements.resultMessage.textContent = message;
    }
    this.showScreen('result');
  }

  updateLobbyStatus(status, roomCode = null) {
    if (this.elements.lobbyStatus) {
      this.elements.lobbyStatus.textContent = status;
    }
    if (this.elements.roomCodeDisplay && roomCode) {
      this.elements.roomCodeDisplay.textContent = `Room Code: ${roomCode}`;
      this.elements.roomCodeDisplay.style.display = 'block';
    }
  }

  setCallback(name, callback) {
    this.callbacks[name] = callback;
  }

  getCanvasContainer() {
    return this.elements.canvasContainer;
  }

  getDifficulty() {
    return this.elements.difficultySelect?.value || 'medium';
  }
}

export default UIManager;
