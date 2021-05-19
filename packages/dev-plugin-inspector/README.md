# dev-plugin-inspector

A Development Plugin for Expo CLI to Support JavaScript Inspector

## Installation

In existing Expo app project folder, run `expo install @expo/dev-plugin-inspector`.

### Development Server Addon

This plugin will add these endpoints to development server (metro server)

- `GET /inspector?applicationId={applicationId}`

Query inspector availability for specific application

- `PUT /inspector?applicationId={applicationId}`
- `POST /inspector?applicationId={applicationId}`

Open inspector for specific applicaiton