# WeegStation — Release

## Nieuwe versie uitbrengen

1. Bump versie in `package.json` en `src/data/product.js`
2. Commit + push naar `main`
3. Draai:

```powershell
npm run release
```

Dit doet automatisch:
- Vite frontend bouwen → `dist/`
- Windows installer bouwen → `release/electron-dist/`
- Weegserver ZIP → `release/Weegserver.zip`
- Lokale verify (grootte + sha512)
- Upload naar GitHub
- Download-verify (controleert dat GitHub exe = lokaal)

## Alleen lokaal bouwen (zonder upload)

```powershell
npm run build:win
npm run verify-release:local
```

## Paden

| Wat | Pad |
|---|---|
| Frontend (vite) | `dist/` |
| Installer (.exe) | `release/electron-dist/` |
| Weegserver ZIP | `release/Weegserver.zip` |

## GitHub Actions

Bij push naar `main`: build + verify (geen dist-fout meer).
Bij tag `v*`: automatische GitHub Release.

## Kantoor-PC problemen?

Voer eerst `scripts/opschonen-installatie.ps1` uit, installeer daarna de nieuwste `.exe`.
