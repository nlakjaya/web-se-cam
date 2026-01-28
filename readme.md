# Overview

WebSeCam is a web based security camera applicaton,
that has standalone Frontend and self hostable Backend
(optionally infratrcutre-as-code on private cloud deployments).

## Features

- Total Privacy, Free and Open Source Forever
- Motion and Noise Alerts
- Pre-roll Recording on any Alert
- Loop Recording (Same or Different Quality)
- Standalone Frontend (Optional Backend)
- _TODO:_ Live View (Requires Backend)
- _TODO:_ Event Alerts (Low Battery, Goes Offline, Ambient Light Sensed etc.)
- _TODO:_ End-to-end Encrypted

## Frontend (Web Application)

- A PWA (Progrssive Web Application) running on each camera device (old smart phone, laptop, etc)
- Start/Stop button to activate/deactivate both camera and microphone
- Preview panel to see the web camera feed
- Audio level indicator to show microphone activity
- Control panel which configures features (extensible)
  - Camera configuration
  - Microphone configuration
  - Continous recording
  - Motion detection
  - Noise detection
  - _etc._

### TypeScript Modules

- Componants
  - Main
  - Test
- Services
  - Video Overlay (Video Layer)
    - Show Date Time
    - Show Stats (FPS, Frame Counter etc.)
    - Context Options (text, formatting etc.)
  - Motion Detector (Video Layer)
    - Prescaler (lower resolution buffer for faster processing)
    - Detection Threshold
    - Motion Blur Strength (to avoid false detection due to noise and high frequency flikering)
    - _TODO:_ Mask
    - Preview
      - Motion Detection
      - _TODO:_ Mask
  - Noise Detector (Audio)
    - Detection Threshold
    - _TODO:_ Smoothing Strength
  - Night Vision (Video Layer)
    - Sub Pixel Multiplier
    - Mix Frames (Using Frame Buffer)
    - Mix Sub Pixels (Black and Green Video)
    - _TODO:_ Automatic Mode Selection
  - Continuous Recording
    - Interval
    - File Naming
    - Start
    - Stop
- Primary Services
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
  - Media Recorder
    - Formats
    - BitRates
    - Pre-Roll
    - Start
    - Stop
    - Rollover
  - Storage
    - Save File
    - Load File
    - Delete File
    - List Files
    - Clear Storage
  - Upload
    - Set URL
    - _TODO:_ No of Retries
    - Fallback to Storage
  - Alerting
    - _TODO_
  - Telemetry
    - _TODO_
  - Heartbeat
    - _TODO_
- Utils
  - Logger
    - Debug Logs
    - Infomational Logs
    - Warning Logs
    - Error Logs
    - Hit Counter
    - Performance Calculation
  - Constants

## Backend (Node Server)

- Simple ExpressJS app running as master (on cloud, vm, home server etc.)
- Manage storage (quota, max file size, timeout)
- Process alerts

## IaC (optional)

- Firebase
  - _TODO_
- AWS SAM
  - _TODO_
- _TODO_

# Known Issues and Improvements

- Browser Compatibility
  - Browser storage permission issues with Chrome/Chromium
  - Mobile browsers require user action (a tap on screen)
  - Lack of Testing
- Motion/Noise Detection algorithms runs on rendering pipeline
  - _TODO:_ Utilize a WebWorker
- Progressive Recording (almost there)
- Progressive Uploading (_TODO:_ Improvement)
- RnD and implement Sensor-based Events
- RnD and implement Camera Flash On/Off
