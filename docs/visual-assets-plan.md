# Visual assets plan

The current build uses gradient placeholder boxes (`<Illustration>` component) wherever finished art will live. This document tells you what to commission/source/generate, the spec for each, and where to drop the files.

## Style brief (give this to any illustrator)

- **Vibe:** warm, playful, friendly, optimistic. Think modern editorial app, not luxury or scientific.
- **Palette:** primary `#ff7a3d` (orange), peach/cream backgrounds (`#fff5e8`, `#ffe4d3`), accents `#5fac23` (green), `#ffb21d` (yellow), `#7c5cff` (violet), `#f36671` (coral). Keep secondary characters in muted variants of these.
- **Faces:** representational, diverse — many ethnicities, ages, expressions. Smiling preferred. Stylized (not photorealistic, not cartoonish-childish either). Soft simplified features, big friendly eyes, no harsh line work.
- **Backgrounds:** soft peach gradients, with abstract cultural ornament hints (temple silhouettes, swirls, mandalas) at low opacity (~10%). No literal flags or country shapes in backgrounds — those go in chip overlays.
- **Line:** slightly chunky, rounded corners on everything. Avoid thin pen lines.
- **Format:** SVG preferred for icons/decorations; PNG/WebP at 2× for raster.
- **Avoid:** photo-realistic, dark/moody, mystical/occult, religious specifics, stereotyped costumes (clichéd cultural attire). Keep it modern.

## Sources, in order of preference

1. **Custom commission** (best, ~$300-1500 for the full set):
   - **Storyset** (storyset.com) — has a "customize" tool, free + paid, license clean for commercial use, lots of pre-made characters in this style.
   - **Iconscout** (iconscout.com) — search "ancestry" / "diversity" / "world map" and use Pro filter.
   - **UpLabs / Dribbble** — find an illustrator whose style fits, hire for ~$50-150 per illustration.
   - **Fiverr Pro** illustrators — search "vector character illustration onboarding."

2. **Pre-made bundles** (~$50-200 total):
   - **Streamline** illustrations (streamlinehq.com) — diverse, friendly, modern bundles.
   - **Blush** (blush.design) — character builder with diverse traits.
   - **Humaaans** (humaaans.com) — free, mix-and-match, may need restyling for warmth.

3. **AI-generated** (cheapest, fastest, watch quality):
   - **Midjourney** — best results. Use the prompt skeletons below.
   - **Ideogram** or **DALL-E 3** — second choice, weaker on style consistency.
   - For consistency across a set, generate one then use `--cref` (Midjourney character reference) on the rest.

## ⭐ Hero portrait (the most important asset)

This is the face that powers the landing-page sliced-portrait effect. Single ambiguous-heritage photoreal portrait.

- **Where:** `public/hero-portrait.{webp,jpg,png,svg}` — drop the file there and the `<SlicedPortrait>` component picks it up
- **Spec:** 4:5 aspect, 1024×1280 minimum (2000×2500 ideal), head-and-shoulders crop, neutral expression, soft front lighting, plain or slightly warm background
- **Goal:** the face should read as "could be from anywhere" — that's what makes the slice effect land

### Generate it (Midjourney recommended)

Paste this into Midjourney v6.1+:

```
ultra-photorealistic studio portrait of a young adult with mixed-heritage features,
soft natural skin texture with light freckles, looking straight at camera, gentle
confident expression, neutral light grey background, soft window light from front,
sharp eyes, fashion-editorial quality, head-and-shoulders crop --ar 4:5 --style raw --v 6.1
```

**Variations to A/B-test:**

| Goal | Add to prompt |
|---|---|
| Female-leaning | `feminine features, mid-length hair with subtle pink highlights` |
| Male-leaning | `masculine features, short dark hair, light stubble` |
| Androgynous | `androgynous gender-neutral features, short tousled hair` |
| Younger feel | `early 20s` |
| Sophisticated | `late 20s, thoughtful expression, minimal makeup` |

