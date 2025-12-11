# Anam + ElevenLabs Integration

This implementation provides a real-time conversation interface combining Anam's visual avatars with ElevenLabs' conversational AI voice agents.

## Architecture

The integration uses Anam's **audio passthrough mode**, where:
- **ElevenLabs** handles: Speech recognition, LLM processing, and voice synthesis
- **Anam** handles: Avatar rendering and lip-sync animation to the ElevenLabs audio

## Setup Instructions

### 1. Get Your Credentials

#### Anam Setup
1. Go to [Anam Lab](https://lab.anam.ai/)
2. Navigate to **Settings → API Keys**
3. Create a new API key and copy it
4. Choose or create an avatar:
   - **Stock avatars**: Browse at [Avatar Gallery](https://docs.anam.ai/resources/avatar-gallery)
   - **Custom avatars**: Create at [Anam Lab](https://lab.anam.ai/avatars)
5. Copy your avatar ID

#### ElevenLabs Setup
1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Create a **Conversational AI Agent** at https://elevenlabs.io/convai/agents
3. **Important**: Configure the agent output with:
   - **Format**: PCM 16-bit
   - **Sample Rate**: 16000 Hz
   - **Channels**: Mono
4. Copy your Agent ID from the dashboard

### 2. Configure Environment Variables

Create or update `.env.local` in the project root:

```env
ANAM_API_KEY=your_anam_api_key_here
ANAM_AVATAR_ID=your_avatar_id_here
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id_here
```

For reference, see `.env.example` for all available configuration options.

### 3. Install Dependencies

```bash
npm install
```

The following packages are used:
- `@anam-ai/js-sdk`: Anam avatar client
- `chatdio`: Audio utilities for WebSocket communication
- `@elevenlabs/react`: ElevenLabs integration (also used in existing conversation)

### 4. Run the Application

```bash
npm run dev
```

Visit: http://localhost:3000/anam

## How It Works

### Flow Diagram
```
User Speech → ElevenLabs (WebSocket)
             ↓
         Speech Recognition
         LLM Processing
         Voice Synthesis (PCM 16-bit audio)
             ↓
Anam Avatar ← Audio Stream
    (Lip-sync animation)
             ↓
Rendered Video Output
```

### Key Components

#### 1. API Route: `/api/anam/config`
- **File**: [app/api/anam/config/route.ts](app/api/anam/config/route.ts)
- Creates an Anam session token with audio passthrough enabled
- Returns both the session token and ElevenLabs agent ID to the client

#### 2. ElevenLabs Module: `lib/elevenlabs.ts`
- **File**: [lib/elevenlabs.ts](lib/elevenlabs.ts)
- Handles WebSocket connection to ElevenLabs
- Manages microphone input capture using `chatdio`
- Processes incoming audio messages from ElevenLabs
- Handles interruptions (barge-in support)
- Emits callbacks for different event types

#### 3. Anam Conversation Component: `app/components/anam-conversation.tsx`
- **File**: [app/components/anam-conversation.tsx](app/components/anam-conversation.tsx)
- Main UI component for the conversation interface
- Initializes Anam client with audio passthrough mode
- Creates audio input stream for lip-sync
- Manages connection lifecycle
- Displays conversation history
- Handles errors and loading states

#### 4. Page: `/anam`
- **File**: [app/anam/page.tsx](app/anam/page.tsx)
- Main page component for the `/anam` route
- Provides layout and styling wrapper

## Message Flow

### Starting a Conversation
1. User clicks "Start Conversation"
2. Component fetches Anam session token from `/api/anam/config`
3. Anam client initializes with video stream
4. Audio input stream created for lip-sync
5. WebSocket connection established to ElevenLabs
6. Microphone input starts streaming to ElevenLabs

### During Conversation
1. User speaks → Captured by microphone → Sent to ElevenLabs via WebSocket
2. ElevenLabs processes and responds with audio chunks (PCM 16-bit)
3. Audio chunks received → Sent to Anam for lip-sync animation
4. Anam avatar renders with synchronized mouth movements
5. User transcripts and agent responses displayed in chat

### Stopping Conversation
1. User clicks "Stop Conversation"
2. Cleanup function closes WebSocket
3. Microphone capture stops
4. Anam streaming ends
5. Audio stream ends

## Handling Interruptions (Barge-in)

When a user speaks while the agent is talking:
1. ElevenLabs sends an `interruption` event
2. Current audio sequence is ended in Anam
3. Anam stops current lip-sync animation
4. Prepared for incoming user audio

## Troubleshooting

### "Failed to fetch configuration"
- Check that `.env.local` has valid API credentials
- Verify `ANAM_API_KEY`, `ANAM_AVATAR_ID`, and `ELEVENLABS_AGENT_ID` are set
- Check browser console for detailed error message

### Avatar lips not syncing
- Ensure ElevenLabs agent is configured with:
  - Format: **PCM 16-bit** (not MP3 or other format)
  - Sample Rate: **16000 Hz**
  - Channels: **Mono**
- Check that the avatar supports audio passthrough mode

### No microphone input
- Check browser permissions for microphone access
- Ensure microphone is enabled in system settings
- Try a different browser
- Check browser console for WebSocket connection errors

### Audio out of sync
- This is typically caused by incorrect ElevenLabs agent audio format
- See "Avatar lips not syncing" troubleshooting above
- Anam internally buffers audio for proper timing

### "Cannot connect to ElevenLabs"
- Verify `ELEVENLABS_AGENT_ID` is correct
- Check that the agent exists and is published
- Verify network connectivity
- Check browser console for WebSocket errors

## Files Created

- [app/api/anam/config/route.ts](app/api/anam/config/route.ts) - API endpoint for Anam configuration
- [lib/elevenlabs.ts](lib/elevenlabs.ts) - ElevenLabs WebSocket client
- [app/components/anam-conversation.tsx](app/components/anam-conversation.tsx) - Main conversation component
- [app/anam/page.tsx](app/anam/page.tsx) - Anam page route
- [.env.example](.env.example) - Environment variable template
- [.env.local](.env.local) - Local environment configuration (add your credentials here)

## Testing

1. Ensure all environment variables are set in `.env.local`
2. Run `npm run dev`
3. Navigate to http://localhost:3000/anam
4. Click "Start Conversation"
5. Speak to the avatar
6. Watch the avatar's lips sync to the audio response

## Additional Resources

- [Anam Documentation](https://docs.anam.ai/)
- [Anam Audio Passthrough API](https://docs.anam.ai/audio-passthrough)
- [ElevenLabs Conversational AI](https://elevenlabs.io/conversational-ai)
- [ElevenLabs Agent Configuration](https://elevenlabs.io/docs/conversational-ai)
- [Full Example Repository](https://github.com/anam-ai/elevenlabs-demo)
