# Reminder Swipe Actions

## Goal

Let a reminder reveal contextual controls when it is swiped left, while keeping the existing completion control and scheduled notification behavior intact.

## Interaction

- A horizontal left swipe on a reminder opens an action rail for that reminder only.
- The rail contains three actions in order: edit, cat-paw mark, delete. Each action is a compact module with a circular icon above and its text label below: pen / "编辑", paw / "标记", trash / "删除".
- Swiping right, tapping outside the row, or opening another row closes the current rail.
- The existing circular checkbox remains the completion control and is not part of the swipe rail.

## Actions

- Edit opens the reminder form prefilled with the item title, date, and time. Saving updates the item and replaces its scheduled local notification.
- Cat-paw mark toggles a persisted `flagged` boolean. A marked reminder shows a small paw after its title.
- Delete cancels the local notification and removes the reminder.

## Data And Notification Rules

- New reminders initialize with `flagged: false`.
- Existing reminders without the property are treated as unmarked.
- Editing a pending reminder cancels its old notification before scheduling the new time.
- Completing an item still cancels its notification; restoring it schedules one again.

## Input And Verification

- Touch input and mouse/pointer dragging use the same swipe threshold.
- Test opening, closing, switching rows, editing a reminder for today and a future day, toggling a paw mark, deleting, and completing/restoring an item.
