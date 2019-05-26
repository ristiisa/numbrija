# Numbrija
A simple concurrent math game where players compete by answering quickest to the simple computational challenge.

[Demo](https://numbrija.web.app/)

# Architecture
Numbrija is composed from two parts - a backend built with Firebase Realtime Database and a front end built with Angular and Semantic UI.

## Backend
Relevant files:
```
./backend/src/index.ts
```

### Database
The database is made up by 3 data nodes:
 * rounds: contains the data for the current active round and the past rounds. Clients do not have access to this node.
 * round: holds the id and challenge of the current round. Clients have a read only access to this node.
 * users: is a list of all the current and past users.  Clients have a read only access to this node.
 
 ### Database functions
 The client has access to two HTTP functions join and answer.
 #### join
 This function sets up the game when called.
 
 #### answer
 This function checks if the answer provided by the Client is correct or not. Depending on the answer either score is increased and a new game is generated or the score is decreased.
 
 
 ## Frontend
 Relevant files:
```
./frontend/app/src/game/game.component*
```
When a user opens the numbrija application on the browser, the user is logged in anonymously to firebase (this login is persistent across sessions). This behaviour can be very easyly altered to include social logins changing the signIn method in the AuthService class.

All of the game logic is inside the GameComponent. The first step after the transparent login procedure is joining the game that the Client does by calling the join method on the server. If that succeeds then the game can begin. Upon players choice on the answer correctness the answer function is called on the server and the result displayed to the player. This can continue ad infinitum. 
 

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
Most of the functionality can be tested offline, but firebase emulators must be be running.

```
cd backend
npm run watch &
firebase serve --only database  --port=9000 &
firebase serve --only functions --port=5000 &
```

## Backend
```
cd backend
npm run tests
```

## Frontend
```
cd frontend
npm run test
npm run e2e
```

# Deploying
```
cd frontend
npm build
firebase deploy --only functions,hosting
```
