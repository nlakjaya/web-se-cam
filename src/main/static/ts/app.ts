import { ContinuousRecorder } from "./service/continuous-recorder";
import { DeviceAccess } from "./service/device-access";
import { MediaRecorder } from "./service/media-recorder";
import { MotionDetector } from "./service/motion-detector";
import { NightVision } from "./service/night-vision";
import { NoiseDetector } from "./service/noise-detector";
import { Sensor } from "./service/sensor";
import { VideoOverlay } from "./service/video-overlay";
import { VideoPipeline } from "./service/video-pipeline";
import { VideoStats } from "./service/video-stats";
import { Logger } from "./util/logger";

export type Stats = {
  deviceTimestamp: number;
  status: string;
  batteryLevel?: number;
  batteryCharging?: boolean;
  batteryEta?: number;
  frameCount?: number;
  locationTimestamp?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
};

export type AppOptions = {
  videoPipeline?: Parameters<VideoPipeline["updateOptions"]>[0];
  videoOverlay?: Parameters<VideoOverlay["updateOptions"]>[0];
  nightVision?: Parameters<NightVision["updateOptions"]>[0];
  motionDetector?: Parameters<MotionDetector["updateOptions"]>[0];
  noiseDetector?: Parameters<NoiseDetector["updateOptions"]>[0];
  stats?: { interval?: number; battery?: boolean; geolocation?: boolean };
};

export type ActivateOptions = {
  deviceId: string;
  deviceAccess?: Parameters<DeviceAccess["start"]>[0];
  continuousRecording?: ConstructorParameters<typeof MediaRecorder>[0] & {
    interval: number;
  };
  triggerRecording?: ConstructorParameters<typeof MediaRecorder>[0] & {
    preRollMs?: number;
    interval: number;
    releaseMs: number;
    triggers: ("motion" | "noise")[];
  };
};

const logger = new Logger("App");
export class App {
  private readonly deviceAccess: DeviceAccess;
  private readonly videoPipeline: VideoPipeline;
  private readonly videoStats: VideoStats;
  private readonly videoOverlay: VideoOverlay;
  private readonly motionDetector: MotionDetector;
  private readonly nightVision: NightVision;
  private readonly noiseDetector: NoiseDetector;

  private mediaStream: MediaStream | null;
  private continuousMediaRecorder: MediaRecorder | null;
  private continuousRecorder: ContinuousRecorder | null;
  private triggerTimeoutId: any;
  private triggerMediaRecorder: MediaRecorder | null;
  private triggerRecorder: ContinuousRecorder | null;

  private readonly sensor: Sensor;
  private readonly stats: {
    interval?: number;
    timeoutId?: any;
    battery?: boolean;
    geolocation?: boolean;
  };

  private wakeLock?: any;

  constructor(
    private readonly onSave: (filename: string, blob: Blob) => void,
    private readonly onStats: (stats: Stats) => void,
    private readonly audioLevelListener: (level: number) => void,
  ) {
    this.deviceAccess = new DeviceAccess();
    this.videoPipeline = new VideoPipeline();
    this.videoStats = new VideoStats();
    this.videoOverlay = new VideoOverlay();
    this.nightVision = new NightVision();
    this.motionDetector = new MotionDetector();
    this.noiseDetector = new NoiseDetector();

    this.mediaStream = null;
    this.continuousMediaRecorder = null;
    this.continuousRecorder = null;
    this.triggerTimeoutId = null;
    this.triggerMediaRecorder = null;
    this.triggerRecorder = null;

    this.videoPipeline.addLayer(this.nightVision);
    this.videoPipeline.addLayer(this.motionDetector);
    this.videoPipeline.addLayer(this.videoOverlay);
    this.videoPipeline.addLayer(this.videoStats);

    this.sensor = new Sensor();
    this.stats = { battery: false, geolocation: false };

    document.addEventListener("visibilitychange", async () => {
      if (this.wakeLock && document.visibilityState == "visible") {
        await this.requestWakeLock();
      }
    });
  }

