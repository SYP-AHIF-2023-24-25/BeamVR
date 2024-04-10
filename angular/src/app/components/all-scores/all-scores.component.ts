import { Component, OnInit } from "@angular/core";
import { DarkmodeService } from "../../services/darkmode.service";

interface DataItem {
  dateTime: string;
  score: number;
}

@Component({
  selector: "app-all-scores",
  templateUrl: "./all-scores.component.html",
  styleUrls: ["./all-scores.component.css"],
})
export class AllScoresComponent implements OnInit {
  constructor(public darkmode: DarkmodeService) {}

  ngOnInit(): void {
    this.connectWebSocket();
    this.fetchHighscores();
  }

  searchByName(): void {
    const searchInput = document.getElementById(
      "searchInput"
    ) as HTMLInputElement;
    const searchValue = searchInput.value; // Because Typescript is strict, we need to cast the element to HTMLInputElement and then get the value

    document.getElementById("resultTableDiv")!.style.display = "block"; // Show the search results table

    if (searchValue === "") {
      return;
    }

    fetch(`https://vps-81d09b41.vps.ovh.net/search-data/${searchValue}`)
      .then((response) => response.json())
      .then((data) => {
        if (data) {
          const tbody = document.getElementById("searchResults");
          tbody!.innerHTML = "";

          // Sort by score
          data.sort((a: any, b: any) => b.score - a.score);

          data.forEach((item: any, index: number) => {
            tbody!.innerHTML += `
              <tr>
                <td><img src="${item.image}" alt="UserImage" class="img-thumbnail"></td>
                <td>${item.name}</td>
                <td>${item.score}</td>
              </tr>`;
          });
        }

        if (data.length === 0) {
          document.getElementById("searchResults")!.innerHTML =
            '<h4 class="text mt-4" style="margin-left: 5px;">No results</h4>';
        }
      })
      .catch((error) => {
        console.error("Error fetching highscores:", error);
      });
  }

  fetchHighscores(): void {
    fetch("https://vps-81d09b41.vps.ovh.net/get-data")
      .then((response) => response.json())
      .then((data) => {
        if (data) {
          const tbody = document.getElementById("mainTable");
          tbody!.innerHTML = "";

          // Sort by score for allTime mode
          data.sort((a: any, b: any) => b.score - a.score);

          data.forEach((item: any, index: number) => {
            tbody!.innerHTML += `
              <tr>
                <td>${index + 1}</td>
                <td><img src="${
                  item.image
                }" alt="UserImage" class="img-thumbnail"></td>
                <td>${item.name}</td>
                <td>${item.score}</td>
              </tr>`;
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching highscores:", error);
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
          document
            .getElementById("vrImage")!
            .setAttribute("src", result!.toString());
        };
        reader.readAsDataURL(data);
      } else if (data === "updateHighscores") {
        this.fetchHighscores();
      }
    });
  }
}
