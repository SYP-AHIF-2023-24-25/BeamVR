function fetchHighscores() {
  fetch("/get-data")
    .then((e) => e.json())
    .then((e) => {
      e &&
        ((document.querySelector("tbody").innerHTML = ""),
        e.sort((e, t) => t.score - e.score),
        e.forEach(function (e, t) {
          document.querySelector(
            "tbody"
          ).innerHTML += `\n                      <tr>\n                          <td>${
            t + 1
          }</td>\n                          <td><img src="${
            e.image
          }" alt="UserImage" class="img-thumbnail"></td>\n                          <td>${
            e.name
          }</td>\n                          <td>${
            e.score
          }</td>\n                      </tr>`;
        }));
    });
}
document.addEventListener("DOMContentLoaded", function () {
  let websocket;

  function connectWebSocket() {
    websocket = new WebSocket("wss://vps-81d09b41.vps.ovh.net");

    websocket.addEventListener("open", function (event) {
      document.getElementById("connectionAlert").style.display = "none";
      websocket.send("Hello Server!");
    });

    websocket.addEventListener("close", function (event) {
      document.getElementById("connectionAlert").style.display = "block";
      console.log("WebSocket closed:", event);

      // Reconnect after a delay of 1 second
      setTimeout(connectWebSocket, 3000);
    });

    websocket.addEventListener("error", function (event) {
      document.getElementById("connectionAlert").style.display = "block";
      console.log("WebSocket error:", event);

      // Reconnect after a delay of 1 second
      setTimeout(connectWebSocket, 3000);
    });

    setInterval(() => {
      websocket.send("ping");
    }, 30000);

    websocket.addEventListener("message", function (event) {
      let data = event.data;
      if (data instanceof Blob) {
        let reader = new FileReader();
        reader.onload = function () {
          let result = reader.result;
          document.getElementById("vrImage").src = result;
        };
        reader.readAsDataURL(data);
      } else if (data === "updateHighscores") {
        fetchHighscores();
      }
    });

    fetchHighscores();
  }

  // Initial connection
  connectWebSocket();
});
