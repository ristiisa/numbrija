import { Component } from "@angular/core";
import { AngularFireFunctions } from '@angular/fire/functions';
import { AngularFireDatabase } from '@angular/fire/database';
import { environment } from 'src/environments/environment';

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"]
})
export class AppComponent {
	title = "numbrija";

	constructor(private functions: AngularFireFunctions, private db: AngularFireDatabase) {
		if (!environment.production)
			this.functions.functions.useFunctionsEmulator('http://localhost:5000');
	}

	ngOnInit(){
		this.functions.httpsCallable('helloWorld')({}).toPromise().then((data) => {
			this.title = data;
		})
	}
}
