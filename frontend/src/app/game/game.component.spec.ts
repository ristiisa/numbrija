import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { GameComponent } from "./game.component";
import { AngularFireModule } from "@angular/fire";
import { environment } from "src/environments/environment";
import { AngularFirestoreModule } from "@angular/fire/firestore";
import { AngularFireAuthModule } from "@angular/fire/auth";
import { AngularFireStorageModule } from "@angular/fire/storage";
import { AngularFireFunctionsModule, AngularFireFunctions } from "@angular/fire/functions";
import { AngularFireDatabaseModule } from "@angular/fire/database";
import { HttpClientModule } from "@angular/common/http";
import { RouterTestingModule } from "@angular/router/testing";
import { AngularFireAuth } from "@angular/fire/auth";

import { AuthService } from "../auth.service";

describe("GameComponent", () => {
	let component: GameComponent;
	let fixture: ComponentFixture<GameComponent>;
	let spy: jasmine.Spy;

	beforeEach(async(() => {
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
			],
			declarations: [
				GameComponent
			],
			providers: [
				AuthService,
				AngularFireAuth,
				AngularFireFunctions
			]
		}).compileComponents();
	}));

	beforeEach(async () => {
		const auth: AuthService = TestBed.get(AuthService);
		await auth.signIn();

		fixture = TestBed.createComponent(GameComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();

		const functions: AngularFireFunctions = TestBed.get(AngularFireFunctions);
		spy = spyOn(functions, "httpsCallable").and.callThrough();
	});

	it("should be created", () => {
		expect(component).toBeTruthy();
	});

	it("should call join", () => {
		expect(spy).toHaveBeenCalled();
	});
});
