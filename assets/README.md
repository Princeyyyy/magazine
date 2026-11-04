# Her Custom Magazine: icon pack

Concept: a magazine cover with a spine fold and one sparkle. Rose tile, blush cover, berry sparkle, small gold sparkle on larger sizes.
Palette: Rose #FF7BAE to #D93272, Blush #FFF6F9, Blush deep #F7CADB, Berry #8E1B4B, Gold #F6B95C.

## Next.js App Router placement
- favicons/favicon.ico        -> src/app/favicon.ico
- favicons/favicon.svg        -> src/app/icon.svg
- app-icons/apple-touch-icon.png -> src/app/apple-icon.png
- app-icons/icon-192.png, icon-512.png, icon-maskable-*.png, site.webmanifest -> public/
  and in src/app/manifest.ts or via `metadata.manifest = "/site.webmanifest"`
- section-icons/SectionIcons.tsx -> src/components/icons/SectionIcons.tsx
- logo/ -> public/brand/

## Head tags if you are not using the App Router file conventions
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#D93272">

## Section icons
Nine 24x24 line icons, 1.75 stroke, currentColor, so they take any text colour:
order-details, about-her, favourites, beauty, style-wishlist, music-movies, memories, photos, final-details.
Use the sectionIcons map to pick one per form page.

## Brand assets (your uploaded SVGs)
brand-assets/robo-studio-logo.svg   (your 4.svg)  wordmark with flower
brand-assets/flower-pink.svg        (your 7.svg)  pink flower, white outline
brand-assets/flower-brown.svg       (your 8.svg)  brown flower, pink outline
brand-assets/png/*-1024.png, *-256.png  transparent PNG exports of each

These SVGs wrap embedded bitmap images (0.6 to 1.8 MB each), so they are not true vectors.
Use them through <img> or next/image, not inline, and prefer the PNGs for small sizes.
Put them in public/brand/ in the web app.

