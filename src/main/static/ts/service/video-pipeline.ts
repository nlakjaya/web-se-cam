import { Logger } from "../util/logger";

type Options = {
  forceFps?: number;
};

const logger = new Logger("VideoPipeline");
export class VideoPipeline {
  private readonly videoElement: HTMLVideoElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly layers: VideoLayer[];
  private options: Options;

  private draw: () => void;
  private drawTimeout?: any;

  constructor() {
    const canvasElement = document.createElement("canvas");

    this.videoElement = document.createElement("video");
    const ctx = canvasElement.getContext("2d");
    if (!ctx) throw new Error("canvas: failed to get 2D Rendering Context");
    this.ctx = ctx;
    this.layers = [];
    this.options = {};
    this.draw = () => {};

    this.updateDrawPipeline();
    const videoFrameCallback = () => {
      this.draw();
      this.videoElement.requestVideoFrameCallback(videoFrameCallback);
    };
    this.videoElement.requestVideoFrameCallback(videoFrameCallback);
    this.videoElement.muted = true;

    logger.debug("instance created");
  }

  updateOptions(options: Partial<Options>) {
    logger.debug("updateOptions called:", options);

    this.options = {
      ...this.options,
      ...options,
    };
    this.updateDrawPipeline();
  }

  private updateDrawPipeline() {
    logger.debug("updateDrawPipeline called");
    if (this.options.forceFps) {
      const delay = 1000 / this.options.forceFps;
      this.draw = () => {
        clearTimeout(this.drawTimeout);
        if ((this.videoElement.srcObject as MediaStream).active) {
          this.ctx.drawImage(this.videoElement, 0, 0);
          this.layers.forEach((layer) => layer.draw(this.ctx));
          this.drawTimeout = setInterval(() => this.draw(), delay);
        }
      };
    } else {
      clearTimeout(this.drawTimeout);
      this.drawTimeout = undefined;
      this.draw = () => {
        if ((this.videoElement.srcObject as MediaStream).active) {
          this.ctx.drawImage(this.videoElement, 0, 0);
          this.layers.forEach((layer) => layer.draw(this.ctx));
        }
      };
    }
  }

  private resizeCanvas(mediaStream: MediaStream) {
    logger.debug("resizeCanvas called:", mediaStream);
    const settings = mediaStream.getVideoTracks()[0].getSettings();
    const width = settings.width;
    const height = settings.height;
    if (width === undefined || height === undefined) {
      throw new Error(
        "mediaStream: videoTrack[0] has undefined width or height",
      );
    }

    this.ctx.canvas.width = width;
    this.ctx.canvas.height = height;
    this.layers.forEach((layer) => layer.resize?.(width, height));
  }

  setMediaStream(mediaStream: MediaStream | null) {
    logger.debug("setMediaStream called:", mediaStream);
    this.videoElement.onresize = () => {
      this.resizeCanvas(this.videoElement.srcObject as MediaStream);
    };
    this.videoElement.srcObject = mediaStream;
    this.videoElement.play();
  }

  addLayer(layer: VideoLayer) {
    logger.debug("addLayer called:", layer);
    this.layers.push(layer);
  }

  getVideoElement(): HTMLVideoElement {
    logger.debug("getVideoElement called");
    return this.videoElement;
  }

  getCanvasElement(): HTMLCanvasElement {
    logger.debug("getCanvasElement called");
    return this.ctx.canvas;
  }

  clearCanvas() {
    logger.debug("clear called");
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }
}

export interface VideoLayer {
  resize?(width: number, height: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}
