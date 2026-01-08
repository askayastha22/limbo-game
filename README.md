# Limbo Game

A dark, atmospheric 2D platformer inspired by Limbo, built with React and TypeScript. Features silhouette-style graphics, physics-based gameplay, and puzzle mechanics.

## Features

- Silhouette art style with high-contrast visuals
- Physics-based movement and interactions
- Pushable objects and puzzle elements
- Multiple levels with hazards and obstacles
- Atmospheric fog effects
- Smooth animations for player states (idle, walking, jumping, pushing)

## Controls

| Action | Keys |
|--------|------|
| Move Left | `Arrow Left` or `A` |
| Move Right | `Arrow Right` or `D` |
| Jump | `Arrow Up`, `W`, or `Space` |
| Interact/Push | `E` or `Shift` |

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd limbo-game

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Canvas API** - Game rendering

## Project Structure

```
src/
├── components/
│   ├── game/        # Core game components and renderers
│   └── ui/          # UI components
├── game/            # Game logic and constants
├── hooks/           # Custom React hooks (input, game loop, audio)
├── levels/          # Level definitions
├── types/           # TypeScript type definitions
└── utils/           # Utility functions (collision detection)
```
