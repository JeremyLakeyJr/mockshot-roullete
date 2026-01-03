/**
 * Main Game Controller for Buckshot Roulette
 * Coordinates game logic, rendering, UI, and network
 */

import { GameLogic, GAME_STATE, SHOT_TARGET } from './game/GameLogic.js';
import { AIOpponent, AI_DIFFICULTY } from './game/AIOpponent.js';
import { SceneManager } from './rendering/SceneManager.js';
import { ShotgunModel } from './rendering/ShotgunModel.js';
import { ShellDisplay } from './rendering/ShellModel.js';
import { EffectsManager } from './rendering/EffectsManager.js';
import { UIManager } from './ui/UIManager.js';
import { NetworkClient } from './network/NetworkClient.js';

export class GameController {
  constructor() {
    this.game = null;
    this.ai = null;
    this.sceneManager = null;
    this.shotgun = null;
    this.shellDisplay = null;
    this.effects = null;
    this.ui = null;
    this.network = null;
    this.isMultiplayer = false;
    this.myPlayerIndex = 0;
    this.isProcessingAction = false;
  }

  async init() {
    // Initialize UI
    this.ui = new UIManager();
    this.ui.init();
    this.setupUICallbacks();

    // Initialize 3D scene
    const container = this.ui.getCanvasContainer();
    if (container) {
      this.sceneManager = new SceneManager(container);
      this.setupScene();
      this.sceneManager.startRenderLoop(() => this.update());
    }

    // Initialize network client
    this.network = new NetworkClient();
    try {
      await this.network.connect();
      this.setupNetworkCallbacks();
    } catch (error) {
      console.warn('Multiplayer connection failed:', error.message || error);
      console.log('Running in offline mode - multiplayer not available');
    }

    // Show menu
    this.ui.showScreen('menu');
  }

  setupScene() {
    // Create shotgun
    this.shotgun = new ShotgunModel();
    this.sceneManager.addObject('shotgun', this.shotgun.getGroup());

    // Create shell display
    this.shellDisplay = new ShellDisplay(this.sceneManager.scene);

    // Create effects manager
    this.effects = new EffectsManager(this.sceneManager.scene);
  }

  setupUICallbacks() {
    this.ui.setCallback('onPlayAI', () => this.startAIGame());
    this.ui.setCallback('onPlayPVP', () => this.showLobby());
    this.ui.setCallback('onDifficultyChange', (diff) => this.setAIDifficulty(diff));
    this.ui.setCallback('onShootSelf', () => this.handleShoot(SHOT_TARGET.SELF));
    this.ui.setCallback('onShootOpponent', () => this.handleShoot(SHOT_TARGET.OPPONENT));
    this.ui.setCallback('onPlayAgain', () => this.playAgain());
    this.ui.setCallback('onMainMenu', () => this.returnToMenu());
    this.ui.setCallback('onCreateRoom', () => this.createRoom());
    this.ui.setCallback('onJoinRoom', (code) => this.joinRoom(code));
    this.ui.setCallback('onLobbyBack', () => this.leaveLobby());
  }

  setupNetworkCallbacks() {
    this.network.setCallback('onRoomCreated', (data) => {
      this.ui.updateLobbyStatus('Waiting for opponent...', data.roomCode);
    });

    this.network.setCallback('onRoomJoined', (data) => {
      this.myPlayerIndex = data.playerIndex;
      this.ui.updateLobbyStatus('Joined room! Waiting for host to start...');
    });

    this.network.setCallback('onOpponentJoined', () => {
      this.ui.updateLobbyStatus('Opponent joined! Starting game...');
      setTimeout(() => {
        this.network.startGame();
      }, 1000);
    });

    this.network.setCallback('onOpponentLeft', () => {
      this.ui.showMessage('Opponent disconnected');
      this.returnToMenu();
    });

    this.network.setCallback('onRoomError', (data) => {
      this.ui.showMessage(data.message);
    });

    this.network.setCallback('onGameStart', (data) => {
      this.startMultiplayerGame(data);
    });

    this.network.setCallback('onGameState', (data) => {
      this.updateGameState(data.state);
    });

    this.network.setCallback('onRoundStart', (data) => {
      this.handleRoundStart(data);
    });

    this.network.setCallback('onShotResult', (data) => {
      this.handleShotResult(data.result);
    });

    this.network.setCallback('onGameOver', (data) => {
      this.handleGameOver(data);
    });

    this.network.setCallback('onTurnChange', (data) => {
      this.updateGameState(data.state);
    });

    this.network.setCallback('onDisconnect', () => {
      this.ui.showMessage('Disconnected from server');
      this.returnToMenu();
    });
  }

