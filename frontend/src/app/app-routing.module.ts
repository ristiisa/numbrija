import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { AuthGuard } from "./auth-guard";
import { GameComponent } from './game/game.component';
import { LoginComponent } from './login/login.component';

const routes: Routes = [
	{ path: '', component: GameComponent, canActivate: [AuthGuard] },
	{ path: 'login', component: LoginComponent }
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule { }
