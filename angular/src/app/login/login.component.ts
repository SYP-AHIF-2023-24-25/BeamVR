import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoggedIn: boolean = false;
  showPassword: boolean = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void { // Check if user is not already logged in
    this.checkSession();
  }

  // Show/hide password
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    try {
      // Hash password using Web Crypto API before sending to backend
      const hashedPassword = await this.hashPassword(this.password);

      // Prepare data to send
      const data = {
        username: this.username,
        passwordHash: hashedPassword,
      };

      // Send data to backend
      this.http
        .post("https://vps-81d09b41.vps.ovh.net/loginAuth", data)
        .subscribe(
          (response: any) => {
            // Set Cookie with sessionID on successful login
            document.cookie = `authToken=${response.sessionID}; path=/; samesite=strict`;
            this.router.navigate(["/admin"]);
          },
          (error) => {
            console.error(error);
            if (error.status === 401) {
              this.errorMessage = "Unauthorized: Invalid username or password.";
            } else {
              this.errorMessage =
                "An unexpected error occurred. Please try again later.";
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
    const hashedPassword = Array.prototype.map
      .call(new Uint8Array(buffer), (x: any) =>
        ("00" + x.toString(16)).slice(-2)
      )
      .join("");
    return hashedPassword;
  }

  checkSession(): void {
    fetch("https://vps-81d09b41.vps.ovh.net/checkSession", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.status === 200) {
          this.isLoggedIn = true;
          this.router.navigate(["/admin"]); // Redirect to admin page if logged in
        } else {
          this.isLoggedIn = false;
        }
      })
      .catch((error) => {
        this.isLoggedIn = false;
      });
  }

  changeThemeColor() {
    const body = document.getElementsByTagName("body")[0];
    if (body.classList.contains("dark-theme")) {
      body.classList.remove("dark-theme");
      document.cookie = `darkmode=false; path=/; max-age=31536000`;
    } else {
      body.classList.add("dark-theme");
      document.cookie = `darkmode=true; path=/; max-age=31536000`;
    }
    return true;
  }

  // when DOM is ready set the darkmode
  ngAfterViewInit() {
    if (document.cookie.includes("darkmode=true")) {
      document.getElementsByTagName("body")[0].classList.add("dark-theme"); // set the dark theme
      // check the darkmode checkbox
      (document.getElementById("darkmodeToggle") as HTMLInputElement).checked = true;

      // Setze alle Elemente der Klasse "form-label" auf schriftfarbe weiß
      let formLabels = document.getElementsByClassName("form-label");
      for (let i = 0; i < formLabels.length; i++) {
        (formLabels[i] as HTMLElement).style.color = "white";
      }

      // Setze alle Elemente der Klasse "input-group-append" auf Hintergrundfarbe darkgrey
      let inputGroupAppends = document.getElementsByClassName("input-group-append");
      for (let i = 0; i < inputGroupAppends.length; i++) {
        (inputGroupAppends[i] as HTMLElement).style.backgroundColor = "darkgrey";
      }

      // Setze alle Elemente der Klasse "form-control" auf Hintergrundfarbe darkgrey
      let formControls = document.getElementsByClassName("form-control");
      for (let i = 0; i < formControls.length; i++) {
        (formControls[i] as HTMLElement).style.backgroundColor = "lightgrey";
      }

      // Setze die id "loginDialog" auf Hintergrundfarbe darkgrey
      let loginDialog = document.getElementById("loginDialog");
      if (loginDialog) {
        loginDialog.style.backgroundColor = "darkgrey";
      }
    }
  }
}
