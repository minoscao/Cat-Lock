# Distinct Room Shop Sets

## Goal

Add room-shop choices that feel materially different from the default room and
the existing bird-of-paradise, checker cushion, and moon-cat print. A purchase
must never read as a barely visible recolor.

## Product Rule

Each item needs a distinct silhouette, material, and subject:

- Plants: default fine-leaf tree; existing bird-of-paradise with upright broad
  leaves; new monstera with large split leaves; citrus tree with visible fruit;
  bamboo palm with narrow feathery fronds.
- Cushions: existing warm checker weave; moon set slate-blue embroidered stars;
  citrus set terracotta fruit print; tea-room set sage block print.
- Art: existing moon-cat print; moon set crescent-and-cloud night print;
  citrus set orange-grove print; tea-room set ink-wash tea terraces.

## First New Sets

1. Moonlit Room: monstera, slate-blue star embroidery, crescent-and-cloud art.
2. Citrus Atelier: citrus tree, terracotta citrus-print cushion, orange-grove
   art.
3. Tea Garden: bamboo palm, sage block-print cushion, tea-terrace ink art.

Items remain independently purchasable and mixable by category. The matching
set names guide discovery but do not lock the player's choices.

## Visual Production

For each item, generate a full-room source that changes only its allocated
object area. Convert it to an RGBA, softly feathered overlay before use. This
keeps the original room pixels outside the replacement area, allows products to
stack, and protects the cat-animation alignment.

## Validation

Preview every item alone and one mixed combination in the mobile room view.
Check that no default object shows through, no hard seam is visible, and every
plant has a leaf shadow consistent with its own silhouette.
