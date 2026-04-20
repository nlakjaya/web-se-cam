# Overview

WebSeCam is a web based security camera application,
that has standalone Frontend and self hostable Backend
(optionally, infrastructure-as-code on private cloud deployments).

## Features

- Total Privacy, Free and Open Source Forever
- _TODO:_ Alerts on Motion and Noise Events
- Pre-roll Recording on any Event
- Loop Recording (Same or Different Quality)
- Standalone Frontend (Optional Backend)
- _TODO:_ Live View (Requires Backend)
- _TODO:_ Alerts on Events such as Low Battery, Offline, Ambient Light Sensed etc.
- _TODO:_ End-to-end Encryption

## Frontend (Web Application)

- A PWA (Progressive Web Application) running on each camera device (old smart phone, laptop, etc)
- Button to Activate/Deactivate both camera and microphone
- Preview panel to see the web camera feed
- Audio level indicator to show microphone activity
- _TODO:_ Control panel which configures features (extensible)
  - Camera configuration
  - Microphone configuration
  - Continuous/Loop recording
  - Motion detection
  - Noise detection
  - _etc._

### TypeScript Modules

- Components
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
    - Motion Blur Strength (to avoid false detection due to noise and high frequency flickering)
    - _TODO:_ Mask
    - Preview
      - Motion Detection
      - _TODO:_ Mask Editor
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
  - Storage (IndexedDB or Download)
    - Save File
    - Load File
    - Delete File
    - List Files
    - Clear Storage
  - Upload
    - Set URL
    - _TODO:_ No of Retries
    - Fallback (to Storage)
  - Stats (Heartbeat/Telemetry/Alerting)
    - Device ID
    - Timestamp
    - Status
      - Active
      - Motion
      - Noise
      - Inactive
    - Frame Count
    - Battery
      - Level
      - Charging State
      - ETA (Charging or Discharging)
    - Geo Location
      - Timestamp
      - Latitude
      - Longitude
      - Altitude
- Utils
  - Logger
    - Debug Logs
    - Informational Logs
    - Warning Logs
    - Error Logs
    - Hit Counter
    - Performance Calculation
  - Parameter (LocalStorage)
    - Get Parameter
    - Set Parameter
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

- Improvement: PWA Manifest Screenshots
- Improvement: Dim and Lock Screen
- Improvement: Request Keep Awake (Based on Battery/Charging state)
- Improvement: Camera Zoom
- Improvement: Camera Focus Request
- Improvement: Camera Flash On/Off
- Improvement: Sensor-based Events (Battery, Accelerometer, Location, Gyroscope etc.)
- Improvement: Utilize a WebWorker for Motion/Noise Detection (currently runs on rendering pipeline)
- Improvement: Progressive Recording (almost there)
- Improvement: Progressive Uploading
- Improvement: Browser Compatibility
- Issue: Low Camera FPS on older Devices
- Issue: False Motion Events on Camera Auto-Focus
- Issue: https://yusitnikov.github.io/fix-webm-duration/
