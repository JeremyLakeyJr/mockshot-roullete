/**
 * Items System for Buckshot Roulette
 * Defines all usable items and their effects
 */

export const ITEM_TYPE = {
  BURNER_PHONE: 'burner_phone',
  ADRENALINE: 'adrenaline',
  HANDCUFFS: 'handcuffs',
  BEER: 'beer',
  MAGNIFYING_GLASS: 'magnifying_glass',
  INVERTER: 'inverter',
  EXPIRED_MEDICINE: 'expired_medicine',
  DOUBLE_OR_NOTHING: 'double_or_nothing'
};

export const ITEM_INFO = {
  [ITEM_TYPE.BURNER_PHONE]: {
    name: 'Burner Phone',
    icon: '📱',
    description: 'Reveals shell count info',
    color: '#4a90d9'
  },
  [ITEM_TYPE.ADRENALINE]: {
    name: 'Adrenaline',
    icon: '💉',
    description: 'Steal & use opponent\'s item',
    color: '#e74c3c'
  },
  [ITEM_TYPE.HANDCUFFS]: {
    name: 'Handcuffs',
    icon: '🔗',
    description: 'Skip opponent\'s next turn',
    color: '#95a5a6'
  },
  [ITEM_TYPE.BEER]: {
    name: 'Beer',
    icon: '🍺',
    description: 'Rack the shotgun (eject shell)',
    color: '#f39c12'
  },
  [ITEM_TYPE.MAGNIFYING_GLASS]: {
    name: 'Magnifying Glass',
    icon: '🔍',
    description: 'Reveals current shell type',
    color: '#9b59b6'
  },
  [ITEM_TYPE.INVERTER]: {
    name: 'Inverter',
    icon: '🔄',
    description: 'Flips shell polarity',
    color: '#1abc9c'
  },
  [ITEM_TYPE.EXPIRED_MEDICINE]: {
    name: 'Expired Medicine',
    icon: '💊',
    description: '50% heal or 50% damage',
    color: '#e91e63'
  },
  [ITEM_TYPE.DOUBLE_OR_NOTHING]: {
    name: 'Double or Nothing',
    icon: '💀',
    description: 'Enter endless mode',
    color: '#ff5722'
  }
};

export const MAX_ITEMS_PER_PLAYER = 8;
export const ITEMS_PER_ROUND = 4;

/**
 * Get random items for a round
 * @param {number} count - Number of items to generate
 * @param {Function} randomFn - Random function
 * @returns {string[]} Array of item types
 */
export function generateRandomItems(count = ITEMS_PER_ROUND, randomFn = Math.random) {
  const itemTypes = Object.values(ITEM_TYPE);
  const items = [];
  
  for (let i = 0; i < count; i++) {
    const index = Math.floor(randomFn() * itemTypes.length);
    items.push(itemTypes[index]);
  }
  
  return items;
}

/**
 * Items Manager - handles item logic for a player
 */
export class ItemsManager {
  constructor() {
    this.playerItems = [[], []]; // Items for each player
    this.handcuffedPlayer = -1; // -1 = no one, 0 = player, 1 = opponent
    this.endlessMode = false;
    this.revealedShell = null;
  }

  reset() {
    this.playerItems = [[], []];
    this.handcuffedPlayer = -1;
    this.endlessMode = false;
    this.revealedShell = null;
  }

  /**
   * Give items to players at start of round
   * @param {string[]} items - Items to distribute
   */
  distributeItems(items, playerIndex) {
    const currentItems = this.playerItems[playerIndex];
    const availableSlots = MAX_ITEMS_PER_PLAYER - currentItems.length;
    const itemsToAdd = items.slice(0, availableSlots);
    this.playerItems[playerIndex].push(...itemsToAdd);
  }

  /**
   * Get items for a player
   * @param {number} playerIndex 
   */
  getPlayerItems(playerIndex) {
    return this.playerItems[playerIndex] || [];
  }

  /**
   * Remove an item from player's inventory
   * @param {number} playerIndex 
   * @param {number} itemIndex 
   */
  removeItem(playerIndex, itemIndex) {
    if (this.playerItems[playerIndex] && this.playerItems[playerIndex][itemIndex]) {
      this.playerItems[playerIndex].splice(itemIndex, 1);
      return true;
    }
    return false;
  }

  /**
   * Use an item
   * @param {number} playerIndex - Player using the item
   * @param {number} itemIndex - Index of item in inventory
   * @param {Object} gameState - Current game state
   * @param {Function} randomFn - Random function
   * @returns {Object} Result of using the item
   */
  useItem(playerIndex, itemIndex, gameState, randomFn = Math.random) {
    const items = this.playerItems[playerIndex];
    if (!items || itemIndex < 0 || itemIndex >= items.length) {
      return { error: 'Invalid item' };
    }

    const itemType = items[itemIndex];
    const result = this.applyItemEffect(itemType, playerIndex, gameState, randomFn);
    
    if (!result.error) {
      this.removeItem(playerIndex, itemIndex);
    }
    
    return result;
  }

