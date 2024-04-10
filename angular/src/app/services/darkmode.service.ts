import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class DarkmodeService {
  constructor() {}
  isDarkMode: boolean = false;

  // Method to toggle dark mode
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    document.cookie = `darkmode=${this.isDarkMode}; path=/; max-age=31536000`;
    console.log("Dark Mode: ", this.isDarkMode);
  }

  // Method to check if cookie is set and if it is, check if dark mode
  checkDarkMode() {
    if (document.cookie.includes("darkmode=true")) {
      this.isDarkMode = true;
    }
  }
}
