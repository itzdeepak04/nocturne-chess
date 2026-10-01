# Nocturne Chess — local source edition

The same game source as the published Nocturne Chess, including the computer-worker loading fix and fallback. This download uses a standalone React + TypeScript + Vite setup for easy local use. It does not require the original hosting platform.

## Setup (Windows, macOS or Linux)

1. Install Node.js 22.13 or newer with npm.
2. Extract this ZIP. Open the `nocturne-chess` folder in VS Code.
3. Open Terminal > New Terminal. Make sure you are in the folder containing `package.json`.
4. Verify your installation:

```sh
node --version
npm --version
```

5. Install packages (internet required):

```sh
npm ci
```

6. Start the development server:

```sh
npm run dev
```

7. Open http://localhost:5173. If that port is occupied, use the Local URL printed in your terminal.
8. Keep the terminal open while playing. Press Ctrl+C to stop.

No backend, database, API key, login, .env file or cloud account is required. Don't open index.html directly; use the development server.

## Play

- Computer mode starts with you as White on Medium difficulty.
- Change mode or New game lets you choose two players or computer, your side, and Easy/Medium/Hard.
- Click a piece, then its highlighted destination. Drag to rotate; scroll or pinch to zoom.
- The speaker button mutes move, capture and check sounds. Audio starts after interaction.
- Undo takes back your last turn and the computer reply in computer mode.
- Games are held in memory; refreshing or closing the page clears the game.
- The computer is a lightweight local chess engine, not Stockfish. Hard is for casual play.

## Production build

```sh
npm run build
npm run preview
```

Open http://localhost:4173. The `dist/` folder contains the compiled files for static hosting. Preview is for testing that build locally.

## Key files

- src/page.tsx: interface, game state, modes, sounds and computer-turn lifecycle.
- src/board.tsx: Three.js board, pieces, camera and controls.
- src/engine.mjs: computer search and evaluation.
- src/chess.worker.ts: background computer engine.
- src/globals.css: responsive layout and theme.
- components/ui/: dialogs, radio controls and buttons.
- vite.config.ts: local build configuration.

## Troubleshooting

- npm not recognized: install Node.js, then reopen VS Code.
- PowerShell blocks npm.ps1: use Command Prompt, or `npm.cmd ci` and `npm.cmd run dev`.
- package.json not found: change into the extracted nocturne-chess folder first.
- Board won't render: enable browser graphics acceleration and use a WebGL-capable browser. A keyboard/accessible board is also provided.
- Computer turn: wait briefly. A fallback handles worker loading failures and timeouts.

The downloadable edition is type-checked and production-built. Browser visuals and audio have not been manually verified in this environment.
