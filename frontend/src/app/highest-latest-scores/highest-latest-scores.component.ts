import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';

interface Highscore {
    image: string;
    dateTime: string;
    name: string;
    score: number;
}

@Component({
    selector: 'app-main',
    templateUrl: './highest-latest-scores.component.html',
    styleUrls: ['./highest-latest-scores.component.css']
})
export class HighestLatestScores implements OnInit, OnDestroy {
    public selectedHighscore: 'allTime' | 'latest' = 'latest';
    public highscoreTableTitle: string = 'Best Highscores';

    public isConnectionLost: boolean = false;

    public displayedHighscores: Highscore[] = [];
    public currentPage: number = 0;
    public highscores: Highscore[] = [];
    public pageSize: number = 3;
    public autoScrollActive: boolean = false;
    private timer: any;

    vrImageSrc: string = './../../assets/black.png';

    constructor(private cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.connectWebSocket();
        this.fetchHighscores();
    }

    ngOnDestroy(): void {
        this.stopAutoScroll();
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

    switchToHS(mode: 'allTime' | 'latest'): void {
        this.selectedHighscore = mode;
        this.highscoreTableTitle = mode === 'allTime' ? 'Best Highscores' : 'Latest Highscores';
        this.fetchHighscores();
        this.cdr.detectChanges();
    }

    changeThemeColor(): void {
        document.body.classList.toggle('dark-theme');
    }

    fetchHighscores(): void {
        const url = `https://vps-81d09b41.vps.ovh.net/get-data?mode=${this.selectedHighscore}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                this.highscores = data;
                this.sortHighscores();
                this.displayedHighscores = this.highscores;
            })
            .catch(error => {
                console.error("Error fetching highscores:", error);
                this.isConnectionLost = true;
            });
    }

    sortHighscores(): void {
        if (this.highscores && Array.isArray(this.highscores)) {
            if (this.selectedHighscore === 'allTime') {
                this.highscores.sort((a, b) => parseInt(String(b.score)) - parseInt(String(a.score)));
            } else if (this.selectedHighscore === 'latest') {
                this.highscores.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
            }
        }
    }

    connectWebSocket(): void {
        const websocket = new WebSocket("wss://vps-81d09b41.vps.ovh.net");
        websocket.onopen = () => this.isConnectionLost = false;
        websocket.onclose = websocket.onerror = () => {
            this.isConnectionLost = true;
            setTimeout(() => this.connectWebSocket(), 3000);
        };
        websocket.onmessage = (event) => {
            if (typeof event.data === 'string' && event.data === 'updateHighscores') {
                this.fetchHighscores();
            } else if (event.data instanceof Blob) {
                const reader = new FileReader();
                reader.onload = () => this.vrImageSrc = reader.result as string;
                reader.readAsDataURL(event.data);
            }
        };
    }

    public nextPage(): void {
        const nextPage = this.currentPage + 1;
        const maxPage = Math.ceil(this.highscores.length / this.pageSize) - 1;
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

    public get paginatedData(): Highscore[] {
        const startIndex = this.currentPage * this.pageSize;
        const pageData = this.highscores.slice(startIndex, startIndex + this.pageSize);

        while (pageData.length < this.pageSize) {
            pageData.push({ image: '#', dateTime: 'N/A', name: '', score: -1 }); // Updated placeholder object
        }

        return pageData;
    }
}
