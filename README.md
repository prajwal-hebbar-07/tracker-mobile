# Logbook

Personal attendance and leave log, dark theme only: an Android app, a Mac desktop widget and a command line tool. The widget and the CLI share one log on the Mac; the phone keeps its own, and a JSON backup moves it between them.

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
| `apps/cli` | `@logbook/cli` | The `logbook` command: an Ink terminal UI and one-shot commands, bundled into one file |
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
npm run cli -- status # run the CLI from source (any command after --)
npm run cli:install  # build the CLI and install it as `logbook`
```

Run Expo and EAS commands from `apps/mobile` (`cd apps/mobile && npx expo install <package>`).

Open the project in Expo Go. This SDK matches the Expo Go app during the SDK 58 transition. Expo Go loads the project from your computer. It does not download releases, and its saved days are separate from an installed build.

## Mac widget

A small glass panel that sits on the desktop behind other windows, shows on every Space, and has no Dock icon. Drag it by its title to move it; it remembers where you put it. Swipe sideways on the trackpad, click the dots, or press ← → to change page:

- **Today**: clock in, clock out, work from home or leave, with a live timer and editable times.
- **Month**: the calendar heatmap. Click a past or future day to mark, edit or remove leave; click today to jump back to Today.
- **Year**: totals, leave by type, and the month-by-month table.
- **More**: Excel for this month, this year or every year (the same workbook as the phone); save or copy a backup; restore from a backup file or pasted text; check for updates; Quit.

The log is `~/Library/Application Support/works.oni.logbook.widget/days.json`, shared with the CLI. It is kept outside the app on purpose: deleting the app, reinstalling it from a newer `.dmg`, or updating it never touches the log. Only deleting that folder does, which "uninstaller" tools such as AppCleaner offer to do; untick it there. The folder name is fixed in code, so it does not move if the app's identifier changes. To move the phone's log to the Mac, use **Share backup (JSON)** on the phone, then **Restore** on the widget; **Copy** on the widget and **Restore from backup** on the phone go the other way.

Install: download `logbook-widget-<version>-universal.dmg` from the newest **Logbook Widget** release on the [Releases page](https://github.com/prajwal-hebbar-07/tracker-mobile/releases), open it and drag **Logbook Widget** to Applications. It runs on Apple Silicon and Intel Macs with macOS 14.4 or later. It is not notarized by Apple, so the first launch is blocked: right-click the app → **Open** → **Open**, or allow it in System Settings → Privacy & Security. To start it at login, add it in System Settings → General → Login Items. To build it yourself instead: `npm run widget:build`.

Updates: the widget checks the release feed at launch and every six hours. When a newer version exists, a banner says so and More shows **Update to … and restart**; it downloads the new app, checks its signature against the key built into the widget, replaces the app and restarts. The log stays where it is.

`npm run web -w @logbook/desktop` opens the same page in a browser for layout work; there the log lives in localStorage and saving downloads the file.

## Command line tool

`logbook` opens a full-screen view with the same pages as the widget: Tab or 1–4 switch between Today, Month, Year and More, each page lists its keys, `q` quits. On Month, `r` starts a range at the selected day; move to the other end, `w` counts weekends, and `l` asks for the type and a note and saves leave on every day in it, as the phone's **Plan leave in advance** does. One-shot commands do the common things without opening it:

```sh
logbook status                # today and this month's calendar
logbook in [09:15]            # clock in now or at a time; again to fix the time
logbook out [18:30]           # clock out
logbook home                  # work from home today
logbook leave sick --date 2026-11-12 --note "dentist"   # personal, early, sick or lop
logbook leave personal --from 2026-12-22 --to 2026-12-31   # a range; weekends skipped unless --weekends
logbook reset [--date …]      # start today over, or remove leave on another day
logbook month 2026-10         # a month's calendar
logbook year                  # totals and months
logbook export --year 2026    # Excel, also --month 2026-11 or --from 2024 --years 3
logbook backup > backup.json  # JSON backup; logbook restore backup.json replaces the log
logbook help
```

It follows the phone's rules: clock in, clock out and home only happen today; other days take leave, and replacing a worked day with leave needs `--replace` (the interactive view asks instead). It reads and writes the widget's log file against the file as it is, one write per change (a range of leave lands in a single write), so neither overwrites the other; the widget re-reads the file every few seconds and the interactive view every two. Set `LOGBOOK_FILE` to use another log.

Install (needs Node.js 22 or newer):

```sh
curl -fsSL https://raw.githubusercontent.com/prajwal-hebbar-07/tracker-mobile/main/apps/cli/install.sh | sh
```

That puts the tool in `~/.local/share/logbook-cli` and links `~/.local/bin/logbook`. Before the first CLI release, or to try local changes, run `npm run cli:install` from the repo instead.

Updates: once a day the CLI asks GitHub, in the background, whether a newer `cli-v*` release exists. If one does, the next command ends with a notice and the interactive view shows it at the bottom; `logbook update` (or More → Update) downloads it, checks its SHA-256 against the release, and replaces the installed file. `LOGBOOK_NO_UPDATE_CHECK=1` turns the check off; it is also off in CI and when output is not a terminal.

## Release and update the app

There are four kinds of release, all run by `.github/workflows/release.yml`:

- **Over-the-air update** (JavaScript and assets): every push to `main` that changes `apps/mobile`, `packages/core` or the dependencies publishes one. Installed APKs download it from Expo’s update service on the next launch, or when you tap **Check for update** in Settings. No reinstall.
- **APK** (native changes): Actions → **Release** → **Run workflow**, pick **Release APK application**. EAS builds the APK, and the workflow attaches it to a GitHub release tagged `v<version>-<build>`. Install it over the old one; the log is kept.
- **Command line tool**: raise `version` in `apps/cli/package.json`, then Actions → **Release** → **Run workflow** → **Release command line tool**. It runs the tests, bundles the CLI and publishes `logbook.mjs` on a release tagged `cli-v<version>`, which installed copies offer as an update. The workflow refuses a version that is already released.
- **Mac widget**: raise `version` in `apps/desktop/src-tauri/tauri.conf.json`, then Actions → **Release** → **Run workflow** → **Release Mac widget**. A GitHub Mac builds a universal app, publishes the `.dmg` and the signed update on a release tagged `widget-v<version>`, then updates `latest.json` on the `widget-updates` release, which installed widgets read. The workflow refuses a version that is already released.

Mac widget updates are signed with a private key kept as the `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` repository secrets; its copy is in `~/.tauri/logbook-widget.key` (password in `logbook-widget.key.password`) on the Mac that set it up. Back up both files somewhere safe. Installed widgets only accept updates signed with this key, so if it is lost, everyone has to download the next `.dmg` by hand once.

One-time setup:

1. Create a free Expo account and run `npx eas-cli@latest login`.
2. Create an access token at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) and save it as the `EXPO_TOKEN` repository secret.
3. Run the **Release APK application** workflow and install the APK from the new GitHub release.
4. Back up the signing key: from `apps/mobile`, run `npx eas-cli@latest credentials -p android` → download the keystore. Android only installs an APK over the old one when both are signed with this key; a different key means uninstalling, which deletes the log.

When you need a new APK: after adding a package with native code, changing a config plugin or permission in `apps/mobile/app.json`, or upgrading the Expo SDK. Bump `expo.version` in `apps/mobile/app.json` first. That version is the runtime id, so over-the-air updates only reach APKs with the same version, and an update that needs native code the old APK lacks never reaches it. The build number (`versionCode`) is managed by EAS and goes up on every build, so you never edit it.

To get new APKs on the phone without checking GitHub by hand, install [Obtainium](https://github.com/ImranR98/Obtainium) and add `https://github.com/prajwal-hebbar-07/tracker-mobile`. It watches the releases, notifies you, and installs the APK. CLI and widget releases are never marked as the latest release, but set the app's **Filter release titles by regular expression** to `^Logbook \d` so Obtainium only ever looks at APK releases.

Export a backup from Settings before switching from Expo Go to the APK. The two installs do not share a log.
