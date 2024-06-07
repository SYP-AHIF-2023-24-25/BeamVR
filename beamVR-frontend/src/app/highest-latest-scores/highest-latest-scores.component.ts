import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { environment } from "../../environment/environment";
import { User } from '../../models/user.model';
import { SocketService } from '../../services/socket-service.service';
import Hls from "hls.js";
import { AuthService } from '../services/auth.service';
import {KeycloakService} from "keycloak-angular";

@Component({
    selector: 'app-main',
    templateUrl: './highest-latest-scores.component.html',
    styleUrls: ['./highest-latest-scores.component.css']
})
export class HighestLatestScores implements OnInit, OnDestroy {
    public users: User[] = [];
    isLoggedIn = false;

    public selectedHighscore: 'best' | 'latest' = 'best';
    public highscoreTableTitle: string = 'Best Scores';

    private clickCount = 0;

    public currentPage: number = 0;
    public pageSize: number = 3;
    public autoScrollActive: boolean = false;
    private timer: any;

    vrImageSrc: string = 'assets/black.png';

    constructor(private cdr: ChangeDetectorRef, private socketService: SocketService,  private authService: AuthService, private keycloakService: KeycloakService) {
        this.isLoggedIn = this.keycloakService.isLoggedIn();
    }

    ngOnInit(): void {
        this.displayScores();

        // subscribe to the user added event using SocketService
        this.socketService.onUserAdded((newUser: User) => {
            this.users.push(newUser);
            this.displayScores();
        });

        // VIDEO HLS STREAM
        let video: HTMLVideoElement = document.getElementById('livestream-element') as HTMLVideoElement;
        let videoSrc: string = 'http://45.93.251.122:8000/live/gamestream/index.m3u8';
        let livestreamText: HTMLElement = document.getElementById('livestream-text') as HTMLElement;

        function checkStreamAvailability(): void {
            fetch(videoSrc, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        livestreamText.style.display = 'none';
                        initHls();
                    } else {
                        livestreamText.style.display = 'block';
                        setTimeout(checkStreamAvailability, 5000);
                    }
                })
                .catch(error => {
                    console.log('Error checking stream availability:', error);
                    livestreamText.style.display = 'block';
                    setTimeout(checkStreamAvailability, 5000);
                });
        }

        function initHls(): void {
            if (Hls.isSupported()) {
                const hls = new Hls({
                    maxBufferSize: 0,
                    maxBufferLength: 3,
                    maxMaxBufferLength: 5,
                    liveSyncDurationCount: 1,
                });
                hls.loadSource(videoSrc);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, function() {
                    video.play().then(() => console.log('Playing video...')).catch(e => console.error('Failed to play video:', e));
                });
                hls.on(Hls.Events.BUFFER_APPENDING, function(event, data) {
                    console.log(`Buffering ${data.data.length} bytes of data.`);
                });

                // Skip video to 2 seconds before live edge if behind 5 seconds
                hls.on(Hls.Events.FRAG_BUFFERED, function(event, data) {
                    if (hls.media && hls.media.readyState === 4) {
                        const liveEdge = hls.media.duration - hls.media.currentTime;
                        if (liveEdge > 2) {
                            hls.media.currentTime = hls.media.duration - 2;
                        }
                    }
                });

                // Continue video if live edge is reached and new data is appended
                hls.on(Hls.Events.FRAG_BUFFERED, function(event, data) {
                    if (hls.media && hls.media.readyState === 4) {
                        hls.media.play();
                    }
                });

                hls.on(Hls.Events.ERROR, function(event, data) {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                // Try to recover from network error
                                console.log("Network Error: Trying to recover...");
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.log("Media Error: Trying to recover...");
                                hls.recoverMediaError();
                                break;
                            default:
                                // Unrecoverable errors: reload HLS object
                                console.log("Unrecoverable Error: Reloading the stream...");
                                hls.destroy();
                                setTimeout(() => {
                                    hls.loadSource(videoSrc);
                                    hls.attachMedia(video);
                                }, 5000);
                                break;
                        }
                    }
                });

                video.addEventListener('ended', () => {
                    livestreamText.style.display = 'block';
                    setTimeout(checkStreamAvailability, 5000);
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = videoSrc;
                video.addEventListener('loadedmetadata', function() {
                    video.play();
                });
            }
        }

        checkStreamAvailability();
    }

    ngOnDestroy(): void {
        this.stopAutoScroll();
        this.socketService.disconnect();
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
        this.highscoreTableTitle = mode === 'best' ? 'Best Scores' : 'Latest Scores';
        this.cdr.detectChanges();
        this.displayScores();
    }

    private displayScores(): void {
        if (this.selectedHighscore === 'best') {
            this.fetchBestHighscores().then((users) => {
                if (users) {
                    this.users = users;
                    console.log('users best:', this.users);
                }
            });
        } else {
            this.fetchLatestHighscores().then((users) => {
                if (users) {
                    this.users = users;
                    console.log('users latest:', this.users);
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

    onDivClick(): void {
        this.clickCount++;
        if (this.clickCount === 5) {
            const livestreamDiv = document.querySelector('#livestream-element') as HTMLElement;
            const livestreamText = document.querySelector("#livestream-text") as HTMLElement;
            livestreamDiv.style.backgroundColor = 'darkblue';
            livestreamText.style.textAlign = 'left';
            livestreamText.style.marginLeft = '10px';
            livestreamText.innerHTML = `<div style="font-size: 40px">:(</div><br> The stream ran into a problem and needs to restart. <br> 
                                        We're just collecting some error info, and then we'll restart for you. <br>
                                        0% complete`;

            // Reset after 5 seconds
            setTimeout(() => {
                livestreamDiv.style.backgroundColor = '';
                livestreamText.style.textAlign = '';
                livestreamText.innerHTML = `<i class="fa-solid fa-video-slash"></i>`;
                this.clickCount = 0;
            }, 5000);
        }
        console.log(this.clickCount);
    }

    async login(): Promise<void> {
        if (this.isLoggedIn) {
            return

        }
        await this.keycloakService.login();
    }

    async logout(): Promise<void> {
        if (!this.isLoggedIn) {
            return;
        }
        await this.keycloakService.logout();
    }

    protected readonly environment = environment;
}
