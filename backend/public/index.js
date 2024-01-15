//Load the Data for the Highscore Table
document.addEventListener("DOMContentLoaded", function () {
  const socket = new WebSocket("wss://vps-81d09b41.vps.ovh.net");

  socket.addEventListener("open", function (event) {
    socket.send("Hello Server!");
  });

  socket.addEventListener('message', function(event) {
    const data = event.data;

    if (data instanceof Blob) {
        const imageUrl = URL.createObjectURL(data);
        const img = document.getElementById("vrImage");
        img.src = imageUrl;
        img.onload = () => {
            URL.revokeObjectURL(imageUrl);
        };
        console.log("Image received and updated");
    }else{
      console.log("Message received from Server: "+data);
    }
});

  //Get Data for Highscore Table
  fetch("/get-data")
    .then((response) => response.json())
    .then((data) => {
      if (data) {
        data.sort((a, b) => b.score - a.score);
        data.forEach(function (item, index) {
          document.querySelector("tbody").innerHTML += `
                      <tr>
                          <td>${index + 1}</td>
                          <td><img src="./media/${
                            item.image
                          }" alt="UserImage" class="img-thumbnail"></td>
                          <td>${item.name}</td>
                          <td>${item.score}</td>
                      </tr>`;
        });
      } else {
        console.error("Error fetching data");
      }
    })
    .catch((error) => console.error("Error:", error));
});
