import { Sensor } from "../../../ts/service/sensor";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");
const pElements: {
  [sensorType: string]: HTMLParagraphElement;
} = {
  Battery: document.createElement("p"),
  Geolocation: document.createElement("p"),
  Accelerometer: document.createElement("p"),
  Gyroscope: document.createElement("p"),
  Magnetometer: document.createElement("p"),
};
if (app) {
  Object.values(pElements).forEach((p) => app.appendChild(p));
}

const sensor = new Sensor();
async function startSensor(
  sensorType: Parameters<Sensor["setGenericSensorListener"]>[0],
) {
  if (await sensor.isSupported(sensorType)) {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    if (app) {
      app.appendChild(canvas);
    }
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const center = { x: ctx.canvas.width / 2, y: ctx.canvas.height / 2 };
    const scale = 10;
    function drawGrid() {
      ctx.strokeStyle = "lightgray";

      ctx.beginPath();
      ctx.moveTo(center.x, 0);
      ctx.lineTo(center.x, ctx.canvas.height);
      ctx.moveTo(0, center.y);
      ctx.lineTo(ctx.canvas.width, center.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(center.x, center.y, 10 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    pElements[sensorType].textContent = `${sensorType}: Waiting for data...`;
    drawGrid();

    sensor.setGenericSensorListener(sensorType, 15, (x, y, z) => {
      pElements[sensorType].innerHTML =
        `${sensorType}:<br/>x:${x}<br/>y:${y}<br/>z:${z}`;

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const _x = center.x - x * scale;
      const _y = center.y + y * scale;
      const radius = scale - z / 2;

      if (z >= 0) {
        // Draw moving ball behind
        ctx.fillStyle = "green";
        ctx.beginPath();
        ctx.arc(_x, _y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      drawGrid();

      // Draw vector line
      ctx.strokeStyle = "blue";
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(_x, _y);
      ctx.stroke();

      if (z < 0) {
        // Draw moving ball front
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(_x, _y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  } else {
    pElements[sensorType].textContent = `${sensorType}: Not supported!`;
  }
}

async function happyPath() {
  if (await sensor.isSupported("Battery")) {
    let batteryLevel = 0;
    let batteryCharging = false;

    pElements.Battery.textContent = "Battery: Waiting for data...";
    sensor.setBatteryListener((batteryInfo) => {
      if (batteryInfo.level !== undefined) {
        batteryLevel = batteryInfo.level;
      }
      if (batteryInfo.charging !== undefined) {
        batteryCharging = batteryInfo.charging;
      }
      pElements.Battery.textContent = `Battery: ${Math.round(batteryLevel * 100)}% (${
        batteryCharging ? "charging" : "discharging"
      }${batteryInfo.eta ? ` ETA: ${Math.round(batteryInfo.eta / 6) / 10} mins` : ""})`;
    });
  } else {
    pElements.Battery.textContent = "Battery: Not supported!";
  }

  if (await sensor.isSupported("Geolocation")) {
    pElements.Geolocation.textContent = "Geolocation: ";
    const requestGeolocationButton = document.createElement("button");
    requestGeolocationButton.textContent = "Request";
    pElements.Geolocation.appendChild(requestGeolocationButton);
    requestGeolocationButton.onclick = () => {
      let lastGeolocation: Parameters<
        Parameters<Sensor["setGeolocationListener"]>[0]
      >[0] = {
        timestamp: 0,
        accuracy: 0,
        latitude: 0,
        longitude: 0,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      };
      pElements.Geolocation.removeChild(requestGeolocationButton);
      pElements.Geolocation.textContent = "Geolocation: Waiting for data...";
      sensor.setGeolocationListener(
        (geolocation) => {
          lastGeolocation = { ...lastGeolocation, ...geolocation };
          pElements.Geolocation.innerHTML = `Geolocation: <br/>Timestamp: ${new Date(
            lastGeolocation.timestamp,
          ).toISOString()}<br/>latitude: ${
            lastGeolocation.latitude
          }<br/>longitude: ${lastGeolocation.longitude}<br/>accuracy: ${
            lastGeolocation.accuracy
          }<br/>altitude: ${
            lastGeolocation.altitude ?? "no data"
          }<br/>heading: ${lastGeolocation.heading ?? "no data"}<br/>speed :${
            lastGeolocation.speed ?? "no data"
          }<br/>altitudeAccuracy: ${
            lastGeolocation.altitudeAccuracy ?? "no data"
          }`;
        },
        (error) =>
          (pElements.Geolocation.textContent = `Geolocation: Error: ${error}`),
      );
    };
  } else {
    pElements.Geolocation.textContent = "Geolocation: Not supported!";
  }

  await startSensor("Accelerometer");
  await startSensor("Gyroscope");
  await startSensor("Magnetometer");

  // TODO
  // window.addEventListener("deviceorientation", (event) => {
  //   console.log("Alpha:", event.alpha); // Rotation around z-axis
  //   console.log("Beta:", event.beta); // Rotation around x-axis
  //   console.log("Gamma:", event.gamma); // Rotation around y-axis
  // });

  // TODO
  // window.addEventListener("devicemotion", (event) => {
  //   console.log("Acceleration X:", event.acceleration?.x);
  //   console.log("Acceleration Y:", event.acceleration?.y);
  //   console.log("Acceleration Z:", event.acceleration?.z);
  // });
}

happyPath();
