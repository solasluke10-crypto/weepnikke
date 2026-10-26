# Echoes After Midnight 3D

First-person 3D version. Enemy: weeping statues that only move when you are not looking at them. A statue freezes whenever it is on your screen (and not behind a wall) — the flashlight only helps you see.

## Launch in VS Code
1. File > Open Folder... > choose this `echoes-after-midnight-3d` folder.
2. Install the "Live Server" extension (VS Code will suggest it).
3. Click **Go Live** in the bottom-right status bar. The game opens at http://127.0.0.1:5500
No extension? Double-click `index.html`.

Needs an internet connection the first time (Three.js loads from a CDN).

## Controls
Mouse: look | WASD: move | Shift: sprint | O (hold): look back | Space (hold): hold your breath | Left/Right arrows: turn | E: interact / hide | F: flashlight | G: blink | J: notes & memories | I: inventory | N: map | B: use spare battery | P: pause | M: mute

**Blink (G):** your eyelids close for about a third of a second. Statues are not "seen" while your eyes are shut, so they move, and they lunge forward quickly while the lids are down.

**Sprint (hold Shift):** you run at 215 instead of 130 while you hold W/A/S/D. It drains the `⚡ Stamina` bar. At 0 you are out of breath and walk until it recovers to 30%. Footsteps get louder and the view widens a little. Tune `RUN`, `WALK`, `STA_DRAIN` and `STA_REGEN` in `game.js`.

**Look back (hold O):** your head snaps 180 degrees round to look behind you while your body keeps going the way it was facing, so you can run and watch what is following. Let go to turn back. A statue behind you is "seen" (and frozen) only while you are actually looking at it. Not available while hiding. Tune `BACK_SPEED`.

**Eye meter (20 s):** the HUD shows `👁 Eyes`. It counts down from 20 seconds. Blinking with G refills it. If it hits 0 your eyes give out and you blink automatically (a longer half-second blink), so you can't stare at a statue forever. The lids start drooping and a warning shows in the last 5 seconds. Tune `BLINK`, `BLINK_CD`, `BLINK_EVERY`, `BLINK_FORCED` and `BLINK_LUNGE` in `game.js`.

**Waking up:** a new game starts with Aki lying in the infirmary bed, staring at the ceiling. After a few seconds she sits up and gets out of bed, then you take control. Controls are locked until then. Tune `LIE`, `BED_IN` and `BED_OUT` in `game.js`. (Continue loads your saved spot and skips this.)

**Map (N) and minimap:** a small floor plan of the room you are in sits in the top-right corner (white arrow = you, which way you face). Press N for the whole school: rooms you have not visited yet show as `???`. Teal doors are open, red doors are locked, green is the exit, gold is the library safe, blue squares are hiding lockers. Statues and items are never shown. Set `MAP_MINI=false` in `game.js` to hide the corner minimap.

**Inventory (I):** your flashlight, spare batteries, keys, plus every note and memory fragment you have found (click a slot to read it). Batteries are now carried instead of used on pickup: press **B** (or use the button in the inventory) to add 40% to the flashlight. The count shows in the HUD and is saved.

**Room size:** `ROOM_SCALE` (now .9, was 1.35) in `game.js` scales every room. Things fixed to a wall stay on their wall, everything else spreads out. Set it to 1 for the original size. Don't go much below .8 or furniture starts to crowd the doors.

**Angel radar (T):** a round scanner in the bottom-right corner. The top is the way you are facing. Each weeping angel in the room is a blip: red and pulsing while it can move (you are not watching it), pale and still while it is frozen. Angels beyond range pin to the rim, and the number below is the distance to the nearest one in metres. Tune `RADAR_RANGE` in `game.js`. T turns it off.

**Flashlight strobe:** when you first lay eyes on an angel, and again when one creeps within about 9 m, the torch stutters on and off for over a second with faint electric clicks. Tune `STROBE_LEN`, `STROBE_NEAR` and `STROBE_COOLDOWN` in `game.js`.

**Angels wake at 3 fragments:** the school is empty at the start, so you can explore the infirmary, hall and classroom in peace. The moment you pick up your 3rd memory fragment the lights die, the torch strobes, and the weeping angels appear in every room that has one (radar, blackouts, ambushes and apparitions all start then). Change `ANGEL_FRAGS` in `game.js` (0 = angels from the start).

