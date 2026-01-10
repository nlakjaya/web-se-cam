import { Logger } from "../util/logger";
import { VideoLayer } from "./video-pipeline";

type Options = {
  margin: number;
  showDateTime: boolean;
  showStats: boolean;
  format: {
    font: string;
    fillStyle: string;
    shadowColor: string;
    shadowOffsetX: number;
    shadowOffsetY: number;
    shadowBlur: number;
  };
  footerText: string;
  footerFormat: {
    fillStyle: string;
    shadowColor: string;
    shadowOffsetX: number;
    shadowOffsetY: number;
    shadowBlur: number;
  };
};

const logger = new Logger("VideoOverlay");
export class VideoOverlay implements VideoLayer {
  private stats: { frameCount: number; lastFrameMs?: number };
  private options: Options;

  constructor() {
    const canvasElement = document.createElement("canvas");

    this.stats = { frameCount: 0 };
    this.options = {
      margin: 20,
      showDateTime: true,
      showStats: false,
      format: {
        font: "20px Arial",
        fillStyle: "#FFF",
        shadowColor: "#000",
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowBlur: 4,
      },
      footerText: "WebSeCam © 2026", // I'm fine if you remove the copyright text
      footerFormat: {
        fillStyle: "rgba(255, 255, 255, 0.4)",
        shadowColor: "rgba(0, 0, 0, 0.4)",
        shadowOffsetX: 1,
        shadowOffsetY: 1,
        shadowBlur: 2,
      },
    };

    logger.debug("instance created");
  }

  updateOptions(options: Partial<Options>) {
    logger.debug("updateOptions called:", options);
    this.options = {
      ...this.options,
      ...options,
      format: { ...this.options.format, ...options.format },
      footerFormat: { ...this.options.footerFormat, ...options.footerFormat },
    };
  }

  draw(ctx: CanvasRenderingContext2D) {
    Object.entries(this.options.format).forEach(([k, v]) => (ctx[k] = v));
    if (this.options.showDateTime) this.drawDateTime(ctx);
    if (this.options.showStats) this.drawStats(ctx);
    if (this.options.footerText) this.drawFooter(ctx);
  }

  drawDateTime(ctx: CanvasRenderingContext2D) {
    const dateTimeString = new Date()
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
    this.drawText(
      ctx,
      dateTimeString,
      this.options.margin,
      this.options.margin,
    );
  }

  drawStats(ctx: CanvasRenderingContext2D) {
    const now = performance.now();
    const statsString = `${
      this.stats.lastFrameMs
        ? Math.round(1000.0 / (now - this.stats.lastFrameMs))
        : "-"
    } fps (${this.stats.frameCount++})`;
    this.stats.lastFrameMs = now;
    this.drawText(
      ctx,
      statsString,
      ctx.canvas.width - this.options.margin,
      this.options.margin,
      "right",
      "top",
    );
  }

  drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    align: CanvasTextAlign = "left",
    baseline: CanvasTextBaseline = "top",
  ) {
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
  }

  drawFooter(ctx: CanvasRenderingContext2D) {
    ctx.save();
    Object.entries(this.options.footerFormat).forEach(([k, v]) => (ctx[k] = v));
    this.drawText(
      ctx,
      this.options.footerText,
      ctx.canvas.width - this.options.margin,
      ctx.canvas.height - this.options.margin,
      "right",
      "bottom",
    );
    ctx.restore();
  }
}
