import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environment/environment';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
    isLoggedIn = false;
    isAuthorized = false;
    errorMessage: string = '';

    constructor(private authService: AuthService, private http: HttpClient) {}

    async ngOnInit() {
        this.isLoggedIn = await this.authService.isLoggedIn();
        if (this.isLoggedIn) {
            this.getProtectedResource();
        }
    }

    async login(): Promise<void> {
        if (this.isLoggedIn) {
            return;
        }
        this.authService.login();
    }

    async logout(): Promise<void> {
        if (!this.isLoggedIn) {
            return;
        }
        this.authService.logout();
    }

    getProtectedResource() {
        this.authService.getToken().then(token => {
            if (token) {
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
            }
        });
    }
}
