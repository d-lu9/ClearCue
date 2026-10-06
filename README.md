# ClearCue

ClearCue is an original, iPhone-first eye-medication routine prototype for a 2026 Congressional App Challenge project. It supports a clinician’s plan; it does not diagnose, prescribe, or replace prescription-label or clinician instructions.

## Run the mobile prototype

The native mobile project is in [`mobile/`](mobile).

1. Install **Expo Go** from the App Store and connect the phone and computer to the same Wi-Fi network.
2. In a terminal, run `cd mobile` followed by `npm start`.
3. Scan the QR code with the iPhone camera and open it in Expo Go.

Expo Go is useful for prototype work, but real reminder behavior must be validated in a standalone iPhone development or TestFlight build before release.

## Build for TestFlight

The iOS app identifier, Expo project link, and native permissions are recorded in [`mobile/app.json`](mobile/app.json). EAS build profiles are in [`mobile/eas.json`](mobile/eas.json). The production profile uses remote app versioning and automatically increments the build number.

From `mobile/`, after signing in to the Expo and Apple accounts that own this app:

```powershell
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production --latest
```

The first command creates a new iOS build; the second sends the latest build to App Store Connect for TestFlight processing. A GitHub commit alone does not update the TestFlight installation. Keep signing credentials in Expo/Apple account services, not in this repository.

## Current app source

The current ClearCue app is the Expo project in [`mobile/`](mobile). It is the only runnable app source in this repository; the earlier root-level web prototype has been retired so it cannot be mistaken for the current product.

## Current features

- Local-by-default eye-drop routines, medication details, refill estimates, and adherence data
- Multiple daily reminder times for a single medication, with safe spacing warnings
- Validated supply-estimate fields, date checks, and a required clinician-plan confirmation before routine changes are saved
- Time picker, medication search, brand/alias support, category filters, and a reviewed offline catalog of common glaucoma, dry-eye, allergy, and clinician-directed post-operative drops
- Self-reported dose history, 30-day routine insights, refill estimates, and shareable 7- or 30-day summaries
- Clinician-safe “How to use drops” guide, including urgent-symptoms guidance
- Accessibility defaults: large text across routine text, forms, dropdowns, time/date controls, and section labels; high contrast; VoiceOver labels; reduced motion; color-safe labels; and Spanish across the core routine, Settings, and Insights. An optional black-and-white mode removes color from key surfaces while retaining written medication and dose-status labels.
- Demo Mode, onboarding, app icon/splash screen, and device-only privacy controls
- Encrypted local routine storage with one-time migration from earlier prototype storage, plus strict runtime validation before saved data is used
- Optional device lock for the medication plan using Face ID, Touch ID, or device passcode in a standalone iPhone build
- A focused home screen that prioritizes today’s eye-drop routine; swipe between Today and Insights instead of scrolling through both, with reports, privacy, and accessibility grouped under More care tools
- Optional accountless caregiver pairing is implemented but inactive until its separate alert service and a new standalone build are configured; it shares minimal schedule/status data and sends generic, non-clinical push alerts

## Release highlights

### Current release — v1.26.0

- Insights now use a 30-day calendar: each day's ring fills in proportion to planned doses marked taken, shows a checkmark when all are marked, and flags skipped or unrecorded doses. Insights and reports give both regular and Large text more room without changing streaks, patterns, or summary sharing.
- Today’s timeline marks each scheduled dose as upcoming, due now, completed, late, or skipped. A late dose shows non-directive label/clinician safety guidance and record-only actions.
- A reminder checkup confirms notification permission, the next planned reminder, and whether scheduled reminders need attention.
- One clear home card per medication, even when it has several daily times; each time keeps its own completion and history actions.
- Medication browsing stays stable after a selection, and both search results and selected-medication details can expand or collapse without hiding the rest of the routine form.
- Bottle-label color is optional; add/edit menus use slightly larger text throughout, with additional scaling for expanded time and calendar controls when Large text is on.
- A calmer onboarding experience: the regular welcome guide appears on first launch, after an intentional erase-all-data action, or when opened from Settings. A separate Demo Mode guide appears automatically only on the first demo visit and can be reopened from Settings while in Demo Mode.
- Spanish coverage throughout the interface: routine, medication form, calendar/time controls, reminders, reports, history, privacy, device protection, guidance, onboarding, alerts, and accessibility labels. Drug and official source names remain unchanged for accuracy.

### Reliability and safety

- Required clinician-plan confirmation, bounded free-text fields, runtime data validation, date/number checks, supply and spacing warnings, and clear self-reported-adherence language.
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
- Validate encrypted storage and optional device protection on a physical TestFlight build before release.
- Deploy and test the optional [caregiver alert service](caregiver-service/README.md) on two real phones before enabling it in a build; the current TestFlight build does not contain a configured service.

## Before TestFlight or release

Test on a physical iPhone in a standalone ClearCue build—not Expo Go:

- Grant, deny, then re-grant notification permission; confirm the reminder checkup reports the correct state and next reminder.
- Confirm a scheduled reminder appears while the app is backgrounded or fully closed. Its Taken, Skip, and Snooze actions should open ClearCue once, update today’s timeline/history, and never record the same response twice.
- Leave a routine scheduled across midnight, then confirm the new day’s timeline and completion state are correct.
- Turn on the optional ClearCue app lock, leave and return to the app, then confirm Face ID or device-passcode unlock works. Face ID itself is not available for testing in Expo Go.

The source type-checks successfully. A full iOS bundle still needs a macOS/iOS build environment: the current Windows environment cannot run Expo’s Hermes compiler, which is an environment permission limitation rather than an identified ClearCue build failure.
