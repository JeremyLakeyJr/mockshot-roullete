# Buckshot Roulette 3D

A sophisticated 3D rendered buckshot roulette game featuring both Player vs AI (PvE) and Player vs Player (PvP) modes.

![Buckshot Roulette](https://img.shields.io/badge/Game-Buckshot%20Roulette-red)
![Three.js](https://img.shields.io/badge/3D-Three.js-blue)
![Socket.io](https://img.shields.io/badge/Multiplayer-Socket.io-green)

## 🎮 Game Overview

Buckshot Roulette is a tense game of chance and strategy. Two players take turns with a shotgun loaded with a mix of live and blank rounds. Choose wisely - shoot yourself to potentially keep your turn, or shoot your opponent to deal damage!

## 🎯 Game Rules

1. **Setup**: The chamber is loaded with a random mix of live (🔴) and blank (🔵) rounds
2. **Turns**: Players alternate turns choosing to shoot themselves or their opponent
3. **Live Rounds**: Deal 1 damage to the target
4. **Blank Rounds**: No damage dealt
5. **Self-Shot Blank**: If you shoot yourself with a blank, you get another turn!
6. **Victory**: Last player standing wins
7. **Reloading**: When all shells are fired, the chamber is reloaded with new random shells

## ✨ Features

### 3D Rendering (Three.js)
- High-quality WebGL rendering
- Detailed 3D shotgun model with animations
- Dynamic lighting and atmospheric effects
- Particle effects for shots and explosions
- Smooth camera animations

### Game Modes
- **Player vs AI**: Battle against an adaptive AI opponent with three difficulty levels
  - Easy: Random decisions with slight opponent preference
  - Medium: Probability-based strategy
  - Hard: Advanced risk assessment and optimal play
- **Player vs Player**: Real-time multiplayer via room codes

### User Interface
- Clean, intuitive UI design
- Responsive layout for all screen sizes
- Real-time health and shell count displays
- Turn indicators and action feedback

### Multiplayer Architecture (Socket.io)
- Real-time WebSocket communication
- Room-based matchmaking with unique codes
- Server-side game state validation
- Automatic reconnection handling

### Security & Fairness
- Server-side random number generation using `crypto.randomBytes()`
- All game logic validated server-side for multiplayer
- No client-side access to chamber contents
- Fisher-Yates shuffle for unbiased randomization

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mockshot-roullete.git
cd mockshot-roullete

# Install dependencies
npm install
```

### Development

```bash
# Start the Vite development server (client only)
npm run dev

# Start the game server (for multiplayer)
npm run server
```

### Production

```bash
# Build and start
npm run start
```

## 🏗️ Project Structure

```
mockshot-roullete/
├── src/
│   ├── client/                 # Frontend code
│   │   ├── js/
│   │   │   ├── game/          # Game logic
│   │   │   │   ├── GameLogic.js
│   │   │   │   └── AIOpponent.js
│   │   │   ├── rendering/     # Three.js components
│   │   │   │   ├── SceneManager.js
│   │   │   │   ├── ShotgunModel.js
│   │   │   │   ├── ShellModel.js
│   │   │   │   └── EffectsManager.js
│   │   │   ├── ui/            # UI components
│   │   │   │   └── UIManager.js
│   │   │   ├── network/       # Multiplayer client
│   │   │   │   └── NetworkClient.js
│   │   │   └── main.js        # Game controller
│   │   ├── css/
│   │   │   └── styles.css
│   │   └── index.html
│   └── server/                # Backend code
│       └── index.js           # Socket.io server
├── package.json
├── vite.config.js
└── README.md
```

## 🎮 Controls

- **Shoot Yourself**: Take the risk - blank rounds give you another turn
- **Shoot Opponent**: Play it safe and deal damage if it's live

## 🌐 Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

WebGL 2.0 support required for optimal 3D rendering.

## 📡 Multiplayer

1. Click "Play vs Player"
2. **Create Room**: Host a game and share your 6-character room code
3. **Join Room**: Enter a friend's room code to join their game
4. Game starts automatically when both players are connected

## 🔧 Configuration

Environment variables:
- `PORT`: Server port (default: 3000)

## 📝 License

ISC License

## 🙏 Acknowledgments

- Inspired by the original Buckshot Roulette game
- Built with [Three.js](https://threejs.org/) for 3D rendering
- [Socket.io](https://socket.io/) for real-time multiplayer
- [Vite](https://vitejs.dev/) for fast development