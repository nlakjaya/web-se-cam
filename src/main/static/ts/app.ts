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
  videoOverlay?: Parameters<VideoOverlay["updateOptions"]>[0];
  nightVision?: Parameters<NightVision["updateOptions"]>[0];
  motionDetector?: Parameters<MotionDetector["updateOptions"]>[0];
  noiseDetector?: Parameters<NoiseDetector["updateOptions"]>[0];
  statsInterval?: number;
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
  private deviceAccess: DeviceAccess;
  private videoPipeline: VideoPipeline;
  private videoStats: VideoStats;
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

  private sensor: Sensor;
  private startBatteryListener: boolean;
  private startGeoLocationListener: boolean;
  statsInterval?: number;
  statsTimeoutId?: any;

  constructor(
    private onSave: (filename: string, blob: Blob) => void,
    private onStats: (stats: Stats) => void,
    private audioLevelListener: (level: number) => void,
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
    this.startBatteryListener = true;
    this.startGeoLocationListener = true;
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
    if (options.statsInterval) {
      this.statsInterval = options.statsInterval;
    } else {
      this.statsInterval = undefined;
    }
  }

  getVideoCanvas() {
    return this.videoPipeline.getCanvasElement();
  }

  getMotionCanvas() {
    return this.motionDetector.getCanvasElement();
  }

  private sendStats(stats?: Partial<Stats>) {
    if (this.statsTimeoutId) {
      clearTimeout(this.statsTimeoutId);
      this.statsTimeoutId = undefined;
    }
    const _this = this;
    const sendStats = (stats?: Partial<Stats>) => {
      const fullStats = {
        status: _this.mediaStream ? "active" : "inactive",
        ...stats,
        deviceTimestamp: Date.now(),
        frameCount: _this.videoStats.getFrameCount(),
      };
      logger.debug("sendStats:", fullStats);
      _this.onStats(fullStats);
    };
    if (this.statsInterval) {
      this.statsTimeoutId = setTimeout(sendStats, this.statsInterval);
    }
    sendStats(stats);
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

  private batteryEvents(battery: {
    level?: number;
    charging?: boolean;
    eta?: number;
  }) {
    // TODO: battery based events
    if (
      this.mediaStream &&
      ((battery.charging === false && (battery.level ?? 1) < 0.5) ||
        (battery.charging === true &&
          (battery.level ?? 1) < 0.2 &&
          !battery.eta))
    ) {
      this.deactivate();
    }
    if (
      battery.charging === true &&
      (battery.level ?? 0) > 0.8 &&
      battery.eta
    ) {
      // this.activate();
    }
  }

  async activate(options: ActivateOptions) {
    this.mediaStream = await this.deviceAccess.start(options.deviceAccess);
    const videoTrack = this.mediaStream.getVideoTracks()[0];
    const audioTrack = this.mediaStream.getAudioTracks()[0];

    (window as any).videoTrack = videoTrack; // for debugging
    (window as any).audioTrack = audioTrack; // for debugging

    this.videoPipeline.setMediaStream(this.mediaStream);
    this.noiseDetector.setMediaStream(this.mediaStream);

    const _this = this;
    function levelIndicatorAnimator() {
      if (_this.mediaStream?.active) {
        _this.audioLevelListener(_this.noiseDetector.peakLevel);
        requestAnimationFrame(levelIndicatorAnimator);
      } else {
        logger.debug("level indicator: stopped");
        _this.audioLevelListener(0);
      }
    }
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
          } else {
            triggerRecorder.updateOptions({
              fileNaming: `%YYYY%MM%DD_%hh%mm%ss-${options.deviceId}-${triggerType}%n`,
            });
            logger.info("Recording:", triggerType);
            this.continuousRecorder?.stop();
            if (this.triggerMediaRecorder) {
              triggerRecorder.start(this.triggerMediaRecorder);
            }
            this.sendStats({ status: triggerType });
          }
          this.triggerTimeoutId = setTimeout(triggerRelease, releaseMs);
        };
        if (options.triggerRecording.triggers.includes("motion")) {
          this.motionDetector.addTrigger(() => trigger("motion"));
        }
        if (options.triggerRecording.triggers.includes("noise")) {
          this.noiseDetector.addTrigger(() => trigger("noise"));
        }
      }
    }

    if (
      this.startBatteryListener &&
      (await this.sensor.isSupported("Battery"))
    ) {
      this.sensor.setBatteryListener((battery) => {
        this.sendStats({
          batteryLevel: battery.level,
          batteryCharging: battery.charging,
          batteryEta: battery.eta,
        });
        this.batteryEvents(battery);
      });
      this.startBatteryListener = false;
    }

    if (
      this.startGeoLocationListener &&
      (await this.sensor.isSupported("Geolocation"))
    ) {
      this.sensor.setGeolocationListener((geolocation) =>
        this.sendStats({
          locationTimestamp: geolocation.timestamp,
          latitude: geolocation.latitude,
          longitude: geolocation.longitude,
          altitude: geolocation.altitude ?? undefined,
        }),
      );
      this.startGeoLocationListener = false;
    }

    this.videoStats.reset();
    this.sendStats();
  }

  async deactivate() {
    this.deviceAccess.stop();
    this.mediaStream = null;
    this.videoPipeline.clearCanvas();
    this.motionDetector.clearHistory();

    if (this.triggerTimeoutId) {
      clearTimeout(this.triggerTimeoutId);
      this.triggerTimeoutId = null;
      await this.triggerRecorder?.stop();
    } else {
      await this.continuousRecorder?.stop();
      await this.triggerMediaRecorder?.stop();
    }
    this.continuousMediaRecorder = null;
    this.continuousRecorder = null;
    this.triggerMediaRecorder = null;
    this.triggerRecorder = null;

    this.sendStats();
  }
}
