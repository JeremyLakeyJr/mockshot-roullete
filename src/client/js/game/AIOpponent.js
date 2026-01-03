/**
 * AI Opponent for Buckshot Roulette
 * Implements adaptive strategies with multiple difficulty levels
 */

import { SHOT_TARGET } from './GameLogic.js';

export const AI_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

export class AIOpponent {
  constructor(difficulty = AI_DIFFICULTY.MEDIUM) {
    this.difficulty = difficulty;
    this.decisionDelay = this.getDecisionDelay();
  }

  getDecisionDelay() {
    switch (this.difficulty) {
      case AI_DIFFICULTY.EASY:
        return { min: 2000, max: 4000 };
      case AI_DIFFICULTY.MEDIUM:
        return { min: 1500, max: 3000 };
      case AI_DIFFICULTY.HARD:
        return { min: 1000, max: 2000 };
      default:
        return { min: 1500, max: 3000 };
    }
  }

  /**
   * Make a decision based on game state
   * @param {Object} gameState - Current game state
   * @returns {Promise<string>} - Decision ('self' or 'opponent')
   */
  async makeDecision(gameState) {
    const delay = this.decisionDelay.min + 
      Math.random() * (this.decisionDelay.max - this.decisionDelay.min);
    
    await new Promise(resolve => setTimeout(resolve, delay));

    const { live, blank, total } = gameState.remainingShells;
    const liveProb = live / total;
    const blankProb = blank / total;

    const myHealth = gameState.players[1].health;
    const opponentHealth = gameState.players[0].health;

    switch (this.difficulty) {
      case AI_DIFFICULTY.EASY:
        return this.easyStrategy(liveProb, blankProb);
      case AI_DIFFICULTY.MEDIUM:
        return this.mediumStrategy(liveProb, blankProb, myHealth, opponentHealth);
      case AI_DIFFICULTY.HARD:
        return this.hardStrategy(liveProb, blankProb, myHealth, opponentHealth, gameState);
      default:
        return this.mediumStrategy(liveProb, blankProb, myHealth, opponentHealth);
    }
  }

  /**
   * Easy AI: Random decisions with slight preference for shooting opponent
   */
  easyStrategy(liveProb, blankProb) {
    // 60% chance to shoot opponent, 40% to shoot self
    return Math.random() < 0.6 ? SHOT_TARGET.OPPONENT : SHOT_TARGET.SELF;
  }

  /**
   * Medium AI: Basic probability-based decisions
   */
  mediumStrategy(liveProb, blankProb, myHealth, opponentHealth) {
    // If more likely to be blank, shoot self to keep turn
    if (blankProb > 0.5) {
      return SHOT_TARGET.SELF;
    }
    
    // If more likely to be live, shoot opponent
    if (liveProb > 0.5) {
      return SHOT_TARGET.OPPONENT;
    }

    // 50/50 case - shoot opponent if they're low on health
    if (opponentHealth === 1) {
      return SHOT_TARGET.OPPONENT;
    }

    // Default to shooting opponent
    return Math.random() < 0.55 ? SHOT_TARGET.OPPONENT : SHOT_TARGET.SELF;
  }

  /**
   * Hard AI: Advanced probability and risk assessment
   */
  hardStrategy(liveProb, blankProb, myHealth, opponentHealth, gameState) {
    const { live, blank } = gameState.remainingShells;

    // Certain cases
    if (live === 0) {
      // All blanks - shoot self to keep turn
      return SHOT_TARGET.SELF;
    }
    
    if (blank === 0) {
      // All live - shoot opponent
      return SHOT_TARGET.OPPONENT;
    }

    // Calculate expected value for each action
    // Shooting self: blank = keep turn (+), live = lose health (-)
    // Shooting opponent: live = damage (+), blank = lose turn (-)

    const selfExpectedValue = (blankProb * 1.0) + (liveProb * -2.0);
    const opponentExpectedValue = (liveProb * 1.5) + (blankProb * -0.5);

    // Adjust based on health situation
    let selfAdjustment = 0;
    let opponentAdjustment = 0;

    if (myHealth === 1) {
      // Can't afford to take damage
      selfAdjustment -= 2.0;
    }

    if (opponentHealth === 1 && liveProb > 0.3) {
      // Can finish off opponent
      opponentAdjustment += 1.5;
    }

    // When ahead, play conservatively
    if (myHealth > opponentHealth + 1) {
      opponentAdjustment += 0.5;
    }

    // When behind, take risks
    if (opponentHealth > myHealth + 1 && blankProb > 0.4) {
      selfAdjustment += 0.5;
    }

    const adjustedSelf = selfExpectedValue + selfAdjustment;
    const adjustedOpponent = opponentExpectedValue + opponentAdjustment;

    // Add small random factor to prevent being too predictable
    const randomFactor = (Math.random() - 0.5) * 0.3;

    return (adjustedSelf + randomFactor) > adjustedOpponent 
      ? SHOT_TARGET.SELF 
      : SHOT_TARGET.OPPONENT;
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.decisionDelay = this.getDecisionDelay();
  }
}

export default AIOpponent;
