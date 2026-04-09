import { Logger } from "../util/logger";
import { VideoLayer } from "./video-pipeline";

const logger = new Logger("VideoStats");
export class VideoStats implements VideoLayer {
  private frameCount: number;
  private frameTimestamps: Float64Array;

  constructor(fpsSmoothness = 3) {
    this.frameCount = 0;
    this.frameTimestamps = new Float64Array(fpsSmoothness);

    logger.debug("instance created");
  }

  draw() {
    this.frameTimestamps[this.frameCount++ % this.frameTimestamps.length] =
      performance.now();
  }

  reset() {
    this.frameCount = 0;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  getFps(roundDecimals = 0): number {
    let oldestFrameTs =
      this.frameTimestamps[this.frameCount % this.frameTimestamps.length];
    const newestFrameTs =
      this.frameTimestamps[(this.frameCount - 1) % this.frameTimestamps.length];
    if (this.frameCount < this.frameTimestamps.length) {
      if (this.frameCount < 2) {
        return 0;
      }
      oldestFrameTs = this.frameTimestamps[0];
      return this.round(
        (this.frameCount - 1) / ((newestFrameTs - oldestFrameTs) / 1000),
        roundDecimals,
      );
    }
    return this.round(
      (this.frameTimestamps.length - 1) /
        ((newestFrameTs - oldestFrameTs) / 1000),
      roundDecimals,
    );
  }

  private round(number: number, decimals?: number) {
    if (decimals !== undefined) {
      const pow = Math.pow(10, decimals);
      return Math.round(number * pow) / pow;
    }
    return number;
  }
}