**Horror score + scarier UI:** all music is synthesised in code (no audio files). The menu has a warped music-box lullaby over a dissonant drone, with choir-like swells and whispers; the game score follows the danger: screeching strings and a heartbeat build as an angel closes in, the lullaby goes flat and wrong, and whispers start once the angels are awake. It begins on your first click or key press, and M mutes it (`MUSIC_VOL`, `LULLABY` and `gameTension()` in `game.js`). The main menu now has a weeping-angel silhouette with a glowing slit between its fingers, drifting fog, blackouts, glitching dripping title and flickering whispers. Menu animations switch off if your system asks for reduced motion.

**Secret song:** type `umamusume` anywhere (menu, in game, paused) to start your song from `assets/music/umamusume.mp3`; type it again to stop. It loops, the game's own music and ambience fade down while it plays, and M mutes it. Replace the mp3 (same filename) to use a different track.

## Mobile / touch
The game detects phones and tablets (or the first finger touch) and switches on on-screen controls from `touch.js`. Landscape works best; in portrait the field of view is widened automatically.
- **Left thumb:** floating joystick. Push it to the rim to sprint (the ring turns red).
- **Right thumb:** drag anywhere to look.
- **Buttons (bottom right):** USE (interact / hide / leave a locker, its label changes with what is in reach), BLINK, LIGHT (torch), BEHIND (hold to look back).
- **Top-left row:** pause, notes, inventory, map, radar, spare battery, sound.
- **Fullscreen** button on the main menu (Android / iPad). On iPhone use Share > Add to Home Screen to play without the browser bars.
- The game pauses by itself if you switch apps or lock the phone.
- Phones get a lighter graphics preset (lower pixel ratio, smaller shadow map, fewer dust motes). Change `MOBILE?x:y` values in the `GFX` block of `game.js` to tune it.
- Secrets without a keyboard: tap the title 5 times for the song, tap the tagline 5 times for the picture.
- Tune in `touch.js`: `LOOK_SENS` (look speed), `JOY_R`, `SPRINT_AT`.

