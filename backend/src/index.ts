import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const cors = require('cors')({
	origin: true
});

enum Response {
	ERROR,
	OK
}

export type Challenge = {
	operands: Array<number>,
	operator: string,
	answer: boolean,
	value: number,
	combined: string
};

/**
 * Generates a challenge
 */
export const generateChallenge = (): Challenge => {
	// lets pick the operator and operands
	// tslint:disable: no-shadowed-variable
	let answer = true;
	const operator = ['+', '-', '/', '*'][~~(Math.random() * 4)];
	const operands = [Math.random() * 10 | 0, Math.random() * 10 | 0];

	// instead we could use eval, but this seems like a more optimal solution
	const op = {
		'+': (a, b) => a + b,
		'-': (a, b) => a - b,
		'*': (a, b) => a * b,
		'/': (a, b) => a / b
	}

	// if the operator is / then lets make the operands dividable
	if (operator == '/')
		if (!operands[1]) // lets not divide by zero
			operands[1] = 1;
		else if (operands[0] % operands[1] !== 0) {
			// lets factorize the larger operand and choose a random factor to replace the divider
			let i = +(operands[1] > operands[0]);
			let factors = [...Array(operands[i] + 1).keys()].filter(i => operands[i] % i === 0);
			operands[1] = factors[Math.random() * factors.length | 0];
			operands[0] = operands[i]
		}

	let value = op[operator](...operands);

	// if wrong answer flip then lets adjust the value a little™
	if (Math.random() < 0.5) {
		let oldValue = value;
		value = Math.random() * 10 | 0;

		// just in case we hit the same number again
		answer = oldValue == value;
	}

	return {
		operands,
		operator,
		answer,
		value,
		combined: operands.join(operator) + '=' + value
	}
};

/**
 * A new round is generated and previous rounds closed
 */
