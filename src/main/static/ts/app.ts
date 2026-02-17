import { Logger } from "./util/logger";

import { Uploader } from "./service/uploader";
import { Storage } from "./service/storage";
import { DeviceAccess } from "./service/device-access";
import { VideoOverlay } from "./service/video-overlay";
import { VideoPipeline } from "./service/video-pipeline";
import { NightVision } from "./service/night-vision";
import { MotionDetector } from "./service/motion-detector";
import { NoiseDetector } from "./service/noise-detector";
import { MediaRecorder } from "./service/media-recorder";
import { ContinuousRecorder } from "./service/continuous-recorder";

const logger = new Logger("App");
export class App {
  private uploader: Uploader;
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

  constructor(options: { uploadUrl: string }) {
    this.uploader = new Uploader(options.uploadUrl);
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
    this.uploader.updateOptions({ fallbackStorage: this.storage });
    this.videoPipeline.addLayer(this.nightVision);
    this.videoPipeline.addLayer(this.motionDetector);
    this.videoPipeline.addLayer(this.videoOverlay);
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

  async activate(options: {
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
  }) {
    this.mediaStream = await this.deviceAccess.start(options.deviceAccess);
    this.videoPipeline.setMediaStream(this.mediaStream);
    this.noiseDetector.setMediaStream(this.mediaStream);

    const onSave = (filename: string, blob: Blob) =>
      this.uploader.post(filename, blob);
    if (options.continuousRecording) {
      this.continuousMediaRecorder = this.createMediaRecorder(
        options.continuousRecording,
      );
      this.continuousRecorder = new ContinuousRecorder();
      this.continuousRecorder.updateOptions({
        fileNaming: `%YYYY%MM%DD%hh%mm%ss-${options.deviceId}-continuous%n`,
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
        fileNaming: `%YYYY%MM%DD%hh%mm%ss-${options.deviceId}-trigger%n`,
        interval: options.triggerRecording.interval,
        onSave,
      });

      if (options.triggerRecording.triggers) {
        const trigger = (instance: any) => {
          if (this.triggerTimeoutId) {
            clearTimeout(this.triggerTimeoutId);
          } else {
            this.triggerRecorder?.updateOptions({
              fileNaming:
                instance instanceof MotionDetector
                  ? `%YYYY%MM%DD%hh%mm%ss-${options.deviceId}-motion%n`
                  : instance instanceof NoiseDetector
                    ? `%YYYY%MM%DD%hh%mm%ss-${options.deviceId}-noise%n`
                    : `%YYYY%MM%DD%hh%mm%ss-${options.deviceId}-trigger%n`,
            });
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
  }

  updateOptions(options: {
    videoOverlay?: Parameters<VideoOverlay["updateOptions"]>[0];
    nightVision?: Parameters<NightVision["updateOptions"]>[0];
    motionDetector?: Parameters<MotionDetector["updateOptions"]>[0];
    noiseDetector?: Parameters<NoiseDetector["updateOptions"]>[0];
  }) {
    if (options.videoOverlay)
      this.videoOverlay.updateOptions(options.videoOverlay);
    if (options.nightVision)
      this.nightVision.updateOptions(options.nightVision);
    if (options.motionDetector)
      this.motionDetector.updateOptions(options.motionDetector);
    if (options.noiseDetector)
      this.noiseDetector.updateOptions(options.noiseDetector);
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
