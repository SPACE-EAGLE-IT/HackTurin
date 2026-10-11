# Brand — the IAMAimpresa marks in the kit

Everything a screen, a document or a social card needs is in `public/brand/`. Vector files are the source;
the PNGs next to them are the sizes the application uses.

## What is mounted where

| Surface | File | Notes |
|---|---|---|
| Shell rail, open | `iamaimpresa-logo-esteso-bianco-400.png` | white logotype on the dark rail (`components/shell/shell.tsx`) |
| Shell rail, collapsed | `iamaimpresa-marchio-bianco-256.png` | the «IA» mark |
| Login card | `iamaimpresa-logo-esteso-nero-400.png` / `-bianco-400.png` | black on the light theme, white on the dark one |
| Browser tab | `favicon.svg`, `favicon-32.png` | declared in `app/layout.tsx` |
| iOS home screen | `apple-touch-icon-180.png` | |
| Installed app | `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` | `app/manifest.ts` |
| Link previews | `og-image-1200x630.png` | `metadata.openGraph` in `app/layout.tsx` |

## The pack (`public/brand/svg/`)

- `logo-esteso/trasparente/` — colour · negative · black · white, transparent background.
- `logo-esteso/con-fondo/` — the same on solid backgrounds, clear space included: colour and black on
  `fondo-bianco` and `fondo-canvas`; negative on `fondo-ink`; white on `fondo-rosso` and `fondo-ink`.
- `marchio/trasparente/`, `marchio/con-fondo/` — the «IA» mark, same combinations.
- `icone/` — 512 px square: transparent, negative, red tile, ink tile, maskable.
- `favicon/favicon.svg` — 32 × 32.

## Colours

| Name | HEX | Token |
|---|---|---|
| Rosso | `#E4002B` | `--primary` |
| Inchiostro | `#15151A` | `--foreground` |
| Carta | `#FFFFFF` | `--background` |
| Canvas | `#F4F4F2` | `--muted` |

In the application never type these values: use the tokens (`bg-primary`, `text-foreground`, …).

## Construction

- One cap height for all eleven letters, one baseline; cap height = 2.618 × the stroke unit.
- Extended logotype: stem 0.19 × H, bars and diagonals 0.17 × H at constant optical weight; the «IA» mark is
  heavier (stem 0.21 × H).
- Letter spacing 0.46 × H between bounding boxes, with optical compensation on the pairs IA, AM, MA, AI and SA.
- In the extended logotype the first «I» is entirely red; the two-colour cut lives only in the mark, where the
  «I» is cut at 26.6° from bottom-left to top-right and the «A» overlaps its foot.
- Colours: **IAMA** red, **IMPRESA** ink.

## Rules of use

- Clear space ≥ 0.5 × H on every side.
- Minimum size: extended logotype 120 px (28 mm); mark 24 px.
- The logotype lives on light backgrounds; the negative only on solid dark backgrounds, never on photos.
- Never rebuild the lettering with a system font; never recolour, rotate or distort.