export const newRound = (): Promise<any> => {
	let challenge = generateChallenge();

	// now insert a new round and update all other round statuses to closed
	const newRound = admin.database().ref('/rounds').push();
	return Promise.all([
		newRound.set({
			key: newRound.key,
			date: admin.database.ServerValue.TIMESTAMP,
			challenge: challenge.combined,
			answer: challenge.answer
		}),
		admin.database().ref('/round').set({
			challenge: challenge.combined,
			key: newRound.key
		})
	]).then(() => {
		return {
			data: {
				result: Response.OK,
				rid: newRound.key
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
};

/**
 * Sets users's statuses to idle if they have been inactive for a while
 */
export const houseKeeping = async (): Promise<any> => {
	// TODO: remove old rounds
	// if the user has been idle for 10 minutes set the status to idle
	return admin.database().ref(`/users`).orderByChild('status').startAt('online').once('value').then(users => {
		let update = {};
		users.forEach((user: any) => {
			if ((new Date().getTime() - (user.val().lastAnswer || 0)) > 10 * 60 * 1000 && user.child('status').val() != 'disconnected')
				update[`${user.key}/status`] = 'idle';
		})

		return admin.database().ref(`/users`).update(update);
	});
};

/**
 * Sets the game up
 * @param {any} data The data deserialized from the request body
 * @param {CallableContext} context The metadata about the request
 */
export const join = functions.https.onCall(async (data, context) => {
	// Checking that the user is authenticated
	if (!context.auth)
		throw new functions.https.HttpsError('unauthenticated', 'permission denied');

	let openRounds = await admin.database().ref('/rounds').orderByChild('status').equalTo(null).once('value');
	if (!openRounds.hasChildren())
		await newRound();

	await houseKeeping();

	return {
		data: {
			result: Response.OK
		}
	}
});

/**
 * Checks if the provided answer is correct for the provided round id. If correct then closes the round and opens a new one.
 * 
 * @param {any} data The data deserialized from the request body
 * @param {string} data.rid The round id 
 * @param {boolean} data.answer The users' answer to the round
 * @param {string} token Deserialized Firebase authentication token
 * @param {Response} res Response object via update is sent back to the user
 */
export const checkAnswer = async (data, token, res) => {
	const roundRef = admin.database().ref(`/rounds/${data.rid}`);
	const userRef = admin.database().ref(`/users/${token.uid}`);
	return Promise.all([roundRef.once('value'), userRef.once('value')]).then(results => {
		// tslint:disable: no-shadowed-variable
		const [round, user] = results.map(r => r.val());

		if (!round)
			return res.send({
				data: {
					result: Response.ERROR,
					error: 'invalid round id'
				}
			})

		if (round.status)
			return res.send({
				data: {
					result: Response.ERROR,
					error: 'the round is closed id'
				}
			})

		if (data.answer == round.answer) {
			// now lets see if the correct answer is the first correct answer
			return roundRef.child('status').transaction(status => {
				// if the status has not been set then we are first to set it
				// that means all other should be denied the right to set the value...
				if (!status) return 'closed';

				// and so we must return undefined for all the other users
				return;
			}).then((commited) => Promise.all([
				// since we were able to close the round we can update users' score...
				userRef.update({
					score: (user.score || 0) + 1,
					lastAnswer: admin.database.ServerValue.TIMESTAMP,
					status: 'online'
				}).then(() => console.log('update done')),
				admin.database().ref(`/round`).update({
					status: 'closed',
					newRoundIn: new Date().getTime() + 5000
				}),
				houseKeeping(), // NOTE: this is not a good place for this function, as user database grows this function gets very slow
				setTimeout(newRound, 5000) // ... and start the new round
			])).then(() => res.send({
				data: {
					result: Response.OK,
					correct: true
				}
			})).catch((e) => {
				console.log(e, "transaction fail");

				return Promise.all([
					userRef.update({
						lastAnswer: admin.database.ServerValue.TIMESTAMP,
						status: 'online'
					}),
					houseKeeping()
				]).then(() => {
					// the user was correct, but not fast enough, we'll still record the answer time
					res.send({
						data: {
							result: Response.ERROR,
							correct: false
						}
					})
				})
			});
		} else {
			console.log("answer incorrect");

			return Promise.all([
				userRef.update({
					lastAnswer: admin.database.ServerValue.TIMESTAMP,
					status: 'online'
				}),
				houseKeeping()
			]).then(() => res.send({
				data: {
					result: Response.ERROR,
					correct: false
				}
			}));
		}
	});
};

/**
 * Registers the users' answer to the given round
 * 
 * @param {any} data The data deserialized from the request body
 * @param {string} data.rid The round id 
 * @param {boolean} data.answer The users' answer to the round
 * @param {CallableContext} context The metadata about the request
 */
export const answer = functions.https.onRequest((req, res) => cors(req, res, async () => {
	// Checking that the user is authenticated
	const tokenId = (req.get('Authorization') || '').split('Bearer ')[1];
	const token = await admin.auth().verifyIdToken(tokenId).catch(e => {
		// we don't really care for the fail reasons other that for debugging purposes
		console.log(e);
	});

	if (!token || !token.uid) {
		return res.status(401).send({
			result: Response.ERROR,
		})
	}

	return checkAnswer(req.body.data, token, res);
}));



export const generateAvataaarUrl = () => {
	const topTypes = [
		"NoHair", "Eyepatch", "Hat", "Hijab", "Turban", "WinterHat1", "WinterHat2", "WinterHat3", "WinterHat4", "LongHairBigHair", "LongHairBob", "LongHairBun", "LongHairCurly", "LongHairCurvy", "LongHairDreads", "LongHairFrida", "LongHairFro", "LongHairFroBand", "LongHairNotTooLong", "LongHairShavedSides", "LongHairMiaWallace", "LongHairStraight", "LongHairStraight2", "LongHairStraightStrand", "ShortHairDreads01", "ShortHairDreads02", "ShortHairFrizzle", "ShortHairShaggyMullet", "ShortHairShortCurly", "ShortHairShortFlat", "ShortHairShortRound", "ShortHairShortWaved", "ShortHairSides", "ShortHairTheCaesar", "ShortHairTheCaesarSidePart"
	];
	const top = topTypes[Math.random() * topTypes.length | 0];

	const topColors = [
		"Black", "Blue01", "Blue02", "Blue03", "Gray01", "Gray02", "Heather", "PastelBlue", "PastelGreen", "PastelOrange", "PastelRed", "PastelYellow", "Pink", "Red", "White"
	];
	const hairColor = topColors[Math.random() * topColors.length | 0];

	const accessories = [
		"Blank", "Kurt", "Prescription01", "Prescription02", "Round", "Sunglasses", "Wayfarers"
	];
	const accessory = accessories[Math.random() * accessories.length | 0];

	const facialHairTypes = [
		"Blank", "BeardMedium", "BeardLight", "BeardMagestic", "MoustacheFancy", "MoustacheMagnum"
	];
	const facialHair = facialHairTypes[Math.random() * facialHairTypes.length | 0];

	const facialHairColors = [
		"Auburn", "Black", "Blonde", "BlondeGolden", "Brown", "BrownDark", "Platinum", "Red"
	];
	const facialColor = facialHairColors[Math.random() * facialHairColors.length | 0];

	const clothingType = [
		"BlazerShirt", "BlazerSweater", "CollarSweater", "GraphicShirt", "Hoodie", "Overall", "ShirtCrewNeck", "ShirtScoopNeck", "ShirtVNeck"
	];
	const clothing = clothingType[Math.random() * clothingType.length | 0];

	const clothColor = [
		"Black", "Blue01", "Blue02", "Blue03", "Gray01", "Gray02", "Heather", "PastelBlue", "PastelGreen", "PastelOrange", "PastelRed", "PastelYellow", "Pink", "Red", "White"
	];
	const clothingColor = clothColor[Math.random() * clothColor.length | 0];

	const eyeType = [
		"Close", "Cry", "Default", "Dizzy", "EyeRoll", "Happy", "Hearts", "Side", "Squint", "Surprised", "Wink", "WinkWacky"
	];
	const eyes = eyeType[Math.random() * eyeType.length | 0];

	const eyeBrowType = [
		"Angry", "AngryNatural", "Default", "DefaultNatural", "FlatNatural", "RaisedExcited", "RaisedExcitedNatural", "SadConcerned", "SadConcernedNatural", "UnibrowNatural", "UpDown", "UpDownNatural"
	];
	const eyeBrows = eyeBrowType[Math.random() * eyeBrowType.length | 0];

	const mouthType = [
		"Concerned", "Default", "Disbelief", "Eating", "Grimace", "Sad", "ScreamOpen", "Serious", "Smile", "Tongue", "Twinkle", "Vomit"
	];
	const mouth = mouthType[Math.random() * mouthType.length | 0];

	const skinColor = [
		"Tanned", "Yellow", "Pale", "Light", "Brown", "DarkBrown", "Black"
	];
	const skin = skinColor[Math.random() * skinColor.length | 0];

	//https://avataaars.io/?avatarStyle=Circle&topType=ShortHairTheCaesar&accessoriesType=Round&hairColor=BrownDark&facialHairType=Blank&facialHairColor=Auburn&clotheType=ShirtCrewNeck&clotheColor=PastelOrange&eyeType=Side&eyebrowType=SadConcernedNatural&mouthType=Concerned&skinColor=DarkBrown'
	return "https://avataaars.io/?avatarStyle=Circle" +
		`&topType=${top}` +
		`&accessoriesType=${accessory}` +
		`&hairColor=${hairColor}` +
		`&facialHairType=${facialHair}` +
		`&facialHairColor=${facialColor}` +
		`&clotheType=${clothingType}` +
		`&clotheColor=${clothingColor}` +
		`&eyeType=${eyes}` +
		`&eyebrowType=${eyeBrows}` +
		`&mouthType=${mouth}` +
		`&skinColor=${skin}`;
};

/**
 * Creates /users/{uid} object with some metadata about the user
 * @param {UserRecord} user The data about the new user
 */
export const completeUserData = functions.auth.user().onCreate((user) => {
	console.log(user);
	if (!user || user.disabled) return;

	return admin.database().ref('/users').child(user.uid).set({
		photoURL: generateAvataaarUrl(),
		uid: user.uid,
		score: 0,
		lastAnswer: admin.database.ServerValue.TIMESTAMP
	});
});