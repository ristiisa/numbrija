# Numbrija

# First steps
```
firebase login
firebase use
cd backend
npm install
cd ../frontend
npm install
```

# Testing
Most of the functionality can be tested offline, but we require firebase emulators to be running. BUT currently there is an issue with latest firebase testing tools https://github.com/firebase/firebase-tools/issues/1280#issuecomment-493991341 so at this time of writing 6.9.0 seems to work.

```
cd ./backend
npm run watch &
firebase serve --only database  --port=9000 &
firebase serve --only functions --port=5000 &
cd ../frontend
ng serve
```

# Backend
cd backend
npm run tests

# Frontend
cd frontend
npm run tests

# Deploying
cd frontend
npm build --prod --aot
firebase deploy --only functions,hosting