import { Logger } from "../util/logger";
import { VideoLayer } from "./video-pipeline";
import { VideoStats } from "./video-stats";

type Options = {
  margin: number;
  showDateTime: boolean;
  showStats: boolean;
  format: Partial<
    CanvasTextDrawingStyles & CanvasFillStrokeStyles & CanvasShadowStyles
  >;
  footerText: string;
  footerFormat: Partial<
    CanvasTextDrawingStyles & CanvasFillStrokeStyles & CanvasShadowStyles
  >;
};

export const defaultOptions: Options = {
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
  footerText: "WebSeCam © 2026",
  footerFormat: {
    fillStyle: "rgba(255, 255, 255, 0.4)",
    shadowColor: "rgba(0, 0, 0, 0.4)",
    shadowOffsetX: 1,
    shadowOffsetY: 1,
    shadowBlur: 2,
  },
};

const logger = new Logger("VideoOverlay");
export class VideoOverlay implements VideoLayer {
  private stats: VideoStats;
  private options: Options;

  constructor() {
    this.stats = new VideoStats(15);
    this.options = defaultOptions;

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
    ctx.textRendering = "optimizeSpeed";
    Object.entries(this.options.format).forEach(
      ([k, v]) => ((ctx as any)[k] = v),
    );
    if (this.options.showDateTime) this.drawDateTime(ctx);
    if (this.options.showStats) this.drawStats(ctx);
    if (this.options.footerText) this.drawFooter(ctx);
  }

  drawDateTime(ctx: CanvasRenderingContext2D) {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateTimeString = `${now.getFullYear()}-${pad(
      now.getMonth() + 1,
    )}-${pad(now.getDate())} ${pad(
      now.getHours(),
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    this.drawText(
      ctx,
      dateTimeString,
      this.options.margin,
      this.options.margin,
    );
  }

  drawStats(ctx: CanvasRenderingContext2D) {
    this.stats.draw();
    const statsString = `${this.stats.getFps(1)} fps (${this.stats.getFrameCount()})`;
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
    Object.entries(this.options.footerFormat).forEach(
      ([k, v]) => ((ctx as any)[k] = v),
    );
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
