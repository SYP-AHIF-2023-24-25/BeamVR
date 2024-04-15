import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";

interface UserData {
  tadeotId: string;
  name: string;
  score: string;
  image: string;
  rank?: number; // Define rank property as optional because it will be added later
  editMode?: boolean; // Define editMode property as optional because it will be added later
}

@Component({
  selector: "app-admin",
  templateUrl: "./admin.component.html",
})
export class AdminComponent implements OnInit {
  isLoggedIn: boolean = false;
  data: UserData[] = [];
  deleteModalVisible: boolean = false;
  deleteId: number = 0;
  deleteName: string = "";
  deleteTadeotId: string = "";
  saveId: number = 0;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.checkSession();

    // Check if DOM is ready
    document.addEventListener("DOMContentLoaded", () => {
      this.connectWebSocket();
      this.fetchData();
    });
  }

  checkSession(): void {
    fetch("https://vps-81d09b41.vps.ovh.net/checkSession", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.status === 200) {
          this.isLoggedIn = true;
          this.fetchData();
        } else {
          this.isLoggedIn = false;
          this.router.navigate(["/login"]);
        }
      })
      .catch((error) => {
        this.isLoggedIn = false;
        this.router.navigate(["/login"]);
      });
  }

  fetchData(): void {
    fetch("https://vps-81d09b41.vps.ovh.net/get-data", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data: UserData[]) => {
        // Sort data by score in descending order
        data.sort((a, b) => {
          return Number(b.score) - Number(a.score);
        });

        // Assign rank based on position in the table
        this.data = data.map((item, index) => ({ ...item, rank: index + 1 }));

        // Add editMode property to each item
        this.data.forEach((item) => {
          item.editMode = false;
        });

        // if the data is empty, disable the deleteAll button
        if (this.data.length === 0) {
          document
            .getElementById("deleteAllButton")!
            .setAttribute("disabled", "true");
        } else {
          document
            .getElementById("deleteAllButton")!
            .removeAttribute("disabled");
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }

  confirmDelete(item: any): void {
    this.deleteId = item["dataID"];
    this.deleteName = item["name"];
    this.deleteTadeotId = item["tadeotId"];

    const confirmation = confirm(
      `Are you sure you really want to delete the Highscore of ${this.deleteName} with Tadeot ID ${this.deleteTadeotId}?`
    );
    if (confirmation) {
      this.deleteData(this.deleteId);
    }
  }

  confirmDeleteAll(): void {
    const confirmation = confirm(
      "Are you sure you really want to delete all Highscores?"
    );
    if (confirmation) {
      this.deleteAllData();
    }
  }

  // delete all
  deleteAllData(): void {
    fetch("https://vps-81d09b41.vps.ovh.net/delete-data", {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(() => {
        // Handle success, maybe refresh data after successful deletion
        this.fetchData();
      })
      .catch((error) => {
        console.error("Error deleting data:", error);
      });
  }

  // delete by id
  deleteData(id: number): void {
    fetch(`https://vps-81d09b41.vps.ovh.net/delete-data/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(() => {
        // Handle success, maybe refresh data after successful deletion
        this.fetchData();
      })
      .catch((error) => {
        console.error("Error deleting data:", error);
      });
  }

  // Websocket connection
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
      if (data === "updateHighscores") {
        // Refresh data when server sends updateHighscores message
        this.fetchData();
      }
    });
  }

  checkInput(event: any): void {
    if (
      event.target.value < 0 ||
      event.target.value > 1000 ||
      !Number.isInteger(Number(event.target.value))
    ) {
      event.target.classList.add("is-invalid");
    } else {
      event.target.classList.remove("is-invalid");
    }
  }

  preventInvalidCharacters(event: KeyboardEvent): void {
    const invalidKeyCodes = ["e", "-", "+", "."];
    if (invalidKeyCodes.includes(event.key)) {
      event.preventDefault();
    }
  }
  // Edit functions
  enableEditMode(item: UserData): void {
    item.editMode = true;
  }

  saveChanges(item: any): void {
    this.saveId = item.dataID;
    this.updateData(this.saveId, item);
    item.editMode = false;
  }

  cancelEdit(item: UserData): void {
    item.editMode = false;
  }

  // Update Data function (id in the URL and item as the request body)
  updateData(id: number, item: UserData): void {
    // remove the rank and editMode properties from the item before sending the request
    delete item.rank;
    delete item.editMode;

    fetch(`https://vps-81d09b41.vps.ovh.net/update-data/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item),
    })
      .then(() => {
        // Handle success, maybe refresh data after successful update
        this.fetchData();
      })
      .catch((error) => {
        console.error("Error updating data:", error);
      });
  }

  // Logout function
  logout(): void {
    fetch("https://vps-81d09b41.vps.ovh.net/logout", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.status === 200) {
          this.isLoggedIn = false;
          this.router.navigate(["/login"]);
        }
      })
      .catch((error) => {
        console.error("Error logging out:", error);
      });
  }

  changeThemeColor() {
    const body = document.getElementsByTagName("body")[0];
    if (body.classList.contains("dark-theme")) {
      body.classList.remove("dark-theme");
      document.cookie = `darkmode=false; path=/; max-age=31536000`;
      document.getElementById("table")!.style.backgroundColor = "lightgray";
      document.getElementById("table")!.style.borderColor = "lightgray";
      document.getElementById("pageHeader")!.style.borderColor = "lightgray";
      document.getElementById("pageHeader")!.style.backgroundColor = "lightgray";
    } else {
      body.classList.add("dark-theme");
      document.cookie = `darkmode=true; path=/; max-age=31536000`;
      document.getElementById("table")!.style.backgroundColor = "darkgray";
      document.getElementById("table")!.style.borderColor = "darkgray";
      document.getElementById("pageHeader")!.style.borderColor = "darkgray";
      document.getElementById("pageHeader")!.style.backgroundColor = "darkgray";
    }
    return true;
  }

  // when DOM is ready set the darkmode
  ngAfterViewInit() {
    if (document.cookie.includes("darkmode=true")) {
      document.getElementsByTagName("body")[0].classList.add("dark-theme"); // set the dark theme
      // check the darkmode checkbox
      (document.getElementById("darkmodeToggle") as HTMLInputElement).checked = true;
    }
  }
}
