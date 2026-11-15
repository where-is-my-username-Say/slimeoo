# Slimoo changed-files upload

This folder contains only source/assets that differ from the previous GitHub-Vercel package, plus required new files. It is a patch for the existing repository, not a standalone replacement project.

Upload these files to the matching paths in https://github.com/where-is-my-username-Say/slimeoo . Replace files with the same names; keep all other repository files. Do not upload the outer GitHub-Vercel folder.

Deploy the matching Cloudflare Worker first, then let Vercel build the frontend. Keep GAME_ROOM, GameRoom and the existing v1 migration. Backend Google verification and save endpoints must be deployed together with these frontend changes.

No private saves, OAuth JSON, credentials, node_modules or local runtime state are included. The original reference and D:\SlimooData\v3 are untouched. Final repairs have not been tested, as requested. See RESTORATION.md.
