import { TestBed } from "@angular/core/testing";

import { AuthGuard } from "./auth-guard";
import { RouterTestingModule } from "@angular/router/testing";
import { AngularFireModule } from "@angular/fire";
import { environment } from "src/environments/environment";
import { AngularFirestoreModule } from "@angular/fire/firestore";
import { AngularFireAuthModule } from "@angular/fire/auth";
import { AngularFireStorageModule } from "@angular/fire/storage";
import { AngularFireFunctionsModule } from "@angular/fire/functions";
import { AngularFireDatabaseModule } from "@angular/fire/database";
import { HttpClientModule } from "@angular/common/http";

describe("AuthGuardService", () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [
				RouterTestingModule,
				AngularFireModule.initializeApp(environment.firebase),
				AngularFirestoreModule,
				AngularFireAuthModule,
				AngularFireStorageModule,
				AngularFireFunctionsModule,
				AngularFireDatabaseModule,
				HttpClientModule
			]}).compileComponents();
	});

	it("should be created", () => {
		const service: AuthGuard = TestBed.get(AuthGuard);
		expect(service).toBeTruthy();
	});
});
