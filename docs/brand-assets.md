# HouseFamily brand assets

The home and family mark was created with the built-in image generator. The generated original is preserved at `apps/web/public/brand/housefamily-mark.png` (1254 × 1254 PNG, transparent alpha). The website pairs it with live HouseFamily text through the shared `BrandLogo` component.

Final generation prompt:

> Use case: logo-brand. Asset type: production website brand symbol for HouseFamily, a private family household app. Create one simple, rounded home enclosing an abstract family of three. Warm and welcoming, clean flat vector-like silhouette, forest green #1F5C45 only with transparent negative space, recognizable at 24px. Centered square composition, symbol occupies about 80% of canvas with balanced clear padding. Transparent background with real alpha. No text, letters, gradients, shadows, textures, borders around the canvas, mockups, or presentation boards. One polished logo mark only.

The same directory contains PNG exports at 48px (browser icon), 180px (Apple touch icon), 192px and 512px (PWA icons), plus a padded 512px maskable icon. These exports use the existing cream background, #F8F7F4. Existing SVG icons are retained; active metadata and the manifest reference the new PNGs.

The service worker caches the original mark alongside the offline fallback page. It does not cache private household data.
