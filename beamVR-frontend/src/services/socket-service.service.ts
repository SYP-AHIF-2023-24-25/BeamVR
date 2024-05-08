import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../environment/environment';
import { User } from '../models/user.model';

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    private socket: Socket | undefined;

    constructor() {
        this.connect();
    }

    private connect(): void {
        this.socket = io(environment.apiBaseUrl);
    }

    onUserAdded(callback: (user: User) => void): void {
        if (this.socket) {
            this.socket.on('userAdded', callback);
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}
