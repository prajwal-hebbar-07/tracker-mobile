# Logbook

Personal attendance log for one Android phone. Office days keep clock-in and clock-out. Work-from-home days count without hours. Leave days are listed on their own. The dashboard is the year: totals, office-hour bars, and a heatmap. The log stays on the phone.

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
5. Push to `main`. The workflow publishes an update. Open the app and let it sit, then open it again, or tap **Check for update** on the dashboard.

Keep `expo.version` at `1.0.0` until you install a new APK. That version is the runtime id, so a published update only reaches builds with the same version. Bump it when a new native module forces a new build, then build and install again.

Export a backup from the dashboard before switching from Expo Go to the APK. The two installs do not share a log.

JavaScript and asset changes ship through the workflow. A new native dependency needs a new APK from step 4.
