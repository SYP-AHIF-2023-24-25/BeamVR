import {Component} from '@angular/core';
import {KeycloakService} from "keycloak-angular";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {environment} from "../../environment/environment";

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    isLoggedIn = false;
    isAuthorized = false;
    errorMessage: string = '';

    constructor(private keycloakService: KeycloakService, private http: HttpClient) {
        this.isLoggedIn = this.keycloakService.isLoggedIn();
        this.keycloakService.getToken().then(async token => {
            if (token) {
                this.getProtectedResource();
            }
        });
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

   getProtectedResource() {
        this.keycloakService.getToken().then(token => {
            const headers = new HttpHeaders().set('Authorization', 'Bearer ' + token);
            this.http.get(environment.apiBaseUrl + 'protected', { headers, responseType: 'text' })
                .subscribe({
                    next: result => {
                        this.isAuthorized = true;
                        console.log(result);
                    },
                    error: error => {
                        this.errorMessage = 'Not authorized to access this resource';
                        this.isAuthorized = false;
                        console.error(error);
                    }
                });
        });
    }
}