import {
  AUDIO_CONFIGS,
  VIDEO_FRAME_RATES,
  VIDEO_RESOLUTIONS,
} from "../util/constants";
import { Logger } from "../util/logger";

type Options = {
  video?: {
    id?: string;
    width?: number;
    height?: number;
    frameRate?: number;
  };
  audio?: {
    id?: string;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    sampleRate?: number;
    channelCount?: number;
    sampleSize?: number;
  };
};

const logger = new Logger("DeviceAccess");
export class DeviceAccess {
  private options: Options;
  private stream?: MediaStream;
  private videoDevices: MediaDeviceInfo[];
  private audioDevices: MediaDeviceInfo[];

  constructor() {
    this.options = {
      video: { width: 640, height: 480, frameRate: 15 },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    };

    this.videoDevices = [];
    this.audioDevices = [];

    logger.debug("instance created");
  }

  updateOptions(options: Partial<Options>) {
    logger.debug("updateOptions called:", options);
    this.options = {
      video:
        options.video === undefined
          ? undefined
          : { ...this.options.video, ...options.video },
      audio:
        options.audio === undefined
          ? undefined
          : { ...this.options.audio, ...options.audio },
    };
  }

  async requestPermissions(): Promise<boolean> {
    logger.debug("requestPermissions called");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices API not supported");
      }

