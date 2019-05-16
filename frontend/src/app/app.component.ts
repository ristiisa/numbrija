import { Component } from "@angular/core";
import { AngularFireFunctions } from '@angular/fire/functions';
import { AngularFireDatabase } from '@angular/fire/database';
import { environment } from 'src/environments/environment';
import { defineBase } from '@angular/core/src/render3';
import { AuthService } from './auth.service';

type Response = {
	result: number
}

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"]
})
export class AppComponent {
	title = "numbrija";

	constructor(private functions: AngularFireFunctions, private db: AngularFireDatabase, public auth: AuthService) {
		if (!environment.production)
			this.functions.functions.useFunctionsEmulator('http://localhost:5000');
	}

	ngOnInit(){
		this.functions.httpsCallable('join')({}).toPromise<Response>().then(rsp => {
			console.log(rsp)
			if(rsp.result) {
				this.db.object('/rounds').valueChanges().subscribe(rounds => {
					console.log(rounds);
				})
			}
		})
	}

	roundtick() {
		this.functions.httpsCallable('round')({}).toPromise<Response>().then(rsp => {
			console.log(rsp)
		})
	}
}
