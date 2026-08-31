# Urgent Reminder Alarm

## Goal

Add an urgent state to reminders and make urgent reminders fire as an Android alarm that keeps sounding until the user explicitly dismisses it.

## Reminder UI

- New and edited reminders expose an `urgent` toggle independent from the existing cat-paw mark.
- The reminder overview gains marked and urgent statistic cards, each with an icon and a distinct low-saturation color.
- An urgent reminder is visible in the urgent card until it is completed or deleted.

## Android Alarm Behavior

- Urgent reminders use an exact Android alarm.
- At the scheduled time, a broadcast receiver starts a foreground alarm service that loops the bundled alert sound and vibrates.
- The receiver opens an alarm activity above the lock screen where permitted by Android.
- The alarm activity shows the reminder title and one explicit dismiss command. Dismissing stops the service, vibration, and notification.
- The alarm does not auto-dismiss.

## Permissions And Fallback

- Request notification permission and exact alarm access before an urgent reminder is saved.
- Declare exact-alarm, foreground-service, vibration, wake-lock, and full-screen-intent permissions in the Android app.
- If exact alarm access is unavailable, preserve the reminder and schedule the existing local notification fallback; the app should explain that the user must enable exact alarms for alarm-grade delivery.
- Browser preview retains the urgent state but cannot provide a persistent system alarm.

## Reminder Lifecycle

- New reminders persist `flagged: false` and `urgent: false` by default.
- Editing an urgent reminder cancels its existing native alarm before scheduling the replacement.
- Completing, restoring, or deleting an urgent reminder updates both the native alarm and its normal local notification.
- Marked and urgent states remain independent.

## Verification

- Verify normal and urgent new reminders, edits, completion, restoration, and deletion.
- On a device, verify permissions, firing after screen-off, persistent sound, vibration, full-screen alarm, and manual dismissal.
