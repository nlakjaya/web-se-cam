import { Logger } from "../util/logger";
import { VideoLayer } from "./video-pipeline";

type Options = {
  subPixelMultiplier?: number;
  mixFrames?: number;
  mixSubPixels?: boolean;
};

const logger = new Logger("NightVision");
export class NightVision implements VideoLayer {
  private options: Options;
  private framesBuffer: ImageData[];

  constructor() {
    this.options = {};
    this.framesBuffer = [];

    logger.debug("instance created");
  }

  updateOptions(options: Partial<Options>) {
    logger.debug("updateOptions called:", options);
    this.options = {
      ...this.options,
      ...options,
    };

    const _this = this;
    function motionFramesBufferPush(ctx: CanvasRenderingContext2D) {
      const frameBuffer = ctx.getImageData(
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height,
      );
      while (
        _this.framesBuffer.length <
        (_this.options.mixFrames as number) + 2
      ) {
        _this.framesBuffer.push(frameBuffer);
      }
      while (_this.framesBuffer.length > (_this.options.mixFrames as number)) {
        _this.framesBuffer.shift();
      }
    }

    function pixelIterator(
      ctx: CanvasRenderingContext2D,
      process: (frameData: Uint8ClampedArray, i: number) => void,
    ) {
      const frameBuffer = ctx.getImageData(
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height,
      );
      for (let i = 0; i < frameBuffer.data.length; i += 4) {
        process(frameBuffer.data, i);
      }
      ctx.putImageData(frameBuffer, 0, 0);
    }

    if (
      this.options.mixSubPixels &&
      this.options.subPixelMultiplier &&
      this.options.subPixelMultiplier > 1 &&
      this.options.mixFrames &&
      this.options.mixFrames > 0
    ) {
      this.draw = (ctx: CanvasRenderingContext2D) => {
        motionFramesBufferPush(ctx);
        pixelIterator(ctx, (frameData, i) => {
          let subPixelValue = 0;
          for (let j = 0; j < 3; j++) {
            subPixelValue += frameData[i + j];
            this.framesBuffer.forEach((_frameBuffer) => {
              subPixelValue += _frameBuffer.data[i + j];
            });
          }
          frameData[i] = frameData[i - 2] =
            (frameData[i + 1] =
              subPixelValue * (this.options.subPixelMultiplier as number)) *
            0.33;
        });
      };
    } else if (
      this.options.mixSubPixels &&
      this.options.subPixelMultiplier &&
      this.options.subPixelMultiplier > 1
    ) {
      this.framesBuffer = [];
      this.draw = (ctx: CanvasRenderingContext2D) => {
        pixelIterator(ctx, (frameData, i) => {
          let subPixelValue = 0;
          for (let j = 0; j < 3; j++) {
            subPixelValue += frameData[i + j];
          }
          frameData[i] = frameData[i - 2] =
            (frameData[i + 1] =
              subPixelValue * (this.options.subPixelMultiplier as number)) *
            0.33;
        });
      };
    } else if (
      this.options.mixSubPixels &&
      this.options.mixFrames &&
      this.options.mixFrames > 0
    ) {
      this.draw = (ctx: CanvasRenderingContext2D) => {
        motionFramesBufferPush(ctx);
        pixelIterator(ctx, (frameData, i) => {
          let subPixelValue = 0;
          for (let j = 0; j < 3; j++) {
            subPixelValue += frameData[i + j];
            0;
            this.framesBuffer.forEach((_frameBuffer) => {
              subPixelValue += _frameBuffer.data[i + j];
            });
          }
          frameData[i] = frameData[i - 2] =
            (frameData[i + 1] = subPixelValue) * 0.33;
        });
      };
    } else if (
      this.options.subPixelMultiplier &&
      this.options.subPixelMultiplier > 1 &&
      this.options.mixFrames &&
      this.options.mixFrames > 0
    ) {
      this.draw = (ctx: CanvasRenderingContext2D) => {
        motionFramesBufferPush(ctx);
        pixelIterator(ctx, (frameData, i) => {
          for (let j = 0; j < 3; j++) {
            this.framesBuffer.forEach((_frameBuffer) => {
              frameData[i + j] += _frameBuffer.data[i + j];
            });
            frameData[i + j] *= this.options.subPixelMultiplier as number;
          }
        });
      };
    } else if (this.options.mixSubPixels) {
      this.framesBuffer = [];
      this.draw = (ctx: CanvasRenderingContext2D) => {
        pixelIterator(ctx, (frameData, i) => {
          let subPixelValue = 0;
          for (let j = 0; j < 3; j++) {
            subPixelValue += frameData[i + j];
          }
          frameData[i] = frameData[i - 2] =
            (frameData[i + 1] = subPixelValue) * 0.33;
        });
      };
    } else if (
      this.options.subPixelMultiplier &&
      this.options.subPixelMultiplier > 1
    ) {
      this.framesBuffer = [];
      this.draw = (ctx: CanvasRenderingContext2D) => {
        pixelIterator(ctx, (frameData, i) => {
          for (let j = 0; j < 3; j++) {
            frameData[i + j] *= this.options.subPixelMultiplier as number;
          }
        });
      };
    } else if (this.options.mixFrames && this.options.mixFrames > 0) {
      this.draw = (ctx: CanvasRenderingContext2D) => {
        motionFramesBufferPush(ctx);
        pixelIterator(ctx, (frameData, i) => {
          for (let j = 0; j < 3; j++) {
            this.framesBuffer.forEach((_frameBuffer) => {
              frameData[i + j] += _frameBuffer.data[i + j];
            });
          }
        });
      };
    } else {
      this.framesBuffer = [];
      this.draw = (_ctx: CanvasRenderingContext2D) => {};
    }
  }

  draw(ctx: CanvasRenderingContext2D) {}
}
