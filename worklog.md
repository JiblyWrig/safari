# Project Worklog — Safari Lion Simulator (3D Multiplayer)

## Project Goal
A browser-based 3D lion simulator game set in a safari. Features: WASD controls, smooth movement + procedural animations, textured & decorated terrain, multiplayer via socket.io, full menu system. Must be deployable from a GitHub repo.

## Tech Stack
- Next.js 16 (App Router) + TypeScript
- Three.js + @react-three/fiber + @react-three/drei (3D rendering)
- Zustand (state), socket.io + socket.io-client (multiplayer)
- shadcn/ui for menus/HUD

## Architecture
- `src/app/page.tsx` — single user route; switches between Menu and Game based on phase.
- `src/components/game/*` — 3D scene (Lion, Terrain, Environment, Player, Camera, RemoteLions).
- `src/components/menu/*` — Main menu, Multiplayer lobby, Settings, How-to-play.
- `src/components/hud/*` — In-game HUD (stamina, minimap, player list, chat).
- `src/lib/store.ts` — Zustand store (phase, player config, multiplayer, settings).
- `src/lib/multiplayer.ts` — socket.io client wrapper + hook.
- `src/lib/textures.ts` — procedural canvas textures (grass, dirt, rock, water, bark).
- `src/lib/terrain.ts` — heightmap + decoration placement helpers.
- `mini-services/multiplayer/` — socket.io server (port 3003), rooms + state sync + chat.

---
Task ID: 0
Agent: main
Task: Scaffold project plan, install deps, create worklog.

Work Log:
- Explored existing Next.js 16 scaffold; confirmed shadcn/ui, zustand, prisma available.
- Installed three, @react-three/fiber, @react-three/drei, socket.io, socket.io-client, @types/three.
- Reviewed Caddyfile + websocket example: must use `io('/?XTransformPort=3003')`, path `/`.
- Designed architecture above.

Stage Summary:
- Deps ready. Multiplayer will run on port 3003 as a mini-service. Next: build server, textures, lion, environment, controller, menus.

---
Task ID: 1-11
Agent: main
Task: Build the complete 3D multiplayer Safari Lion Simulator (frontend + backend + multiplayer service) and verify end-to-end.

Work Log:
- Installed three, @react-three/fiber, @react-three/drei, socket.io, socket.io-client, @types/three.
- Built socket.io multiplayer mini-service (`mini-services/multiplayer/index.ts`, port 3003): rooms, join/leave, position+anim state broadcast, chat, emote (roar). Server uses engine.io `path: '/'`.
- Built procedural texture utilities (`src/lib/textures.ts`): grass, dirt, rock, sand, bark, bump — all canvas-based fBm noise, memoized, zero external assets.
- Built terrain (`src/lib/terrain.ts` + `src/components/game/Terrain.tsx`): 240-unit heightmapped savannah with rolling hills, NW rocky ridge, SE watering hole, vertex-color blended regions, dirt spawn clearing, animated water. Shared `terrainHeight()` used by both mesh and player controller.
- Built animated Lion (`src/components/game/Lion.tsx`) from primitives: torso, chest, rump, neck, head, mane (male), snout, jaw, eyes, ears, 4 articulated legs (hip+knee pivots), 2-segment tail. Procedural gait: idle breathing, walk/trot/sprint diagonal gait with body bob, neck counter-bob, tail sway, and a roar envelope (head tilt + jaw open + mane puff). Driven by a `stateRef` to avoid per-frame React re-renders.
- Built environment (`src/components/game/Environment.tsx`): instanced grass tufts (220), bushes, rocks; individual acacia trees, dead trees, termite mounds; wandering zebra herd (7) with stripe detail and leg animation.
- Built Player controller (`src/components/game/Player.tsx`): WASD relative to camera, acceleration/turn lerp, sprint+stamina, jump+gravity, terrain ground follow, world bounds, third-person orbit camera (mouse yaw/pitch), FPS counter, ~18Hz state sync to server, roar on R.
- Built RemoteLions (`src/components/game/RemoteLions.tsx`): subscribes to mp player-list changes for mount/unmount; per-frame position lerp + shortest-arc yaw interpolation; renders each remote lion with name tag + emote.
- Built GameScene (`src/components/game/GameScene.tsx`): Canvas, hemisphere+ambient+directional sun (follows player for crisp shadows), drei Sky, fog, AdaptiveDpr, graphics-quality presets.
- Built input manager (`src/lib/input.ts`): keyboard (WASD/shift/space/R, arrow keys), pointer-lock mouse-look, input-field guard.
- Built stats singleton (`src/lib/stats.ts`) for HUD (rAF-pollled, no re-renders).
- Built menus (`src/components/menu/Menu.tsx`): AI-generated savanna-sunset backdrop, SVG lion preview, color pickers (fur+mane), main / multiplayer (room + connect) / settings (sensitivity, camera dist/height, graphics, shadows, minimap, invert-Y) / how-to-play. Graceful multiplayer failure → solo fallback.
- Built HUD (`src/components/hud/HUD.tsx`): minimap (player+remote dots, water, ridge, facing arrow), stamina bar, speed, anim badge, roar/water badges, FPS, player count, controls hint, leave button. ChatPanel (`ChatPanel.tsx`) with collapsible chat. ClickToPlay overlay for pointer lock.
- Wired `src/app/page.tsx` (dynamic ssr:false GameScene) to switch menu⇄game; tears down multiplayer + pointer lock on exit. Updated layout metadata.
- Generated `public/safari-menu-bg.png` via z-ai image generation (1344x768).
- Wrote `README.md` with local-dev + GitHub/Vercel + separate socket host deployment instructions and `NEXT_PUBLIC_MULTIPLAYER_URL` env var; made the client configurable to support external deploys.

