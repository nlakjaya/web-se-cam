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

const logger = new Logger("MotionDetector");
export class MotionDetector implements VideoLayer {
  private options: Options;
  private originalWidth: number;
  private originalHeight: number;
  private ctx: CanvasRenderingContext2D;
  private previousFrame?: ImageData;
  private triggers: ((instance: MotionDetector) => void)[];

  constructor() {
    const canvasElement = document.createElement("canvas");
    this.ctx = canvasElement.getContext("2d") as CanvasRenderingContext2D;

    this.updateOptions({
      downScaleFactor: 4,
      motionBlur: 0.6,
      detectionThreshold: 20,
      marker: { style: "cross", color: "#F33", size: 2 },
    });
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

  clearHistory() {
    logger.debug("clearHistory called");
    this.previousFrame = undefined;
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
        this.ctx.canvas.height
      );
      this.ctx.globalAlpha = 1;
    } else {
      this.ctx.drawImage(
        canvas,
        0,
        0,
        this.ctx.canvas.width,
        this.ctx.canvas.height
      );
    }
    const thisFrame = this.ctx.getImageData(
      0,
      0,
      this.ctx.canvas.width,
      this.ctx.canvas.height
    );
    const ctxVisible = this.ctx.canvas.checkVisibility();
    if (ctxVisible) {
      if (!this.options.previewMotionBlur) {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
      }
      this.motionVisualizeInit();
    }
    if (this.previousFrame) {
      let motionDetected = false;
      pixelsIterator: for (
        let i = 0;
        i < this.previousFrame.data.length;
        i += 4
      ) {
        subPixelsIterator: for (let j = 0; j < 3; j++) {
          if (
            Math.abs(this.previousFrame.data[i + j] - thisFrame.data[i + j]) >
            this.options.detectionThreshold
          ) {
            motionDetected = true;
            if (ctxVisible) {
              let y = i / 4;
              const x = y % this.ctx.canvas.width;
              y = Math.round(y / this.ctx.canvas.width);
              this.motionVisualize(x, y);
              break subPixelsIterator;
            } else {
              break pixelsIterator;
            }
          }
        }
      }
      if (motionDetected) {
        this.triggers.forEach((trigger) => setTimeout(() => trigger(this), 0));
      }
    }
    this.previousFrame = thisFrame;
  }

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
                2 * size
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
      this.motionVisualize = (x: number, y: number) => {};
    }
  }

  private motionVisualize(_x: number, _y: number) {}
}
