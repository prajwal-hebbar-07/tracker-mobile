This is an npm workspaces monorepo. `apps/mobile` is an Expo/React Native mobile application; `apps/desktop` is a Tauri + React Mac desktop widget (Rust in `src-tauri/`, not Expo); `packages/core` (`@logbook/core`) holds the platform-free logic every app shares. Prioritize mobile-first patterns, performance, and cross-platform compatibility in the mobile app, and keep `packages/core` free of React, storage, and native imports. The Expo rules below apply to `apps/mobile` only.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `apps/mobile/package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present). Install dependencies from the repository root (`npm install`); run Expo and EAS commands from `apps/mobile`.

```bash
npx expo install <package>  # in apps/mobile; ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # in apps/mobile; start the dev server
npx expo-doctor             # in apps/mobile; diagnose dependency and config issues
npx expo install --fix      # in apps/mobile; fix incompatible package versions
npm test                    # at the root; core tests
npm run lint                # at the root; every workspace
npm run typecheck           # at the root; every workspace
```

Run lint, typecheck and tests before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `apps/mobile/src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`, and logic that is not specific to the phone in `packages/core`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `apps/mobile/ios/` and `apps/mobile/android/` do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `apps/mobile/app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
