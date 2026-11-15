# Phase 1 handoff

Base: `where-is-my-username-Say/slimeoo`, main commit `ae8a8cbfe34c54532a2ba1e783768fadcfd6f341`.

Phase 1 only. No Phase 2 work has started.

| Content | Playable now | Later target |
|---|---:|---:|
| Character skills | 1 (Focus), plus basic controls | 100 |
| Swords | 4 | 30 |
| Bows | 4 | 30 |
| Equippable spells | 4 | 40 |
| Armor pieces | 4 baseline pieces | 100 signature suits |
| Enemy families / tier variants | 25 / 75 | Phase 1 addition |
| Villagers | 8 | Phase 1 addition |

`worker.js` keeps the existing room transport. `rpg-server.mjs` owns combat, AI, rewards, inventory and saves. `rpg-content.mjs` defines authored content and save migration. The client, actors and village are separate modules. `fight.html` preserves the supplied game with its spit sample remapped.

Check the first drop, comparison/equip flow, level-2 unlock timing, level-5 difficulty, attack cues, NPC shop reach, camera lock and mobile controls. Pay particular attention to fighting alongside another player.

Limits: load probes are scripted sockets with a rendered browser, not 50 physical devices. Phone QA is touch emulation. Production storage latency/failure behavior needs staging observation. Character recovery uses a private key rather than an account service. Reconnect restores health in town; transient position/health are not progression saves. Legacy PeerJS room code is retained but its external service has not been revalidated here. Cloudflare login is needed for deployment; existing production is unchanged.
