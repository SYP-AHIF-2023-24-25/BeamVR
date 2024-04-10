import { Component, OnInit } from "@angular/core";

interface DataItem {
  dateTime: string;
  score: number;
}

@Component({
  selector: "app-main",
  templateUrl: "./main.component.html",
  styleUrls: ["./main.component.css"],
})
export class MainComponent implements OnInit {
  selectedHighscore: String = "allTime";

  ngOnInit(): void {
    this.connectWebSocket();
    this.fetchHighscores();
  }

  switchToHS(mode: "allTime" | "latest"): void {
    this.selectedHighscore = mode;

    const latestButton = document.getElementById("latestButton")!;
    const allTimeButton = document.getElementById("allTimeButton")!;
    const highscoreTableTitle = document.getElementById("HighscoreTableTitle")!;

    if (mode === "allTime") {
      latestButton.style.display = "block";
      allTimeButton.style.display = "none";
      highscoreTableTitle.innerHTML = "Best Highscores";
    } else {
      latestButton.style.display = "none";
      allTimeButton.style.display = "block";
      highscoreTableTitle.innerHTML = "Latest Highscores";
    }

    this.fetchHighscores();
  }

  changeThemeColor() {
    const body = document.getElementsByTagName("body")[0];
    if (body.classList.contains("dark-theme")) {
      body.classList.remove("dark-theme");
      document.cookie = `darkmode=false; path=/; max-age=31536000`;
    } else {
      body.classList.add("dark-theme");
      document.cookie = `darkmode=true; path=/; max-age=31536000`;
    }
    return true;
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

          let processedData = data;

          if (this.selectedHighscore === "latest") {
            // reverse the data array to show the latest highscores first
            processedData = data.reverse();

            // Show only the last 5 highscores
            processedData = processedData.slice(0, 5);

            // Sort by Score
            processedData.sort((a: any, b: any) => b.score - a.score);
          } else {
            // Sort by score for allTime mode
            data.sort((a: any, b: any) => b.score - a.score);
            processedData = data;

            // Show only the last 5 highscores
            processedData = processedData.slice(0, 5);
          }

          processedData.forEach((item: any, index: number) => {
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

  // when DOM is ready set the darkmode
  ngAfterViewInit() {
    if (document.cookie.includes("darkmode=true")) {
      document.getElementsByTagName("body")[0].classList.add("dark-theme"); // set the dark theme
      // check the darkmode checkbox
      (document.getElementById("darkmodeToggle") as HTMLInputElement).checked = true;
    }
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
