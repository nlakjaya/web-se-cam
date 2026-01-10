import { Logger } from "../util/logger";

const logger = new Logger("VideoPipeline");
export class VideoPipeline {
  private videoElement: HTMLVideoElement;
  private ctx: CanvasRenderingContext2D;
  private layers: VideoLayer[];

  constructor() {
    const canvasElement = document.createElement("canvas");

    this.videoElement = document.createElement("video");
    this.ctx = canvasElement.getContext("2d") as CanvasRenderingContext2D;

    const _this = this;
    function draw() {
      _this.ctx.drawImage(_this.videoElement, 0, 0);
      _this.layers.forEach((layer) => layer.draw(_this.ctx));
      _this.videoElement.requestVideoFrameCallback(draw);
    }
    this.videoElement.requestVideoFrameCallback(draw);

    this.videoElement.muted = true;
    this.videoElement.play();

    this.layers = [];

    logger.debug("instance created");
  }

  private resizeCanvas(mediaStream: MediaStream) {
    logger.debug("resizeCanvas called:", mediaStream);
    const settings = mediaStream.getVideoTracks()[0].getSettings();
    const width = settings.width as number;
    const height = settings.height as number;

    this.ctx.canvas.width = width;
    this.ctx.canvas.height = height;
    this.layers.forEach((layer) => layer.resize?.(width, height));
  }

  setMediaStream(mediaStream: MediaStream) {
    logger.debug("setMediaStream called:", mediaStream);
    this.videoElement.onresize = () => {
      this.resizeCanvas(this.videoElement.srcObject as MediaStream);
    };
    this.videoElement.srcObject = mediaStream;
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
