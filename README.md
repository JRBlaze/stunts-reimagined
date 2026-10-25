# Stunts Reimagined

A playable, offline Windows 11 recreation inspired by Distinctive Software's Stunts / 4D Sports Driving. Version 0.1.1.

## Play on Windows

After building the Windows package, open `release/Stunts-Reimagined-0.1.1-Windows.exe`. It is a portable, unsigned x64 build. It includes its runtime; Node.js, a DOS emulator, and an internet connection are not required. Generated executables are not stored in this source repository.

Use **Drive**, select a car and track, then **Start your engine**. The first circuit has a loop on the opening straight, a tunnel, a ramp jump and a horizontal corkscrew. Brake before the corners. Try Performance graphics in Settings on slower systems.

Version 0.1.1 sharpens steering and tire response so tight paved corners are practical at normal driving speeds. Reverse accelerates faster and reaches about 65 km/h. Hitting a tree stops the car without ending the run: hold S / Down / LT to back away, then steer around it. Both placed trees and generated forest trees are solid; their visible trunks and collision positions share the same data.

## Included

- A new WebGL 2 renderer, physically based car materials, dynamic shadows, procedural vehicles, forest, mountain scenery, and four cameras.
- Eleven car identities from the original roster, with distinct acceleration, top speed, and grip profiles; automatic and six-speed manual gearboxes.
- Keyboard and standard-mapped gamepads, analog triggers and steering, configurable deadzone and steering sensitivity, gamepad menu navigation, fullscreen and audio settings.
- Time trials, six selectable pace rivals, local personal bests and saved best-run ghost cars.
- Asphalt, dirt and ice handling, off-road slowdown and penalties, jumps, loops, corkscrews, elevated roads, tunnels, pipes, banked corners and slalom scenery.
- A 30 × 30 track editor with road/scenery/terrain brushes, piece rotation, undo/redo, local saves, and DOS `.TRK` import/export.
- Position-based instant replay, timeline scrubbing, playback speed, four cameras, portable `.replay` export/import and continuing driving from a selected moment. Continued drives are practice runs and cannot set records.
- Three newly designed circuits and all 41 `.TRK` files from the supplied original game folder. The original folder is not modified.

## Controls

| Action | Keyboard | Standard controller |
| --- | --- | --- |
| Accelerate | W / Up | RT |
| Brake, then reverse | S / Down | LT |
| Steer | A D / Left Right | Left stick |
| Handbrake | Space | A |
| Shift up / down | E / Q | RB / LB |
| Cycle camera | C | X |
| Restart run | R | Y |
| Pause / resume | Esc | Start |
| Navigate menus | Tab / arrows | D-pad |
| Activate focused button | Enter | A |
| Back to paddock | Esc in menus | B |
| Fullscreen | F11 | Settings menu |

Press any controller button to make it visible to the game. The track editor uses a mouse. Right-click erases; R rotates the selected piece. Triggers use the standard browser/Xbox mapping. Other mappings may need the controller's Windows configuration software.

## Fidelity and current limitations

This is a new implementation with stylized modern graphics and new arcade handling, not the original DOS physics engine. Car models are newly constructed interpretations rather than exact vehicle replicas. There is no original audio or dashboard artwork.

Original tile codes are decoded, but complex split pieces, wide curves, scenery, pipe surfaces, terrain coastlines and hill corners are simplified. Bank transitions and stunt attachments use new handling. A file importing successfully does not prove its course drives exactly as in DOS. Original shortcut exploits, powergear behavior and competition replay compatibility are not reproduced.

Rivals follow the connected route at six pace levels; they do not use a full opponent physics/decision system or collide with the player. Slalom objects are scenery. Trees stop the car while the session continues; water, buildings, stunt departures and hard landings cause crashes. There is no multiplayer.

Original `.RPL` recordings are incompatible with the new physics. This build records and plays its own `.replay` files. `.TRK` export preserves the road/terrain layout and horizon; optional DOS metadata overlays and reserved bytes are not preserved. Save files are local to the Windows account. Export files for backups or transfers.

## Build and test

Requires Node.js 22.12+ and npm for development only.

```powershell
git clone https://github.com/JRBlaze/stunts-reimagined.git
cd stunts-reimagined
npm ci
npm test
npm run coverage
npm run test:ui
npm run test:desktop
npm run package
```

If npm's installation policy skips Electron's download, run `node node_modules/electron/install.js` once. `npm run dev` opens a local development server; `npm start` launches the desktop app after `npm run build`.

The coverage command enforces 100% statements, branches, functions and lines for all application source (`src/`), the desktop entry point, and the Vite build configuration. HTML coverage output is in `coverage/index.html`. Tests exercise real domain and geometry code, with a mocked graphics device and DOM for unit isolation. Browser tests separately exercise the rendered, production-built game. Native smoke tests launch Electron with the production assets and check offline tracks, WebGL, driving, pause and replay.

`tests/browser.mjs` uses installed Google Chrome with software graphics for reproducible rendering. It saves screenshots, a track export and a replay in `artifacts/`. Controller automation uses a simulated standard gamepad; that does not establish compatibility with a particular physical controller.

To check the packaged application:

```powershell
$env:STUNTS_EXE = (Resolve-Path 'release/win-unpacked/Stunts Reimagined.exe').Path
node tests/desktop-smoke.mjs
```

## Sources and credits

- Original concept: Distinctive Software's **Stunts** (1990), published by Brøderbund / Mindscape.
- [Original manual](https://www.retrogames.cz/manualy/DOS/4D_Sports_Driving_-_DOS_-_Manual.pdf): car selection, driving, editor and replay feature reference.
- [Stunts Wiki track format](https://wiki.stunts.hu/wiki/Track_file): original road/terrain codes and binary layout.
- [Stunts Wiki replay format](https://wiki.stunts.hu/wiki/Replay_File_Format): why original input recordings depend on the original engine.
- [Three.js](https://threejs.org/), [Electron](https://www.electronjs.org/), [Vite](https://vite.dev/) and their dependencies. Dependency license notices accompany the Windows runtime.
- [Gamepad API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API): controller input interface.

This is an unofficial personal recreation. The supplied original tracks and original game names retain their respective authorship. No code from the original executable is executed by this game.
