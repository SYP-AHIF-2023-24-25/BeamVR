import {Component, OnInit} from '@angular/core';
import {environment} from "../../environment/environment";
import {User} from "../../models/user.model";

@Component({
    selector: 'app-admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
    public users: User[] = []

    public currentPage: number = 0;
    public pageSize: number = 3;

    constructor() {
        console.log("test")
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
