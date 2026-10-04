# Письмо бабушкам

Статичная страница-письмо с фотографиями из Нью-Йорка: музей Уитни, зал,
яблочное пирожное, цветы, офис, велосипед, зоопарк, закат рядом с домом
и планы на октябрь.

Открывается как обычный GitHub Pages сайт.

## Editing

The public page renders `letter.json`.

`/admin/` is a hosted editor for that JSON. It can publish through the Cloudflare
Worker in `worker/`, once the Worker is deployed and configured with:

- `ADMIN_TOKEN`
- `GITHUB_TOKEN`

See `worker/README.md` for setup.
