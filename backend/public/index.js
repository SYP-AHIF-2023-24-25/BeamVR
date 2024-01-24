function fetchHighscores() {
  fetch("/get-data")
    .then((response) => response.json())
    .then((data) => {
      if (data) {
        document.querySelector("tbody").innerHTML = ""; // Clear Table before adding data
        data.sort((a, b) => b.score - a.score);
        data.forEach(function (item, index) {
          document.querySelector("tbody").innerHTML += `
                      <tr>
                          <td>${index + 1}</td>
                          <td><img src="${
                            item.image
                          }" alt="UserImage" class="img-thumbnail"></td>
                          <td>${item.name}</td>
                          <td>${item.score}</td>
                      </tr>`;
        });
        console.log("Highscores fetched successfully");
      } else {
        console.error("Error fetching data");
      }
    })
    .catch((error) => console.error("Error:", error));
}

//Load the Data for the Highscore Table
document.addEventListener("DOMContentLoaded", function () {
  const socket = new WebSocket("wss://vps-81d09b41.vps.ovh.net");

  socket.addEventListener("open", function (event) {
    socket.send("Hello Server!");
  });

  socket.addEventListener("message", function (event) {
    const data = event.data;

    if (data instanceof Blob) { // Change Image when received new one
      const reader = new FileReader();

      reader.onload = function () {
        const imageUrl = reader.result;
        const img = document.getElementById("vrImage");
        img.src = imageUrl;

        console.log("Image received and updated");
      };
      reader.readAsDataURL(data);
    } else if(data == "updateHighscores"){
      fetchHighscores(); // Update Highscores on server request
    } else {
      console.log("Message received from Server: " + data);
    }
  });

  //Get Data for Highscore Table
  fetchHighscores();
});
