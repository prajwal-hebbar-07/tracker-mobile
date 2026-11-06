# Logbook

Personal attendance and leave log, dark theme only: an Android app, plus a Mac desktop widget. Each keeps its own log on its own device; move it between them with a JSON backup.

- **Today**: clock in, clock out, work from home or leave, for today only. **Leave** asks for the type and an optional note, then **Save leave** records it. Once clocked in, the clock-in time shows on the card with **Edit time**; after clock-out both times do. **Start over** clears today so you can choose again.
- **Calendar**: a month at a glance. Tap another date to see what was logged or to mark it as leave. **Share month** sends a readable list of every day; **Share month as Excel** sends the same workbook as the Report export, with one row for each day of that month.
- **Report**: the year in one place. Totals, a month-by-month table, leave by type with dates and notes. **Plan leave in advance** books a range of future days; weekends are skipped unless you turn on **Count weekends**. Remove leave from the list here. **Share the report** sends the year as text, or as an Excel workbook with one row for every calendar day: pick the first year and how many years, whether empty weekends are listed, and one sheet per year or a single sheet.
- **Settings** (gear icon): export as CSV or JSON, restore a backup, check for an update.

## Repository layout

An npm workspaces monorepo, so other Logbook apps can share the same logic:

| Path | Package | What it is |
| --- | --- | --- |
| `apps/mobile` | `@logbook/mobile` | The Expo app: screens, storage, sharing, `app.json`, `eas.json` |
| `apps/desktop` | `@logbook/desktop` | The Mac widget: Tauri (`src-tauri/`) around a React page (`src/`) |
| `packages/core` | `@logbook/core` | Platform-free logic: dates, summaries, leave spans, reports, CSV and Excel export, and its tests |

`@logbook/core` has no React, storage or native code, so any JavaScript app can import it. A new app goes in `apps/<name>` and adds `"@logbook/core": "*"` to its dependencies.

## Use it while building

Install once from the repository root. Each workspace has its own scripts; the root runs them all.

```sh
npm install          # every workspace, one package-lock.json at the root
npm test             # core tests
npm run typecheck    # every workspace
npm run lint         # every workspace
npm start            # Expo dev server for apps/mobile
npm run widget       # Mac widget in development (needs Rust: rustup.rs)
npm run widget:build # Logbook Widget.app and a .dmg in apps/desktop/src-tauri/target/release/bundle/
```

Run Expo and EAS commands from `apps/mobile` (`cd apps/mobile && npx expo install <package>`).

Open the project in Expo Go. This SDK matches the Expo Go app during the SDK 58 transition. Expo Go loads the project from your computer. It does not download releases, and its saved days are separate from an installed build.

## Mac widget

A small glass panel that sits on the desktop behind other windows, shows on every Space, and has no Dock icon. Drag it by its title to move it; it remembers where you put it. Swipe sideways on the trackpad, click the dots, or press ← → to change page:

- **Today**: clock in, clock out, work from home or leave, with a live timer and editable times.
- **Month**: the calendar heatmap. Click a past or future day to mark, edit or remove leave; click today to jump back to Today.
- **Year**: totals, leave by type, and the month-by-month table.
- **More**: Excel for this month, this year or every year (the same workbook as the phone); save or copy a backup; restore from a backup file or pasted text; Quit.

The log is `~/Library/Application Support/works.oni.logbook.widget/days.json`. To move the phone's log to the Mac, use **Share backup (JSON)** on the phone, then **Restore** on the widget; **Copy** on the widget and **Restore from backup** on the phone go the other way.

Install: run `npm run widget:build`, open the `.dmg` and drag **Logbook Widget** to Applications. It is ad-hoc signed, not notarized, so a copy downloaded from elsewhere needs right-click → **Open** the first time. To start it at login, add it in System Settings → General → Login Items.

`npm run web -w @logbook/desktop` opens the same page in a browser for layout work; there the log lives in localStorage and saving downloads the file.

## Release and update the app

There are two kinds of release, both run by `.github/workflows/release.yml`:

- **Over-the-air update** (JavaScript and assets): every push to `main` that changes `apps/mobile`, `packages/core` or the dependencies publishes one. Installed APKs download it from Expo’s update service on the next launch, or when you tap **Check for update** in Settings. No reinstall.
- **APK** (native changes): Actions → **Release** → **Run workflow**, pick **Release APK application**. EAS builds the APK, and the workflow attaches it to a GitHub release tagged `v<version>-<build>`. Install it over the old one; the log is kept.

One-time setup:

1. Create a free Expo account and run `npx eas-cli@latest login`.
2. Create an access token at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) and save it as the `EXPO_TOKEN` repository secret.
3. Run the **Release APK application** workflow and install the APK from the new GitHub release.
4. Back up the signing key: from `apps/mobile`, run `npx eas-cli@latest credentials -p android` → download the keystore. Android only installs an APK over the old one when both are signed with this key; a different key means uninstalling, which deletes the log.

When you need a new APK: after adding a package with native code, changing a config plugin or permission in `apps/mobile/app.json`, or upgrading the Expo SDK. Bump `expo.version` in `apps/mobile/app.json` first. That version is the runtime id, so over-the-air updates only reach APKs with the same version, and an update that needs native code the old APK lacks never reaches it. The build number (`versionCode`) is managed by EAS and goes up on every build, so you never edit it.

To get new APKs on the phone without checking GitHub by hand, install [Obtainium](https://github.com/ImranR98/Obtainium) and add `https://github.com/prajwal-hebbar-07/tracker-mobile`. It watches the releases, notifies you, and installs the APK.

Export a backup from Settings before switching from Expo Go to the APK. The two installs do not share a log.
