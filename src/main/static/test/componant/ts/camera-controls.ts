import { VideoPipeline } from "../../../ts/service/video-pipeline";
import { DeviceAccess } from "../../../ts/service/device-access";
import { sleep } from "../../ts/base";
import { VideoOverlay } from "../../../ts/service/video-overlay";
import { TrackControls } from "../../../ts/componant/track-controls";
import { TRACK_CONTROLS } from "../../../ts/util/constants";

const app = document.getElementById("app");

async function happyPath() {
  const video = new VideoPipeline();
  const overlay = new VideoOverlay();
  const devices = new DeviceAccess();

  video.addLayer(overlay);
  overlay.updateOptions({
    showDateTime: false,
    showStats: true,
    footerText: "",
  });

  const mediaStream = await devices.start({
    video: { facingMode: "environment" },
    audio: {},
  });
  video.setMediaStream(mediaStream);

  const videoTrack = mediaStream.getVideoTracks()[0];
  const audioTrack = mediaStream.getAudioTracks()[0];
  const videoTrackControls = new TrackControls(
    videoTrack.getCapabilities(),
    videoTrack.getSettings(),
  );
  videoTrackControls.setApplyConstraintsListener(async (constrains) => {
    await videoTrack.applyConstraints(constrains);
    return videoTrack.getSettings();
  });
  const audioTrackControls = new TrackControls(
    audioTrack.getCapabilities(),
    audioTrack.getSettings(),
  );
  audioTrackControls.setApplyConstraintsListener(async (constrains) => {
    await audioTrack.applyConstraints(constrains);
    return audioTrack.getSettings();
  });

  (window as any).videoTrack = videoTrack; // for debugging
  (window as any).audioTrack = audioTrack; // for debugging

  if (app) {
    app.append(
      video.getCanvasElement(),
      ...Object.entries(TRACK_CONTROLS)
        .filter(([_control, feature]) => feature.type == "video")
        .map(([control]) =>
          videoTrackControls.getControlDiv(
            control as keyof typeof TRACK_CONTROLS,
          ),
        ),
      ...Object.entries(TRACK_CONTROLS)
        .filter(([_control, feature]) => feature.type == "audio")
        .map(([control]) =>
          audioTrackControls.getControlDiv(
            control as keyof typeof TRACK_CONTROLS,
          ),
        ),
    );
    videoTrackControls.updateDependencies();
  }
}

happyPath();
