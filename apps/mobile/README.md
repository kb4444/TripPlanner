# Burns Travel Mobile

Expo/React Native companion app for the Burns Travel planner.

The first TestFlight build intentionally reuses the hosted planner API:

- API base: `https://burns-travel-planner.kyleburns626647.chatgpt.site`
- Native screens: Today, Itinerary, Packing, Places, Notes
- Offline cache: last fetched trip data is stored on device
- Sync today: packing toggles and notes write back to the hosted API

## Local Commands

```bash
npm install
npm run typecheck
npm start
```

## TestFlight Path

```bash
npx eas login
npx eas init
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production
```

Use internal TestFlight first for the trip sprint.
