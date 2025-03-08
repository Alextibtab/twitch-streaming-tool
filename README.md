# Twitch Tool

A real-time Twitch integration tool that listens for channel point redemptions and broadcasts them via WebSockets to connected clients. Built with Deno, Oak, and Twurple.

## Features

- 🔄 Real-time channel point redemption notifications
- 🌐 WebSocket server for client connections
- 🔒 Secure EventSub integration with Twitch
- 🚇 Local development with ngrok tunneling
- 📝 Comprehensive logging

## Project Structure

```
twitch-tool/
├── src/                      # Source code
│   ├── config/               # Configuration
│   │   └── config.ts         # Configuration interface and loading
│   ├── eventsub/             # Twitch EventSub integration
│   │   └── handler.ts        # EventSub handler for Twitch events
│   ├── websocket/            # WebSocket server
│   │   └── server.ts         # WebSocket server implementation
│   ├── utils/                # Utility functions
│   │   └── utils.ts          # Logging and other utilities
│   ├── app.ts                # Main application entry point
│   └── test-eventsub.ts      # Test script for EventSub
├── .env                      # Environment variables (not in repo)
├── deno.json                 # Deno configuration
└── README.md                 # Project documentation
```

## How It Works

1. **EventSub Integration**: The application uses Twitch's EventSub system to receive real-time notifications about channel point redemptions.

2. **Ngrok Tunneling**: For local development, ngrok creates a public URL that Twitch can use to send webhook notifications.

3. **WebSocket Broadcasting**: When a channel point is redeemed, the event is broadcast to all connected WebSocket clients.

4. **Oak Web Server**: Handles HTTP requests and serves the WebSocket connections.

## Setup

### Prerequisites

- [Deno](https://deno.land/) installed
- [Twitch Developer Account](https://dev.twitch.tv/)
- [Ngrok Account](https://ngrok.com/)

### Environment Variables

Create a `.env` file with the following variables:

```
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_ACCESS_TOKEN=your_access_token
TWITCH_CHANNEL_NAME=your_channel_name
TWITCH_EVENTSUB_SECRET=your_eventsub_secret
NGROK_AUTH_TOKEN=your_ngrok_auth_token
PORT=8000
```

### Running the Application

```bash
# Start the application
deno run --allow-net --allow-env --allow-read src/app.ts

# Test EventSub integration
deno run --allow-net --allow-env --allow-read src/test-eventsub.ts
```

## Technical Details

### EventSub Handler

The EventSub handler uses Twurple's `EventSubHttpListener` with an `NgrokAdapter` to receive webhook notifications from Twitch. When a channel point is redeemed, the handler processes the event and broadcasts it to all connected WebSocket clients.

### WebSocket Server

The WebSocket server uses Oak's WebSocket implementation to handle client connections. It provides a simple interface for broadcasting messages to all connected clients.

### Configuration

The application uses environment variables for configuration, which are loaded and validated at startup.

## Client Integration

To connect to the WebSocket server from a client:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'reward_redeemed') {
    console.log(`${data.data.userName} redeemed ${data.data.rewardTitle}`);
  }
};
```

## Development

### Testing

To test if the EventSub integration is working:

1. Run the test script: `deno run --allow-net --allow-env --allow-read src/test-eventsub.ts`
2. Go to your Twitch channel and redeem a channel point reward
3. Check the console for logs indicating the event was received

## License

[MIT License](LICENSE)
