const API_BASE_URL = "http://192.168.50.1:5000";
const canvas = document.getElementById("lidar-view");
const ctx = canvas.getContext("2d");

const MIN_VIEW_RANGE_METERS = 6;
const MAX_VIEW_RANGE_METERS = 60;

let currentLidarPoints = [];
let lastLat = null;
let lastLng = null;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  drawLidarScene();
}

window.addEventListener("resize", resizeCanvas);

function updateGPS(lat, lng) {
  if (lat === lastLat && lng === lastLng) return;

  lastLat = lat;
  lastLng = lng;

  document.getElementById("gps").textContent =
    `GPS : ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function fetchGPS() {
  fetch(`${API_BASE_URL}/gps`)
    .then(res => res.json())
    .then(data => {
      console.log("GPS recu:", data);

      if (typeof data.lat === "number" && typeof data.lon === "number") {
        updateGPS(data.lat, data.lon);
      }
    })
    .catch(err => console.error(err));
}

setInterval(fetchGPS, 2000);
updateGPS(48.8566, 2.3522);

function sendCommand(cmd) {
  fetch(`${API_BASE_URL}/command`, {
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
    case "ArrowLeft":
      sendCommand("left");
      break;
    case "ArrowRight":
      sendCommand("right");
      break;
    case "ArrowUp":
      sendCommand("forward");
      break;
    case "ArrowDown":
      sendCommand("backward");
      break;
    case " ":
      sendCommand("stop");
      break;
  }
});

function scorePointInterpretation(distance, angle) {
  let score = 0;

  if (distance >= 0 && distance <= 120) score += 3;
  else if (distance >= 0) score += 1;

  if (Math.abs(angle) <= (Math.PI * 2 + 0.01) || (angle >= 0 && angle <= 360)) {
    score += 2;
  }

  return score;
}

function parseLidarPoint(rawPoint) {
  if (!Array.isArray(rawPoint) || rawPoint.length < 3) return null;

  const a = Number(rawPoint[0]);
  const b = Number(rawPoint[1]);
  const intensity = Number(rawPoint[2]);

  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(intensity)) {
    return null;
  }

  const scoreDistanceFirst = scorePointInterpretation(a, b);
  const scoreAngleFirst = scorePointInterpretation(b, a);

  const distance = scoreAngleFirst > scoreDistanceFirst ? b : a;
  const angle = scoreAngleFirst > scoreDistanceFirst ? a : b;
  const angleRad = Math.abs(angle) <= (Math.PI * 2 + 0.01) ? angle : angle * Math.PI / 180;

  return {
    distance: Math.max(0, distance),
    angleRad: angleRad,
    intensity: intensity
  };
}

function getViewRangeMeters(points) {
  if (points.length === 0) return MIN_VIEW_RANGE_METERS;

  const farthestDistance = Math.max(...points.map(point => point.distance));
  const paddedRange = farthestDistance * 1.2;

  return Math.max(
    MIN_VIEW_RANGE_METERS,
    Math.min(MAX_VIEW_RANGE_METERS, paddedRange)
  );
}

function drawLidarScene() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const viewRange = getViewRangeMeters(currentLidarPoints);
  const maxRadiusPx = Math.min(width, height) * 0.45;
  const metersToPixels = maxRadiusPx / viewRange;

  ctx.fillStyle = "#101317";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;

  for (let i = 1; i <= 4; i += 1) {
    const ringRadius = (maxRadiusPx * i) / 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(centerX - maxRadiusPx, centerY);
  ctx.lineTo(centerX + maxRadiusPx, centerY);
  ctx.moveTo(centerX, centerY - maxRadiusPx);
  ctx.lineTo(centerX, centerY + maxRadiusPx);
  ctx.stroke();

  currentLidarPoints.forEach(point => {
    const x = centerX + Math.cos(point.angleRad) * point.distance * metersToPixels;
    const y = centerY - Math.sin(point.angleRad) * point.distance * metersToPixels;
    const color = point.intensity > 200 ? "#ff5f5f" : "#f5b141";

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#5ac8fa";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(centerX, centerY - 14);
  ctx.lineTo(centerX - 5, centerY - 4);
  ctx.lineTo(centerX + 5, centerY - 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText(`Portee: ${viewRange.toFixed(1)} m`, 16, 24);
  ctx.fillText(`Points: ${currentLidarPoints.length}`, 16, 44);
}

function fetchLidar() {
  fetch(`${API_BASE_URL}/lidar`)
    .then(res => res.json())
    .then(data => {
      console.log("LIDAR:", data);

      if (data.points && Array.isArray(data.points)) {
        currentLidarPoints = data.points
          .map(parseLidarPoint)
          .filter(point => point !== null);
        drawLidarScene();
      }
    })
    .catch(err => console.error("Erreur LIDAR:", err));
}

setInterval(fetchLidar, 500);

const sw = document.getElementById("switch");
sw.addEventListener("click", () => {
  sw.classList.toggle("active");
});

resizeCanvas();
drawLidarScene();
