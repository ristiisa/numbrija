import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/functions';
import { AngularFireDatabase } from '@angular/fire/database';
import { AuthService } from '../auth.service';
import { take, timeout } from "rxjs/operators";
import { confetti } from 'dom-confetti';

declare var $: any;

type Round = {
	key?,
	challenge,
	status?,
	newRoundIn?
}

@Component({
	selector: 'app-game',
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
	challenge: any;
	players: any;
	roundId: any = 1;
	newChallengeLoading = false;
	checking: boolean = false;
	interval: any;
	timeLeft: number;
	newRoundStart: any;
	answerRecorded: number;

	constructor(private functions: AngularFireFunctions, private db: AngularFireDatabase, public auth: AuthService, private cd: ChangeDetectorRef) {
		auth.state.pipe(take(1)).subscribe(() => {
			this.functions.httpsCallable('join')({}).toPromise<any>().then(rsp => {
				console.log(rsp)
				if (rsp.result) {
					this.db.object('/rounds').valueChanges().subscribe(rounds => {
						console.log(rounds);
					})
				} else {
					// TODO: show error perhaps
				}
			});

			// NOTE: this does not work in chrome dev-tools
			// https://github.com/firebase/firebase-js-sdk/issues/249
			db.database.ref('.info/connected').on('value', connected => {
				var ref = db.database.ref(`users/${auth.uid}/status`);
				if (connected.val() === true) {
					ref.set('online');
				} else {
					// TODO: show disconnected overlay
				}
			});
		})
	}

	ngOnInit() {
		this.db.object<Round>('/round').valueChanges().subscribe(round => {
			if (!round) return;

			console.log('time from answer to new round', ((new Date().getTime() - this.answerRecorded) / 1000), 'seconds');

			this.challenge = round.challenge;
			this.roundId = round.key;
			this.newChallengeLoading = round.status == 'closed';
			this.newRoundStart = round.newRoundIn;

			// if the round is closed that means that there will be a new one soon
			if (round.status == 'closed')
				this.startTimer();
			else {
				// if the round is not closed we should stop the countdown...
				this.pauseTimer();

				// and show the control for answering to the user
				if($('.active.side')[0].id != 'answer')
					$('.shape').shape('set next side', '#answer').shape('flip up');
			}
		});

		this.db.object<any>('/users').valueChanges().subscribe(users => {
			this.players = Object.values<any>(users).filter(u => u.status != 'disconnect').sort((u1, u2) => u2.score - u1.score);
		})
	}

	answer(answer, e) {
		const classList = e.target.classList;
		classList.add('loading');

		this.checking = true
		this.functions.httpsCallable('answer')({ answer, rid: this.roundId }).toPromise<any>().then(rsp => {
			console.log(rsp)
			if (rsp && rsp.result && rsp.correct) {
				this.newChallengeLoading = true;
				this.answerRecorded = new Date().getTime();

				$('.shape').shape('set next side', '#correct').shape('flip right');
				$('.card').transition('jiggle');
				
				// yay!
				confetti($('body')[0], {duration: 3000});
			} else {
				console.log("try again!");
				$('.shape').shape('set next side', '#wrong').shape('flip left');
				$('.card').transition('shake');

				//lets flip back to the input side, so the user can guess again
				setTimeout(() => {
					if($('.active.side')[0].id != 'answer') {
						$('.shape').shape('set next side', '#answer').shape('flip up');
					}
				}, 2000);
			}
		}).finally(() => {
			classList.remove('loading');
			this.checking = false;

			this.cd.detectChanges();
		});
	}

	startTimer() {
		this.interval = setInterval(() => {
			this.timeLeft = this.newRoundStart - new Date().getTime();

			if (this.timeLeft < 0) this.pauseTimer();
		}, 1000)
	}

	pauseTimer() {
		clearInterval(this.interval);
	}
}
