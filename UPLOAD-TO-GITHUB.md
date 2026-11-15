# GitHub / Vercel files

Upload the **contents** of this folder to the root of:

https://github.com/where-is-my-username-Say/slimeoo

Do not upload the outer `GitHub-Vercel` directory as a nested folder. `package.json`, `index.html` and `vercel.json` belong at the repository root. Replace the older versions of those files.

Vercel configuration is included: `npm run build` → `dist`. The displayed name is **Slimoo**; the registered website address remains https://slimeoo-plum.vercel.app/.

Google login is configured with the public Web Client ID. Publish the matching Cloudflare Worker as described in `GOOGLE-SETUP.md` before publishing the frontend; a frontend-only upload cannot add the login/save endpoints to the existing backend.

This directory intentionally contains no private save database, player session data, downloaded OAuth secret JSON, `node_modules`, or Git credentials. The local save directory is `D:\SlimooData\v3`, outside this upload folder. Do not upload that data directory.

For a local playtest, run `START-SLIMOO.cmd`. Local saves continue using `D:\SlimooData`, so replacing this code folder does not reset them.
