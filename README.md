# Merit

**The Talent Intelligence Engine.** One person, seven layers of evidence, from first résumé to fifth year.

- **Live presentation:** https://keevin227.github.io/Performance-Management/ (password-protected)
- **Product concept:** [docs/CONCEPT.md](docs/CONCEPT.md)
- **Finishing the deck:** [docs/HANDOFF.md](docs/HANDOFF.md)

## The presentation

Plain HTML, CSS and JavaScript in [`site/`](site), no build step. The centerpiece is the Merit Portrait engine
([`site/assets/portrait.js`](site/assets/portrait.js)): a person drawn as a silhouette inside seven growth rings, where
each band is as thick as the evidence for its layer.

| Key | Action |
|---|---|
| `→` `Space` `Enter` / click | next step or slide |
| `←` / click on the left third | previous |
| `F` | fullscreen |

The language control switches between English and Persian. Open `?lang=fa#4` for a Persian deep link; the selected language is remembered and switching preserves the slide. Persian horizontal keys and swipe follow right-to-left reading order.

Run locally: `cd site && python3 -m http.server 8000`, then open http://localhost:8000.

### Password protection

`public/` is what gets published: the whole deck encrypted with AES-256-GCM (key from the password via PBKDF2-SHA-256,
600,000 iterations) behind a gate. The password is not stored in this repository. After changing `site/`:

```sh
DECK_PASSWORD='…' node scripts/build-protected.mjs
```

This repository is public, so the plain source in `site/` can still be read on GitHub; the password protects the
published link. Pushing `public/` to `main` deploys it through [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
(Pages source: GitHub Actions).

Brand marks come from [Simple Icons](https://simpleicons.org) (CC0) and are trademarks of their owners. All people and
figures in the deck are illustrative.