## Rooms
Seven rooms in a row: **Boiler room - Supply closet - Infirmary - Main hall - Classroom - Library - Chapel.**
- **Supply closet** (west of the infirmary, open from the start): a clue note, a battery and a hiding locker.
- **Boiler room** (west end): one angel, a hiding locker at each end, a memory fragment and a battery.
- **Chapel** (east of the library, through the new door at the south end of the library's east wall): two angels among the pews, hiding lockers, a memory fragment, a note and a battery.
Memory fragments are now 7 in total (the true ending needs all of them). Angels still wake at 3 fragments, and their speed stops growing after 5 fragments. To add another room, copy one of the `ROOMS` entries, give it doors that point at each other (`to`, `tx`, `ty`), add items to `ITEMS`, and add the room to `MAPN` / `MAPO`.

## Story
11:58 PM. Aki wakes on a cold infirmary bed with no memory, only her name. The clock is frozen at midnight, the door is locked, and somewhere past it stone scrapes on stone. She must find her way through the school (Infirmary > Main Hall > Classroom > Library > back to the Hall exit) before dawn. Collect every memory fragment for the true ending.

## Puzzle chain
1. **Infirmary keypad (3 digits):** read the nurse's log and the cabinet label. Count every bed, including the one you woke in.
2. **Classroom desks:** touch the desks in the order a memory fragment in the hall hints at. Opens the library door.
3. **Library safe (4 digits):** combine the plaque in the hall with the librarian's sticky note. Gives the exit key.
4. **Exit** in the main hall. Statues: 1 in the main hall, 1 in the classroom, 1 in the boiler room and 2 in the chapel. The infirmary, supply closet and library have none. Edit the `statues:[[x,y],...]` list of each room in `game.js` to change this.

Press **J** any time to re-read the notes and memories you have found. The HUD shows your current objective.

## Statues and scares
Statues are hooded, cracked, bleeding stone angels. While you watch they stay frozen, but every time you look away they come closer and their frozen pose gets angrier: hands over the face and a shut mouth when far away, then clawing arms, spread wings, glowing red eyes and a fanged open mouth when close. Statues stop at arm's length instead of walking through you.
- **Ambush:** a few seconds after you pick up a memory fragment in a room with statues, one snaps into view right in front of you.
- **Blackout:** every 45-80 s the lights cut out for about 1.4 s (they flicker first). You can't hold the statues with your eyes, so they close in. They won't trigger it if one is already very close.
- **Behind you:** a loud sting plays if a statue gets right behind you without being seen.
- **Touch:** contact shakes the screen and flashes. If your health runs out, the statue lunges into your face before Game Over.
- **Lights back on:** when a blackout ends, a statue is usually standing a few metres in front of you, and every scare now punches the camera's field of view.
- **Door scare:** about 7 times in 10, a second after you walk into a room with a statue it is already in front of you.
- **Apparition:** every 35-80 s a statue flashes into view at the edge of the dark for a third of a second, then vanishes. It is not one of the real statues.
- **Death scare:** longer, closer, with a second scream and flashes of inverted colour.
- **Angels:** taller (about 2.3 m), glowing red eyes once they have moved, stone dragging that gets louder as they close in, light that stutters near them, and they gain speed with every memory fragment you collect (`SPD` in `statuesUpdate()`).
Scare tuning lives in `ambush()`, `blackout()`, `startScare()` / `scareFrame()` and the `stinger()` sound in `game.js`. Press **M** to mute the sound.

## Realism settings
All the realism effects are controlled by the `GFX` object at the top of `game.js`, so they are easy to tune or switch off:
- `shadows`, `shadowSize`: the torch casts real, soft shadows (statues, lockers, desks, pillars).
- `exposure`: overall brightness (now .7, so the game is much darker). Raise it (for example 1) if it is too dark on your screen. Ambient, moon and lamp light, fog (`FogExp2`) and the screen-edge vignette were also darkened.
- `env`: faint reflected moonlight on the glossy floor, lockers and metal.
- `beam`, `dust`: visible haze in the torch beam and dust motes that glow only inside it.
- `grain`: film grain (it also gets stronger when a statue is close or your health is low).
- `bob`, `flashSway`: head bob, footsteps, a little inertia when you start and stop, and a torch that lags slightly behind your view.
- `reverb`: echo on every sound, plus a low building drone, wind and distant creaks. M still mutes everything.
- `pixelRatio`: set to 1 for more speed on weak machines.
Surfaces now use procedural bump, roughness and wood-grain maps (cracked tiles, damp and mouldy plaster, scuffed floor, weathered stone statues), a colour-correct pipeline with ACES tone mapping, and pale moonlight patches under the windows. Everything is still generated in code, so no image files are needed.

**Lighting upgrade:** the torch now has a wide soft spill around its bright centre, a cold sky / warm floor bounce light fills the rooms, shadows use a 2048 map on desktop (1024 on phones) and exposure is a little higher (.78).

**Textures:** every surface texture is drawn at double resolution on desktop (`TEXK`, 1 on phones) and gets a seamless layer of fractal grime, mottling and fine grain (`grime()` / `fbm()` in `game.js`), including the bump and gloss maps, so walls, floors, wood and stone look weathered up close. Change `TEXK` or the `amt` / `gr` values in `grime()` to tune it. Startup takes a second or two longer because the textures are generated in code.

## Files
- `game.js`: all game logic and the 3D scene. Rooms, walls, doors (a door can be locked with `need`), furniture/decor (`props`), statues and items live in the ROOMS / ITEMS tables; keypad codes are in the CODES table at the top (the comment above them explains the format). Flashlight look: the `FLASH` object. How far you can "hold" a statue with your eyes: `SIGHT`.
- `index.html`, `style.css`: menus and HUD
- `touch.js`: on-screen touch controls (loaded after `game.js`)
- `assets/`: unused for now (3D shapes and textures are built in code)

**More angels, every room:** once the angels wake, every room holds several (hall 3, classroom 3, infirmary 2, library 4, supply closet 2, boiler room 3, chapel 4). Authored spots in `ROOMS` are used first, the rest are random open floor spots that are never inside furniture, never near a door and never within about 11 m of where you stand. They are re-rolled each time you enter a room. Tune `ANGELS_PER_ROOM`, `ANGEL_MIN_DIST` and `ANGEL_GAP` in `game.js`. On a slow phone, lower the counts.

**Lunges:** an angel you are not looking at now winds up (it freezes for 0.4 s, its eyes flare and stone grinds), then dashes at you for about 0.75 s. It tries again every 3.5-7.5 s, sooner with every memory fragment, and only angels within about 18 m lunge, never two at the same moment. Look at one and it freezes, even mid-lunge. Tune `LUNGE_EVERY`, `LUNGE_WIND`, `LUNGE_TIME`, `LUNGE_SPD`, `LUNGE_RANGE` and `LUNGE_GAP` in `game.js`.

**Dorothy-inspired angels:** each angel has a 50% chance to be a stone homage to Dorothy from NIKKE: long pink hair with a braid and a single bun, purple ribbon and glowing purple eyes, a frilled white dress with a sash, and white mechanical wings. It is still a cracked, weeping, fanged horror. Set `DOROTHY_CHANCE` in `game.js` (0 = never, 1 = always).

**The Hollow (second entity):** once the angels wake (`HOLLOW_FRAGS`, default same as `ANGEL_FRAGS`), a blind, eyeless creature with huge ears roams every room (it patrols between spots, stops to listen, and finds its way round furniture). It hunts by sound. If you are within about 9.5 m (`HOLLOW_HEAR_R`) it hears you breathe, so **hold your breath: hold Space (BREATH button on a phone)**. A warning shows when it is close, and the radar shows it as an amber diamond once it is within earshot. Rules:
- Heard for about 1.1 s (`HOLLOW_DETECT`) and it finds you. Going quiet makes the meter drain away. If it hears you it walks to where you were, then stands and listens, so move away quietly (you creep at 70% speed while holding your breath and cannot sprint).
- Your lungs last about 7 s (`BREATH_DRAIN`). At 0 you gasp, which carries further (`HOLLOW_GASP_R`), and you can't hold again until you have recovered 30% and let go of the key.
- Sprinting is heard from further away (`HOLLOW_RUN_R`) and holding your breath does not hide your footsteps. Walls muffle you, and a locker muffles you a lot.
- If it touches you, you are found at once.
- Walk out of a room while it is hunting you and it follows through the door a few seconds later.
- **Being found (nerfed):** it no longer ends the game. It blinds you: the screen goes black for `HOLLOW_BLIND` seconds (2) while you can still walk, you can't watch the angels while you can't see (they get no free speed-up), the hollow shuffles off to a far corner and ignores you for `HOLLOW_BLIND_CD` seconds (8). Set `HOLLOW_KILLS=true` for the old eye-clawing game over (`HOLLOW_SCARE`).
Set `HOLLOW_ON=false` in `game.js` to remove it.

**Alice replaces the angels (1%, or 100% after the acheron code):** each angel has an `ALICE_CHANCE` (.01) of being the 3D **Alice** model from NIKKE instead of a stone angel (the rest are the usual angels, still with the `DOROTHY_CHANCE` roll). Once you enter the **acheron code** (type `acheron`, or on a phone walk forward twice then backward three times) the chance becomes `ALICE_CHANCE_UNLOCKED` (1 = every angel is Alice), the angels already in the room turn into her, and it is remembered in this browser (localStorage key `eam_alice`; run `localStorage.removeItem('eam_alice')` in the browser console to forget it). She is the real textured model, not stone: she keeps the same freeze / creep / lunge rules, tips towards you as she gets angrier, her eyes glow red once she has moved, and she is the face in the death jumpscare. Tune in `game.js`: `ALICE_CHANCE` and `ALICE_CHANCE_UNLOCKED`. Tune her look in `ALICE_CFG` at the top of `assets/models/alice.js`: `HEIGHT`, `FACING`, `LEAN`, `TINT` (try `0xb8b8c4` for a grey, ghostly look) and `EYE_GLOW`. Her shadow is switched off on phones to keep the torch cheap (`castShadow` in `makeAliceStatue`). While her textures load (about a second) the usual angels spawn instead.
- `assets/models/alice-data.js` is generated: geometry and textures embedded as base64, so the game still works when you double-click `index.html`. Do not edit it by hand.
- To rebuild it from the original files: `python3 tools/build_alice.py Alice.obj textures/ assets/models/alice-data.js` (needs `pip install pillow numpy`; change `TEX_SIZE` / `TEX_QUALITY` in the script for smaller or sharper textures).

**Hold breath:** hold **Space** or **H** on a keyboard, or the **BREATH** button on a phone (it is now always on screen: middle column, above LOOK BEHIND).

**Mobile pass:** bigger buttons and top-row icons, thumb-sized full-width menu buttons in portrait, larger text in notes and inventory, a bigger keypad, and the button columns re-spaced so they stay clear of the thumb stick and the radar. Button sizes come from the `--b` (round buttons), `--e` (USE button) and `--g` (gap) variables near the end of `style.css`.

**Acheron code on a phone:** push the joystick up, let go, up again, let go, then down three times (let go between each). Each push has to be held for about a tenth of a second, and no more than 3.5 s may pass between pushes. Tune `GESTURE` (f = forward, b = backward), `STEP_MIN` and `STEP_GAP` in `touch.js`. The old taps still work on the menu (tagline 5x = the picture).
