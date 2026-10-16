# Installing Darna

Public guides are available at `/en/install`, `/fr/install`, and `/ar/install`, without signing in. Welcome and Family → Your account link to the localized guide. Use the existing Vercel URL; no app-store distribution or extra service is needed.

## Phone installation

- Android: open Darna in Chrome. When the browser offers an installation event, the guide shows an Install Darna button. Otherwise use Chrome’s menu → Add to Home screen / Install app, then confirm the available option.
- iPhone/iPad: open Darna in Safari → Share → Add to Home Screen. Enable Open as Web App if shown, then Add. The Share action’s location depends on Safari’s layout. If the home-screen action is missing, use Edit Actions in the Share menu.
- Open the resulting Darna icon and sign in if requested. Installation confirmation and actual device launch must be checked on the phone; automated browser checks do not replace this step.

## Behavior

The global PWA provider retains `beforeinstallprompt` across client navigation, invokes it only after a user click, consumes each event once, and handles pending, accepted, cancelled, and rejected prompts. Acceptance alone does not mark the app installed: the provider uses `appinstalled`, the standalone display-mode media query, or Safari’s standalone property. The detected platform determines guide order; both sets of instructions remain available. Installation links and controls are hidden in installed mode. There are no automatic installation popups or notification permission requests.

The manifest keeps `/en` as its launch URL and explicit app identity, preserving the identity previously inferred from that URL. Its scope is `/`, and existing 192px/512px, maskable, and Apple touch icons are retained. An authenticated user’s language preference is handled by the existing app shell.

The production service worker caches only the public offline page and brand mark. Household API requests are excluded, and private records are not available for offline viewing or editing. Shell cache v4 removes older `darna-shell-` caches without deleting caches belonging to other features. Registration failures have a reload option on the installation page and do not cause unhandled promise rejections.

## Verification

- 64 web tests cover existing flows plus installation-event lifetime, acceptance versus installation, cancellation, prompt rejection, duplicate-click prevention, navigation retention, standalone detection, Safari guide ordering, registration failures, scoped cache cleanup, API exclusion, and offline navigation fallback.
- Browser checks confirmed worker activation and the cached offline screen. Stopping the local production server displayed the offline page; reconnecting restores normal navigation.
- Installation guides fit 320, 390, 768, and 1440 CSS-pixel widths in English, French, and Arabic. Actual Android/iOS home-screen installation requires the final confirmation on the user’s device.

References: [Apple’s Safari installation guide](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios), [browser installation prompts](https://web.dev/learn/pwa/installation-prompt).
