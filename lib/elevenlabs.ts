import { MicrophoneCapture, arrayBufferToBase64 } from 'chatdio';

const SAMPLE_RATE = 16000;

export interface ElevenLabsCallbacks {
  onReady?: () => void;
  onAudio?: (base64Audio: string) => void;
  onUserTranscript?: (text: string) => void;
  onAgentResponse?: (text: string) => void;
  onInterrupt?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export async function connectElevenLabs(
  agentId: string,
  callbacks: ElevenLabsCallbacks
): Promise<() => void> {
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`
      );

      let mic: MicrophoneCapture | null = null;

      // Cleanup function
      const cleanup = () => {
        if (mic) {
          mic.stop();
          mic = null;
        }
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };

      ws.onopen = async () => {
        try {
          // Set up microphone capture with audio processing
          mic = new MicrophoneCapture({
            sampleRate: SAMPLE_RATE,
            echoCancellation: true,
            noiseSuppression: true,
          });

          mic.on('data', (data: ArrayBuffer) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  user_audio_chunk: arrayBufferToBase64(data),
                })
              );
            }
          });

          await mic.start();
          callbacks.onReady?.();
        } catch (error) {
          const err =
            error instanceof Error ? error : new Error(String(error));
          callbacks.onError?.(err);
          reject(err);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'audio':
              if (msg.audio_event?.audio_base_64) {
                const base64Audio = msg.audio_event.audio_base_64;
                // Forward audio to Anam for lip-sync and playback
                // Anam handles the audio playback, so we don't need to play it separately
                callbacks.onAudio?.(base64Audio);
              }
              break;

            case 'agent_response':
              if (msg.agent_response_event?.agent_response) {
                callbacks.onAgentResponse?.(
                  msg.agent_response_event.agent_response
                );
              }
              break;

            case 'user_transcript':
              if (msg.user_transcription_event?.user_transcript) {
                callbacks.onUserTranscript?.(
                  msg.user_transcription_event.user_transcript
                );
              }
              break;

            case 'interruption':
              callbacks.onInterrupt?.();
              break;

            case 'ping':
              if (msg.ping_event?.event_id) {
                ws.send(
                  JSON.stringify({
                    type: 'pong',
                    event_id: msg.ping_event.event_id,
                  })
                );
              }
              break;
          }
        } catch (error) {
          const err =
            error instanceof Error
              ? error
              : new Error('Failed to parse WebSocket message');
          callbacks.onError?.(err);
        }
      };

      ws.onclose = () => {
        if (mic) {
          mic.stop();
          mic = null;
        }
        callbacks.onDisconnect?.();
      };

      ws.onerror = () => {
        const error = new Error('WebSocket error');
        callbacks.onError?.(error);
        reject(error);
      };

      resolve(cleanup);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks.onError?.(err);
      reject(err);
    }
  });
}
