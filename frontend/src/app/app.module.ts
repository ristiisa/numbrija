import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { AngularFireModule } from '@angular/fire';
import { AngularFireDatabaseModule } from '@angular/fire/database';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFireFunctionsModule } from '@angular/fire/functions';

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { environment } from '../environments/environment';
import { LoginComponent } from './login/login.component';
import { GameComponent } from './game/game.component';

@NgModule({
	declarations: [
	AppComponent,
	LoginComponent,
	GameComponent
	],
	imports: [
		BrowserModule,
		AppRoutingModule,
		AngularFireModule.initializeApp(environment.firebase),
		AngularFirestoreModule,
		AngularFireAuthModule,
		AngularFireStorageModule,
		AngularFireFunctionsModule,
		AngularFireDatabaseModule
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule { }
