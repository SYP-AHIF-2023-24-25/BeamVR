async function startWebcam() {
  try {
    //Get Videostream from Webcam and set the stream to the Video Element
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const thirdPersonStream = document.getElementById("ThirdPersonStream");
    thirdPersonStream.srcObject = stream;
  } catch (error) {
    document.getElementById("3CamWarning").textContent = "Kamera blockiert oder nicht verfügbar!";
  }
}

let streamOnline = false;
//Load the Data for the Highscore Table
document.addEventListener("DOMContentLoaded", function () {
  //Checke Status des Streams (/get-stream-status)
  fetch("/get-stream-status")
    .then((response) => response.json())
    .then((data) => {
      streamOnline = data;
      if (streamOnline == true) {
        console.log("Stream online");

        //Webcam as 3. Person View
        startWebcam();

        //Debug Video for VR View
        const vrStream = document.getElementById("VRStream");
        vrStream.src = "./media/beamVR-Video-Placeholder.mp4";
        vrStream.loop = true;
      } else {
        console.log("Stream deaktiviert!");

        //Replace Videos through "NO-Source" Image
        document.getElementById("ThirdPersonStream").style.display = "none";
        document.getElementById("VRStream").style.display = "none";
        document.getElementById("3CamWarning").style.display = "none";
        document.getElementById("noSourceImageOne").style.display = "block";
        document.getElementById("noSourceImageTwo").style.display = "block";
      }
    })
    .catch((error) => console.error("Error:", error));

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
                          <td><img src="./media/${item.image
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