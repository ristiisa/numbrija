# Numbrija
A simple concurrent math game
[Demo](https://numbrija.web.app/)

# First steps
You can read about how to setup your firebase on https://firebase.google.com/docs/web/setup
But in short you must
1. Install firebase tools
   ```
   npm i -g firebase-tools
   ```
2. Create the firebase config for web applications https://firebase.google.com/docs/web/setup#config-object

   Copy the firebase configuration object to ./frontend/src/environments/environment.ts and environment.prod.ts and install

3. Install backend dependencies
   ```
   firebase login
   firebase use
   firebase setup:emulators:database
   cd backend
   npm install
   ```
   
4. Install the frontend dependencies
   ```
   cd ../frontend
   npm install
   ```
   Note: Use default values for Semantic UI installation
   
   ```
   cd semantic
   ../node_modules/.bin/gulp build
   ```
   
5. Run
   ```
   cd ../..
   ./start-local-servers.sh
   ```

# Testing
Most of the functionality can be tested offline, but we require firebase emulators to be running. BUT currently there is an issue with latest firebase testing tools https://github.com/firebase/firebase-tools/issues/1280#issuecomment-493991341 so at this time of writing 6.9.0 seems to work.

```
cd backend
npm run watch &
firebase serve --only database  --port=9000 &
firebase serve --only functions --port=5000 &
```

# Backend
```
cd backend
npm run tests
```

# Frontend
```
cd frontend
npm run test
npm run e2e
```

# Deploying
```
cd frontend
npm build --prod --aot
firebase deploy --only functions,hosting
```
