import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFireDatabase } from '@angular/fire/database';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class AuthService {
	auth: any = null;
	redirectUrl: string = "/";
	photoURL: Promise<{}>;

	constructor(private af: AngularFireAuth, private db: AngularFireDatabase, private router: Router) {
		af.authState.subscribe((auth) => {
			this.auth = auth;

			if (auth && auth.uid) {
				var ref = db.database.ref(`users/${auth.uid}/status`);
				ref.set('online');
				ref.onDisconnect().set("disconnect");

				this.photoURL = db.object(`users/${auth.uid}`).valueChanges().toPromise().then(url => {console.log(url); return url});
			}
		});
	}

	get authenticated(): boolean {
		return this.auth !== null;
	}

	get state(): Observable<any> {
		return this.af.authState
	}

	get uid(): any {
		return this.auth.uid;
	}

	signIn(){
		return this.af.auth.signInAnonymously();
	}

	signOut() {
		this.af.auth.signOut();
	}
}
