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

beforeEach(async () => {
    // Clear the database between tests
    return adminApp().ref().set(null);
});

after(async () => {
    // Close any open apps
    return Promise.all(firebase.apps().map(app => app.delete()));
});

describe("housekeeping", () => {
    let db = adminApp();
    let now = new Date().getTime();

    let tests = [
        {it: "should set the idle users' status to idle", lastAnswer: 0, status: 'online', expected: 'idle'},
        {it: "should not set the disconnected user status to idle", lastAnswer: 0, status: 'disconnected', expected: 'disconnected'},
        {it: "should not set the non idle users' status to idle", lastAnswer: now, status: 'online', expected: 'online'},
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
/*
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
});*/

describe("answer", () => {
    let db = adminApp();
    Object.defineProperty(admin, 'auth', {
        get: () => {
            return sinon.stub().returns({
                verifyIdToken: sinon.stub().returns(Promise.resolve({
                    uid: 0
                }))
            })
        }
    });
/*
    it("should increase the score of user if the answer is correct", async () => {
        Object.defineProperty(lib, 'newRound', {get: () => sinon.stub().returns(Promise.resolve())});
        Object.defineProperty(lib, 'houseKeeping', {get: () => sinon.stub().returns(Promise.resolve())});

        let challenge = {
            answer: true,
            challenge: '1+1=2',
            key: 0
        };

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

        const req = {answer: challenge.answer, rid: challenge.key};
        const rsp = {
            send: (data) => {
                assert.equal(data.correct, true);
                return Promise.resolve()
            }
        };

        await lib.checkAnswer(req, {uid: 0}, rsp);
        let user = await db.ref("/users/0").once('value');
        assert.equal(user.child('score').val(), 2);
    });

    it("should not increase the score of user if the answer is not correct", async () => {
        Object.defineProperty(lib, 'newRound', {get: () => sinon.stub().returns(Promise.resolve())});
        Object.defineProperty(lib, 'houseKeeping', {get: () => sinon.stub().returns(Promise.resolve())});

        let challenge = {
            answer: true,
            challenge: '1+1=2',
            key: 0
        };

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

        const req = {answer: !challenge.answer, rid: challenge.key};
        const rsp = {
            send: (data) => {
                assert.notEqual(data.correct, true);
                return Promise.resolve()
            }
        };

        await lib.checkAnswer(req, {uid: 0}, rsp);
        let user = await db.ref("/users/0").once('value');
        assert.notEqual(user.child('score').val(), 2);
    });

    /*it("should not return positive result for answer correctnes", async () => {
        Object.defineProperty(lib, 'newRound', {get: () => sinon.stub().returns(Promise.resolve())});
        Object.defineProperty(lib, 'houseKeeping', {get: () => sinon.stub().returns(Promise.resolve())});

        let challenge = {
            answer: true,
            challenge: '1+1=2',
            key: 0
        };

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

        const req = {answer: !challenge.answer, rid: challenge.key};
        const rsp = {
            send: (data) => {
                console.log(data)
                assert.notEqual(data.correct, true);

                return Promise.resolve()
            }
        };

        await lib.checkAnswer(req, {uid: 0}, rsp);
    });*/

    /*it("should return positive result for answer correctnes", async () => {
        Object.defineProperty(lib, 'newRound', {get: () => sinon.stub().returns(Promise.resolve())});
        Object.defineProperty(lib, 'houseKeeping', {get: () => sinon.stub().returns(Promise.resolve())});

        let challenge = {
            answer: true,
            challenge: '1+1=2',
            key: 0
        };

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

        const req = {answer: challenge.answer, rid: challenge.key};

        const rspCalled = new rx.ReplaySubject();
        const rsp = {
            send: (data) => {
                console.log('send', data)
                rspCalled.next(data);
                return Promise.resolve()
            }
        };

        await lib.checkAnswer(req, {uid: 0}, rsp);
        rspCalled.toPromise().then(() => console.log('rspcalled'));
        let result = await rspCalled.toPromise().then(() => console.log('rspcalled'));
        console.log('done', result)
    });*/
});