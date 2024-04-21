import {Component, OnInit, AfterViewInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit {
    username: string = '';
    password: string = '';
    errorMessage: string = '';
    isLoggedIn: boolean = false;
    showPassword: boolean = false;

    constructor(private http: HttpClient, private router: Router) {
    }

    ngOnInit(): void {
        this.checkSession();
    }

    ngAfterViewInit(): void {
        this.checkDarkMode();
    }

    togglePassword(): void {
        this.showPassword = !this.showPassword;
    }

    async onSubmit(): Promise<void> {
        try {
            const hashedPassword = await this.hashPassword(this.password);
            const data = {username: this.username, passwordHash: hashedPassword};

            this.http.post("https://vps-81d09b41.vps.ovh.net/loginAuth", data).subscribe(
                (response: any) => {
                    document.cookie = `authToken=${response.sessionID}; path=/; samesite=strict`;
                    this.router.navigate(['/admin']);
                },
                (error) => {
                    console.error(error);
                    if (error.status === 401) {
                        this.errorMessage = "Unauthorized: Invalid username or password.";
                    } else {
                        this.errorMessage = "An unexpected error occurred. Please try again later.";
                    }
                }
            );
        } catch (error) {
            console.error("Error hashing password:", error);
        }
    }

    async hashPassword(password: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const buffer = await crypto.subtle.digest("SHA-256", data);
        const hashedPassword = Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
        return hashedPassword;
    }

    checkSession(): void {
        fetch("https://vps-81d09b41.vps.ovh.net/checkSession", {
            method: "GET",
            credentials: "include"
        }).then((res) => {
            if (res.status === 200) {
                this.isLoggedIn = true;
                this.router.navigate(['/admin']);
            } else {
                this.isLoggedIn = false;
            }
        }).catch(() => {
            this.isLoggedIn = false;
        });
    }

    changeThemeColor(): void {
        const body = document.getElementsByTagName("body")[0];
        if (body.classList.contains("dark-theme")) {
            body.classList.remove("dark-theme");
            document.cookie = `darkmode=false; path=/; max-age=31536000`;
        } else {
            body.classList.add("dark-theme");
            document.cookie = `darkmode=true; path=/; max-age=31536000`;
        }
    }

    checkDarkMode(): void {
        if (document.cookie.includes("darkmode=true")) {
            document.getElementsByTagName("body")[0].classList.add("dark-theme");
            let formLabels = document.getElementsByClassName("form-label");
            for (let i = 0; i < formLabels.length; i++) {
                (formLabels[i] as HTMLElement).style.color = "white";
            }
        }
    }
}
