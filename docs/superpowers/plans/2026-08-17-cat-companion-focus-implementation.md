# Cat Companion Focus - Implementation Plan

## Scope

Replace the existing penguin cafe prototype with the approved first playable cat companion focus room. Keep the implementation intentionally narrow: one room, one starter cat, one starter rug anchor, a fixed 25-minute flow, completion rewards, and a shop that communicates future furniture without inventing prices or purchases before balancing.

## Steps

1. Generate project-owned visual assets.
   - A warm bedroom backdrop with the bed as fixed room architecture and no visible placeholders for future furniture.
   - A dedicated rug close-up background for the active focus state; later furniture each receives its own close-up.
   - A transparent, tabby-and-white domestic cat cutout in a natural loafing pose.
   - Reuse the same cat asset with restrained CSS posture changes for the first playable; do not build a frame-heavy animation system yet.
2. Replace the app shell and state in `src/main.js`.
   - Use a new local-storage key so old cafe state cannot leak into the new product.
   - Add one-tap 25-minute start, a presentation-friendly short demo mode only if explicitly exposed as a developer control (otherwise use production timing).
   - Track fish, completed sessions, and the current room anchor.
   - Implement neutral early stop and a completion reward moment.
   - Build shop cards for future furniture and cat looks as visible collection targets, with price status marked as “待定” rather than fake values.
3. Replace old coffee-specific markup, icons, and labels in `index.html` and `src/main.js`.
4. Consolidate styles into the existing CSS entry points.
   - Compose the warm full room as the idle visual surface and crossfade/zoom to the rug close-up when focused.
   - Make the in-scene floor board the primary focus control.
   - Keep unpurchased furniture positions completely empty; show future items only in the collection drawer.
   - Add a minimal cat idle cycle for breathing, ear/tail suggestion, and pose variation.
   - Keep desktop and mobile layouts readable.
5. Verify locally.
   - Run the Vite build.
   - Start a local dev server.
   - Inspect desktop and mobile screenshots in the browser and fix obvious layout/visibility issues.

## Verification

- Starting a session visibly changes the room into a focus state with a 25-minute countdown.
- The cat remains on the rug with quiet movement while focused.
- Early stopping produces no reward or negative framing.
- Completing a session grants one fish and one paw print, persisted after refresh.
- The collection/shop displays bed, sofa, cat tree, box, and future cat appearances without imposing a purchase order or price ladder.
