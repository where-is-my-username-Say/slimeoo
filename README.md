# Slimoo — The Dewwild / Phase 1

A server-authoritative RPG foundation on the existing Open Meadow backend. The original game is preserved at **`fight.html`**, including PeerJS friend rooms, invitations, practice and its legacy Open Meadow interface. The spit sample has been replaced there too.

## Run

Requires Node.js 22.12+ and npm. In this directory:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:8787** on this PC. Wrangler prints the LAN address for other devices. During QA this was **http://192.168.100.38:8787**. Keep that terminal running.

This runs the actual Cloudflare Worker and Durable Object locally, not a browser-only simulation. Local saves now persist in `D:\SlimooData` on this machine, with one-time migration from `.wrangler/state`. Replacing the game folder keeps that data. Guest browsers retain a private recovery key. Google sign-in is configured for the main website and links saves to the verified account. See GOOGLE-SETUP.md for deployment, account linking, and local testing.

## Two-device playtest

1. Put the PC and phone on the same Wi-Fi. Start the server. Open its printed LAN URL on both devices. If Windows asks, allow Node on your private network. Give each browser a different name; each gets its own character.
2. Enter Open Meadow. Both slimes should appear in Dewbell Village and the counter should show 2/50. PC: WASD. Phone: landscape, left joystick. Check movement and G/wave on the other screen.
3. Follow the east/right path past Fern and the green farm gate. Start with level-1 Dewhoppers. Select a creature, approach it and use F / bar 1 for your equipped attack. Bows and spells have longer range; spells spend mana. Dodge windups with Shift / bar 3; Q / bar 4 uses a tonic.
4. Your first kill guarantees an upgrade for your starting style, XP, gold and a shard. Bag (I) → new item → compare → Equip. Your visible weapon and damage change.
5. Hunt three creatures, return to Pip, and claim a jacket, 25 gold and 20 XP. Ember's first forge upgrade costs 3 shards + 12 gold and adds 2 weapon power. Visit the other villagers for tonics, different gear, maps and free rest.
6. Level 2 unlocks Focus: 175% attack damage for 12 extra mana, with an 8-second cooldown. Later levels require progressively more XP.
7. Settings → Reconnect, or reload and enter again. Verify XP, gold, items, gear, quests and unlocked Focus remain. Reconnect returns you safely to town. Use the same URL origin on later visits, or import your recovery key to move the character.
8. PvP: both players enter the circular ring at (0,0), select each other, and slap/spit. Outside the ring, those animations, projectiles and sounds still work but do no player damage. Monster combat remains enabled in the farm. PvP grants no XP or loot.

## Controls

| PC | Action |
|---|---|
| WASD / arrows | Move relative to camera |
| Mouse drag / Tab | Orbit / toggle shift lock (outside menus/text fields) |
| Space | Jump |
| Left / right click | Slap / spit; click another slime to select PvP target |
| F / 1 | Equipped weapon or spell |
| 2 | Focus, after level 2 |
| Shift / 3 | Dodge |
| Q / 4 | Tonic |
| E / G | Nearby villager / wave |
| I / M | Bag / map |

## Scope and checks

Included: a safe town, 8 role-animated villagers with distinct buildings/shops, inn and forge; one farm with **25 enemy families × levels 1/5/10 = 75 variants**; starter/upgrade equipment; server AI, telegraphs, combat, XP, loot, forging, quests, inventory, saves, recovery keys, mobile HUD, map, chat/emotes and invites.

The trial catalogue has **4 swords, 4 bows, 4 equippable spells and 4 armor pieces**. Focus is the first character skill. The 100-skill system, build presets/respec, full 30/30/40 catalogue and 100 signature suits remain for later phases. **Stop at Phase 1 for playtesting.**

```powershell
npm.cmd test
npm.cmd run build
```

The 23 automated tests cover authoritative validation, first loot, action/reward deduplication, shops/forge/quests, reconnect, migration, jump and ring-only PvP. With two browsers joined, `node test/network-smoke.mjs` adds 48 local probe clients, attempts a 51st, sends movement/slap/spit/emote traffic and closes its sockets. It is restricted to loopback.

QA: two browser clients saw each other; a normal-control hunt earned XP/gold and first loot; the upgrade equipped and survived reload. A 50-client room rejected the 51st. Tab shift lock toggled. A touch-enabled 844×390 landscape context joined without overflow. This is not a physical-phone or 50-device soak test. Legacy PeerJS duels are preserved but have not been revalidated with two devices.

Graphics: 60 FPS game / 30 FPS menus, no hidden-tab rendering, compact remote models, distance culling and spaced labels. The instanced meadow is retained. Light shafts now use more samples, higher resolution and floating-point scattering when supported. Low quality intentionally disables shafts. Real-device balance/performance still needs playtesting.

## Existing production deployment

Production is unchanged. GitHub access is available; Cloudflare CLI is **not authenticated**. Upgrade the existing backend before publishing the matching frontend:

```powershell
npx.cmd wrangler login
npm.cmd run deploy
```

Keep Worker `slimeoo-multiplayer`, binding `GAME_ROOM`, class `GameRoom`, and its existing `v1` SQLite Durable Object migration. No namespace replacement is needed. Vercel uses `npm run build` and `dist` via the included configuration. The Worker can also serve those assets itself. The Vercel client defaults to the existing backend at `https://slimeoo-multiplayer.balochnajool.workers.dev`; `/health` must report `rpg: 1`.

The existing protocol-2 binary movement, 50-player cap, room path, roster, chat, emotes and voice-signal relay remain. Voice UI remains available in the original `fight.html` game. See `README-legacy.md` for the original relay documentation.

## Audio

New dry spit: **Caitlin_100 — Spit.mp3**, CC0: https://freesound.org/people/Caitlin_100/sounds/365537/ (HQ preview). Other audio is retained from the supplied repository. No oscillator-generated combat sounds were added.
