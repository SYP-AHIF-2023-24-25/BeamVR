import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

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

    constructor(private router: Router, private http: HttpClient) { }

    ngOnInit(): void {
        // this.checkSession();
        this.fetchData();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    checkSession(): void {
        this.subscriptions.add(
            this.http.get<{ status: number }>('https://vps-81d09b41.vps.ovh.net/checkSession', {
                withCredentials: true
            }).subscribe({
                next: res => {
                    if (res.status === 200) {
                        this.isLoggedIn = true;
                    } else {
                        this.isLoggedIn = false;
                        this.router.navigate(['/login']);
                    }
                },
                error: () => {
                    this.isLoggedIn = false;
                    this.router.navigate(['/login']);
                }
            })
        );
    }

    fetchData(): void {
        this.subscriptions.add(
            this.http.get<UserData[]>('https://vps-81d09b41.vps.ovh.net/get-data', { withCredentials: true })
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
            this.http.delete(`https://vps-81d09b41.vps.ovh.net/delete-data/${id}`, { withCredentials: true })
                .subscribe(() => {
                    this.fetchData();
                })
        );
    }

    deleteAllData(): void {
        this.subscriptions.add(
            this.http.delete('https://vps-81d09b41.vps.ovh.net/delete-data', { withCredentials: true })
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
        const updateUrl = `https://vps-81d09b41.vps.ovh.net/update-data/${item.tadeotId}`;
        this.subscriptions.add(
            this.http.put(updateUrl, item, { withCredentials: true })
                .subscribe(() => {
                    this.fetchData();  // Refresh the data list after updating
                })
        );
        item.editMode = false; // Disable edit mode on successful update
    }

    logout(): void {
        this.subscriptions.add(
            this.http.get('https://vps-81d09b41.vps.ovh.net/logout', {
                withCredentials: true
            }).subscribe(() => {
                this.isLoggedIn = false;
                this.router.navigate(['/login']);
            })
        );
    }

    changeThemeColor(event: any): void {
        const isChecked = event.target.checked;
        const themeClass = isChecked ? 'dark-theme' : 'light-theme';
        document.body.classList.toggle(themeClass, isChecked);
        document.cookie = `darkmode=${isChecked}; path=/; max-age=31536000`;
    }
}
