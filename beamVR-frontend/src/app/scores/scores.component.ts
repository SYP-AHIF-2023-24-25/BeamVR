import { Component, OnInit } from "@angular/core";

interface DataItem {
    image: string;
    name: string;
    score: number;
}

@Component({
    selector: "app-scores",
    templateUrl: "./scores.component.html",
    styleUrls: ["./scores.component.css"],
})
export class ScoresComponent implements OnInit {
    public highscores: DataItem[] = [];
    public currentPage: number = 0;
    public pageSize: number = 3;
    public searchResults: DataItem[] = [];
    public searchInitiated: boolean = false;
    public searchValue: string = "";
    public connectionLost: boolean = false;

    constructor() {}

    ngOnInit(): void {
        this.connectWebSocket();
        this.fetchHighscores();
    }

    fetchHighscores(): void {
        this.fetchData("https://vps-81d09b41.vps.ovh.net/get-data")
            .then(data => {
                this.highscores = data.sort((a, b) => b.score - a.score);
            })
            .catch(error => console.error("Error fetching highscores:", error));
    }

    searchByName(): void {
        if (!this.searchValue) return;
        this.searchInitiated = true;
        this.fetchData(`https://vps-81d09b41.vps.ovh.net/search-data/${this.searchValue}`)
            .then(data => {
                this.searchResults = data && data.length > 0 ? data : [];
            })
            .catch(error => {
                console.error("Error fetching search results:", error);
                this.searchResults = [];
            });
    }

    private fetchData(url: string): Promise<DataItem[]> {
        return fetch(url)
            .then(response => response.json())
            .then(data => data)
            .catch(error => { throw new Error(error); });
    }

    connectWebSocket(): void {
        const websocket = new WebSocket("wss://vps-81d09b41.vps.ovh.net");
        websocket.onopen = () => this.connectionLost = false;
        websocket.onclose = websocket.onerror = () => {
            this.connectionLost = true;
            setTimeout(() => this.connectWebSocket(), 3000);
        };
        websocket.onmessage = (event) => {
            if (event.data === "updateHighscores") this.fetchHighscores();
        };
    }

    public nextPage(): void {
        const nextPage = this.currentPage + 1;
        const maxPage = Math.ceil(this.highscores.length / this.pageSize) - 1;
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

    public get paginatedData(): DataItem[] {
        const startIndex = this.currentPage * this.pageSize;
        return this.highscores.slice(startIndex, startIndex + this.pageSize);
    }
}
