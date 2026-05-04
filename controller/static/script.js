const map = L.map('map').setView([48.8566, 2.3522], 16);
const lidarLayer = L.layerGroup().addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

const marker = L.marker([48.8566, 2.3522]).addTo(map);

let lastLat = null;
let lastLng = null;

function updateGPS(lat, lng) {
  if (lat === lastLat && lng === lastLng) return;

  lastLat = lat;
  lastLng = lng;

  document.getElementById("gps").textContent =
    `GPS : ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function updateMap(lat, lng) {
  marker.setLatLng([lat, lng]);
  map.setView([lat, lng], map.getZoom(), { animate: false });
  updateGPS(lat, lng);
}

function fetchGPS() {
  fetch("http://localhost:5000/gps")
    .then(res => res.json())
    .then(data => {
      console.log("GPS reçu:", data);

      if (typeof data.lat === "number" && typeof data.lon === "number") {
        updateMap(data.lat, data.lon);
      }
    })
    .catch(err => console.error(err));
}

setInterval(fetchGPS, 2000);
updateGPS(48.8566, 2.3522);

function sendCommand(cmd) {
  fetch("http://localhost:5000/command", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ cmd: cmd })
  })
  .then(res => res.json())
  .then(data => {
    console.log("Command result:", data);
  })
  .catch(err => console.error("Command error:", err));
}

document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      sendCommand("forward");
      break;
    case "ArrowDown":
      sendCommand("backward");
      break;
    case "ArrowLeft":
      sendCommand("turn_left");
      break;
    case "ArrowRight":
      sendCommand("turn_right");
      break;
    case " ":
      sendCommand("stop");
      break;
  }
});

function lidarToLatLng(lat, lon, distance, angleDeg) {
  const R = 6378137; // rayon Terre en mètres

  const angleRad = angleDeg * Math.PI / 180;

  // coordonnées locales
  const dx = distance * Math.cos(angleRad);
  const dy = distance * Math.sin(angleRad);

  // conversion en lat/lon
  const newLat = lat + (dy / R) * (180 / Math.PI);
  const newLon = lon + (dx / (R * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);

  return [newLat, newLon];
}

function updateLidar(points, baseLat, baseLon) {
  lidarLayer.clearLayers();

  points.forEach(p => {
    const [distance, angle, intensity] = p;

    const [lat, lon] = lidarToLatLng(baseLat, baseLon, distance, angle);

    const color = intensity > 200 ? "red" : "orange";

    L.circleMarker([lat, lon], {
      radius: 6,
      color: color,
      fillOpacity: 0.8
    }).addTo(lidarLayer);
  });
}

function fetchLidar() {
  fetch("http://localhost:5000/lidar")
    .then(res => res.json())
    .then(data => {
      console.log("LIDAR:", data);

      const pos = marker.getLatLng();

      if (data.points && Array.isArray(data.points)) {
        updateLidar(data.points, pos.lat, pos.lng);
      }
    })
    .catch(err => console.error("Erreur LIDAR:", err));
}

setInterval(fetchLidar, 500);
const sw = document.getElementById("switch");
sw.addEventListener("click", () => {
  sw.classList.toggle("active");
});