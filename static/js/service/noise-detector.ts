import { Logger } from "../util/logger";

type Options = {
  detectionThreshold: number;
  bufferLengthMs: number;
  bufferSize: number;
  // smoothingConstant?: number;
};

const logger = new Logger("NoiseDetector");
export class NoiseDetector {
  private options: Options;
  private audioContext: AudioContext;
  private analyzer: AnalyserNode;
  private mediaStreamSource?: MediaStreamAudioSourceNode;
  private intervalId?: any;
  private triggers: ((instance: NoiseDetector) => void)[];

  public peakLevel: number;

  constructor() {
    this.options = {
      detectionThreshold: 20,
      bufferLengthMs: 45,
      bufferSize: 2048,
    };
    this.audioContext = new window.AudioContext();
    this.analyzer = this.audioContext.createAnalyser();
    this.mediaStreamSource = undefined;
    this.peakLevel = 0;
    this.triggers = [];

    logger.debug("instance created");
  }

  updateOptions(options: Partial<Options>) {
    logger.debug("updateOptions called:", options);
    this.options = {
      ...this.options,
      ...options,
    };
  }

  setMediaStream(mediaStream: MediaStream | null) {
    logger.debug("setMediaStream called:", mediaStream);
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      this.peakLevel = 0;
    }
    this.mediaStreamSource?.disconnect(this.analyzer);
    if (mediaStream !== null) {
      this.mediaStreamSource =
        this.audioContext.createMediaStreamSource(mediaStream);
      this.mediaStreamSource.connect(this.analyzer);
      const buffer = new Uint8Array(this.options.bufferSize);
      this.intervalId = setInterval(() => {
        if (!mediaStream.active) {
          clearInterval(this.intervalId);
          this.intervalId = undefined;
          this.peakLevel = 0;
          logger.debug("stopped");
          return;
        }
        this.analyzer.getByteTimeDomainData(buffer);
        const minMax = buffer.reduce<number[]>(
          (minMax, sample) => [
            Math.min(minMax[0], sample),
            Math.max(minMax[1], sample),
          ],
          [buffer[0], buffer[0]]
        );
        this.peakLevel = minMax[1] - minMax[0];
        if (this.peakLevel > this.options.detectionThreshold) {
          this.triggers.forEach((trigger) =>
            setTimeout(() => trigger(this), 0)
          );
        }
      }, this.options.bufferLengthMs);
    }
    logger.debug("started");
  }

  addTrigger(trigger: (instance: NoiseDetector) => void) {
    this.triggers.push(trigger);
  }
}
