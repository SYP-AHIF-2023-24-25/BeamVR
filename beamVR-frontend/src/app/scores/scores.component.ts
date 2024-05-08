import {Component, OnDestroy, OnInit} from "@angular/core";
import { environment } from '../../environment/environment';
import { SocketService } from '../../services/socket-service.service';
import { User } from '../../models/user.model';

@Component({
    selector: "app-scores",
    templateUrl: "./scores.component.html",
    styleUrls: ["./scores.component.css"],
})
export class ScoresComponent implements OnInit, OnDestroy {
    public users: User[] = [];
    public connectionLost: boolean = false;

    public currentPage: number = 0;
    public pageSize: number = 3;

    public searchResults: User[] = [];
    public searchInitiated: boolean = false;
    public searchValue: string = "";

    constructor(private socketService: SocketService) {}

    ngOnInit(): void {
        this.fetchUsers().then((users) => {
            if (users) {
                this.users = users;
            }
        });
    }

    ngOnDestroy(): void {
        this.socketService.disconnect();
    }

    async fetchUsers() {
        try {
            const res = await fetch(environment.apiBaseUrl + 'scores/getUsers');
            if (!res.ok) {
                new Error(`Status: ${res.status}`);
            }
            const users = await res.json();
            console.log('Users fetched:', users);
            return users;
        } catch (error) {
            if (error instanceof Error) {
                console.error('Failed to fetch users:', error.message);
            } else {
                console.error('An unexpected error occurred:', error);
            }
        }
    }

    public search(): void {
        this.searchResults = this.users.filter((user) =>
            user.username.toLowerCase().includes(this.searchValue.toLowerCase())
        );
        this.searchInitiated = true;
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
            pageData.push({rank: 0, tadeotId: 0, image: '#', username: "", score: -1 });
        }

        return pageData;
    }

    trackItem(item: any): number {
        return item.id;
    }

    protected readonly environment = environment;
}
