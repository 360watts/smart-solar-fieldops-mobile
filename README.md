# Smart Solar Mobile (React Native)

Native-feeling iOS + Android app for Smart Solar, built with Expo + TypeScript.

## Prereqs
- Node.js 18+ (this project is pinned to Expo SDK 52 for Node 18 compatibility)
- Expo Go on your phone (for quick testing), or Android Studio for emulator

## Configure API base URL
Set the backend API base URL via Expo public env var:

```bash
export EXPO_PUBLIC_API_BASE_URL="https://smart-solar-django-backend.vercel.app/api"
```

## Run locally

```bash
npm install
npm run start
```

Then scan the QR code with Expo Go.

## Internal distribution (recommended path)
This repo is compatible with EAS Build (requires an Expo account):

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
eas build -p ios --profile preview
```

## Notes
- Auth uses `expo-secure-store` for tokens.\n+- React Query cache is persisted via AsyncStorage for offline-ish fallback.

