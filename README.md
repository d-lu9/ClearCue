# ClearCue

ClearCue is an original, iPhone-first eye-medication routine prototype for a 2026 Congressional App Challenge project. It supports a clinician’s plan; it does not diagnose, prescribe, or replace prescription-label or clinician instructions.

## Run the mobile prototype

The native mobile project is in [`mobile/`](mobile).

1. Install **Expo Go** from the App Store and connect the phone and computer to the same Wi-Fi network.
2. In a terminal, run `cd mobile` followed by `npm start`.
3. Scan the QR code with the iPhone camera and open it in Expo Go.

Local reminder actions and full notification behavior should be tested in an iOS development build before release; Expo Go has notification limitations.

## Current features

- Local-only eye-drop routines, medication details, refill estimates, and adherence data
- Multiple daily reminder times for a single medication, with safe spacing warnings
- Time picker, medication search, brand/alias support, and category filters
- Daily adherence history, weekly insights, refill estimates, and clinician-shareable reports
- Clinician-safe “How to use drops” guide, including urgent-symptoms guidance
- Accessibility defaults: large text, high contrast, VoiceOver labels, reduced motion, color-safe labels, and core Spanish home-screen labels
- Demo Mode, onboarding, app icon/splash screen, and device-only privacy controls
- A focused home screen that prioritizes today’s eye-drop routine; reports, privacy, and accessibility are grouped under More care tools

## Version history

### v1.9.0 — Focused eye-drop routine

- Removed contact-lens and glasses-prescription records, including their reference forms and reminders.
- Simplified supporting tools to keep ClearCue centered on taking eye drops reliably.

### v1.8.0 — Focused routine dashboard

- Simplified the home screen around daily progress, today’s schedule, reminders, and adding an eye drop.
- Moved insights, privacy controls, and accessibility settings into a single Care & settings sheet.

### v1.7.0 — Glasses prescription reference

- Added a local glasses prescription record with separate right/left values, PD, prism, clinician, expiration, and frame or lens notes.
- Added a local glasses-prescription expiration reminder and included glasses details in ClearCue’s privacy and erase-data controls.

### v1.6.0 — Routine and reminder polish

- Added multiple daily times under one medication, expandable time pickers, and group editing/removal.
- Added notification actions for Taken, Snooze 10 minutes, and Skip.
- Added local contact-lens expiration and replacement reminders.
- Added medication category filters for glaucoma, dry eye, allergy, and post-operative care.
- Updated Expo and safe-area support.

### v1.5.0 — Contact lenses and interface improvements

- Added a local contact-lens prescription reference with right/left lens values, renewal details, and replacement planning.
- Added a clinician-safe urgent-symptoms note to the drop-application guide.
- Added the reminder-time dropdown and Calm Clinic interface refinements.

### v1.4.0 — Presentation and demo experience

- Added the ClearCue icon, splash screen, polished empty states, Demo Mode, and expanded Spanish home-screen support.
- Made insights, reports, privacy, history, and settings easier to find.

### v1.3.0 — Privacy, safety, and patient records

- Added private prescription details, refill estimates, contact-lens planning, dose history, and a read-only shareable report.
- Added device-only privacy controls, onboarding, clinician application instructions, and supply estimates.

### v1.2.0 — Accessible adherence support

- Added weekly adherence tracking, streaks, medication-level insights, and Doctor Reports.
- Added large text, high contrast, VoiceOver labels, reduced motion, color-safe labels, and Spanish foundations.

### v1.1.0 — Medication and reminder foundations

- Added an offline eye-medication catalog, medication editing/deletion, daily completion reset, safe reminder spacing, and local notifications.

### v1.0.0 — ClearCue prototype

- Created the original dashboard, eye-specific medication cards, local routine storage, and an iPhone-first Expo prototype.

## Next milestone

- Expand the offline eye-medication catalog with carefully reviewed source data before considering a connected prescription database.
