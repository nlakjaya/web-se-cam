export const VIDEO_RESOLUTIONS = [
  { width: 3840, height: 2160 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 854, height: 480 },
  { width: 640, height: 480 },
  { width: 640, height: 360 },
  { width: 320, height: 240 },
];

export const VIDEO_FRAME_RATES = [60, 30, 24, 15, 10, 5, 1];

export const AUDIO_CONFIGS = [
  // High quality configurations
  {
    sampleRate: 48000,
    channelCount: 2,
    sampleSize: 24,
    label: "Studio Quality (48kHz, Stereo)",
  },
  {
    sampleRate: 48000,
    channelCount: 1,
    sampleSize: 16,
    label: "High Quality (48kHz, Mono)",
  },
  {
    sampleRate: 44100,
    channelCount: 2,
    sampleSize: 16,
    label: "CD Quality (44.1kHz, Stereo)",
  },
  // Standard configurations
  {
    sampleRate: 44100,
    channelCount: 1,
    sampleSize: 16,
    label: "Standard Quality (44.1kHz, Mono)",
  },
  {
    sampleRate: 32000,
    channelCount: 1,
    sampleSize: 16,
    label: "Good Quality (32kHz, Mono)",
  },
  {
    sampleRate: 24000,
    channelCount: 1,
    sampleSize: 16,
    label: "Balanced Quality (24kHz, Mono)",
  },
  // Low bandwidth configurations
  {
    sampleRate: 16000,
    channelCount: 1,
    sampleSize: 16,
    label: "Voice Optimized (16kHz, Mono)",
  },
  {
    sampleRate: 8000,
    channelCount: 1,
    sampleSize: 16,
    label: "Low Bandwidth (8kHz, Mono)",
  },
];

export const ALL_FORMATS = [
  { mimetype: "video/webm", label: "WebM Video", extension: "webm" },
  { mimetype: "video/mp4", label: "MP4 Video", extension: "mp4" },
  { mimetype: "video/ogg", label: "Ogg Video", extension: "ogv" },
  {
    mimetype: "video/webm;codecs=vp8,opus",
    label: "WebM Video (VP8, Opus)",
    extension: "webm",
  },
  {
    mimetype: "video/webm;codecs=vp8,vorbis",
    label: "WebM Video (VP8, Vorbis)",
    extension: "webm",
  },
  {
    mimetype: "video/webm;codecs=vp9,opus",
    label: "WebM Video (VP9, Opus)",
    extension: "webm",
  },
  {
    mimetype: "video/webm;codecs=h264,opus",
    label: "WebM Video (H.264, Opus)",
    extension: "webm",
  },
  {
    mimetype: "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    label: "MP4 Video (H.264, AAC)",
    extension: "mp4",
  },
  {
    mimetype: "video/mp4;codecs=h264,aac",
    label: "MP4 Video (H.264, AAC, simple)",
    extension: "mp4",
  },
  {
    mimetype: "video/ogg;codecs=theora,vorbis",
    label: "Ogg Video (Theora, Vorbis)",
    extension: "ogv",
  },
  {
    mimetype: "video/ogg;codecs=theora,opus",
    label: "Ogg Video (Theora, Opus)",
    extension: "ogv",
  },
];

export const ALL_BIT_RATES = [
  {
    label: "Automatic",
  },
  {
    audioBitsPerSecond: 8000,
    videoBitsPerSecond: 64000,
    label: "Very low quality (~ 0.5 MB/min)",
  },
  {
    audioBitsPerSecond: 16000,
    videoBitsPerSecond: 128000,
    label: "Low quality (~ 1 MB/min)",
  },
  {
    audioBitsPerSecond: 32000,
    videoBitsPerSecond: 256000,
    label: "Basic quality (~ 2 MB/min)",
  },
  {
    audioBitsPerSecond: 64000,
    videoBitsPerSecond: 512000,
    label: "Standard quality (~ 4 MB/min)",
  },
  {
    audioBitsPerSecond: 96000,
    videoBitsPerSecond: 768000,
    label: "Good quality (~ 6 MB/min)",
  },
  {
    audioBitsPerSecond: 128000,
    videoBitsPerSecond: 1000000,
    label: "High quality (~ 8 MB/min)",
  },
  {
    audioBitsPerSecond: 128000,
    videoBitsPerSecond: 1500000,
    label: "Very high quality (~ 12 MB/min)",
  },
  {
    audioBitsPerSecond: 192000,
    videoBitsPerSecond: 2000000,
    label: "Excellent quality (~ 16 MB/min)",
  },
  {
    audioBitsPerSecond: 256000,
    videoBitsPerSecond: 3000000,
    label: "Premium quality (~ 24 MB/min)",
  },
  {
    audioBitsPerSecond: 320000,
    videoBitsPerSecond: 4000000,
    label: "Ultra quality (~ 30 MB/min)",
  },
  {
    audioBitsPerSecond: 510000,
    videoBitsPerSecond: 5000000,
    label: "Maximum quality (~ 40 MB/min)",
  },
];