  // Game Start Methods
  startAIGame() {
    this.isMultiplayer = false;
    this.myPlayerIndex = 0;
    
    // Create game logic
    this.game = new GameLogic(2, false);
    
    // Create AI opponent
    const difficulty = this.ui.getDifficulty();
    this.ai = new AIOpponent(difficulty);

    // Start the game
    this.ui.showScreen('game');
    this.startNewRound();
  }

  startMultiplayerGame(data) {
    this.isMultiplayer = true;
    this.myPlayerIndex = data.playerIndex;
    this.game = null; // Game state managed by server
    
    this.ui.showScreen('game');
    
    if (data.state) {
      this.updateGameState(data.state);
    }
  }

  startNewRound() {
    if (this.isMultiplayer) {
      // Request server to start new round
      this.network.requestReload();
      return;
    }

    // Local game - load chamber
    const loadResult = this.game.loadChamber();
    
    // Show loading animation
    this.ui.showMessage(`Loading ${loadResult.totalShells} shells...`, 1500);
    
    // Display shells
    this.shellDisplay.displayShells(loadResult.liveCount, loadResult.blankCount);
    
    // Animate loading
    setTimeout(async () => {
      await this.shotgun.animateLoad();
      await this.shellDisplay.animateLoad();
      
      this.updateGameState(this.game.getClientState());
    }, 500);
  }

  handleRoundStart(data) {
    this.ui.showMessage(`Loading ${data.totalShells} shells...`, 1500);
    
    this.shellDisplay.displayShells(data.liveCount, data.blankCount);
    
    setTimeout(async () => {
      await this.shotgun.animateLoad();
      await this.shellDisplay.animateLoad();
    }, 500);
  }

  // Game Actions
  async handleShoot(target) {
    if (this.isProcessingAction) return;
    this.isProcessingAction = true;

    this.ui.setActionButtonsEnabled(false);

    if (this.isMultiplayer) {
      // Send to server
      this.network.shoot(target);
      this.isProcessingAction = false;
      return;
    }

    // Local game processing
    const shooterIndex = this.game.currentPlayerIndex;
    
    // Animate aim and shoot
    await this.shotgun.animateAim(target);
    await this.delay(300);
    
    const result = this.game.shoot(shooterIndex, target);
    await this.handleShotResult(result);

    this.isProcessingAction = false;
  }

  async handleShotResult(result) {
    if (result.error) {
      this.ui.showMessage(result.error);
      return;
    }

    // Animate the shot
    await this.shotgun.animateShoot();
    
    // Get barrel position for effects
    const barrelPos = this.shotgun.getGroup().position.clone();
    barrelPos.z -= 0.5;

    if (result.shellType === 'live') {
      // Live round effects
      this.effects.createMuzzleFlash(barrelPos);
      this.effects.createSmoke(barrelPos);
      
      if (result.target === this.myPlayerIndex) {
        this.effects.createDamageFlash('player');
      }
      
      this.shotgun.setIndicatorColor('live');
      this.ui.showMessage('💥 LIVE ROUND!', 1500);
    } else {
      // Blank round effects
      this.effects.createBlankEffect(barrelPos);
      this.shotgun.setIndicatorColor('blank');
      
      if (result.keepTurn) {
        this.ui.showMessage('🔵 Blank! Your turn again', 1500);
      } else {
        this.ui.showMessage('🔵 Blank!', 1000);
      }
    }

    // Reset shotgun position
    await this.delay(500);
    await this.shotgun.resetPosition();
    this.shotgun.setIndicatorColor('neutral');

    // Check for game over
    if (result.gameOver) {
      await this.delay(500);
      const isWinner = result.winner.id === this.myPlayerIndex;
      this.handleGameOver({ isWinner, winner: result.winner });
      return;
    }

    // Check for reload needed
    if (result.needsReload) {
      await this.delay(500);
      this.ui.showMessage('Chamber empty! Reloading...', 1500);
      await this.delay(1000);
      this.startNewRound();
      return;
    }

    // Update game state
    if (!this.isMultiplayer) {
      const state = this.game.getClientState();
      this.updateGameState(state);
      
      // If it's AI's turn, let AI play
      if (state.currentPlayerIndex === 1) {
        await this.processAITurn();
      } else {
        // Player's turn - ensure buttons are enabled
        this.ui.setActionButtonsEnabled(true);
      }
    }
  }

