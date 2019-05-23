import { Component } from "@angular/core";
import { AngularFireFunctions } from "@angular/fire/functions";
import { environment } from "src/environments/environment";
import { HttpClient } from "@angular/common/http";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"]
})
export class AppComponent {
	constructor(private functions: AngularFireFunctions, private http: HttpClient) {
		if (!environment.production)
			this.functions.functions.useFunctionsEmulator("http://localhost:5000");
	}
}