  /**
   * Apply the effect of an item
   */
  applyItemEffect(itemType, playerIndex, gameState, randomFn) {
    const opponentIndex = (playerIndex + 1) % 2;
    
    switch (itemType) {
      case ITEM_TYPE.BURNER_PHONE:
        // Reveals detailed shell info
        const shellCounts = gameState.getRemainingShellCounts();
        return {
          success: true,
          itemType,
          message: `📱 Shell Info: ${shellCounts.live} live, ${shellCounts.blank} blank`,
          shellInfo: shellCounts
        };

      case ITEM_TYPE.ADRENALINE:
        // Steal opponent's item
        const opponentItems = this.playerItems[opponentIndex];
        if (opponentItems.length === 0) {
          return { error: 'Opponent has no items to steal' };
        }
        // Steal random item, but prevent stealing another adrenaline to avoid infinite recursion
        let validItems = opponentItems.filter(item => item !== ITEM_TYPE.ADRENALINE);
        if (validItems.length === 0) {
          // If only adrenaline items, just steal one without using it
          const stolenIdx = Math.floor(randomFn() * opponentItems.length);
          this.playerItems[opponentIndex].splice(stolenIdx, 1);
          return {
            success: true,
            itemType,
            message: `💉 Stole opponent's Adrenaline (discarded to prevent loop)`,
            stolenItem: ITEM_TYPE.ADRENALINE,
            stolenResult: null
          };
        }
        // Steal a non-adrenaline item
        const stolenItemType = validItems[Math.floor(randomFn() * validItems.length)];
        const stolenIndex = opponentItems.indexOf(stolenItemType);
        this.playerItems[opponentIndex].splice(stolenIndex, 1);
        // Immediately use the stolen item
        const stolenResult = this.applyItemEffect(stolenItemType, playerIndex, gameState, randomFn);
        return {
          success: true,
          itemType,
          message: `💉 Stole and used ${ITEM_INFO[stolenItemType].name}!${stolenResult.error ? ' (failed)' : ''}`,
          stolenItem: stolenItemType,
          stolenResult
        };

      case ITEM_TYPE.HANDCUFFS:
        // Skip opponent's next turn
        this.handcuffedPlayer = opponentIndex;
        return {
          success: true,
          itemType,
          message: '🔗 Opponent is handcuffed! They skip their next turn.',
          handcuffedPlayer: opponentIndex
        };

      case ITEM_TYPE.BEER:
        // Rack the shotgun - eject current shell
        if (gameState.currentChamberIndex >= gameState.chamber.length) {
          return { error: 'No shells to eject' };
        }
        const ejectedShell = gameState.chamber[gameState.currentChamberIndex];
        gameState.currentChamberIndex++;
        return {
          success: true,
          itemType,
          message: `🍺 Racked! Ejected a ${ejectedShell === 'live' ? '🔴 LIVE' : '🔵 BLANK'} round`,
          ejectedShell,
          chamberEmpty: gameState.currentChamberIndex >= gameState.chamber.length
        };

      case ITEM_TYPE.MAGNIFYING_GLASS:
        // Reveal current shell
        if (gameState.currentChamberIndex >= gameState.chamber.length) {
          return { error: 'No shell to inspect' };
        }
        const currentShell = gameState.chamber[gameState.currentChamberIndex];
        this.revealedShell = currentShell;
        return {
          success: true,
          itemType,
          message: `🔍 Current shell is ${currentShell === 'live' ? '🔴 LIVE' : '🔵 BLANK'}`,
          revealedShell: currentShell
        };

      case ITEM_TYPE.INVERTER:
        // Flip current shell polarity
        if (gameState.currentChamberIndex >= gameState.chamber.length) {
          return { error: 'No shell to invert' };
        }
        const currentType = gameState.chamber[gameState.currentChamberIndex];
        gameState.chamber[gameState.currentChamberIndex] = 
          currentType === 'live' ? 'blank' : 'live';
        return {
          success: true,
          itemType,
          message: '🔄 Shell polarity inverted!',
          inverted: true
        };

      case ITEM_TYPE.EXPIRED_MEDICINE:
        // 50% heal, 50% damage
        const heals = randomFn() < 0.5;
        const healthChange = heals ? 1 : -1;
        gameState.players[playerIndex].health += healthChange;
        
        // Cap health at max
        if (gameState.players[playerIndex].health > 3) {
          gameState.players[playerIndex].health = 3;
        }
        
        return {
          success: true,
          itemType,
          message: heals 
            ? '💊 Medicine worked! +1 HP' 
            : '💊 Medicine backfired! -1 HP',
          healthChange,
          heals,
          playerHealth: gameState.players[playerIndex].health,
          playerDied: gameState.players[playerIndex].health <= 0
        };

      case ITEM_TYPE.DOUBLE_OR_NOTHING:
        // Enter endless mode
        this.endlessMode = true;
        return {
          success: true,
          itemType,
          message: '💀 ENDLESS MODE ACTIVATED! Game continues until someone dies!',
          endlessMode: true
        };

      default:
        return { error: 'Unknown item type' };
    }
  }

  /**
   * Check if a player is handcuffed
   */
  isHandcuffed(playerIndex) {
    return this.handcuffedPlayer === playerIndex;
  }

  /**
   * Clear handcuffs after turn is skipped
   */
  clearHandcuffs() {
    this.handcuffedPlayer = -1;
  }

  /**
   * Clear revealed shell info
   */
  clearRevealedShell() {
    this.revealedShell = null;
  }

  /**
   * Get serializable state
   */
  getState() {
    return {
      playerItems: this.playerItems,
      handcuffedPlayer: this.handcuffedPlayer,
      endlessMode: this.endlessMode,
      revealedShell: this.revealedShell
    };
  }

  /**
   * Restore from state
   */
  loadState(state) {
    this.playerItems = state.playerItems || [[], []];
    this.handcuffedPlayer = state.handcuffedPlayer ?? -1;
    this.endlessMode = state.endlessMode || false;
    this.revealedShell = state.revealedShell || null;
  }
}

export default ItemsManager;
