import { Logger } from "../util/logger";

type SensorType =
  | "Battery"
  | "Geolocation"
  | "Accelerometer"
  | "Gyroscope"
  | "Magnetometer";

const logger = new Logger("Sensor");
export class Sensor {
  async isSupported(sensorType: SensorType): Promise<boolean> {
    logger.debug("isSupported called:", sensorType);
    let supported = false;
    switch (sensorType) {
      case "Battery":
        supported = "getBattery" in navigator;
        break;
      case "Geolocation":
        supported = "geolocation" in navigator;
        break;
      case "Accelerometer":
      case "Gyroscope":
      case "Magnetometer":
        supported = sensorType in globalThis;
        if (supported) {
          await navigator.permissions.query({
            name: sensorType.toLowerCase(),
          } as any);
        }
        break;
    }
    logger.debug("isSupported:", sensorType, supported);
    return supported;
  }

  setBatteryListener(
    listener: (batteryInfo: {
      level?: number;
      charging?: boolean;
      eta?: number;
    }) => void,
  ) {
    logger.debug("getBattery called");
    (navigator as any).getBattery().then((battery: any) => {
      logger.debug("(native).getBattery called:", battery);
      function getETA() {
        if (
          battery.chargingTime !== undefined &&
          battery.chargingTime != Infinity
        ) {
          return battery.chargingTime;
        }
        if (
          battery.dischargingTime !== undefined &&
          battery.dischargingTime != Infinity
        ) {
          return battery.dischargingTime;
        }
        return undefined;
      }
      listener({
        level: battery.level,
        charging: battery.charging,
        eta: getETA(),
      });
      battery.addEventListener("levelchange", (event: Event) => {
        logger.debug("(native).levelchange called:", event);
        listener({
          level: battery.level,
          eta: getETA(),
        });
      });
      battery.addEventListener("chargingchange", (event: Event) => {
        logger.debug("(native).chargingchange called:", event);
        listener({
          charging: battery.charging,
          eta: getETA(),
        });
      });
      battery.addEventListener("chargingtimechange", (event: Event) => {
        logger.debug("(native).chargingtimechange called:", event);
        listener({
          eta: getETA(),
        });
      });
      battery.addEventListener("dischargingtimechange", (event: Event) => {
        logger.debug("(native).dischargingtimechange called:", event);
        listener({
          eta: getETA(),
        });
      });
    });
  }

  setGeolocationListener(
    listener: (geolocation: {
      timestamp: number;
      accuracy: number;
      latitude: number;
      longitude: number;
      altitude: number | null;
      altitudeAccuracy: number | null;
      heading: number | null;
      speed: number | null;
    }) => void,
    errorCb?: (error: string) => {},
    options?: PositionOptions,
  ) {
    const positionListener: PositionCallback = (position) => {
      logger.debug("(native).position called:", position);
      listener({
        timestamp: position.timestamp,
        accuracy: position.coords.accuracy,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
      });
    };
    const errorListener: PositionErrorCallback = (error) => {
      logger.debug("(native).position error:", error);
      errorCb?.(error.message);
    };
    navigator.geolocation.getCurrentPosition(
      positionListener,
      errorListener,
      options,
    );
    navigator.geolocation.watchPosition(
      positionListener,
      errorListener,
      options,
    );
  }

  setGenericSensorListener(
    sensorType: "Accelerometer" | "Gyroscope" | "Magnetometer",
    frequency: number,
    listener: (x: number, y: number, z: number) => void,
  ) {
    logger.debug("setSensorListener called:", sensorType, frequency);
    try {
      const sensor = new (globalThis as any)[sensorType]({
        frequency,
      });
      sensor.addEventListener("reading", (event: Event) => {
        logger.debug("(native).reading called:", event);
        listener(sensor.x, sensor.y, sensor.z);
      });
      sensor.start();
    } catch (error) {
      logger.error("setSensorListener error:", sensorType, error);
    }
  }

  setAccelerometerListener(
    frequency: number,
    listener: (x: number, y: number, z: number) => void,
  ) {
    this.setGenericSensorListener("Accelerometer", frequency, listener);
  }

  setGyroscopeListener(
    frequency: number,
    listener: (x: number, y: number, z: number) => void,
  ) {
    this.setGenericSensorListener("Gyroscope", frequency, listener);
  }

  setMagnetometerListener(
    frequency: number,
    listener: (x: number, y: number, z: number) => void,
  ) {
    this.setGenericSensorListener("Magnetometer", frequency, listener);
  }
}
