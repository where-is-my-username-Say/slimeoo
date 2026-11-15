# Slimoo changed files

Upload this folder's contents over the matching paths in the existing slimeoo repository. Keep unchanged repository files; this is a source patch, not a standalone project. New rpg-*.mjs files are required dependencies and must be uploaded too.

Deploy the updated Cloudflare Worker first, then the Vercel frontend. Both must contain the shared village layout and new rpg-habitats.mjs geography. This release uses map revision meadow-4-habitats; an older frontend needs a refresh after both deployments. Include rpg-habitat-world.mjs and rpg-world-map.mjs in the frontend upload too. Keep the existing GAME_ROOM binding, GameRoom class and v1 SQLite migration to preserve saves. Google identity verification remains on the backend.

The upload folder contains source changes and required new assets only. It excludes saves, OAuth JSON, node_modules, generated dist, browser artifacts and temporary repair scripts. Final changes are untested at the user's request. See RESTORATION.md for scope.
