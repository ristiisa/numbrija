import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFireDatabase } from "@angular/fire/database";
import { Router } from "@angular/router";
import { Observable } from "rxjs";

export enum ConnectionStatus {
	Online = 0,
	Idle = 1,
	Offline = 2
};

@Injectable({
	providedIn: "root"
})
export class AuthService {
	auth: any = null;
	photoURL: any;

	constructor(private af: AngularFireAuth, private db: AngularFireDatabase, private router: Router) {
		af.authState.subscribe((auth) => {
			this.auth = auth;

			if (auth && auth.uid) {
				const ref = db.database.ref(`users/${auth.uid}/status`);
				ref.onDisconnect().set(ConnectionStatus.Offline);

				this.photoURL = db.object(`users/${auth.uid}/photoURL`).valueChanges();
			}
		});
	}

	/**
	 * Return true if AngularFire.authState has triggered and the user was logged in
	 */
	get authenticated(): boolean {
		return this.auth !== null;
	}

	get state(): Observable<any> {
		return this.af.authState;
	}

	get uid(): any {
		return this.auth.uid;
	}

	signIn() {
		return this.af.auth.signInAnonymously();
	}

	signOut() {
		this.af.auth.signOut();
	}
}
