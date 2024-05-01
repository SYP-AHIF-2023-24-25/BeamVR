import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { HttpHeaders } from '@angular/common/http';
import {KeycloakService} from "keycloak-angular";

interface UserData {
    tadeotId: string;
    name: string;
    score: string;
    image: string;
    rank?: number;
    editMode?: boolean;
}

@Component({
    selector: 'app-admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit, OnDestroy {
    isLoggedIn = false
    data: UserData[] = [];
    subscriptions: Subscription = new Subscription();
    username: string = '';
    justLoggedOut: boolean = false;

    constructor(private keycloakService: KeycloakService, private router: Router, private http: HttpClient, private cookieService: CookieService) { }

    ngOnInit(): void {
        this.checkSession();
        //this.fetchData();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    checkSession(): void {
        if(this.justLoggedOut){ // if the user just logged out, don't check the session and redirect to login page
            this.router.navigate(['/login'], { state: { error: 'loggedOut' } });
        }

        const ServerURL = 'http://localhost:3000';

        const token = this.cookieService.get('token');
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
        this.subscriptions.add(
            this.http.get(ServerURL+'/api/checkSession', {
                headers: headers,
                responseType: 'json'
            }).subscribe({
                next: (jsonRes: any) => {
                    console.log('Server response:', jsonRes); // log the response from the server for debugging
        
                    // If a User is not in the trusted list, he will be logged out again, because he is not authorized to view the admin page
                    if (jsonRes.message && jsonRes.message === "untrusted") {
                        console.log('Untrusted token'); // is correctly shown in the console
                        this.logout(); // not working

                        // Commented because of endless loop between login and admin page (because angular is to incompetent to log the user out, so he wont get redirected to the admin page again)
                        //this.router.navigate(['/login'], { state: { error: 'untrusted' } }); // Redirect to login page
                    }

                    // If the user is in the trusted list, he will be logged in and can view the admin page
                    if (jsonRes.status === 200 && jsonRes.message === "trusted") {
                        this.username = jsonRes.name;
                        this.isLoggedIn = true;
                    } else {
                        // if is to temperary fix the endless loop between login and admin page when the user is not in the trusted list
                        if(jsonRes.message !== "untrusted"){
                            // just move the user to login page (probably not logged in)
                            this.isLoggedIn = false;
                            this.router.navigate(['/login'], { state: { error: 'notLoggedIn' } }); // Redirect to login page
                        }   
                    }
                },
                error: (err) => { // Catch Errors
                    if(this.isLoggedIn){ // log out if any error occurs
                        this.logout();
                    }
                    this.isLoggedIn = false;
                    this.router.navigate(['/login'], { state: { error: 'unknown' } }); // Redirect to login page and show error message
                }
            })
        );
    }

    fetchData(): void {
        this.subscriptions.add(
            this.http.get<UserData[]>('/api/get-data', { withCredentials: true })
                .subscribe(data => {
                    // @ts-ignore
                    this.data = data.sort((a, b) => b.score - a.score)
                        .map((item, index) => ({ ...item, rank: index + 1, editMode: false }));
                    this.updateDeleteButtonState();
                })
        );
    }

    updateDeleteButtonState(): void {
        const deleteAllButton = document.getElementById('deleteAllButton') as HTMLButtonElement;
        if (this.data.length === 0) {
            deleteAllButton.disabled = true;
        } else {
            deleteAllButton.disabled = false;
        }
    }

    confirmDelete(item: any): void {
        let deleteId = item["dataID"];
        let deleteName = item["name"];
        let deleteTadeotId = item["tadeotId"];

        const confirmation = confirm(
            `Are you sure you really want to delete the Highscore of ${deleteName} with Tadeot ID ${deleteTadeotId}?`
        );
        if (confirmation) {
            this.deleteData(deleteId);
        }
    }

    confirmDeleteAll(): void {
        if (confirm("Are you sure you really want to delete all Highscores?")) {
            this.deleteAllData();
        }
    }

    deleteData(id: number): void {
        this.subscriptions.add(
            this.http.delete(`/api/delete-data/${id}`, { withCredentials: true })
                .subscribe(() => {
                    this.fetchData();
                })
        );
    }

    deleteAllData(): void {
        this.subscriptions.add(
            this.http.delete('/api/delete-data', { withCredentials: true })
                .subscribe(() => {
                    this.data = [];
                    this.updateDeleteButtonState();
                })
        );
    }

    enableEditMode(item: UserData): void {
        item.editMode = true;
    }

    saveChanges(item: UserData): void {
        this.updateData(item);
    }

    cancelEdit(item: UserData): void {
        item.editMode = false;
    }

    updateData(item: UserData): void {
        const updateUrl = `/api/update-data/${item.tadeotId}`;
        this.subscriptions.add(
            this.http.put(updateUrl, item, { withCredentials: true })
                .subscribe(() => {
                    this.fetchData();  // Refresh the data list after updating
                })
        );
        item.editMode = false; // Disable edit mode on successful update
    }

    async logout(): Promise<void> {
        // only working for trusted users, if a user is untrusted, nothing happens
        // Also Angular is showing a Error message on the login page after the user is correctly logged out

        if (!this.isLoggedIn) {
            return;
        }
        this.justLoggedOut = true;
        await this.keycloakService.logout();
    }

    changeThemeColor(event: any): void {
        const isChecked = event.target.checked;
        const themeClass = isChecked ? 'dark-theme' : 'light-theme';
        document.body.classList.toggle(themeClass, isChecked);
        document.cookie = `darkmode=${isChecked}; path=/; max-age=31536000`;
    }
}
