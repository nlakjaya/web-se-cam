import { Logger } from "../util/logger";
import { VideoLayer } from "./video-pipeline";

type Options = {
  downScaleFactor: number;
  detectionThreshold: number;
  motionBlur?: number;
  previewMotionBlur?: boolean;
  marker?: { style: "box" | "plus" | "cross"; color: string; size: number };
  // mask?: Uint32Array;
  // previewMask?: boolean;
};

export const defaultOptions: Options = {
  downScaleFactor: 4,
  motionBlur: 0.6,
  detectionThreshold: 20,
  marker: { style: "cross", color: "#F33", size: 2 },
};

const logger = new Logger("MotionDetector");
export class MotionDetector implements VideoLayer {
  private options: Options;
  private originalWidth: number;
  private originalHeight: number;
  private readonly ctx: CanvasRenderingContext2D;
  private previousFrame?: ImageData;
  private triggers: ((instance: MotionDetector) => void)[];

  constructor() {
    const canvasElement = document.createElement("canvas");
    const ctx = canvasElement.getContext("2d", {
      willReadFrequently: true,
    });
    if (!ctx) throw new Error("canvas: failed to get 2D Rendering Context");
    this.ctx = ctx;

    this.options = defaultOptions;
    this.originalWidth = 640;
    this.originalHeight = 480;
    this.triggers = [];

    logger.debug("instance created");
  }

  updateOptions(options: Partial<Options>) {
    logger.debug("updateOptions called:", options);
    this.options = {
      ...this.options,
      ...options,
    };
    this.resize();
  }

  addTrigger(trigger: (instance: MotionDetector) => void) {
    logger.debug("addTrigger called:", trigger);
    this.triggers.push(trigger);
  }

  removeTriggers() {
    logger.debug("removeTriggers called");
    this.triggers = [];
  }

  clearHistory() {
    logger.debug("clearHistory called");
    this.previousFrame = undefined;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  getCanvasElement(): HTMLCanvasElement {
    logger.debug("getCanvasElement called");
    return this.ctx.canvas;
  }

  resize(width?: number, height?: number): void {
    logger.debug("resize called:", width, height);
    if (width) {
      this.originalWidth = width;
    }
    if (height) {
      this.originalHeight = height;
    }
    this.ctx.canvas.width = this.originalWidth / this.options.downScaleFactor;
    this.ctx.canvas.height = this.originalHeight / this.options.downScaleFactor;
    this.clearHistory();
  }

  draw({ canvas }: CanvasRenderingContext2D) {
    if (this.options.motionBlur && this.previousFrame) {
      this.ctx.putImageData(this.previousFrame, 0, 0);
      this.ctx.globalAlpha = 1 - this.options.motionBlur;
      this.ctx.drawImage(
        canvas,
        0,
        0,
        this.ctx.canvas.width,
        this.ctx.canvas.height,
      );
      this.ctx.globalAlpha = 1;
    } else {
      this.ctx.drawImage(
        canvas,
        0,
        0,
        this.ctx.canvas.width,
        this.ctx.canvas.height,
      );
    }
    const thisFrame = this.ctx.getImageData(
      0,
      0,
      this.ctx.canvas.width,
      this.ctx.canvas.height,
    );
    const ctxVisible = this.ctx.canvas.checkVisibility();
    if (ctxVisible) {
      if (!this.options.previewMotionBlur) {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
      }
      if (this.previousFrame) {
        if (this.motionDetectWithVisualization(thisFrame, this.previousFrame)) {
          this.triggers.forEach((trigger) =>
            setTimeout(() => trigger(this), 0),
          );
        }
      }
    } else if (this.previousFrame) {
      if (this.motionDetect(thisFrame, this.previousFrame)) {
        this.triggers.forEach((trigger) => setTimeout(() => trigger(this), 0));
      }
    }

    this.previousFrame = thisFrame;
  }

  private motionDetect(
    thisFrame: ImageData,
    previousFrame: ImageData,
  ): boolean {
    for (let i = 0; i < previousFrame.data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        if (
          Math.abs(previousFrame.data[i + j] - thisFrame.data[i + j]) >
          this.options.detectionThreshold
        ) {
          return true;
        }
      }
    }
    return false;
  }

  private motionDetectWithVisualization(
    thisFrame: ImageData,
    previousFrame: ImageData,
  ): boolean {
    this.motionVisualizeInit();
    let motionDetected = false;
    for (let i = 0; i < previousFrame.data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        if (
          Math.abs(previousFrame.data[i + j] - thisFrame.data[i + j]) >
          this.options.detectionThreshold
        ) {
          motionDetected = true;
          let y = i / 4;
          const x = y % this.ctx.canvas.width;
          y = Math.round(y / this.ctx.canvas.width);
          this.motionVisualize(x, y);
          break;
        }
      }
    }
    return motionDetected;
  }

  private motionVisualize: (x: number, y: number) => void = () => {};
  private motionVisualizeInit() {
    if (this.options.marker) {
      const size = this.options.marker.size;
      const color = this.options.marker.color;
      switch (this.options.marker.style) {
        case "box":
          this.ctx.strokeStyle = color;
          if (size) {
            this.motionVisualize = (x: number, y: number) => {
              this.ctx.strokeRect(
                x - size + 0.5,
                y - size + 0.5,
                2 * size,
                2 * size,
              );
            };
          }
          break;
        case "plus":
          this.ctx.strokeStyle = color;
          if (size) {
            this.motionVisualize = (x: number, y: number) => {
              this.ctx.beginPath();
              this.ctx.moveTo(x - size, y + 0.5);
              this.ctx.lineTo(x + size + 1, y + 0.5);
              this.ctx.moveTo(x + 0.5, y - size);
              this.ctx.lineTo(x + 0.5, y + size + 1);
              this.ctx.stroke();
            };
          }
          break;
        case "cross":
          this.ctx.strokeStyle = color;
          if (size) {
            this.motionVisualize = (x: number, y: number) => {
              this.ctx.beginPath();
              this.ctx.moveTo(x - size, y - size);
              this.ctx.lineTo(x + size + 1, y + size + 1);
              this.ctx.moveTo(x + size + 1, y - size);
              this.ctx.lineTo(x - size, y + size + 1);
              this.ctx.stroke();
            };
          }
          break;
      }
    } else {
      this.motionVisualize = () => {};
    }
  }
}
