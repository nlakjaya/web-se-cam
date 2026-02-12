import { Logger } from "../../../ts/util/logger";
import { sleep } from "../../ts/base";

const logger = new Logger("sensor");

// TODO: make service
class Sensor {
  // TODO: battery (level, state)
}

async function happyPath() {
  if ("permissions" in navigator) {
    navigator.permissions
      .query({ name: "accelerometer" } as any)
      .then((result) => {
        console.log("Accelerometer permission:", result.state);
      });
  }

  if ("Accelerometer" in window) {
    try {
      const accelerometer = new (window as any).Accelerometer({
        frequency: 60,
      });

      accelerometer.addEventListener("reading", () => {
        console.log("X:", accelerometer.x);
        console.log("Y:", accelerometer.y);
        console.log("Z:", accelerometer.z);
      });

      accelerometer.start();
    } catch (error) {
      console.error("Sensor not allowed or not available:", error);
    }
  } else {
    console.log("Accelerometer not supported on this device/browser.");
  }

  window.addEventListener("deviceorientation", (event) => {
    console.log("Alpha:", event.alpha); // Rotation around z-axis
    console.log("Beta:", event.beta); // Rotation around x-axis
    console.log("Gamma:", event.gamma); // Rotation around y-axis
  });

  window.addEventListener("devicemotion", (event) => {
    console.log("Acceleration X:", event.acceleration?.x);
    console.log("Acceleration Y:", event.acceleration?.y);
    console.log("Acceleration Z:", event.acceleration?.z);
  });

  if ("getBattery" in navigator) {
    (navigator as any).getBattery().then((battery: any) => {
      function updateBatteryInfo() {
        console.log(`Battery level: ${battery.level * 100}%`);
        console.log(`Charging: ${battery.charging}`);
      }

      updateBatteryInfo();

      battery.addEventListener("levelchange", updateBatteryInfo);
      battery.addEventListener("chargingchange", updateBatteryInfo);
    });
  } else {
    console.log("Battery API not supported on this device/browser.");
  }
}

happyPath();
