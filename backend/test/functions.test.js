const firebase = require("@firebase/testing");
const fs = require("fs");
const ffest = require("firebase-functions-test")({
    databaseURL: "http://localhost:9000"
});

const sinon = require("sinon");
const assert = require("assert");
const httpMocks = require('node-mocks-http');
const rx = require('rxjs')
/*
 * ============
 *    Setup
 * ============
 */
const databaseName = "numbrija-functions-test";
const rules = fs.readFileSync("../database.rules.json", "utf8");

const admin = require("firebase-admin");
sinon.stub(admin, "initializeApp");

const lib = require("../lib/index");

ConnectionStatus = {
	Online : 1,
	Idle: 2,
	Offline: 3
};

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

    Object.defineProperty(admin, 'database', {
        get: () => {
            return Object.assign(sinon.stub().returns(adminApp()), {
                ServerValue: {
                    TIMESTAMP: 0
                }
            })
        }
    });
});

after(async () => {
    // Close any open apps
    return Promise.all(firebase.apps().map(app => app.delete()));
});

afterEach(async () => {
    // Clear the database between tests
    return adminApp().ref().set(null);
});

describe("housekeeping", () => {
    let db = adminApp();
    let now = new Date().getTime();

    let tests = [
        {it: "should set the idle users' status to idle", lastAnswer: 0, status: ConnectionStatus.Online, expected: ConnectionStatus.Idle},
        {it: "should not set the disconnected user status to idle", lastAnswer: 0, status: ConnectionStatus.Offline, expected: ConnectionStatus.Offline},
        {it: "should not set the non idle users' status to idle", lastAnswer: now, status: ConnectionStatus.Online, expected: ConnectionStatus.Online},
    ];

    tests.forEach(test => {
        it(test.it, async () => {
            await db.ref().set({
                users: {
                    0: {
                        lastAnswer: test.lastAnswer,
                        status: test.status
                    }
                }
            });

            await lib.houseKeeping();
            let data = await db.ref("users/0").once('value');

            assert(data.val().status, test.expected);
        });
    });
});

describe("generateChallenge", () => {
    it("should create valid challenge", async () => {
        let challenge = lib.generateChallenge();

        assert(challenge.combined, challenge.operands.join(challenge.operator) + '=' + challenge.value);
    });
});

describe("newRound", () => {
    it("should create new round with the correct challenge", async () => {
        let db = adminApp();

        let challenge = {
            operands: [1, 1],
            operator: '+',
            answer: true,
            value: 2,
            combined: '1+1=2'
        };

        Object.defineProperty(lib, 'generateChallenge', {get: () => sinon.stub().returns(challenge)});

        await lib.newRound();

        let round = await db.ref("round").once('value');
        let rounds = await db.ref("rounds").once('value');

        assert.equal(round.val().challenge, challenge.combined);
        assert(rounds.child(round.val().key).child('challenge').val(), challenge.combined);
    });
});

describe("answer", async () => {
    let db, rspData, challenge, rsp;
    
    // for some reason mocking bleed is contained in the hooks... so if it works lets do our setup in here
    before(async () => {
        db = adminApp();
        Object.defineProperty(admin, 'auth', {
            get: () => {
                return sinon.stub().returns({
                    verifyIdToken: sinon.stub().returns(Promise.resolve({
                        uid: 0
                    }))
                })
            }
        });

        // lets override the newRound and houseKeeping functions as we test them separately
        Object.defineProperty(lib, 'newRound', {get: () => sinon.stub().returns(Promise.resolve())});
        Object.defineProperty(lib, 'houseKeeping', {get: () => sinon.stub().returns(Promise.resolve())});

        challenge = {
            answer: true,
            challenge: '1+1=2',
            key: 0
        };

        rsp = {
            send: (data) => {
                rspData = data;
                return Promise.resolve()
            }
        };
    });

    beforeEach(async () => {
        await db.ref().set({
            rounds: {
                [challenge.key]: challenge
            },
            users: {
                0: {
                    score: 1
                }
            }
        });
    });

    it("should increase the score of user if the answer is correct", async () => {
        let scoreBefore = (await db.ref("/users/0/score").once('value')).val();
        await lib.checkAnswer({answer: challenge.answer, rid: challenge.key}, {uid: 0}, rsp);
        let scoreAfter = (await db.ref("/users/0/score").once('value')).val();

        assert.equal(scoreAfter, scoreBefore + 1);
    });

    it("should decrease the score of user if the answer is incorrect", async () => {
        let scoreBefore = (await db.ref("/users/0/score").once('value')).val();
        await lib.checkAnswer({answer: !challenge.answer, rid: challenge.key}, {uid: 0}, rsp);
        let scoreAfter = (await db.ref("/users/0/score").once('value')).val();

        assert.equal(scoreAfter, scoreBefore - 1);
    });

    it("should respond ok if the answer is correct", async () => {
        await lib.checkAnswer({answer: challenge.answer, rid: challenge.key}, {uid: 0}, rsp);

        assert.equal(rspData.data.result, true);
        assert.equal(rspData.data.correct, true);
    });

    it("should respond nok if the answer is correct", async () => {
        await lib.checkAnswer({answer: !challenge.answer, rid: challenge.key}, {uid: 0}, rsp);

        assert.equal(rspData.data.result, true);
        assert.equal(rspData.data.correct, false);
    });
});

describe("generateAvataaarUrl", () => {
    it("should create valid avataaar url", () => {
        let genUrl = lib.generateAvataaarUrl();

        const http = require('http');
        const url = require('url');

        let rsp = new Promise((resolve, reject) => {
            let options = {method: 'HEAD', host: url.parse(genUrl).host, port: 80, path: url.parse(genUrl).pathName};
            let req = http.request(options, data => {
                resolve(data)
            });
            req.end();
        });

        // instead of downloading the image from avataaar we check the status of the response
        return rsp.then((data) => assert(data.statusCode >= 200 && data.statusCode < 400));
    });
});