# Cat Companion Focus - First Playable Design

## Product Intent

Create an original focus companion experience: during a fixed 25-minute session, a believable house cat stays near the user. The product should make concentration feel accompanied and completion feel gently comforting, without turning the cat into a productivity assistant or a high-pressure progression game.

The cat is lazy, occasionally mischievous, and recognizably feline. It does not clean, cook, serve, wear costumes, or behave like a tiny human.

## Core Loop

1. The user enters their room and taps one primary action: "和猫一起坐一会儿".
2. The room is normally shown as a full-room view. A fixed 25-minute focus session begins without a duration picker.
3. The camera moves to a close view of one available resting place. The cat performs quiet, natural behavior there.
4. Completing the full session grants one small fish and one paw print for that calendar day while the close view remains on screen.
5. After a short reward moment, the camera returns to the full-room view. The user can stop there or start another 25-minute session.
6. Small fish are later spent in the shop on cats and interactive furniture. Prices and balancing are intentionally deferred.

## Focus Rules

- A full 25-minute session is the only rewarded unit.
- Completion grants `1 small fish` and `1 paw print`.
- Paw prints are a non-spendable record of completed 25-minute sessions on the calendar. No minute totals are displayed.
- Stopping early is neutral: no reward, no punishment, no broken streak, and no disappointed-cat framing.
- The app should not automatically fail a session because the user changes apps or leaves the page. Pause/resume behavior is deferred.

## Cat Behavior

### Base Character

- Initial cat: short-haired tabby-and-white domestic cat.
- It should feel like a common real house cat, not a specific pedigree and not a chibi mascot.
- Visual direction: premium soft 3D animation, with visible fur, weight, paws, and understated facial expressions.
- The current visual reference direction is the third concept sample: a warm, believable tabby-and-white cat sleeping loosely by a window.

### Reusable Pose Library

Actions are shared across cats. A new breed/coat does not require a unique action set.

Initial reusable poses:

- Loafing and half-dozing
- Licking a paw and washing its face
- Grooming fur
- Stretching
- Funny, twisted sleeping poses
- Quietly watching a small moving thing

The goal is long, calm observation rather than frequent animation. The cat's emotion should come primarily from posture, ears, tail, pauses, and weight.

### Session States

- Most sessions: the cat stays visible and simply keeps the user company.
- Sometimes: it briefly leaves its furniture and returns.
- Rarely: it leaves near the end and does not return. Completion may reveal where it went.

These are background behaviors, not announced odds, gacha rewards, or mandatory story content. Repeated sessions can remain quiet.

## The Room

### One Persistent Room

The experience uses one fixed room called "我的房间", rather than cycling through unrelated scenes. The room gradually becomes more personal as the user adds furniture. This gives purchases persistent visual value and keeps the cat's world coherent.

The fixed architecture includes:

- Window
- Walls and floor
- Desk
- Lamp
- Bed

Furniture uses fixed, authored positions. The user collects rather than freely arranges it in the first version. Fixed anchors prevent visual clutter and keep every cat pose aligned with its furniture.

Unpurchased furniture positions are completely empty in the room view. The room must not use dotted outlines, lock icons, ghost furniture, or labels to advertise its future items. The collection page communicates what can be added.

### Starter State

- The cat begins with a free rug as its first resting place.
- On the rug it can loaf, groom, stretch, and sleep in odd positions.

### Shop Furniture

All shop furniture is visible from the start and may be bought in any order. There is no linear unlock path and no escalating rarity system.

Candidate first furniture:

- Sofa: taking the seat, leaning on cushions, sprawling asleep
- Cat tree: watching outside, sitting high up, scratching
- Cardboard box: hiding, peeking, pouncing out
- Bedside cat nook: a dedicated curled-up sleeping place beside the fixed bed

Each furniture item is an interaction anchor: owning it adds compatible cat behavior, rather than merely adding decoration.

## Shop and Collection

### Spendable Currency

- Small fish are the only spendable currency.
- Prices, acquisition rate, and economy tuning are deferred until content volume and user behavior can be tested.

### Purchase Types

1. **Cat appearances**: additional real-world coat/breed looks. They reuse the shared pose library.
2. **Interactive furniture**: fixed-position room objects that add new resting places and compatible behaviors.

No arbitrary cat outfit layering, crafting, or accessory combinations in the first version. They create asset and clipping costs, make the cat less believable, and are unnecessary for the emotional core. If ever added later, they should be validated preset looks rather than mix-and-match parts.

### Selection at Session Start

At session start, the system selects from the user's owned cat appearances and available furniture anchors. This retains a little day-to-day surprise while keeping all outcomes within the player's own room.

## Explicit Non-Goals for the First Version

- No cafe management or service simulation
- No café currency, recipes, or furniture-placement editor
- No timer length selection
- No forced four-session streak mechanics
- No rare-event collection treadmill
- No punishment-oriented failure state
- No apparel system, item crafting, or arbitrary accessory stacking
- No multiplayer or social ranking

## Open Decisions

- Final small-fish reward rate, furniture prices, and cat prices
- Exact initial room composition and furniture anchors
- Whether sessions can be manually paused and how that affects rewards
- Calendar visual details and history view
- Initial set of purchasable cat appearances

## Success Criteria for a First Playable Prototype

- A user can start a 25-minute companion session in one tap.
- The initial tabby-and-white cat visibly stays on the rug with at least several believable idle poses.
- Completing a session gives the user a clear but restrained fish and paw-print outcome.
- The room has a full-room idle view and an authored rug close view for the active focus state.
- The full-room view remains naturally uncluttered when furniture is unavailable.
- Unlocking one furniture item causes the cat to gain a clearly different place and behavior to be with the user.
