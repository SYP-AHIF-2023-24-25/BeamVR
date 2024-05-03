import { Component } from '@angular/core';
import { KeycloakService } from "keycloak-angular";
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    isLoggedIn = false;
    errorMessage: string = '';

    constructor(private keycloakService: KeycloakService, private router: Router) {
        this.isLoggedIn = this.keycloakService.isLoggedIn();
        this.keycloakService.getToken().then(token => {
            console.log(token);
        });
    }

    /* const navigation = this.router.getCurrentNavigation();
    const state = navigation && navigation.extras && navigation.extras.state;

    if (state && state['error']) {
        if (state['error'] === 'untrusted') {
            this.errorMessage = 'Sorry, but you are not authorized to view this page!';
            this.logout();
        } if(state['error'] === 'notLoggedIn'){
            this.errorMessage = 'Please login to view this page!';
        } else {
            this.errorMessage = 'An error occurred. Please try again.';
        }
    }
    if(state && state['loggedOut']){
        this.errorMessage = 'You have been logged out!';
    }

    this.isLoggedIn = this.keycloakService.isLoggedIn();
    this.keycloakService.getToken().then(token => {
        this.cookieService.set('token', token);
        if(this.isLoggedIn){
            this.router.navigate(['/admin']);
        }
    }); */

    async login(): Promise<void> {
        if (this.isLoggedIn) {
            return
        }
        await this.keycloakService.login();
    }

    async logout(): Promise<void> {
        if (!this.isLoggedIn) {
            return;
        }
        await this.keycloakService.logout();
    }
}