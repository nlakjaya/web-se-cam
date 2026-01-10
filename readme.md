# Overview

WebSeCam is a web based security camera applicaton, that has 2 major components.

## Web Application

- A simple html/css/js application running on each camera device (old smart phone, laptop, etc)
  - Upgrade to a Progrssive Web Application (TODO)
- Start/Stop button to activate/deactivate both camera and microphone
- Preview panel to see the web camera feed
- Audio level indicator to show microphone activity
- Has a control panel which can be used to configure features (extendable)
  - Camera configuration
  - Microphone configuration
  - Continous recording
  - Motion detection
  - Noise detection
  - etc.

### TypeScript Modules

- Logger
  - Debug Logs
  - Infomational Logs
  - Warning Logs
  - Error Logs
  - Hit Counter
  - Performance Calculation
- Storage
  - Save File
  - Load File
  - Delete File
  - List Files
  - Clear Storage
- Upload
  - Set URL
  - No of Retries (TODO)
  - Fallback to Storage
- Device Access (Camera and Microphone)
  - Request Permissions
  - Video Device List
  - Audio Device List
  - Video Capabilities
  - Audio Capabilities
  - Start
    - options (VideoDeviceID, Resolution, FPS, AudioDeviceID, AutoGain, etc)
    - returns MediaStream
  - Stop
- Video Pipeline
  - Layered Rendering
- Night Vision (Video Layer)
  - Sub Pixel Multiplier
  - Mix Frames (Using Frame Buffer)
  - Mix Sub Pixels (Black and Green Video)
  - Automatic Mode Selection (TODO)
- Motion Detector (Video Layer)
  - Prescaler (lower resolution buffer for faster processing)
  - Detection Threshold
  - Motion Blur Strength (to avoid false detection due to noise and high frequency flikering)
  - Mask (TODO)
  - Preview
    - Motion Detection
    - Mask (TODO)
- Video Overlay (Video Layer)
  - Show Date Time
  - Show Stats (FPS, Frame Counter etc.)
  - Context Options (text, formatting etc.)
- Media Recorder
  - Formats
  - BitRates
  - Pre Roll
  - Start
  - Stop
  - Rollover
- Continuous Recording
  - Interval
  - File Naming
  - Start
  - Stop
- Alerting
  - ...
- Heartbeat
  - ...

## Intranet Server

- 

## AWS SAM

-
