# Logbook

Personal attendance and leave log for one Android phone, dark theme only. The log stays on the phone.

- **Today**: clock in, clock out, work from home or leave, for today only. **Leave** marks today straight away; pick the leave type on the card. Tap a clock time to fix it. **Change** clears today so you can choose again.
- **Calendar**: a month at a glance. Tap another date to see what was logged or to mark it as leave. **Share month** sends a readable list of every day.
- **Report**: the year in one place. Totals, a month-by-month table, leave by type with dates and notes, and **Share report**. **Plan leave in advance** books a range of future days; weekends are skipped unless you turn on **Count weekends**. Remove leave from the list here.
- **Settings** (gear icon): export as CSV or JSON, restore a backup, check for an update.

## Use it while building

```sh
npm install
npm test
npx expo start
```

Open the project in Expo Go. This SDK matches the Expo Go app during the SDK 58 transition. Expo Go loads the project from your computer. It does not download releases, and its saved days are separate from an installed build.

## Install a copy that updates from this repo

Expo can update the JavaScript inside an installed app without a new APK. The phone still asks Expo’s update service, not GitHub directly. GitHub Actions publishes to that service when `main` changes, which is the automatic part.

1. Create a free Expo account and run `npx eas-cli@latest login`.
2. Run `npx eas-cli@latest update:configure`. Commit the project id it writes into `app.json`.
3. Create an access token at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) and save it as the `EXPO_TOKEN` repository secret.
4. Build the installable APK once: `npx eas-cli@latest build -p android --profile preview`. Install that APK. It listens to the `preview` channel.
5. Push to `main`. The workflow publishes an update. Open the app and let it sit, then open it again, or tap **Check for update** in Settings.

Keep `expo.version` at `1.0.0` until you install a new APK. That version is the runtime id, so a published update only reaches builds with the same version. Bump it when a new native module forces a new build, then build and install again.

Export a backup from Settings before switching from Expo Go to the APK. The two installs do not share a log.

JavaScript and asset changes ship through the workflow. A new native dependency needs a new APK from step 4.