After generating, **upscale to 2× via Magnific or Topaz Photo AI** for the sharpest result on retina screens.

### Alternative generators

- **FLUX.1 Pro on Replicate** — best non-Midjourney option, ~$0.05/image (`black-forest-labs/flux-1.1-pro`)
- **Ideogram 2.0** — free tier, faster
- **GPT-image-1 / DALL-E 3** — quickest, less control over style consistency

### Stock photo fallback

- **Pexels** / **Unsplash** — search "diverse model portrait neutral background" (free, requires no attribution but credit is polite)
- **Adobe Stock** — search "mixed ethnicity headshot studio" (~$10-30/image, broadest commercial license)
- **Pond5** or **Shutterstock** — pricier, larger catalogs

⚠ **Do not** use any image you can't license. Don't grab portraits from competitor sites or social media. The traffic generated will eventually be enough that someone notices.

### Replace the placeholder

The current `/public/hero-portrait.svg` is a stylized placeholder so the layout renders. Once you have a real portrait:

1. Save as `public/hero-portrait.webp` (best for performance) or `public/hero-portrait.jpg`
2. The `<SlicedPortrait>` component defaults to `/hero-portrait.svg` — pass the new path explicitly:

   ```tsx
   <SlicedPortrait src="/hero-portrait.webp" />
   ```

   Or rename the file to `hero-portrait.svg` (which won't work for raster) — better yet, edit the default in `src/components/sliced-portrait.tsx`.

3. Optional: A/B test 3-4 portraits by rotating which file the component points to.

---

## Asset checklist

Each asset's `id` matches the value passed to `<Illustration id="…" />` in the code.

### `hero-faces` — landing hero
- **Where:** `src/app/page.tsx` (hero section)
- **Spec:** 1:1 (square), 800×800 minimum. Used at max 320×320 on mobile.
- **Subject:** collage / cluster of 6-9 diverse smiling faces, looking forward. Faces overlap softly, peach gradient background, subtle world-map silhouette behind them.
- **Prompt (Midjourney):**
  > flat vector illustration, mosaic of 9 diverse smiling faces in soft peach background, modern editorial style, warm orange (#FF7A3D) and peach palette, subtle world map silhouette behind, simplified rounded features, friendly inviting feel, generous negative space, square composition --ar 1:1 --stylize 250

### `world-map` — sample report + report page
- **Where:** `src/app/page.tsx`, `src/app/report/[id]/page.tsx`
- **Spec:** 4:3, 1200×900, exported as SVG ideally so animation hooks can be added.
- **Subject:** stylized flat world map in peach/cream tones, with small migration arrows in orange/green/violet between continents.
- **Prompt:**
  > flat illustrated world map, peach and cream tones, simplified continents in soft beige, a few curved orange and green migration arrows arching between continents, no text labels, minimal modern editorial style --ar 4:3 --stylize 200
- **Pro tip:** consider using `react-simple-maps` instead — gives you SVG you can animate per region.

### `scan-face` — analyzing screen
- **Where:** `src/app/analyzing/analyzing-client.tsx`, `src/app/paywall/paywall-client.tsx`
- **Spec:** 1:1, 600×600. Shows in 176×176 circular frame.
- **Subject:** stylized friendly face (gender-neutral) with a subtle scan-grid overlay (orange dots/lines), soft peach background. Smile suggested.
- **Prompt:**
  > flat vector portrait, gender neutral friendly face with soft scan grid overlay of orange dots and lines, peach background, modern editorial illustration, simplified rounded features --ar 1:1 --stylize 200

### `heritage-globe` — analyzing alt
- **Where:** optional alternate for analyzing screen
- **Spec:** 1:1, 600×600
- **Subject:** rotating globe with soft pin lights at 5-6 locations, warm palette.

### `report-celebrate` — top of report page
- **Where:** `src/app/report/[id]/page.tsx`
- **Spec:** 4:3, 1200×900
- **Subject:** celebratory scene — subject face surrounded by soft confetti/orbs in brand colors, glowing aura, peach background.
- **Prompt:**
  > flat illustration of a smiling person at center, surrounded by a soft burst of orange yellow and green confetti dots, peach background, celebratory uplifting feel, modern editorial style --ar 4:3 --stylize 250

### `parents-comparison` — upsell modal
- **Spec:** 16:9, 1200×675 (modal hero)
- **Subject:** three faces side-by-side (parent / parent / child), connecting lines between them suggesting heritage.
- **Prompt:**
  > flat vector illustration, three friendly portraits in a row representing two parents and their child, soft connecting lines suggesting heritage between them, peach gradient background, warm modern editorial style --ar 16:9

### `pdf-book` — upsell modal
- **Spec:** 16:9, 1200×675
- **Subject:** open book with a small map and portrait inside, gentle 3D perspective.
- **Prompt:**
  > flat illustration of an open hardcover book with a stylized world map and small portrait on its pages, peach background, soft drop shadow, modern editorial illustration style --ar 16:9

### `ages-portraits` — upsell modal
- **Spec:** 16:9, 1200×675
- **Subject:** the same face shown 4 times in different historical contexts (Roman, medieval, Tang dynasty, modern), abstracted not stereotyped.
- **Prompt:**
  > flat illustration of a single friendly face shown four times across different historical eras, modern editorial style, peach background, no stereotyped clothing — just subtle period hints --ar 16:9 --stylize 250

### `selfie-frame` — capture page
- **Spec:** 1:1, 500×500
- **Subject:** simple smartphone outline with a face viewfinder + corner brackets, peach background.
- **Prompt:**
  > flat illustration of a smartphone in portrait orientation with a friendly face in the viewfinder, orange corner-bracket framing marks, peach background, simple modern editorial style --ar 1:1

### `checkmark-burst` — generic confirmation
- **Spec:** 1:1, 400×400
- **Subject:** large green checkmark in a soft burst of orange and green dots.

## Where to put the files

Drop the finished assets here:

```
public/
  illustrations/
    hero-faces.webp
    world-map.svg
    scan-face.webp
    heritage-globe.webp
    report-celebrate.webp
    parents-comparison.webp
    pdf-book.webp
    ages-portraits.webp
    selfie-frame.webp
    checkmark-burst.webp
```

Then replace the `<Placeholder>` SVG body in `src/components/illustration.tsx` with `<img>` / `<Image>` references to those paths.

## Other visual assets to commission

| Asset | Purpose | Spec |
|---|---|---|
| Country flag set | Used in heritage chips on report page | 36×36, rounded square, ~15-25 needed for top regions |
| Cultural icon set | Background haze on hero/report | SVG, single-color, ~12 cultural symbols (temple, mask, mandala, etc.) at 5-10% opacity |
| Logo refinements | Marketing variations | Square mark, horizontal lockup, monochrome, light-bg, dark-bg |
| Open Graph image | Social share | 1200×630 with logo + tagline + face mosaic |
| App icon (PWA) | Home screen | 512×512 (auto-generated for other sizes) |
| Loading Lottie | Replaces the CSS pulse on `/analyzing` | JSON Lottie file, ~20s loop, scan-grid + face |

## Order to commission

If budget is limited, ship in this order — each unlocks more conversion:

1. **`hero-faces`** — first impression, biggest conversion lever
2. **`scan-face`** — appears on 2 highest-friction screens (analyzing, paywall)
3. **`world-map`** — sample report visual; signals "this looks real"
4. **`report-celebrate`** — paid users see this; sets reactivation tone
5. **`parents-comparison`** — first upsell modal, highest revenue per impression
6. **`pdf-book`** — second upsell
7. **`selfie-frame`** + **`ages-portraits`** + **`checkmark-burst`** — polish pass

## Budget guide

- DIY with Midjourney: ~$30/mo for the subscription, 2-4 hours work, results vary.
- Mid-tier Fiverr illustrator: ~$400-700 for the full set, 1-2 weeks.
- High-end custom: $2,000-5,000, 3-4 weeks, polished cohesive set.