  async processAITurn() {
    if (!this.ai || this.isMultiplayer) return;

    this.isProcessingAction = true;
    this.ui.setActionButtonsEnabled(false);
    
    this.ui.showMessage("AI is thinking...", 1000);
    
    const state = this.game.getClientState();
    const decision = await this.ai.makeDecision(state);
    
    // Animate AI's action
    await this.shotgun.animateAim(decision);
    await this.delay(500);
    
    const result = this.game.shoot(1, decision);
    await this.handleShotResultForAI(result);
  }

  async handleShotResultForAI(result) {
    if (result.error) {
      this.ui.showMessage(result.error);
      this.isProcessingAction = false;
      return;
    }

    // Animate the shot
    await this.shotgun.animateShoot();
    
    // Get barrel position for effects
    const barrelPos = this.shotgun.getGroup().position.clone();
    barrelPos.z -= 0.5;

    if (result.shellType === 'live') {
      this.effects.createMuzzleFlash(barrelPos);
      this.effects.createSmoke(barrelPos);
      
      if (result.target === this.myPlayerIndex) {
        this.effects.createDamageFlash('player');
      }
      
      this.shotgun.setIndicatorColor('live');
      this.ui.showMessage('💥 AI fired LIVE!', 1500);
    } else {
      this.effects.createBlankEffect(barrelPos);
      this.shotgun.setIndicatorColor('blank');
      this.ui.showMessage('🔵 AI fired blank!', 1000);
    }

    await this.delay(500);
    await this.shotgun.resetPosition();
    this.shotgun.setIndicatorColor('neutral');

    // Check for game over
    if (result.gameOver) {
      this.isProcessingAction = false;
      await this.delay(500);
      const isWinner = result.winner.id === this.myPlayerIndex;
      this.handleGameOver({ isWinner, winner: result.winner });
      return;
    }

    // Check for reload needed
    if (result.needsReload) {
      await this.delay(500);
      this.ui.showMessage('Chamber empty! Reloading...', 1500);
      await this.delay(1000);
      this.isProcessingAction = false;
      this.startNewRound();
      return;
    }

    // Update game state and check who's turn
    const state = this.game.getClientState();
    this.ui.updateGameState(state);
    
    // If AI keeps turn (blank shot self), continue AI turn
    if (state.currentPlayerIndex === 1) {
      await this.delay(500);
      await this.processAITurn();
    } else {
      // Player's turn - enable buttons
      this.isProcessingAction = false;
      this.ui.setActionButtonsEnabled(true);
    }
  }

  handleGameOver(data) {
    const isWinner = data.isWinner !== undefined 
      ? data.isWinner 
      : data.winner?.id === this.myPlayerIndex;

    if (isWinner) {
      this.effects.createVictoryEffect();
      this.ui.showResult(true, 'You survived the game!');
    } else {
      this.effects.createDefeatEffect();
      this.ui.showResult(false, 'Better luck next time...');
    }
  }

  updateGameState(state) {
    this.ui.updateGameState(state);
    
    // Enable controls if it's player's turn
    const isMyTurn = state.currentPlayerIndex === this.myPlayerIndex;
    const isPlayPhase = state.state === GAME_STATE.PLAYER_TURN || 
                        state.state === GAME_STATE.OPPONENT_TURN;
    
    this.ui.setActionButtonsEnabled(isMyTurn && isPlayPhase && !this.isProcessingAction);
  }

  // Lobby Methods
  showLobby() {
    this.ui.showScreen('lobby');
  }

  createRoom() {
    if (this.network.isConnected()) {
      this.network.createRoom();
    } else {
      this.ui.showMessage('Not connected to server');
    }
  }

  joinRoom(code) {
    if (this.network.isConnected()) {
      this.network.joinRoom(code);
    } else {
      this.ui.showMessage('Not connected to server');
    }
  }

  leaveLobby() {
    this.network.leaveRoom();
    this.ui.showScreen('menu');
  }

  // Utility Methods
  setAIDifficulty(difficulty) {
    if (this.ai) {
      this.ai.setDifficulty(difficulty);
    }
  }

  playAgain() {
    if (this.isMultiplayer) {
      // Request new game from server
      if (this.network.isRoomHost()) {
        this.network.startGame();
      }
    } else {
      this.game.reset();
      this.ui.showScreen('game');
      this.startNewRound();
    }
  }

  returnToMenu() {
    if (this.isMultiplayer) {
      this.network.leaveRoom();
    }
    this.game = null;
    this.ai = null;
    this.isMultiplayer = false;
    this.ui.showScreen('menu');
  }

  update() {
    // Called each frame - add any per-frame updates here
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  dispose() {
    this.sceneManager?.dispose();
    this.shotgun?.dispose();
    this.shellDisplay?.dispose();
    this.effects?.dispose();
    this.network?.disconnect();
  }
}

export default GameController;
