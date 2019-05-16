import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);

enum Response {
	ERROR,
	OK
}

/**
 * This is the place to setup the game, if needed, do some cleanup
 * @param {any} data The data deserialized from the request body
 * @param {CallableContext} context The metadata about the request
 */
export const join = functions.https.onCall(async (data, context) => {
	// Checking that the user is authenticated
	if (!context.auth)
		throw new functions.https.HttpsError('unauthenticated', 'permission denied');

	return {
		data: {
			result: Response.OK
		}
	}
});

/**
 * This is the tick function of this game... a new round is generated and previous rounds closed
 * @param {any} data The data deserialized from the request body
 * @param {CallableContext} context The metadata about the request
 */
export const round = functions.https.onCall(async (data, context) => {
	// Checking that the user is authenticated
	if (!context.auth)
		throw new functions.https.HttpsError('unauthenticated', 'permission denied');

	const moment = require('moment');
	const config = (await admin.database().ref('/config').once('value')).val();

	// find all open rounds and close them
	let update = {};
	let openRounds = await admin.database().ref('/rounds').orderByChild('status').startAt('open').once('value');
	openRounds.forEach(r => {
		update[`${r.key}/status`] = 'closed';
	});

	// lets pick the operator and operands
	// tslint:disable: no-shadowed-variable
	let answer = true
	let operator = ['+', '-', '/', '*'][~~(Math.random() * 4)]
	operator = '/'
	let operands = [Math.random() * 10 | 0, Math.random() * 10 | 0]
	let op = {
		'+': (a, b) => a + b,
		'-': (a, b) => a - b,
		'*': (a, b) => a * b,
		'/': (a, b) => a / b
	}

	// if the operator is / then lets make the operands dividable
	if (operator == '/')
		if (!operands[1])
			operands[1] = 1;
		else if (operands[0] % operands[1] !== 0) {
			let i = +(operands[1] > operands[0]);
			let factors = [...Array(operands[i] + 1).keys()].filter(i => !(operands[i] % i));
			operands[i] = factors[Math.random() * factors.length | 0];
		}

	let value = op[operator](...operands);

	// if wrong answer flip then lets adjust the value a little™
	if (Math.random() < 0.5) {
		value = Math.random() * value | 0;
		answer = false;
	}

	// now insert a new round and update all other round statuses to closed
	let newRound = admin.database().ref('/rounds').push();
	return Promise.all([
		newRound.set({
			key: newRound.key,
			date: admin.database.ServerValue.TIMESTAMP,
			dateStr: moment().format('L LT'),
			validFor: config && config.roundDuration || 60, // default is 60 seconds
			status: 'open',
			challenge: operands.join(operator) + '=' + value,
			answer
		}),
		admin.database().ref('/rounds').update(update)
	]).then(() => {
		return {
			data: {
				result: Response.OK,
				gid: newRound.key
				// we could also send the new round data back, but this method is rarely called by a player
			}
		}
	}).catch(() => {
		// NOTE: gcf will log any errors into the gcf console, no need for double output
		return {
			data: {
				result: Response.ERROR,
			}
		}
	})
});

/**
 * Registers the users' answer to the given round
 * 
 * @param {any} data The data deserialized from the request body
 * @param {string} data.rid The round id 
 * @param {boolean} data.answer The users' answer to the round
 * @param {CallableContext} context The metadata about the request
 */
export const answer = functions.https.onCall((data, context) => {
	const moment = require('moment');

	// Checking that the user is authenticated
	if (!context.auth)
		throw new functions.https.HttpsError('unauthenticated', 'permission denied');

	const auth = context.auth;

	const userRef = admin.database().ref(`/users/${auth.uid}`);
	const answerRef = admin.database().ref(`/answers/${data.rid}/${context.auth.uid}`);
	return Promise.all([admin.database().ref('/config').once('value'), admin.database().ref(`/rounds/${data.rid}`).once('value'), userRef.once('value'), answerRef.once('value')]).then(results => {
		// tslint:disable: no-shadowed-variable
		const [config, round, user, userAnswer] = results.map(r => r.val());

		if (!round)
			throw new functions.https.HttpsError('invalid-argument', 'invalid round id');

		// TODO: we should take latency into an account but for now lets just check if the round is open or not
		if (round.status != 'open')
			throw new functions.https.HttpsError('resource-exhausted', 'the round is closed');

		// we check if user has already answered the question but we don't have to do that, we could allow the user to change his answer...
		if (userAnswer)
			throw new functions.https.HttpsError('resource-exhausted', 'an answer already given');

		// if there answer is not correct, no need to update user data
		let userUpdate = Promise.resolve();
		if (data.answer == round.answer)
			// TODO: if we allow user to change the already given answer then we have to change how we calculate user score
			userUpdate = userRef.update({
				score: user.score || 0 + 1
			});

		// ... and this is where we would do that
		let answerUpdate = Promise.resolve();
		if (userAnswer != data.answer)
			answerUpdate = answerRef.set(data.answer);

		return Promise.all([userUpdate, answerUpdate]).then(() => {
			return {
				result: Response.OK,
				correct: data.answer == round.answer
			}
		}).catch(() => {
			return {
				result: Response.ERROR
			}
		});
	});
});


export const onUserStatusChanged = functions.database.ref('/users').onWrite((change, context) => {
	// we should do some cleanup in the db, best time is in this use-case when last of the users disconnects
});

/**
 * Copies new round challenge to /round/challenge
 */
export const onRoundsChanged = functions.database.ref('/rounds/{key}').onWrite((change, context) => {
	// currently we only copy new round data to a different node
	if (change.before.exists()) {
		return null;
	}

	return admin.database().ref('/round').set({
		challenge: change.after.child('challenge').val(),
		key: change.after.key
	})
});

/**
 * Creates /users/{uid} object with some metadata about the user
 * @param {UserRecord} user The data about the new user
 */
export const completeUserData = functions.auth.user().onCreate((user) => {
	console.log(user);
	if (!user || user.disabled) return;

	return admin.database().ref('/users').child(user.uid).set({
		displayName: user.displayName,
		photoURL: user.photoURL,
		uid: user.uid,
		score: 0,
	});
});