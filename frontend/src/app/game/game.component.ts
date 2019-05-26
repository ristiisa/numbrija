import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { AngularFireFunctions } from "@angular/fire/functions";
import { AngularFireDatabase } from "@angular/fire/database";
import { AuthService, ConnectionStatus } from "../auth.service";
import { take, timeout } from "rxjs/operators";
import { confetti } from "dom-confetti";
declare var $: any;

interface Round {
	key?;
	challenge;
	closedBy?;
	status?;
	newRoundIn?;
}

@Component({
	selector: "app-game",
	templateUrl: "./game.component.html",
	styleUrls: ["./game.component.scss"]
})
export class GameComponent implements OnInit {
	challenge: any;
	players: any = {};
	playerIds: any = [];
	roundId: any = 1;
	newChallengeLoading = false;
	checking = false;
	interval: any;
	timeLeft: number;
	newRoundStart: any;
	answerRecorded: number;
	correct = false;
	score: any[];
	message: string;
	roundsLoaded: boolean;
	usersLoaded: boolean;
	firstDisconnectMessage = true;
	statusString = ['online', 'idle', 'offline'];
	initDone:boolean;

	constructor(private functions: AngularFireFunctions, private db: AngularFireDatabase, public auth: AuthService, private cd: ChangeDetectorRef) {
	}

	ngOnInit() {
		this.auth.state.pipe(take(1)).subscribe(() => {
			// NOTE: this does not work in chrome dev-tools if set to offline
			// https://github.com/firebase/firebase-js-sdk/issues/249
			this.db.database.ref(".info/connected").on("value", connected => {
				if (connected.val() === true) {
					$('#connectionDown').modal('setting', 'closable', false).modal('hide');

					// we are now logged in but we must also check if we can join the game
					this.joinGame().then(joined => {
						if (joined) this.initGame();
						else $("#serverDeclined").modal('setting', 'closable', false).modal('show');
					});
				} else {
					if (!this.firstDisconnectMessage)
						$('#connectionDown').modal('setting', 'closable', false).modal('show');

					this.firstDisconnectMessage = false;
				}
			});
		});
	}

	joinGame(): Promise<boolean> {
		return this.functions.httpsCallable("join")({}).toPromise<any>().then(rsp => {
			return rsp.data.result;
		});
	}

	reJoinGame(e){
		const classList = e.target.classList;
		classList.add("loading");
		
		this.joinGame().then(joined => {
			if (!joined) $("#serverDeclined").modal('setting', 'closable', false).modal('show');
		}).finally(() => {
			classList.remove("loading");
			$("#idle").modal('hide');
		});

	}

	initGame() {
		if(this.initDone) return;
		this.initDone = true;

		this.db.object<Round>("/round").valueChanges().subscribe(round => {
			if (!round) return;

			this.challenge = round.challenge;
			this.roundId = round.key;
			this.newChallengeLoading = round.status === "closed";
			this.newRoundStart = round.newRoundIn;

			// if the round is closed that means that there will be a new one soon
			if (round.status === "closed") {
				this.startTimer();
				if (round.closedBy !== this.auth.uid) {
					if ($(`#${round.closedBy}`).length > 0) {
						$(`#${round.closedBy}`).transition("pulse");
						$(`#${round.closedBy}.score`).addClass("plusone");
					}
					this.message = "Too Slow!";

					$("#message").removeClass('active');
					$("#answer").addClass('active');
				}
			} else {
				// if the round is not closed we should stop the countdown...
				this.pauseTimer();

				// and show the control for answering to the user
				$("#message").removeClass('active');
				$("#answer").addClass('active');
			}

			this.roundsLoaded = true;
		});

		this.db.object<any>("/users").valueChanges().subscribe(users => {
			const playerIds = [];

			// lets filter out all the disconnected users...
			// NOTE: we could use filter here BUT that would mean that we have to use trackBy on the template side
			Object.keys(users).forEach(uid => {
				if (uid === this.auth.uid)
					this.score = users[uid].score;

				if (users[uid].status !== ConnectionStatus.Offline) {
					this.players[uid] = users[uid];
					playerIds.push(uid);
				}

				if(uid == this.auth.uid) {
					if(users[uid].status == ConnectionStatus.Idle) {
						$('#idle').modal('setting', 'closable', false).modal('show');
					}
				}
			});

			// and sort them by score
			this.playerIds = playerIds.sort((u1, u2) => this.players[u2].score - this.players[u1].score);

			this.usersLoaded = true;
		});
	}

	answer(answer, e) {
		// we are triggering change detection because we don't want our users clicking on both of the buttons
		this.checking = true;
		this.cd.detectChanges();

		const classList = e.target.classList;
		classList.add("loading");

		this.functions.httpsCallable("answer")({ answer, rid: this.roundId }).toPromise<any>().then(rsp => {
			if (rsp && rsp.result && rsp.correct) {
				this.newChallengeLoading = true;
				this.answerRecorded = new Date().getTime();
				this.message = "Correct!";

				if ($(".active.side").first().attr('id') === "answer") {
					$("#answer").removeClass('active');
					$("#message").addClass('active');
				}

				$(".game").transition("jiggle");

				// yay!
				confetti($("body")[0], { duration: 3000 });
			} else {
				this.message = "Try Again!";

				if ($(".active.side").first().attr('id') === "answer") {
					$("#answer").removeClass('active');
					$("#message").addClass('active');
				}

				$(".game").transition("shake");
			}

			// lets flip back to the input side, so the user can guess again
			setTimeout(() => {
				$("#message").removeClass('active');
				$("#answer").addClass('active');
			}, 2000);
		}).finally(() => {
			classList.remove("loading");
			this.checking = false;

			// some times on a mobile device (perhaps on slower browsers) change detection has a slight delay
			// and it was annoying to have to wait until the buttons become active
			this.cd.detectChanges();
		});
	}

	startTimer() {
		this.timeLeft = 5000;
		this.interval = setInterval(() => {
			this.timeLeft = this.newRoundStart - new Date().getTime();

			if (this.timeLeft < 0) this.pauseTimer();
		}, 1000);
	}

	pauseTimer() {
		clearInterval(this.interval);
	}
}