      // Request permissions by getting a stream and stopping immediately
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: this.options.audio !== undefined,
        video: this.options.video !== undefined,
      });
      stream.getTracks().forEach((track) => track.stop());

      logger.info("Permissions granted");
    } catch (error) {
      logger.warn("requestPermissions failed:", error);
      return false;
    }
    return true;
  }

  async getVideoDeviceList(): Promise<MediaDeviceInfo[]> {
    logger.debug("getVideoDeviceList called");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error("Device enumeration not supported");
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.videoDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );
      logger.debug("getVideoDeviceList found:", this.videoDevices);

      return this.videoDevices;
    } catch (error) {
      logger.warn("getVideoDeviceList failed:", error);
      return [];
    }
  }

  async getAudioDeviceList(): Promise<MediaDeviceInfo[]> {
    logger.debug("getAudioDeviceList called");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error("Device enumeration not supported");
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.audioDevices = devices.filter(
        (device) => device.kind === "audioinput",
      );
      logger.debug("getAudioDeviceList found:", this.audioDevices);

      return this.audioDevices;
    } catch (error) {
      logger.warn("getAudioDeviceList failed:", error);
      return [];
    }
  }

  async getVideoDeviceCapabilitiesList(deviceId?: string): Promise<
    {
      width: number;
      height: number;
      frameRate: number;
      label: string;
    }[]
  > {
    logger.debug("getVideoDeviceCapabilitiesList called:", { deviceId });
    try {
      if (!deviceId && this.videoDevices.length > 0) {
        deviceId = this.videoDevices[0].deviceId;
        logger.debug(
          "getVideoDeviceCapabilitiesList",
          "Using first available device:",
          { deviceId },
        );
      }
      if (!deviceId) {
        throw new Error("No video device available");
      }

      const testStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
        },
      });
      const videoTrack = testStream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error("No video track available");
      }
      const capabilities = videoTrack.getCapabilities();
      logger.debug("getVideoDeviceCapabilitiesList supported:", capabilities);
      testStream.getTracks().forEach((track) => track.stop());

      const resolutions = VIDEO_RESOLUTIONS.filter(
        (r) =>
          r.width <= (capabilities.width?.max ?? 640) &&
          r.width >= (capabilities.width?.min ?? 0) &&
          r.height <= (capabilities.height?.max ?? 480) &&
          r.height >= (capabilities.height?.min ?? 0),
      );
      const frameRateOptions = VIDEO_FRAME_RATES.filter(
        (f) =>
          f <= (capabilities.frameRate?.max ?? 30) &&
          f >= (capabilities.frameRate?.min ?? 1),
      );
      const supportedCombinations: {
        width: number;
        height: number;
        frameRate: number;
        label: string;
      }[] = [];
      for (const res of resolutions) {
        for (const frameRate of frameRateOptions) {
          supportedCombinations.push({
            width: res.width,
            height: res.height,
            frameRate: frameRate,
            label: `${res.width}x${res.height} @ ${frameRate}fps`,
          });
        }
      }
      const sorted = supportedCombinations.sort(
        (a, b) =>
          b.width * b.height * b.frameRate - a.width * a.height * a.frameRate,
      );

      logger.debug("getVideoDeviceCapabilitiesList:", sorted);
      return sorted;
    } catch (error) {
      logger.warn(
        "getVideoDeviceCapabilitiesList failed:",
        {
          deviceId,
        },
        error,
      );
      return [];
    }
  }

  async getAudioDeviceCapabilitiesList(deviceId?: string): Promise<
    {
      sampleRate: number;
      channelCount: number;
      sampleSize: number;
      label: string;
    }[]
  > {
    logger.debug("getAudioDeviceCapabilitiesList called:", { deviceId });
    try {
      if (!deviceId && this.audioDevices.length > 0) {
        deviceId = this.audioDevices[0].deviceId;
        logger.debug(
          "getAudioDeviceCapabilitiesList",
          "Using first available device:",
          { deviceId },
        );
      }
      if (!deviceId) {
        throw new Error("No audio device available");
      }

      const testStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
        },
      });
      const audioTrack = testStream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error("No audio track available");
      }
      const capabilities = audioTrack.getCapabilities();
      logger.debug("getAudioDeviceCapabilitiesList supported:", capabilities);
      testStream.getTracks().forEach((track) => track.stop());

      const supportedCombinations = AUDIO_CONFIGS.filter((config) => {
        if (capabilities.channelCount) {
          const maxChannels = capabilities.channelCount.max || 2;
          if (config.channelCount > maxChannels) return false;
        }
        if (capabilities.sampleRate) {
          const maxSampleRate = capabilities.sampleRate.max || 48000;
          const minSampleRate = capabilities.sampleRate.min || 8000;
          if (
            config.sampleRate > maxSampleRate ||
            config.sampleRate < minSampleRate
          ) {
            return false;
          }
        }
        if (capabilities.sampleSize) {
          const maxSampleSize = capabilities.sampleSize.max || 24;
          if (config.sampleSize > maxSampleSize) return false;
        }
        return true;
      });

      const sorted = supportedCombinations.sort((a, b) => {
        const qualityA = a.sampleRate * a.channelCount * a.sampleSize;
        const qualityB = b.sampleRate * b.channelCount * b.sampleSize;
        return qualityB - qualityA;
      });

      logger.debug("getAudioDeviceCapabilitiesList:", sorted);
      return sorted;
    } catch (error) {
      logger.warn(
        "getAudioDeviceCapabilitiesList failed:",
        {
          deviceId,
        },
        error,
      );
      return [];
    }
  }

  async start() {
    logger.debug("start called");

    try {
      const constraints: MediaStreamConstraints = {
        video: this.options.video
          ? {
              deviceId: this.options.video.id
                ? { exact: this.options.video.id }
                : undefined,
              width: this.options.video.width
                ? { exact: this.options.video.width }
                : undefined,
              height: this.options.video.height
                ? { exact: this.options.video.height }
                : undefined,
              frameRate: this.options.video.frameRate
                ? { exact: this.options.video.frameRate }
                : undefined,
            }
          : false,
        audio: this.options.audio
          ? {
              deviceId: this.options.audio.id
                ? { exact: this.options.audio.id }
                : undefined,
              echoCancellation: this.options.audio.echoCancellation
                ? { exact: this.options.audio.echoCancellation }
                : undefined,
              noiseSuppression: this.options.audio.noiseSuppression
                ? { exact: this.options.audio.noiseSuppression }
                : undefined,
              autoGainControl: this.options.audio.autoGainControl
                ? { exact: this.options.audio.autoGainControl }
                : undefined,
              sampleRate: this.options.audio.sampleRate
                ? { exact: this.options.audio.sampleRate }
                : undefined,
              channelCount: this.options.audio.channelCount
                ? { exact: this.options.audio.channelCount }
                : undefined,
              sampleSize: this.options.audio.sampleSize
                ? { exact: this.options.audio.sampleSize }
                : undefined,
            }
          : false,
      };
      logger.debug("start constraints:", constraints);
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      logger.info("Stream Started");
      return this.stream;
    } catch (error) {
      logger.error("start failed:", this.options, error);
      throw new Error("Media activation failed", { cause: error });
    }
  }

  stop() {
    logger.debug("stop called");

    if (this.stream) {
      const trackCount = this.stream.getTracks().length;
      this.stream.getTracks().forEach((track) => {
        logger.debug("stop track:", track.kind, track.label);
        track.stop();
      });
      this.stream = undefined;
      logger.info("Stream Stopped");
    } else {
      logger.debug("stop: no active streams");
    }
  }
}
