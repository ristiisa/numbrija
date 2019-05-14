import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);

const cors = require('cors')({
	origin: true
});

export const helloWorld = functions.https.onRequest((req, res) => {
	cors(req, res, () => {
		res.send({data: "Hello from Firebase!"});
	});
});
