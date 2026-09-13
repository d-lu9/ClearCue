# ClearCue

ClearCue is an original, iPhone-first eye-medication routine prototype for a 2026 Congressional App Challenge project. It supports a clinician’s plan; it does not diagnose, prescribe, or replace prescription-label or clinician instructions.

## Run the mobile prototype

The native mobile project is in [`mobile/`](mobile).

1. Install **Expo Go** from the App Store and connect the phone and computer to the same Wi-Fi network.
2. In a terminal, run `cd mobile` followed by `npm start`.
3. Scan the QR code with the iPhone camera and open it in Expo Go.

Expo Go is useful for prototype work, but real reminder behavior must be validated in a standalone iPhone development or TestFlight build before release.

## Current app source

The current ClearCue app is the Expo project in [`mobile/`](mobile). It is the only runnable app source in this repository; the earlier root-level web prototype has been retired so it cannot be mistaken for the current product.

## Current features

- Local-only eye-drop routines, medication details, refill estimates, and adherence data
- Multiple daily reminder times for a single medication, with safe spacing warnings
- Validated supply-estimate fields, date checks, and a required clinician-plan confirmation before routine changes are saved
- Time picker, medication search, brand/alias support, category filters, and a reviewed offline catalog of common glaucoma, dry-eye, allergy, and clinician-directed post-operative drops
- Self-reported dose history, weekly routine insights, refill estimates, and shareable summaries
- Clinician-safe “How to use drops” guide, including urgent-symptoms guidance
- Accessibility defaults: large text, high contrast, VoiceOver labels, reduced motion, color-safe labels, and Spanish across the core routine, Settings, and Insights
- Demo Mode, onboarding, app icon/splash screen, and device-only privacy controls
- Optional device lock for the medication plan using Face ID, Touch ID, or device passcode in a standalone iPhone build
- A focused home screen that prioritizes today’s eye-drop routine; reports, privacy, and accessibility are grouped under More care tools

## Release highlights

### Current release — v1.26.0

- Today’s timeline marks each scheduled dose as upcoming, due now, completed, late, or skipped. A late dose shows non-directive label/clinician safety guidance and record-only actions.
- A reminder checkup confirms notification permission, the next planned reminder, and whether scheduled reminders need attention.
- One clear home card per medication, even when it has several daily times; each time keeps its own completion and history actions.
- Medication browsing stays stable after a selection, and both search results and selected-medication details can expand or collapse without hiding the rest of the routine form.
- Bottle-label color is optional; add/edit menus use slightly larger text throughout, with additional scaling for expanded time and calendar controls when Large text is on.
- A calmer onboarding experience: the full welcome guide appears only on first launch, after an intentional erase-all-data action, or when opened from Settings.
- Spanish coverage for the core routine, medication form, calendar/time controls, Settings, and Insights. Drug and official source names remain unchanged for accuracy.

### Reliability and safety

- Required clinician-plan confirmation, date/number checks, supply and spacing warnings, and clear self-reported-adherence language.
- iOS sheet transitions are sequenced to avoid overlapping screens; save, refresh, and Demo Mode actions guard against duplicate taps and background work stays non-interrupting.
- Routine changes save immediately. When reminders are active, people choose when to refresh scheduled notifications.

### Product focus

- ClearCue is intentionally focused on reliable eye-drop routines. Contact-lens and glasses prescription records were removed from the active app.
- The offline medication-recognition catalog is reviewed against DailyMed and FDA openFDA labels; it never provides dosing recommendations.

## Medication catalog sources and updates

ClearCue's medication catalog is a recognition aid, not a clinical reference or dosing tool. Each release reviews the bundled entries against two official U.S. sources:

- [DailyMed](https://dailymed.nlm.nih.gov/dailymed), operated by the National Library of Medicine, for the current in-use label submitted to the FDA.
- The FDA's [openFDA drug-label data](https://open.fda.gov/apis/drug/label/), used as a second label-data cross-check.

Catalog changes are reviewed and shipped in app releases rather than downloaded silently to a person's phone. The app shows the source and review date on the selected medication and offers a medication-specific DailyMed source search when the device is online. Because manufacturers can publish separate current labels for the same medication, that search is safer than pinning a person to one manufacturer or an outdated label version. The prescription label and clinician remain the only source of medication instructions.

## Next milestone

- Establish a recurring review process for the bundled medication catalog and continue improving the focused eye-drop routine experience.
- Evaluate optional device passcode or Face ID protection in a future TestFlight build if private prescription numbers or clinician details return.

## Before TestFlight or release

Test on a physical iPhone in a standalone ClearCue build—not Expo Go:

- Grant, deny, then re-grant notification permission; confirm the reminder checkup reports the correct state and next reminder.
- Confirm a scheduled reminder appears while the app is backgrounded or fully closed. Its Taken, Skip, and Snooze actions should open ClearCue once, update today’s timeline/history, and never record the same response twice.
- Leave a routine scheduled across midnight, then confirm the new day’s timeline and completion state are correct.
- Turn on the optional ClearCue app lock, leave and return to the app, then confirm Face ID or device-passcode unlock works. Face ID itself is not available for testing in Expo Go.

The source type-checks successfully. A full iOS bundle still needs a macOS/iOS build environment: the current Windows environment cannot run Expo’s Hermes compiler, which is an environment permission limitation rather than an identified ClearCue build failure.
