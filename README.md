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
- Validated supply-estimate fields, date checks, and a required clinician-plan confirmation before routine changes are saved
- Time picker, medication search, brand/alias support, category filters, and a reviewed offline catalog of common glaucoma, dry-eye, allergy, and clinician-directed post-operative drops
- Self-reported dose history, weekly routine insights, refill estimates, and shareable summaries
- Clinician-safe “How to use drops” guide, including urgent-symptoms guidance
- Accessibility defaults: large text, high contrast, VoiceOver labels, reduced motion, color-safe labels, and Spanish home-screen support; full-app Spanish is in progress
- Demo Mode, onboarding, app icon/splash screen, and device-only privacy controls
- A focused home screen that prioritizes today’s eye-drop routine; reports, privacy, and accessibility are grouped under More care tools

## Version history

### v1.12.0 — Reviewed offline medication catalog

- Expanded the bundled recognition catalog with common glaucoma and ocular-hypertension drops (including combination products), dry-eye treatments, allergy drops, and clinician-directed anti-inflammatory and antibiotic drops.
- Every catalog entry now identifies its source as the current [DailyMed](https://dailymed.nlm.nih.gov/dailymed) label, cross-checked against the FDA's [openFDA drug-label data](https://open.fda.gov/apis/drug/label/), with a visible review date.
- Kept catalog data offline, versioned with the app, and intentionally free of dosing directions, contraindication guidance, or treatment recommendations.

## Medication catalog sources and updates

ClearCue's medication catalog is a recognition aid, not a clinical reference or dosing tool. Each release reviews the bundled entries against two official U.S. sources:

- [DailyMed](https://dailymed.nlm.nih.gov/dailymed), operated by the National Library of Medicine, for the current in-use label submitted to the FDA.
- The FDA's [openFDA drug-label data](https://open.fda.gov/apis/drug/label/), used as a second label-data cross-check.

Catalog changes are reviewed and shipped in app releases rather than downloaded silently to a person's phone. The app shows the source and review date on the selected medication, while the prescription label and clinician remain the only source of medication instructions.

### v1.11.0 — Clearer reminder and record language

- Renamed the active reminder state to “ClearCue reminders are on” to avoid implying Apple Reminders integration.
- Clarified that dose history, insights, and shared summaries are self-reported activity—not proof of administration, treatment effectiveness, or clinical adherence.
- Labeled Spanish as home-screen and core-routine support while full-app translation is completed.

### v1.10.0 — Safer routine entry

- Added numeric and real-date checks for supply estimates, while preserving room for unusual but valid clinician instructions.
- Added a read-only routine review with required confirmation against the clinician’s prescription before saving.
- Added warnings for reminder-count mismatches and future or unusually old bottle-opened dates.

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

- Establish a recurring review process for the bundled medication catalog and continue improving the focused eye-drop routine experience.
