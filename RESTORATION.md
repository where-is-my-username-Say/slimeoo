# Slimoo restoration — 15 November 2026

Reference: D:\downloads\index.html (read only). Current project and its existing save/backend work were retained.

- Restored the original dome, skirt, small dark eyes, blush, seven laurel leaves, fingered palms, slap curve and close shoulder framing. Shared-world players and NPCs use the same rig; duel/practice fighters retain their existing game state and network systems with restored visual construction.
- Default camera migrates once to 62° FOV and distance 7. WASD remains relative to the view; Tab toggles mouse shift lock, Space jumps, left/right mouse slap/spit. Duplex duel input retains its 22-byte size, using the unused high flag bits for a jump counter.
- Typed action codes and durations distinguish slap, spit, sword, bow and casting. Snapshot timers advance between packets, combo side is shared, and emotes use server age. Launch/contact effects follow the action phase. PvP checks both players in the ring at action and damage time; monster combat remains authoritative.
- Selected spit-mouth-short.wav (0.36 seconds); supplied alternatives are 0.41 and 0.34 seconds. The source attribution from the unfinished restoration is retained: ErikH2000, Spitting.wav, CC0, https://freesound.org/people/ErikH2000/sounds/232211/ . Clip duration was inspected; no listening test was performed. Natural playback rate, separate impact audio, squared distance attenuation, stereo pan and bounded concurrent sounds.
- Village roof gables, eaves, side windows, garden paths, forge tools, smith work surface and timed sparks, apothecary cauldron/herbs, fletcher bench and inn furniture complete the existing shop rebuild. Static details are batched.
- Lower light-shaft sample costs and haze strength. Upsampling compares full scene depth rather than quantized depth packed into the scatter texture. Balanced shadows use 1024px; rendering keeps the existing resolution limits and frame cap. Actor resource disposal and effect limits added.
- Main menu exposes Open Meadow, Host friend duel, Join friend duel, Practice, Google sign-in and Settings. Invite hashes take priority over automatic host/practice shortcuts.
- Existing server-side Google verification, public client ID, account linking and private save paths retained. Local origin errors name the unauthorized origin. Official GIS loading has a timeout and retry support. No OAuth JSON or secret was opened or packaged.

## Validation and deployment

The existing 23 tests passed before the user requested no tests. No tests or browser playtests were run after that instruction; final repairs are untested. No production deployment was performed. No measured performance improvement is claimed.

Deploy the matching Cloudflare Worker before the Vercel frontend. See GOOGLE-SETUP.md. Keep the existing Durable Object namespace and migration.
