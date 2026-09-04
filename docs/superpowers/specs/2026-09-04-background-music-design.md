# Background Music Design

## Goal

Add Kevin MacLeod's "Relaxing Piano Music" as the room's low-volume ambient loop.

## Behavior

- The track is stored locally in `public/audio` and is never streamed at runtime.
- Playback begins after the first normal user gesture, which satisfies browser autoplay rules.
- The existing Background music slider controls this track immediately and remains persisted with the rest of the settings.
- The audio loops continuously through room, focus, and overlay views. It does not restart during renders or cat animations.
- Cat sounds retain their existing independent volume control and behavior.

## Attribution

The source file is downloaded from the credited author/distributor page and remains covered by CC BY 4.0. The product attribution is kept in `NOTICE.md`:

`Relaxing Piano Music` by Kevin MacLeod, licensed under CC BY 4.0.

## Verification

- Build the Vite app successfully.
- Confirm the bundled audio file is emitted into `dist/audio`.
- Confirm changing the Background music slider updates only the background track.
