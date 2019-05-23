import { Injectable, OnInit } from "@angular/core";
import { ActivatedRouteSnapshot, Router, ActivatedRoute, RouterStateSnapshot, CanActivate } from "@angular/router";
import { AuthService } from "./auth.service";
import { Observable, from } from "rxjs";

import { map, take, tap } from "rxjs/operators";

@Injectable({
	providedIn: "root"
})
export class AuthGuard implements CanActivate {
	path: ActivatedRouteSnapshot[];
	return: any;

	constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) { }

	canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | boolean {
		if (this.auth.authenticated)
			return true;

		return from(this.auth.signIn().then(() => true));
	}
}
