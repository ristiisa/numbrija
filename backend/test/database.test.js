const firebase = require("@firebase/testing");
const fs = require("fs");
const ffest = require("firebase-functions-test")({
	databaseURL: "http://localhost:9000"
});

const sinon = require("sinon");
var assert = require("assert");


/*
 * ============
 *    Setup
 * ============
 */
const databaseName = "numbrija-db-test";
const rules = fs.readFileSync("../database.rules.json", "utf8");

/**
 * Creates a new app with authentication data matching the input.
 *
 * @param {object} auth the object to use for authentication (typically {uid: some-uid})
 * @return {object} the app.
 */
function authedApp(auth) {
	return firebase.initializeTestApp({databaseName, auth}).database();
}

/**
 * Creates a new admin app.
 *
 * @return {object} the app.
 */
function adminApp() {
	return firebase.initializeAdminApp({databaseName}).database();
}

/*
 * ============
 *  Test Cases
 * ============
 */
before(async () => {
	// Set database rules before running these tests
	await firebase.loadDatabaseRules({
		databaseName,
		rules: rules
	});
});

beforeEach(async () => {
	// Clear the database between tests
	await adminApp()
		.ref()
		.set(null);
});

after(async () => {
	// Close any open apps
	await Promise.all(firebase.apps().map(app => app.delete()));
});

describe("read score", () => {
	it("users should be able to read their own and others scores", async () => {
		const u1 = authedApp({uid: "u1"});

		// should be able to read score
		await firebase.assertSucceeds(u1.ref("users/u1").once('value'));
		await firebase.assertSucceeds(u1.ref("users/u2").once('value'));
	});
});

describe("score write", () => {
	it("users should not be able to alter their own score", async () => {
		const u1 = authedApp({uid: "u1"});

		// should not be able to alter score
		await firebase.assertFails(u1.ref("user/u1").set({score: 1}));
		await firebase.assertFails(u1.ref("user/u2").set({score: 1}));
	});
});

describe("read round", () => {
	it("users should be able to read round but not round answers", async () => {
		const u1 = authedApp({uid: "u1"});

		// should be able to read round...
		await firebase.assertSucceeds(u1.ref("round").once('value'));

		// ... but not read rounds
		await firebase.assertFails(u1.ref("rounds").once('value'));
		await firebase.assertFails(u1.ref("rounds/0/answer").once('value'));
	});
});

describe("round write", () => {
	it("users should not be able to alter round data", async () => {
		const u1 = authedApp({uid: "u1"});

		// should not be able to alter rounds
		await firebase.assertFails(u1.ref("rounds").set({0: {answer: 0}}));
		await firebase.assertFails(u1.ref("rounds/0").set({answer: 0}));
		await firebase.assertFails(u1.ref("round").set({challenge: 1}));
	});
});