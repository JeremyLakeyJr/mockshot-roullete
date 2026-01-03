/**
 * Buckshot Roulette Game Logic
 * Handles game state, rules, and flow
 */

export const GAME_CONFIG = {
  INITIAL_HEALTH: 3,
  MIN_SHELLS: 2,
  MAX_SHELLS: 8,
  LIVE_RATIO_MIN: 0.3,
  LIVE_RATIO_MAX: 0.6
};

export const SHELL_TYPE = {
  LIVE: 'live',
  BLANK: 'blank'
};

export const GAME_STATE = {
  WAITING: 'waiting',
  LOADING: 'loading',
  PLAYER_TURN: 'player_turn',
  OPPONENT_TURN: 'opponent_turn',
  GAME_OVER: 'game_over'
};

export const SHOT_TARGET = {
  SELF: 'self',
  OPPONENT: 'opponent'
};

export class GameLogic {
  constructor(playerCount = 2, isMultiplayer = false) {
    this.playerCount = playerCount;
    this.isMultiplayer = isMultiplayer;
    this.reset();
  }

  reset() {
    this.players = [];
    for (let i = 0; i < this.playerCount; i++) {
      this.players.push({
        id: i,
        name: i === 0 ? 'Player' : (this.isMultiplayer ? 'Opponent' : 'AI'),
        health: GAME_CONFIG.INITIAL_HEALTH,
        isAI: !this.isMultiplayer && i === 1
      });
    }
    this.currentPlayerIndex = 0;
    this.chamber = [];
    this.currentChamberIndex = 0;
    this.roundNumber = 1;
    this.state = GAME_STATE.WAITING;
    this.lastShotResult = null;
    this.liveCount = 0;
    this.blankCount = 0;
  }

  /**
   * Generate shells for a new round (server-side for security)
   * @param {Function} randomFn - Secure random function
   */
  loadChamber(randomFn = Math.random) {
    const totalShells = Math.floor(
      randomFn() * (GAME_CONFIG.MAX_SHELLS - GAME_CONFIG.MIN_SHELLS + 1)
    ) + GAME_CONFIG.MIN_SHELLS;

    const liveRatio = GAME_CONFIG.LIVE_RATIO_MIN + 
      randomFn() * (GAME_CONFIG.LIVE_RATIO_MAX - GAME_CONFIG.LIVE_RATIO_MIN);
    
    this.liveCount = Math.max(1, Math.floor(totalShells * liveRatio));
    this.blankCount = totalShells - this.liveCount;

    // Create shells array
    this.chamber = [];
    for (let i = 0; i < this.liveCount; i++) {
      this.chamber.push(SHELL_TYPE.LIVE);
    }
    for (let i = 0; i < this.blankCount; i++) {
      this.chamber.push(SHELL_TYPE.BLANK);
    }

    // Fisher-Yates shuffle for secure randomization
    for (let i = this.chamber.length - 1; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      [this.chamber[i], this.chamber[j]] = [this.chamber[j], this.chamber[i]];
    }

    this.currentChamberIndex = 0;
    this.state = GAME_STATE.PLAYER_TURN;
    
    return {
      totalShells,
      liveCount: this.liveCount,
      blankCount: this.blankCount
    };
  }

  /**
   * Get current shell without revealing it (for client)
   */
  getRemainingShellCounts() {
    let live = 0;
    let blank = 0;
    for (let i = this.currentChamberIndex; i < this.chamber.length; i++) {
      if (this.chamber[i] === SHELL_TYPE.LIVE) live++;
      else blank++;
    }
    return { live, blank, total: live + blank };
  }

  /**
   * Execute a shot
   * @param {number} shooterIndex - Index of shooting player
   * @param {string} target - 'self' or 'opponent'
   * @returns {Object} Shot result
   */
  shoot(shooterIndex, target) {
    if (this.state !== GAME_STATE.PLAYER_TURN && 
        this.state !== GAME_STATE.OPPONENT_TURN) {
      return { error: 'Not in shooting phase' };
    }

    if (shooterIndex !== this.currentPlayerIndex) {
      return { error: 'Not your turn' };
    }

    if (this.currentChamberIndex >= this.chamber.length) {
      return { error: 'No shells remaining' };
    }

    const currentShell = this.chamber[this.currentChamberIndex];
    this.currentChamberIndex++;

    const targetIndex = target === SHOT_TARGET.SELF 
      ? shooterIndex 
      : (shooterIndex + 1) % this.playerCount;

    let damage = 0;
    let keepTurn = false;

    if (currentShell === SHELL_TYPE.LIVE) {
      damage = 1;
      this.players[targetIndex].health -= damage;
    } else if (target === SHOT_TARGET.SELF) {
      // Shooting self with blank = keep turn
      keepTurn = true;
    }

    this.lastShotResult = {
      shooter: shooterIndex,
      target: targetIndex,
      shellType: currentShell,
      damage,
      keepTurn,
      targetHealth: this.players[targetIndex].health
    };

    // Check for game over
    const deadPlayer = this.players.find(p => p.health <= 0);
    if (deadPlayer) {
      this.state = GAME_STATE.GAME_OVER;
      this.winner = this.players.find(p => p.health > 0);
      return { ...this.lastShotResult, gameOver: true, winner: this.winner };
    }

    // Check if chamber is empty
    if (this.currentChamberIndex >= this.chamber.length) {
      this.roundNumber++;
      return { 
        ...this.lastShotResult, 
        chamberEmpty: true,
        needsReload: true
      };
    }

    // Determine next turn
    if (!keepTurn) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;
    }
    
    this.state = this.currentPlayerIndex === 0 
      ? GAME_STATE.PLAYER_TURN 
      : GAME_STATE.OPPONENT_TURN;

    return this.lastShotResult;
  }

  /**
   * Get game state for client (without revealing chamber contents)
   */
  getClientState() {
    return {
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        health: p.health,
        isAI: p.isAI
      })),
      currentPlayerIndex: this.currentPlayerIndex,
      state: this.state,
      roundNumber: this.roundNumber,
      remainingShells: this.getRemainingShellCounts(),
      lastShotResult: this.lastShotResult,
      winner: this.winner || null
    };
  }

  /**
   * Serialize full game state (for server storage)
   */
  serialize() {
    return {
      players: this.players,
      currentPlayerIndex: this.currentPlayerIndex,
      chamber: this.chamber,
      currentChamberIndex: this.currentChamberIndex,
      roundNumber: this.roundNumber,
      state: this.state,
      lastShotResult: this.lastShotResult,
      liveCount: this.liveCount,
      blankCount: this.blankCount,
      isMultiplayer: this.isMultiplayer
    };
  }

  /**
   * Restore game from serialized state
   */
  static deserialize(data) {
    const game = new GameLogic(data.players.length, data.isMultiplayer);
    game.players = data.players;
    game.currentPlayerIndex = data.currentPlayerIndex;
    game.chamber = data.chamber;
    game.currentChamberIndex = data.currentChamberIndex;
    game.roundNumber = data.roundNumber;
    game.state = data.state;
    game.lastShotResult = data.lastShotResult;
    game.liveCount = data.liveCount;
    game.blankCount = data.blankCount;
    return game;
  }
}

export default GameLogic;
