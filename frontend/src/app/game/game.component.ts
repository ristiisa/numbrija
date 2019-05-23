import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { AngularFireFunctions } from "@angular/fire/functions";
import { AngularFireDatabase } from "@angular/fire/database";
import { AuthService } from "../auth.service";
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

	constructor(private functions: AngularFireFunctions, private db: AngularFireDatabase, public auth: AuthService, private cd: ChangeDetectorRef) {
		
	}

	ngOnInit() {
		this.auth.state.pipe(take(1)).subscribe(() => {
			this.functions.httpsCallable("join")({}).toPromise<any>().then(rsp => {
				console.log(rsp)
				if (rsp.data.result) {
					this.initGame();
				} else {
					$("#serverDeclined").modal('show');
				}
			});

			// NOTE: this does not work in chrome dev-tools
			// https://github.com/firebase/firebase-js-sdk/issues/249
			this.db.database.ref(".info/connected").on("value", connected => {
				const ref = this.db.database.ref(`users/${this.auth.uid}/status`);
				if (connected.val() === true) {
					ref.set("online");
					$('#connectionDown').modal('hide');
				} else {
					$('#connectionDown').modal('show');
				}
			});
		});
	}

	initGame() {
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
						console.log(round.closedBy, $(`#${round.closedBy}`));
						$(`#${round.closedBy}`).transition("pulse");
						$(`#${round.closedBy}.score`).addClass("plusone");
					}
					this.message = "Too Slow!";

					if ($(".active.side").eq(0).id === "answer")
						$(".ui.shape").eq(0).shape("flip down");
				}
			} else {
				// if the round is not closed we should stop the countdown...
				this.pauseTimer();

				// and show the control for answering to the user
				if ($(".active.side").eq(0).id !== "answer")
					$(".ui.shape").eq(0).shape("flip up");
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

				if (users[uid].status !== "disconnect") {
					this.players[uid] = users[uid];
					playerIds.push(uid);
				}
			});

			// and sort them by score
			this.playerIds = playerIds.sort((u1, u2) => this.players[u2].score - this.players[u1].score);

			this.usersLoaded = true;
		});
	}

	answer(answer, e) {
		// we are triggering change detection because we don"t want our users clicking on both of the buttons
		this.checking = true;
		this.cd.detectChanges();

		const classList = e.target.classList;
		classList.add("loading");

		this.functions.httpsCallable("answer")({ answer, rid: this.roundId }).toPromise<any>().then(rsp => {
			if (rsp && rsp.result && rsp.correct) {
				this.newChallengeLoading = true;
				this.answerRecorded = new Date().getTime();
				this.message = "Correct!";
				if ($(".active.side").eq(0).id === "answer")
					$(".ui.shape").eq(0).shape("flip right");

				$(".game").transition("jiggle");

				// yay!
				confetti($("body").eq(0), { duration: 3000 });
			} else {
				this.message = "Try Again!";

				if ($(".active.side").eq(0).id === "answer")
					$(".ui.shape").eq(0).shape("flip left");

				$(".game").transition("shake");

				// lets flip back to the input side, so the user can guess again
				setTimeout(() => {
					$(".ui.shape").eq(0).shape("flip up");
				}, 2000);
			}
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
