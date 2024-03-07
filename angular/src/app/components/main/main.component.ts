import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    this.connectWebSocket();
    this.fetchHighscores();
  }

  fetchHighscores(): void {
    fetch("https://vps-81d09b41.vps.ovh.net/get-data")
      .then(response => response.json())
      .then(data => {
        if (data) {
          const tbody = document.querySelector("tbody");
          tbody!.innerHTML = "";
          data.sort((a: any, b: any) => b.score - a.score);
          data.forEach((item: any, index: number) => {
            tbody!.innerHTML += `
              <tr>
                <td>${index + 1}</td>
                <td><img src="${item.image}" alt="UserImage" class="img-thumbnail"></td>
                <td>${item.name}</td>
                <td>${item.score}</td>
              </tr>`;
          });
        }
      })
      .catch(error => {
        console.error('Error fetching highscores:', error);
      });
  }

  connectWebSocket(): void {
    const websocket = new WebSocket("wss://vps-81d09b41.vps.ovh.net");

    websocket.addEventListener("open", (event) => {
      document.getElementById("connectionAlert")!.style.display = "none";
      websocket.send("Hello Server!");
    });

    websocket.addEventListener("close", (event) => {
      document.getElementById("connectionAlert")!.style.display = "block";
      console.log("WebSocket closed:", event);

      // Reconnect after a delay of 1 second
      setTimeout(() => {
        this.connectWebSocket();
      }, 3000);
    });

    websocket.addEventListener("error", (event) => {
      document.getElementById("connectionAlert")!.style.display = "block";
      console.log("WebSocket error:", event);

      // Reconnect after a delay of 1 second
      setTimeout(() => {
        this.connectWebSocket();
      }, 3000);
    });

    setInterval(() => {
      websocket.send("ping");
    }, 30000);

    websocket.addEventListener("message", (event) => {
      let data = event.data;
      if (data instanceof Blob) {
        let reader = new FileReader();
        reader.onload = () => {
          let result = reader.result;
          document.getElementById("vrImage")!.setAttribute("src", result!.toString());
        };
        reader.readAsDataURL(data);
      } else if (data === "updateHighscores") {
        this.fetchHighscores();
      }
    });
  }
}
