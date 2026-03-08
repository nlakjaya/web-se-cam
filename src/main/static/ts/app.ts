import { Logger } from "./util/logger";

import { Uploader } from "./service/uploader";
import { Storage } from "./service/storage";
import { DeviceAccess } from "./service/device-access";
import { VideoOverlay } from "./service/video-overlay";
import { VideoPipeline, VideoLayer } from "./service/video-pipeline";
import { NightVision } from "./service/night-vision";
import { MotionDetector } from "./service/motion-detector";
import { NoiseDetector } from "./service/noise-detector";
import { MediaRecorder } from "./service/media-recorder";
import { ContinuousRecorder } from "./service/continuous-recorder";
import { Sensor } from "./service/sensor";

type StatsData = {
  deviceId?: string;
  deviceTimestamp?: number;
  batteryLevel?: number;
  batteryCharging?: boolean;
  batteryEta?: number;
  frameCount?: number;
  locationTimestamp?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
};

type StatsConfig = {
  url?: string;
  interval?: number;
  timeoutId?: any;
};

type AppOptions = {
  videoOverlay?: Parameters<VideoOverlay["updateOptions"]>[0];
  nightVision?: Parameters<NightVision["updateOptions"]>[0];
  motionDetector?: Parameters<MotionDetector["updateOptions"]>[0];
  noiseDetector?: Parameters<NoiseDetector["updateOptions"]>[0];
  uploadUrl?: string;
  statsConfig?: { url: string; interval: number };
};

type ActivateOptions = {
  deviceId: string;
  deviceAccess?: Parameters<DeviceAccess["start"]>[0];
  continuousRecording?: ConstructorParameters<typeof MediaRecorder>[0] & {
    interval: number;
  };
  triggerRecording?: ConstructorParameters<typeof MediaRecorder>[0] & {
    preRollMs?: number;
    interval: number;
    releaseMs: number;
    triggers: ("MOTION" | "NOISE")[];
  };
};

class FrameCounter implements VideoLayer {
  private frameCount: number;
  constructor() {
    this.frameCount = 0;
  }
  draw(): void {
    this.frameCount++;
  }
  resetFrameCount() {
    this.frameCount = 0;
  }
  getFrameCount() {
    return this.frameCount;
  }
}

const logger = new Logger("App");
export class App {
  private uploader?: Uploader;
  private storage: Storage;
  private deviceAccess: DeviceAccess;
  private videoPipeline: VideoPipeline;
  private videoOverlay: VideoOverlay;
  private motionDetector: MotionDetector;
  private nightVision: NightVision;
  private noiseDetector: NoiseDetector;

  private mediaStream: MediaStream | null;
  private continuousMediaRecorder: MediaRecorder | null;
  private continuousRecorder: ContinuousRecorder | null;
  private triggerTimeoutId: any;
  private triggerMediaRecorder: MediaRecorder | null;
  private triggerRecorder: ContinuousRecorder | null;

  private audioLevelListener: ((level: number) => void) | null;

  private sensor: Sensor;
  private statsConfig: StatsConfig;
  private frameCounter: FrameCounter;

  constructor() {
    this.storage = new Storage();
    this.deviceAccess = new DeviceAccess();
    this.videoPipeline = new VideoPipeline();
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

    this.audioLevelListener = null;

    this.storage.init();
    this.videoPipeline.addLayer(this.nightVision);
    this.videoPipeline.addLayer(this.motionDetector);
    this.videoPipeline.addLayer(this.videoOverlay);

    this.sensor = new Sensor();
    this.statsConfig = {};
    this.frameCounter = new FrameCounter();
    this.videoPipeline.addLayer(this.frameCounter);
  }

  getVideoCanvas() {
    return this.videoPipeline.getCanvasElement();
  }

  getMotionCanvas() {
    return this.motionDetector.getCanvasElement();
  }

  setAudioLevelListener(listener: ((level: number) => void) | null) {
    this.audioLevelListener = listener;
  }

