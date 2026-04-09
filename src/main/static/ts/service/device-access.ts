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
    facingMode?: "user" | "environment";
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

export const defaultOptions: Options = {
  video: {
    height: 480,
    facingMode: "user",
  },
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
};

const logger = new Logger("DeviceAccess");
export class DeviceAccess {
  private stream?: MediaStream;
  private videoDevices: MediaDeviceInfo[];
  private audioDevices: MediaDeviceInfo[];

  constructor() {
    this.videoDevices = [];
    this.audioDevices = [];

    logger.debug("instance created");
  }

  async requestPermissions(options?: {
    audio: boolean;
    video: boolean;
  }): Promise<boolean> {
    logger.debug("requestPermissions called");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices API not supported");
      }

      // Request permissions by getting a stream and stopping immediately
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: options?.audio ?? true,
        video: options?.video ?? true,
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

  async start(options?: Partial<Options>) {
    logger.debug("start called:", options);
    options = options
      ? {
          video: options.video
            ? { ...defaultOptions.video, ...options.video }
            : undefined,
          audio: options.audio
            ? { ...defaultOptions.audio, ...options.audio }
            : undefined,
        }
      : defaultOptions;

    try {
      const constraints: MediaStreamConstraints = {
        video: options.video
          ? {
              deviceId: options.video.id
                ? { exact: options.video.id }
                : undefined,
              width: options.video.width
                ? { exact: options.video.width }
                : undefined,
              height: options.video.height
                ? { exact: options.video.height }
                : undefined,
              frameRate: options.video.frameRate
                ? { exact: options.video.frameRate }
                : undefined,
              facingMode: options.video.facingMode
                ? { ideal: options.video.facingMode }
                : undefined,
            }
          : false,
        audio: options.audio
          ? {
              deviceId: options.audio.id
                ? { exact: options.audio.id }
                : undefined,
              echoCancellation: options.audio.echoCancellation
                ? { exact: options.audio.echoCancellation }
                : undefined,
              noiseSuppression: options.audio.noiseSuppression
                ? { exact: options.audio.noiseSuppression }
                : undefined,
              autoGainControl: options.audio.autoGainControl
                ? { exact: options.audio.autoGainControl }
                : undefined,
              sampleRate: options.audio.sampleRate
                ? { exact: options.audio.sampleRate }
                : undefined,
              channelCount: options.audio.channelCount
                ? { exact: options.audio.channelCount }
                : undefined,
              sampleSize: options.audio.sampleSize
                ? { exact: options.audio.sampleSize }
                : undefined,
            }
          : false,
      };
      logger.debug("start constraints:", constraints);
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      logger.info("Stream Started");
      return this.stream;
    } catch (error) {
      logger.error("start failed:", options, error);
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