  updateOptions(options: AppOptions) {
    if (options.videoPipeline)
      this.videoPipeline.updateOptions(options.videoPipeline);
    if (options.videoOverlay)
      this.videoOverlay.updateOptions(options.videoOverlay);
    if (options.nightVision)
      this.nightVision.updateOptions(options.nightVision);
    if (options.motionDetector)
      this.motionDetector.updateOptions(options.motionDetector);
    if (options.noiseDetector)
      this.noiseDetector.updateOptions(options.noiseDetector);
    if (options.stats) {
      this.stats.interval = options.stats.interval || undefined;
      if (options.stats.battery !== undefined) {
        this.stats.battery = options.stats.battery || false;
      }
      if (options.stats.geolocation !== undefined) {
        this.stats.geolocation = options.stats.geolocation || false;
      }
    }
  }

  getVideoCanvas() {
    return this.videoPipeline.getCanvasElement();
  }

  getMotionCanvas() {
    return this.motionDetector.getCanvasElement();
  }

  private sendStats(stats?: Partial<Stats>) {
    if (this.stats.timeoutId) {
      clearTimeout(this.stats.timeoutId);
      this.stats.timeoutId = undefined;
      logger.debug("send stats schedule cancelled");
    }
    const completeStats = {
      status: this.mediaStream ? "active" : "inactive",
      ...stats,
      deviceTimestamp: Date.now(),
      frameCount: this.videoStats.getFrameCount(),
    };
    logger.debug("sendStats:", completeStats);
    this.onStats(completeStats);
    if (this.stats.interval) {
      this.stats.timeoutId = setTimeout(
        () => this.sendStats(),
        this.stats.interval,
      );
      logger.debug("send stats scheduled in ms:", this.stats.interval);
    }
  }

  private createMediaRecorder(
    options: ConstructorParameters<typeof MediaRecorder>[0],
  ) {
    if (!this.mediaStream) {
      const errorMsg = "no active media stream";
      logger.error("createMediaRecorder failed:", errorMsg);
      throw new Error(errorMsg);
    }
    return new MediaRecorder(
      options,
      ...this.videoPipeline.getCanvasElement().captureStream().getVideoTracks(),
      ...this.mediaStream.getAudioTracks(),
    );
  }

