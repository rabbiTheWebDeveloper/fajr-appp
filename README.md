# Fajr Academy app (Android, React Native)

The phone app for **students** and **teachers** of Fajr Academy. It is a native React Native app (Expo SDK 58,
React Native 0.88) that signs in to the same server as the website, `https://app.fajracademy.io`, and uses the
same `/api` routes, so it needs no server changes. Staff and admin accounts are told to use the website.

| | |
|---|---|
| App name | Fajr Academy |
| Android package | `io.fajracademy.app` |
| Version | set in `app.json` (`expo.version`, `expo.android.versionCode`) |
| Server | `app.json` → `expo.extra.apiUrl` |

## Build the APK

Requirements on the PC: Node 20+, JDK 17, Android SDK (`ANDROID_HOME` set).

```bat
npm install --legacy-peer-deps
npm run build:apk
```

The APK is written to `dist\FajrAcademy-<version>.apk`. The first build takes a long time (it compiles the native
parts); later builds only re-bundle the JavaScript.

Windows limits file paths to 260 characters and the native build goes deeper than that. The project
handles it by itself (`plugins/with-release-signing.js`): native build folders are staged under
`%USERPROFILE%\.fa\cxx`, which can be deleted at any time to force a clean native build.

Other commands: `npm run typecheck` (TypeScript), `npm run export:check` (bundles the JavaScript without a build,
to catch broken imports), `npm run prebuild` (re-creates the `android/` folder from `app.json`).

To release a new version: raise `expo.version` and `expo.android.versionCode` in `app.json`, run
`npm run prebuild`, then `npm run build:apk`.

## The signing key (back it up)

`signing/fajr-academy-release.keystore` and `signing/keystore.properties` sign every release. Android only
installs an update over an existing app when it is signed with the **same key**, so if this folder is lost,
people must uninstall the app before installing a newer one. Keep a copy somewhere safe and never share it.
The folder is git-ignored on purpose.

## Project layout

```
App.tsx                 providers: safe area, theme, sign-in, toasts
app.json                Expo config (name, package, permissions, plugins)
plugins/                Android build tweaks applied on prebuild (release signing, Windows path limit)
scripts/build-apk.bat   one-step release build
src/
  api/                  client.ts (the one door to the server), session.ts (login token storage)
  auth/                 AuthContext: sign in / out, session restore, role check
  navigation/           Root / Student / Teacher navigators, app bar, route names, website-path mapping
  notifications/        bell inbox, on-phone class reminders
  theme/                colours (light + dark) and the theme switch
  ui/                   the UI kit every screen is built from
  lib/                  formatting + academy-time helpers, files (pick / upload / PDF), device helpers,
                        and logic files copied unchanged from the website
  config/               teacher onboarding steps (copied from the website)
  screens/auth          login, forgot password
  screens/student       Dashboard, My Classes, Islamic Tools, Schedule, Payments, Certificate, Feedback,
                        Leaderboard, Settings, More
  screens/teacher       Dashboard, My Classes, Monthly Report, My Students, Learning Materials, Salary,
                        Schedule, Helpdesk, CEO Direct Line, Leaderboard, Announcements, Settings, More
```

## How it relates to the website

- Every screen is the phone version of a page under `/student` or `/teacher` on the website and calls the same
  API route. When a page or route changes on the website, change the matching screen here.
- These files are copies of website files and must be re-copied when the originals change:
  `src/lib/student-dashboard-shared.ts`, `src/lib/teacher-slot-shared.ts`, `src/lib/islamic-data.ts`,
  `src/lib/teacher-profile-helper.ts`, `src/config/teacher-onboarding.ts`.
- Sign-in: the server sets an `auth_token` cookie valid for 7 days. The app stores it encrypted on the phone
  and sends it with each request. When it expires the app returns to the login screen.
- Notifications: the bell shows the same inbox as the website. The website's browser push does not reach a
  phone app (that needs Google's push service); instead the app can set its own reminder 15 minutes before
  each class in the weekly routine (Settings → Notifications).
- Class times, "today" and "this month" follow Bangladesh time (UTC+6) on every phone.