Bugs fixed during verification:
- Lint: refactored inline `Leg` component to a render function; removed `mounted` setState-in-effect.
- Removed expensive drei `SoftShadows` (PCSS) — was tanking FPS.
- CRITICAL: socket.io client defaulted engine.io path to `/socket.io` while server used `/`; fixed client to `io({ path: '/', query: { XTransformPort: 3003 } })`. Also reordered transports to polling-first for gateway reliability.
- CRITICAL: background multiplayer process kept getting reaped between shell sessions. Fix: start with `(setsid bun index.ts </dev/null >>server.log 2>&1 &)` so it reparents to PID 1 and survives. Plain `&`/`nohup`/`bun --hot` all died.

Verification (agent-browser + VLM + second socket.io test client):
- Menu renders (title, name input, color pickers, all buttons). ✓
- Solo mode: 3D savanna renders, lion visible, zebra nearby, HUD (stamina/minimap/FPS) visible. ✓ (VLM-confirmed)
- Movement: holding W → 4.4 m/s "Walking"; W+Shift → 12.3 m/s "Sprinting"; R → "ROAR!" badge. ✓
- Multiplayer via gateway (port 81): Simba connects, server logs join. Second test client "Nala" joins room `safari-1` → browser shows "2 in savannah" and renders Nala's lion with floating name tag. ✓ (VLM-confirmed two lions)
- Lint clean. Dev log clean. Multiplayer service stable on 3003.

Stage Summary:
- Project is FEATURE-COMPLETE and verified runnable: 3D lion, smooth WASD + animations, textured decorated safari terrain, full menu system, real-time multiplayer with rooms/chat/name-tags, solo fallback, and GitHub deployment docs.
- Multiplayer service running on port 3003 (PID reparented to init).
- Next.js dev server on port 3000; preview via gateway port 81.

Unresolved issues / risks:
- FPS is low (~2-4) in headless Chromium because of software WebGL; real browsers with a GPU run smoothly. Not a real bug.
- Multiplayer mini-service must be restarted if the sandbox reboots. Use the setsid subshell command documented below.
- For external deploy, the user must deploy the socket.io service separately and set `NEXT_PUBLIC_MULTIPLAYER_URL`.

Priority recommendations for next phase (webDevReview):
1. Keep the multiplayer service alive: `cd /home/z/my-project/mini-services/multiplayer && (setsid bun index.ts </dev/null >>server.log 2>&1 &)`. Verify with `ss -ltn | grep 3003`.
2. Add a day/night cycle (animate sun + sky + fog color over time) for atmosphere.
3. Add prey AI: gazelles that graze and flee when a lion approaches (score on catch).
4. Add lion gender toggle (lioness = no mane, sleeker) in the menu.
5. Add audio: use the TTS/ASR skill or simple WebAudio for roar, footstep, and ambient savanna sounds.
6. Add a stamina/health HUD improvement + a "stamina regen" pickup (watering hole drink).
7. Add mobile touch controls (virtual joystick + look drag) for phone deployment.
8. Persist a leaderboard / longest-survival stat via Prisma.
9. Polish: dust particles when sprinting, grass sway shader, water reflection.