  async activate(options: ActivateOptions) {
    this.mediaStream = await this.deviceAccess.start(options.deviceAccess);
    const videoTrack = this.mediaStream.getVideoTracks()[0];
    const audioTrack = this.mediaStream.getAudioTracks()[0];

    (globalThis as any).videoTrack = videoTrack; // for debugging
    (globalThis as any).audioTrack = audioTrack; // for debugging

    this.videoPipeline.setMediaStream(this.mediaStream);
    this.noiseDetector.setMediaStream(this.mediaStream);

    const levelIndicatorAnimator = () => {
      if (this.mediaStream?.active) {
        this.audioLevelListener(this.noiseDetector.peakLevel);
        requestAnimationFrame(levelIndicatorAnimator);
      } else {
        logger.debug("level indicator: stopped");
        this.audioLevelListener(0);
      }
    };
    levelIndicatorAnimator();
    logger.debug("level indicator: started");

    if (options.continuousRecording) {
      this.continuousMediaRecorder = this.createMediaRecorder(
        options.continuousRecording,
      );
      this.continuousRecorder = new ContinuousRecorder();
      this.continuousRecorder.updateOptions({
        fileNaming: `%YYYY%MM%DD_%hh%mm%ss-${options.deviceId}-continuous%n`,
        interval: options.continuousRecording.interval,
        onSave: this.onSave,
      });

      this.continuousRecorder.start(this.continuousMediaRecorder);
    }

    if (options.triggerRecording) {
      this.triggerMediaRecorder = this.createMediaRecorder(
        options.triggerRecording,
      );
      const triggerRecorder = (this.triggerRecorder = new ContinuousRecorder());
      triggerRecorder.updateOptions({
        fileNaming: `%YYYY%MM%DD_%hh%mm%ss-${options.deviceId}-trigger%n`,
        fileNamingRolloverNewTs: false,
        interval: options.triggerRecording.interval,
        onSave: this.onSave,
      });

      if (options.triggerRecording.triggers) {
        const preRollMs = options.triggerRecording.preRollMs;
        const setupPreRollRecording = () => {
          if (preRollMs) {
            this.triggerMediaRecorder?.start(undefined, preRollMs);
          }
        };
        setupPreRollRecording();

        const releaseMs = options.triggerRecording.releaseMs;
        const triggerRelease = () => {
          logger.info("Recording: ended");
          triggerRecorder.stop();
          setupPreRollRecording();
          if (this.continuousMediaRecorder) {
            this.continuousRecorder?.start(this.continuousMediaRecorder);
          }
          this.triggerTimeoutId = null;
        };

        const trigger = (triggerType: string) => {
          if (this.triggerTimeoutId) {
            clearTimeout(this.triggerTimeoutId);
            logger.debug("trigger release schedule cancelled");
          } else if (this.mediaStream) {
            triggerRecorder.updateOptions({
              fileNaming: `%YYYY%MM%DD_%hh%mm%ss-${options.deviceId}-${triggerType}%n`,
            });
            logger.info("Recording:", triggerType);
            this.continuousRecorder?.stop();
            if (this.triggerMediaRecorder) {
              triggerRecorder.start(this.triggerMediaRecorder);
            }
            this.sendStats({ status: triggerType });
          } else {
            return;
          }
          this.triggerTimeoutId = setTimeout(() => triggerRelease(), releaseMs);
          logger.debug("trigger release scheduled in ms:", releaseMs);
        };
        if (options.triggerRecording.triggers.includes("motion")) {
          this.motionDetector.addTrigger(() => trigger("motion"));
        }
        if (options.triggerRecording.triggers.includes("noise")) {
          this.noiseDetector.addTrigger(() => trigger("noise"));
        }
      }
    }

    if (this.stats.battery && (await this.sensor.isSupported("Battery"))) {
      this.sensor.setBatteryListener((battery) => {
        const stat = {
          ...(battery.level != undefined && { batteryLevel: battery.level }),
          ...(battery.charging != undefined && {
            batteryCharging: battery.charging,
          }),
          ...(battery.eta != undefined && { batteryEta: battery.eta }),
        };
        const keys = Object.keys(stat);
        if (keys.length == 1 && keys[0] == "batteryEta" && !stat.batteryEta) {
          return;
        }
        this.sendStats(stat);
      });
      this.stats.battery = undefined;
    }

    if (
      this.stats.geolocation &&
      (await this.sensor.isSupported("Geolocation"))
    ) {
      this.sensor.setGeolocationListener((geolocation) =>
        this.sendStats({
          locationTimestamp: geolocation.timestamp,
          latitude: geolocation.latitude,
          longitude: geolocation.longitude,
          // accuracy: geolocation.accuracy,
          ...(geolocation.altitude !== null && {
            altitude: geolocation.altitude,
          }),
        }),
      );
      this.stats.geolocation = undefined;
    }

    this.videoStats.reset();
    this.sendStats();
    this.requestWakeLock();
  }

  async deactivate() {
    this.deviceAccess.stop();
    this.mediaStream = null;
    this.videoPipeline.clearCanvas();
    this.motionDetector.clearHistory();
    this.motionDetector.clearTriggers();
    this.noiseDetector.clearTriggers();

    if (this.triggerTimeoutId) {
      clearTimeout(this.triggerTimeoutId);
      this.triggerTimeoutId = null;
      logger.debug("trigger release schedule cancelled");
      this.triggerRecorder?.stop();
    } else {
      this.continuousRecorder?.stop();
      await this.triggerMediaRecorder?.stop();
    }
    this.continuousMediaRecorder = null;
    this.continuousRecorder = null;
    this.triggerMediaRecorder = null;
    this.triggerRecorder = null;

    this.sendStats();
    this.releaseWakeLock();
  }

  async requestWakeLock() {
    try {
      this.wakeLock = await navigator.wakeLock.request("screen");
      this.wakeLock.addEventListener("release", (event: Event) => {
        logger.debug("wake lock: released:", event);
      });
      logger.debug("wake lock: acquired");
    } catch (error) {
      logger.error("wake lock: error", error);
    }
  }

  async releaseWakeLock() {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = undefined;
    }
  }
}
