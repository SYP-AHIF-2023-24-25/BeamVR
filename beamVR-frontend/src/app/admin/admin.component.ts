import {Component, OnInit} from '@angular/core';
import {environment} from "../../environment/environment";
import {User} from "../../models/user.model";
import {io, Socket} from "socket.io-client";

@Component({
    selector: 'app-admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
    public users: User[] = []
    private socket: Socket | undefined;

    protected editingIndex: number | null = null;

    public currentPage: number = 0;
    public pageSize: number = 3;

    constructor() {
        this.socket = io(environment.apiBaseUrl);
        this.socket.on('refresh', (data) => {
            this.fetchUsers().then((users) => {
                if (users) {
                    this.users = users;
                }
            });
        });
    }

    ngOnInit(): void {
        this.fetchUsers().then((users) => {
            if (users) {
                this.users = users;
            }
        });
    }

    async fetchUsers() {
        try {
            const res = await fetch(environment.apiBaseUrl + 'scores/getUsers');
            if (!res.ok) {
                new Error(`Status: ${res.status}`);
            }
            return await res.json();
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    }

    async deleteUser(tadeotId: number) {
        try {
            const response = await fetch(environment.apiBaseUrl + `admin/deleteUser/${tadeotId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {

                const errorData = await response.json();
                console.error('Error deleting user:', errorData.error);
                return;
            }

            const data = await response.json();
            console.log('Success:', data.message);
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }

    async deleteAllUser() {
        if (!confirm('Are you sure you want to delete all users?')) {
            return;
        }
        try {
            const response = await fetch(environment.apiBaseUrl + `admin/deleteAllUsers`, {
                method: 'DELETE',
            });

            if (!response.ok) {

                const errorData = await response.json();
                console.error('Error deleting user:', errorData.error);
                return;
            }

            const data = await response.json();
            console.log('Success:', data.message);
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }

    startEditing(index: number) {
        this.editingIndex = index;
    }

    // update user
    async saveChanges(index: number) {
        try {
            const response = await fetch(environment.apiBaseUrl + `admin/updateUser/${this.users[index].tadeotId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.users[index]),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error updating user:', errorData.error);
                return;
            }

            const data = await response.json();
            console.log('Success:', data.message);
        } catch (error) {
            console.error('Error updating user:', error);
        }
        this.editingIndex = null;
    }

    public nextPage(): void {
        const nextPage = this.currentPage + 1;
        const maxPage = Math.ceil(this.users.length / this.pageSize) - 1;
        if (nextPage <= maxPage) {
            this.currentPage = nextPage;
        }
    }

    public previousPage(): void {
        const prevPage = this.currentPage - 1;
        if (prevPage >= 0) {
            this.currentPage = prevPage;
        }
    }

    public get paginatedData(): User[] {
        const startIndex = this.currentPage * this.pageSize;
        const pageData = this.users.slice(startIndex, startIndex + this.pageSize);

        while (pageData.length < this.pageSize) {
            pageData.push({rank: 0, tadeotId: 0, image: '#', username: "", score: -1});
        }
        return pageData;
    }

    trackItem(item: any): number {
        return item.id;
    }

    protected readonly environment = environment;
}