  async activate(options: ActivateOptions) {
    this.mediaStream = await this.deviceAccess.start(options.deviceAccess);
    const videoTrack = this.mediaStream.getVideoTracks()[0];
    const audioTrack = this.mediaStream.getAudioTracks()[0];

    (window as any).videoTrack = videoTrack;
    (window as any).audioTrack = audioTrack;

    this.videoPipeline.setMediaStream(this.mediaStream);
    this.noiseDetector.setMediaStream(this.mediaStream);

    const onSave = (filename: string, blob: Blob) =>
      this.uploader
        ? this.uploader.post(filename, blob)
        : this.storage.save(filename, blob);
    if (options.continuousRecording) {
      this.continuousMediaRecorder = this.createMediaRecorder(
        options.continuousRecording,
      );
      this.continuousRecorder = new ContinuousRecorder();
      this.continuousRecorder.updateOptions({
        fileNaming: `%YYYY%MM%DD_%hh%mm%ss-${options.deviceId}-continuous%n`,
        interval: options.continuousRecording.interval,
        onSave,
      });

      this.continuousRecorder.start(this.continuousMediaRecorder);
    }
    if (options.triggerRecording) {
      this.triggerMediaRecorder = this.createMediaRecorder(
        options.triggerRecording,
      );
      this.triggerRecorder = new ContinuousRecorder();
      this.triggerRecorder.updateOptions({
        fileNaming: `%YYYY%MM%DD_%hh%mm%ss-${options.deviceId}-trigger%n`,
        interval: options.triggerRecording.interval,
        onSave,
      });

      if (options.triggerRecording.triggers) {
        const trigger = (instance: any) => {
          if (this.triggerTimeoutId) {
            clearTimeout(this.triggerTimeoutId);
          } else {
            const triggerType =
              instance instanceof MotionDetector
                ? "motion"
                : instance instanceof NoiseDetector
                  ? "noise"
                  : "trigger";
            this.triggerRecorder?.updateOptions({
              fileNaming: `%YYYY%MM%DD_%hh%mm%ss-${options.deviceId}-${triggerType}%n`,
            });
            logger.info("Recording:", triggerType);
            logger.debug("trigger recording started", this.triggerTimeoutId);
            this.continuousRecorder?.stop();
            if (this.triggerMediaRecorder) {
              this.triggerRecorder?.start(this.triggerMediaRecorder);
            }
          }
          this.triggerTimeoutId = setTimeout(() => {
            logger.debug("trigger recording ended:", this.triggerTimeoutId);
            this.triggerRecorder?.stop();
            if (options.triggerRecording?.preRollMs) {
              this.triggerMediaRecorder?.start(
                undefined,
                options.triggerRecording.preRollMs,
              );
            }
            if (this.continuousMediaRecorder) {
              this.continuousRecorder?.start(this.continuousMediaRecorder);
            }
            this.triggerTimeoutId = null;
          }, options.triggerRecording?.releaseMs);
        };
        if (options.triggerRecording.triggers.includes("MOTION")) {
          this.motionDetector.addTrigger(trigger);
        }
        if (options.triggerRecording.triggers.includes("NOISE")) {
          this.noiseDetector.addTrigger(trigger);
        }
        if (options.triggerRecording.preRollMs) {
          this.triggerMediaRecorder.start(
            undefined,
            options.triggerRecording.preRollMs,
          );
        }
      }
    }

    const _this = this;
    function levelIndicatorAnimator() {
      if (_this.audioLevelListener) {
        if (_this.mediaStream?.active) {
          _this.audioLevelListener(_this.noiseDetector.peakLevel);
          requestAnimationFrame(levelIndicatorAnimator);
        } else {
          logger.debug("level indicator: stopped");
          _this.audioLevelListener(0);
        }
      }
    }

    levelIndicatorAnimator();

    if (this.statsConfig.url && this.statsConfig.interval) {
      const stats: StatsData = {
        deviceId: options.deviceId,
      };
      const { url, interval } = this.statsConfig;
      const sendStats = async () => {
        logger.debug("send stats:", stats);
        if (this.statsConfig.timeoutId) {
          clearTimeout(this.statsConfig.timeoutId);
        }
        this.statsConfig.timeoutId = setTimeout(sendStats, interval);
        stats.deviceTimestamp = Date.now();
        stats.frameCount = this.frameCounter.getFrameCount();
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(stats),
        }).catch((error) => {
          logger.error("send stats failed:", error);
        });
      };
      if (await this.sensor.isSupported("Battery")) {
        this.sensor.setBatteryListener((batteryInfo) => {
          if (batteryInfo.level !== undefined)
            stats.batteryLevel = batteryInfo.level;
          if (batteryInfo.charging !== undefined)
            stats.batteryCharging = batteryInfo.charging;
          stats.batteryEta = batteryInfo.eta;
          if (this.statsConfig.timeoutId) sendStats();
        });
      }
      if (await this.sensor.isSupported("Geolocation")) {
        this.sensor.setGeolocationListener((geolocation) => {
          stats.locationTimestamp = geolocation.timestamp;
          stats.latitude = geolocation.latitude;
          stats.longitude = geolocation.longitude;
          if (geolocation.altitude !== null)
            stats.altitude = geolocation.altitude;
          if (this.statsConfig.timeoutId) sendStats();
        });
      }
      this.frameCounter.resetFrameCount();
      sendStats();
    }
  }

  async deactivate() {
    this.deviceAccess.stop();
    this.videoPipeline.clearCanvas();
    this.motionDetector.clearHistory();
    this.mediaStream = null;
    if (this.triggerTimeoutId) {
      clearTimeout(this.triggerTimeoutId);
      this.triggerTimeoutId = null;
      await this.triggerRecorder?.stop();
    } else {
      await this.continuousRecorder?.stop();
      await this.triggerMediaRecorder?.stop();
    }
    if (this.statsConfig.timeoutId) {
      clearTimeout(this.statsConfig.timeoutId);
      this.statsConfig.timeoutId = undefined;
    }
  }

  updateOptions(options: AppOptions) {
    if (options.videoOverlay)
      this.videoOverlay.updateOptions(options.videoOverlay);
    if (options.nightVision)
      this.nightVision.updateOptions(options.nightVision);
    if (options.motionDetector)
      this.motionDetector.updateOptions(options.motionDetector);
    if (options.noiseDetector)
      this.noiseDetector.updateOptions(options.noiseDetector);
    if (options.uploadUrl) {
      this.uploader = new Uploader(options.uploadUrl);
      this.uploader.updateOptions({ fallbackStorage: this.storage });
    } else {
      this.uploader = undefined;
    }
    if (options.statsConfig) {
      this.statsConfig.url = options.statsConfig.url;
      this.statsConfig.interval = options.statsConfig.interval;
    } else {
      this.statsConfig.url = undefined;
      this.statsConfig.interval = undefined;
    }
  }

  private createMediaRecorder(
    options: ConstructorParameters<typeof MediaRecorder>[0],
  ) {
    if (!this.mediaStream) {
      const errorMsg = "no active media stream";
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    return new MediaRecorder(
      options,
      ...this.videoPipeline.getCanvasElement().captureStream().getVideoTracks(),
      ...this.mediaStream.getAudioTracks(),
    );
  }
}
