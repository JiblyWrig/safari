# 🦁 Safari Lion Simulator — 3D Multiplayer

Roam the African savannah as a lion in this browser-based 3D multiplayer simulator.
Built with **Next.js 16**, **Three.js / React Three Fiber**, and **Socket.IO**.

![Safari Lion](public/safari-menu-bg.png)

## ✨ Features

- **Fully 3D savannah** — rolling grassy hills, a watering hole, a rocky ridge, acacia trees, termite mounds, bushes, rocks, and a wandering zebra herd, all procedurally textured (zero external image assets).
- **Animated lion** built from primitives with idle / walk / trot / sprint / jump gaits and a **roar** emote.
- **Smooth third-person controls** — WASD movement relative to camera, mouse look (pointer lock), sprint with stamina, jump, and graceful acceleration/turning.
- **Real-time multiplayer** — see other players' lions roam the same world, with floating name tags and a chat panel.
- **Full menu system** — main menu, multiplayer lobby (room-based), settings (sensitivity, camera, graphics, shadows), and a how-to-play guide.
- **HUD** — stamina bar, speed, animation state, live minimap, FPS counter, and player count.
- **Solo fallback** — if no multiplayer server is reachable, the game still plays perfectly in single-player.

## 🎮 Controls

| Key | Action |
|-----|--------|
| `W A S D` | Move (relative to camera) |
| Mouse | Orbit / look around |
| `Shift` | Sprint (drains stamina) |
| `Space` | Jump / pounce |
| `R` | Roar! |
| `Esc` | Release the mouse cursor |

Click the game to capture the mouse for camera control.

## 🛠️ Local Development

The app is a standard Next.js project plus a tiny Socket.IO mini-service for multiplayer.

```bash
# 1. Install deps
bun install

# 2. Start the multiplayer service (port 3003)
cd mini-services/multiplayer
bun install
bun run dev          # socket.io server on http://localhost:3003
cd ../..

# 3. Start the Next.js app (port 3000)
bun run dev
```

Open <http://localhost:3000>. In this sandbox the gateway routes multiplayer
traffic automatically; on a plain `localhost` setup the client talks to the
same origin, so either proxy `/` → `:3003` or use the env var below.

## 🚀 Deploying from GitHub

The frontend and the multiplayer server are deployed separately.

### Frontend → Vercel (or any Next.js host)

1. Push this repo to GitHub.
2. Import it into **Vercel**.
3. (Optional) Set env var **`NEXT_PUBLIC_MULTIPLAYER_URL`** to your deployed
   Socket.IO server origin, e.g. `https://your-lion-mp.onrender.com`.
   - If unset, the client assumes it is behind the sandbox gateway and multiplayer
     will be unavailable (solo mode still works).

### Multiplayer server → Render / Railway / Fly.io / a VPS

The server lives in `mini-services/multiplayer/` (`index.ts`).

1. Create a new service pointing at the `mini-services/multiplayer` folder.
2. Build/start command: `bun install && bun index.ts` (or `node` after a build).
3. Expose the port the server listens on (hardcoded `3003` in `index.ts` —
   change `const PORT` or read `process.env.PORT` if your host assigns ports).
4. Set the resulting URL as `NEXT_PUBLIC_MULTIPLAYER_URL` on the frontend.

> The server uses `path: '/'` and permissive CORS, so it works from any frontend origin.

## 🧱 Tech Stack

- Next.js 16 (App Router) + TypeScript
- Three.js + @react-three/fiber + @react-three/drei
- Socket.IO (server + client)
- Zustand (state), Tailwind CSS 4 + shadcn/ui (UI)

## 📁 Structure

```
src/
  app/page.tsx              # Menu ⇄ Game switch
  components/
    game/                   # 3D scene: Lion, Terrain, Environment, Player, RemoteLions, GameScene
    menu/                   # Main / Multiplayer / Settings / How-to menus
    hud/                    # HUD, ChatPanel, ClickToPlay overlay
  lib/
    store.ts                # Zustand game store
    multiplayer.ts          # Socket.IO client + remote-player buffer
    input.ts                # Keyboard + mouse (pointer lock) manager
    textures.ts             # Procedural canvas textures
    terrain.ts              # Heightmap + decoration placement
    stats.ts                # Per-frame stats for the HUD
mini-services/multiplayer/  # Socket.IO server (rooms, state sync, chat)
```

## 🌱 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_MULTIPLAYER_URL` | _(unset)_ | Origin of the deployed Socket.IO server. When unset, the client uses the sandbox gateway (`XTransformPort=3003`). |

---

Made with 🦁, ☀️ and a lot of vertex colors.
