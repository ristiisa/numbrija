cd ./backend
npm run watch &
firebase serve --only database  --port=9000 &
firebase serve --only functions --port=5000 &
cd ../frontend
ng serve