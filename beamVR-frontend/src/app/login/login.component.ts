import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.checkSession();
  }

  ngAfterViewInit(): void {
    this.setInitialTheme();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    const hashedPassword = await this.hashPassword(this.password);
    const data = { username: this.username, passwordHash: hashedPassword };

    this.http.post("https://vps-81d09b41.vps.ovh.net/loginAuth", data, { withCredentials: true })
      .subscribe({
        next: (response: any) => this.handleLoginSuccess(response),
        error: (error) => this.handleLoginError(error)
      });
  }

  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(password));
    return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  checkSession(): void {
    this.http.get("https://vps-81d09b41.vps.ovh.net/checkSession", { withCredentials: true })
      .subscribe({
        next: (response) => this.isLoggedIn = true,
        error: (error) => this.isLoggedIn = false
      });
  }

  changeThemeColor(): void {
    const body = document.body;
    body.classList.toggle("dark-theme");
    document.cookie = `darkmode=${body.classList.contains('dark-theme')}; path=/; max-age=31536000`;
  }

  private handleLoginSuccess(response: any): void {
    document.cookie = `authToken=${response.sessionID}; path=/; samesite=strict`;
    this.router.navigate(["/admin"]);
  }

  private handleLoginError(error: any): void {
    if (error.status === 401) {
      this.errorMessage = "Unauthorized: Invalid username or password.";
    } else {
      this.errorMessage = "An unexpected error occurred. Please try again later.";
    }
  }

  private setInitialTheme(): void {
    if (document.cookie.includes("darkmode=true")) {
      document.body.classList.add("dark-theme");
    }
  }
}
