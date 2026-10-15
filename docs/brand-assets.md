# Darna brand assets

The home and family mark was created with the built-in image generator. The generated original is preserved at `apps/web/public/brand/housefamily-mark.png` (1254 × 1254 PNG, transparent alpha). The website pairs it with live Darna text through the shared `BrandLogo` component.

Original generation prompt (created before the Darna rename):

> Use case: logo-brand. Asset type: production website brand symbol for HouseFamily, a private family household app. Create one simple, rounded home enclosing an abstract family of three. Warm and welcoming, clean flat vector-like silhouette, forest green #1F5C45 only with transparent negative space, recognizable at 24px. Centered square composition, symbol occupies about 80% of canvas with balanced clear padding. Transparent background with real alpha. No text, letters, gradients, shadows, textures, borders around the canvas, mockups, or presentation boards. One polished logo mark only.

Browser favicons are transparent PNG exports at 16px, 32px, and 48px, named `favicon-transparent-{size}.png`. The same directory contains cream-backed 180px Apple touch, 192px and 512px PWA, and padded 512px maskable icons. Existing SVG icons are retained; active metadata and the manifest reference the PNG assets.

The service worker caches the original mark alongside the offline fallback page. It does not cache private household data.
