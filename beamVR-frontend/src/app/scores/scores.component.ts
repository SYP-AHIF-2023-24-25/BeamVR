import { Component, OnDestroy, OnInit } from "@angular/core";
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
    public displayedSearchResults: User[] = [];
    public searchInitiated: boolean = false;
    public searchValue: string = "";
    public placeholders: any[] = [];
    public searchCurrentPage: number = 0;

    constructor(private socketService: SocketService) {}

    ngOnInit(): void {
        this.fetchUsers().then((users) => {
            if (users) {
                this.users = users;
            }
        });

        // subscribe to the user added event using SocketService
        this.socketService.onUserAdded((newUser: User) => {
            this.users.push(newUser);
            this.updateSearchResults();
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
            return await res.json();
        } catch (error) {
            console.log(environment.apiBaseUrl + 'scores/getUsers')
            console.error('Failed to fetch users:', error);
        }
    }

    public search(): void {
        this.updateSearchResults();
    }

    private updateSearchResults(): void {
        this.searchResults = this.users.filter(user =>
            user.username.toLowerCase().includes(this.searchValue.toLowerCase())
        );
        this.searchInitiated = true;
        this.searchCurrentPage = 0; // Reset to first page of search results
        this.updateDisplayedSearchResults();
    }

    private updateDisplayedSearchResults(): void {
        const startIndex = this.searchCurrentPage * this.pageSize;
        this.displayedSearchResults = this.searchResults.slice(startIndex, startIndex + this.pageSize);

        this.placeholders = [];
        const placeholdersNeeded = this.pageSize - this.displayedSearchResults.length;
        for (let i = 0; i < placeholdersNeeded; i++) {
            this.placeholders.push({ rank: 0, tadeotId: 0, image: '#', username: "", score: -1 });
        }
        this.displayedSearchResults = this.displayedSearchResults.concat(this.placeholders);
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

    public nextSearchPage(): void {
        const nextPage = this.searchCurrentPage + 1;
        const maxPage = Math.ceil(this.searchResults.length / this.pageSize) - 1;
        if (nextPage <= maxPage) {
            this.searchCurrentPage = nextPage;
            this.updateDisplayedSearchResults();
        }
    }

    public previousSearchPage(): void {
        const prevPage = this.searchCurrentPage - 1;
        if (prevPage >= 0) {
            this.searchCurrentPage = prevPage;
            this.updateDisplayedSearchResults();
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
