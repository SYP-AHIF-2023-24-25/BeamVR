import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { environment } from "../../environment/environment";

interface User {
    tadeotId: number;
    rank: number;
    image?: string;
    username: string;
    score: number;
}

@Component({
    selector: 'app-main',
    templateUrl: './highest-latest-scores.component.html',
    styleUrls: ['./highest-latest-scores.component.css']
})
export class HighestLatestScores implements OnInit, OnDestroy {
    public users: User[] = [];

    public selectedHighscore: 'best' | 'latest' = 'best';
    public highscoreTableTitle: string = 'Best Highscores';

    public isConnectionLost: boolean = false;

    public currentPage: number = 0;
    public pageSize: number = 3;
    public autoScrollActive: boolean = false;
    private timer: any;

    vrImageSrc: string = 'assets/black.png';

    constructor(private cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.displayScores();
    }

    ngOnDestroy(): void {
        this.stopAutoScroll();
    }

    async fetchBestHighscores() {
        try {
            const res = await fetch(environment.apiBaseUrl + 'scores/getBestUsers');
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

    async fetchLatestHighscores() {
        try {
            const res = await fetch(environment.apiBaseUrl + 'scores/getLatestUsers');
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

    toggleAutoScroll(): void {
        if (this.autoScrollActive) {
            this.startAutoScroll();
        } else {
            this.stopAutoScroll();
        }
    }

    startAutoScroll(): void {
        this.timer = setInterval(() => this.nextPage(), 3000);
    }

    stopAutoScroll(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    switchHighscore(mode: 'best' | 'latest'): void {
        this.selectedHighscore = mode;
        this.highscoreTableTitle = mode === 'best' ? 'Best Highscores' : 'Latest Highscores';
        this.cdr.detectChanges();
        this.displayScores();
    }

    private displayScores(): void {
        if (this.selectedHighscore === 'best') {
            this.fetchBestHighscores().then((users) => {
                if (users) {
                    this.users = users;
                }
            });
        } else {
            this.fetchLatestHighscores().then((users) => {
                if (users) {
                    this.users = users;
                }
            });
        }
    }

    public nextPage(): void {
        const nextPage = this.currentPage + 1;
        const maxPage = Math.ceil(this.users.length / this.pageSize) - 1;
        if (nextPage > maxPage) {
            this.currentPage = 0;
        } else {
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
