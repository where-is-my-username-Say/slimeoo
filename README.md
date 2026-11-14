# Slimeoo Cloudflare multiplayer backend

This is a prototype WebSocket room relay with up to 50 connections per room. It is **not** yet an authoritative game server: movement, hits, damage, physics and anti-cheat still need server-side validation, and the existing Slimeoo HTML uses PeerJS and must be integrated with this protocol.

## Deploy

1. Place worker.js and wrangler.jsonc in the same repository root.
2. Deploy using `npx wrangler deploy` from the repository directory, with Cloudflare authorization.
3. Open `https://YOUR-WORKER.workers.dev/health` to verify.
4. Connect the client with `new WebSocket('wss://YOUR-WORKER.workers.dev/room/ABCD12')`.

## WebSocket messages

- Server welcome: `{type:'welcome',id,players,maxPlayers}`
- Client movement: `{type:'state',seq:1,x:0,y:0,z:0,yaw:0}`
- Client name: `{type:'name',name:'Slime'}`
- Client action: `{type:'action',action:'slap'}` (also spit, dodge, emote)
- Client ping: `{type:'ping',at:Date.now()}`
- Server events: `state`, `joined`, `left`, `action`, `name`, `pong`

Do not deploy the Worker as a replacement for the Vercel website. This Worker is a separate multiplayer service.
