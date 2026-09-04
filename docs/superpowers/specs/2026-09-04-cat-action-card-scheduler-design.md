# Cat Action Card Scheduler Design

## Goal

Replace the existing fixed-count lobby randomization and focus-timeline action branches with one invisible action-card scheduler. Users only see natural cat behavior; cards, odds, and timers are never shown in the interface.

## Scope

- Apply the scheduler in both the lobby and an active focus session.
- Keep reminder paw-scratching separate from the scheduler.
- Keep direct interaction separate and higher priority than natural behavior.
- Use only the current action assets. The awake pool does not include an ear-wiggle action.

## Awake Cards

At the end of each sitting idle loop, draw one awake card:

- Blink or tail swish: normal outcomes, selected evenly whenever the rare card misses.
- Move closer: rare outcome. It starts at 5%. Each missed draw adds 2 percentage points. A successful draw resets it to 5%.

All selected single actions play to their natural end before the next sitting loop begins. The next draw happens only after that loop ends.

## Interaction Priority

Head petting, body scratching, and gaze following interrupt any waiting idle loop. They do not interrupt an already-playing single natural action, sleep transition, reminder reaction, or focus completion transition.

When an interaction ends:

1. Reset the move-closer chance to 5%.
2. Immediately draw an awake card.
3. Resume ordinary awake looping only after that card finishes.

There is no consecutive-use limit on manual scratching.

## Inactivity And Sleep Cards

Five uninterrupted minutes without direct interaction moves the cat from the awake scheduler into sleep. This timer runs in the lobby and during focus. A user interaction resets the timer and returns the cat to the awake scheduler after its follow-up card.

While asleep, the cat uses a card-based sleep cycle rather than the previous elapsed-focus branch. At each completed sleep interval, the scheduler chooses only from currently available sleep assets:

- Continue curled sleep.
- Turn over into the belly-sleep loop.
- Wake and return to the awake scheduler.

The precise weighting remains conservative: continuing to sleep is the normal outcome; turning over and waking are less frequent. Focus completion and early finish retain their required wake-up transitions.

## Priority Order

1. Focus completion or early finish transition.
2. Due reminder reaction.
3. Direct interaction.
4. Non-interruptible natural awake or sleep action already in progress.
5. Card draw after an idle or sleep interval.

## State And Verification

The scheduler owns a rare-action chance, last direct-interaction time, current mode (`awake` or `sleep`), and current natural action. It resets those values when the cat layer is recreated, focus ends, or a reminder reaction takes control.

Verification must cover:

- Repeated awake draws increase only the move-closer chance by 2% after misses and reset after a hit.
- The same behavior works in the lobby and during focus.
- Interactions reset the chance and lead into one immediate draw without a flash or duplicate cat.
- Five minutes with no direct interaction enters sleep in both contexts.
- A reminder still starts and finishes its own paw-scratch reaction correctly.
