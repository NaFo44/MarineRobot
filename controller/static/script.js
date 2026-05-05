const API_BASE_URL = "http://192.168.50.1:5000";
const canvas = document.getElementById("lidar-view");
const ctx = canvas.getContext("2d");

const LIDAR_FETCH_INTERVAL_MS = 120;
const POINT_PERSISTENCE_MS = 1800;
const VIEW_RANGE_METERS = 18;
const LIDAR_ROTATION_OFFSET_DEG = -90;
const MAX_LIDAR_DISTANCE_METERS = 35;
const LIDAR_POINT_ORDER = "auto"; // auto | angle-distance | distance-angle

let lidarTrail = [];
let lastFramePoints = [];
let lastLat = null;
let lastLng = null;
let pointOrder = null;
let isLidarFetchInFlight = false;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

function toDegrees(value) {
  if (Math.abs(value) <= (Math.PI * 2 + 0.01)) {
    return value * (180 / Math.PI);
  }
  return value;
}

function normalizeDegrees(deg) {
  const normalized = deg % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function detectPointOrder(rawPoints) {
  if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
    return "angle-distance";
  }

  let scoreAngleDistance = 0;
  let scoreDistanceAngle = 0;

  rawPoints.forEach((p) => {
    if (!Array.isArray(p) || p.length < 2) return;
    const a = Number(p[0]);
    const b = Number(p[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;

    if (b >= 0 && b <= MAX_LIDAR_DISTANCE_METERS) scoreAngleDistance += 2;
    if (a >= 0 && a <= MAX_LIDAR_DISTANCE_METERS) scoreDistanceAngle += 2;
    if (a >= 0 && a <= 360) scoreAngleDistance += 1;
    if (b >= 0 && b <= 360) scoreDistanceAngle += 1;
  });

  return scoreDistanceAngle > scoreAngleDistance
    ? "distance-angle"
    : "angle-distance";
}

function parseLidarPoint(rawPoint) {
  if (!Array.isArray(rawPoint) || rawPoint.length < 3) return null;

  const a = Number(rawPoint[0]);
  const b = Number(rawPoint[1]);
  const intensity = Number(rawPoint[2]);

  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(intensity)) {
    return null;
  }

  const distance = pointOrder === "distance-angle" ? a : b;
  const rawAngle = pointOrder === "distance-angle" ? b : a;
  if (!Number.isFinite(distance) || distance < 0 || distance > MAX_LIDAR_DISTANCE_METERS) {
    return null;
  }

  const angleDeg = normalizeDegrees(toDegrees(rawAngle) + LIDAR_ROTATION_OFFSET_DEG);
  const angleRad = angleDeg * Math.PI / 180;

  return {
    distance,
    angleRad,
    intensity
  };
}

function pruneTrail(now) {
  lidarTrail = lidarTrail.filter(p => (now - p.timestamp) <= POINT_PERSISTENCE_MS);
}

function pushFramePoints(points) {
  const now = performance.now();
  lastFramePoints = points;

  points.forEach((point) => {
    lidarTrail.push({
      ...point,
      timestamp: now
    });
  });

  pruneTrail(now);
}

function drawLidarScene(now) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadiusPx = Math.min(width, height) * 0.45;
  const metersToPixels = maxRadiusPx / VIEW_RANGE_METERS;

  pruneTrail(now);

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

  lidarTrail.forEach((point) => {
    const age = now - point.timestamp;
    const alpha = Math.max(0, 1 - (age / POINT_PERSISTENCE_MS));
    const x = centerX + Math.cos(point.angleRad) * point.distance * metersToPixels;
    const y = centerY - Math.sin(point.angleRad) * point.distance * metersToPixels;

    const color = point.intensity > 200
      ? `rgba(255, 95, 95, ${0.2 + 0.8 * alpha})`
      : `rgba(245, 177, 65, ${0.2 + 0.8 * alpha})`;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 2 + alpha * 1.5, 0, Math.PI * 2);
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
  ctx.fillText(`Portee fixe: ${VIEW_RANGE_METERS.toFixed(1)} m`, 16, 24);
  ctx.fillText(`Points frame: ${lastFramePoints.length}`, 16, 44);
  ctx.fillText(`Points persistants: ${lidarTrail.length}`, 16, 64);
}

function renderLoop(now) {
  drawLidarScene(now);
  requestAnimationFrame(renderLoop);
}

function fetchLidar() {
  if (isLidarFetchInFlight) return;
  isLidarFetchInFlight = true;

  fetch(`${API_BASE_URL}/lidar`)
    .then(res => res.json())
    .then(data => {
      if (data.points && Array.isArray(data.points)) {
        if (!pointOrder && data.points.length > 0) {
          pointOrder = LIDAR_POINT_ORDER === "auto"
            ? detectPointOrder(data.points)
            : LIDAR_POINT_ORDER;
        }

        const parsedPoints = data.points
          .map(parseLidarPoint)
          .filter(point => point !== null);

        pushFramePoints(parsedPoints);
      }
    })
    .catch(err => console.error("Erreur LIDAR:", err))
    .finally(() => {
      isLidarFetchInFlight = false;
    });
}

setInterval(fetchLidar, LIDAR_FETCH_INTERVAL_MS);
fetchLidar();

const sw = document.getElementById("switch");
sw.addEventListener("click", () => {
  sw.classList.toggle("active");
});

resizeCanvas();
requestAnimationFrame(renderLoop);
