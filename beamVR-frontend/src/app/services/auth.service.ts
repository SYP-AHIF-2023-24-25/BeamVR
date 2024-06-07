import { Injectable } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    constructor(private keycloakService: KeycloakService) { }

    async isLoggedIn(): Promise<boolean> {
        return this.keycloakService.isLoggedIn();
    }

    async login(): Promise<void> {
        await this.keycloakService.login();
    }

    async logout(): Promise<void> {
        await this.keycloakService.logout(window.location.origin);
    }

    async getToken(): Promise<string | null> {
        return await this.keycloakService.getToken();
    }
}