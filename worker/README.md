# Grandmas Letter Admin Worker

Tiny Cloudflare Worker backend for `/admin`.

It accepts `POST /publish`, validates `Authorization: Bearer <ADMIN_TOKEN>`, then commits `letter.json` to GitHub. GitHub Pages deploys the public site from that commit.

## Required secrets

```sh
wrangler secret put ADMIN_TOKEN
wrangler secret put GITHUB_TOKEN
```

`GITHUB_TOKEN` should be fine-grained and only allowed to write contents for `Masha-L/grandmas-letter-2026`.

## Deploy

```sh
cd worker
wrangler deploy
```

After deploy, open `/admin/` on the public site, paste the Worker URL and admin token once, then save settings.
