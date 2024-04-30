import {Component, OnInit} from '@angular/core';
import {KeycloakService} from "keycloak-angular";

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    isLoggedIn = false;
    username: string = '';
    password: string = '';
    showPassword: boolean = false;

    // showPassword: boolean = false;

    constructor(private keycloakService: KeycloakService) {
        this.isLoggedIn = this.keycloakService.isLoggedIn();
        this.keycloakService.getToken().then(token => {
            console.log(token);
        });
    }

    togglePassword(): void {
        this.showPassword = !this.showPassword;
    }

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