'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, type AnamClient } from '@anam-ai/js-sdk';
import { connectElevenLabs } from '@/lib/elevenlabs';

interface Message {
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

export function AnamConversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const anamClientRef = useRef<AnamClient | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const startConversation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get configuration from server
      const configResponse = await fetch('/api/anam/config');
      if (!configResponse.ok) {
        const errorData = await configResponse.text();
        console.error('Config response:', errorData);
        throw new Error(
          `Failed to fetch configuration: ${configResponse.status} - ${errorData}`
        );
      }
      const { anamSessionToken, elevenLabsAgentId } =
        await configResponse.json();

      if (!anamSessionToken || !elevenLabsAgentId) {
        throw new Error(
          'Missing session token or agent ID. Check your environment variables.'
        );
      }

      // Initialize Anam avatar with audio passthrough (mic disabled since ElevenLabs handles it)
      const anamClient = createClient(anamSessionToken, {
        disableInputAudio: true, // ElevenLabs handles microphone input
      });

      await anamClient.streamToVideoElement('anam-video');
      anamClientRef.current = anamClient;

      // Create agent audio input stream for lip-sync
      const audioInputStream = anamClient.createAgentAudioInputStream({
        encoding: 'pcm_s16le',
        sampleRate: 16000,
        channels: 1,
      });

      // Connect to ElevenLabs
      const cleanup = await connectElevenLabs(elevenLabsAgentId, {
        onReady: () => {
          console.log('ElevenLabs connected');
          setIsConnected(true);
          setIsLoading(false);
        },
        onAudio: (base64Audio) => {
          // Forward audio to Anam for lip-sync
          audioInputStream.sendAudioChunk(base64Audio);
        },
        onUserTranscript: (text) => {
          setMessages((prev) => [
            ...prev,
            { role: 'user', text, timestamp: new Date() },
          ]);
        },
        onAgentResponse: (text) => {
          setMessages((prev) => [
            ...prev,
            { role: 'agent', text, timestamp: new Date() },
          ]);
          audioInputStream.endSequence();
        },
        onInterrupt: () => {
          // Handle barge-in (user interrupts agent)
          audioInputStream.endSequence();
        },
        onDisconnect: () => {
          console.log('ElevenLabs disconnected');
          setIsConnected(false);
        },
        onError: (error) => {
          console.error('ElevenLabs error:', error);
          setError(error.message);
          setIsConnected(false);
        },
      });

      cleanupRef.current = cleanup;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setIsLoading(false);
      console.error('Failed to start conversation:', err);
    }
  }, []);

  const stopConversation = useCallback(async () => {
    try {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      if (anamClientRef.current) {
        await anamClientRef.current.stopStreaming();
        anamClientRef.current = null;
      }

      setIsConnected(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error stopping conversation:', err);
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (anamClientRef.current) {
        anamClientRef.current.stopStreaming().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      {/* Video Element */}
      <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden">
        <video
          id="anam-video"
          className="w-full h-auto"
          style={{ minHeight: '400px' }}
          autoPlay
          playsInline
        />
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <p className="text-white text-lg">
              {isLoading
                ? 'Connecting...'
                : 'Click Start to begin conversation'}
            </p>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={startConversation}
          disabled={isConnected || isLoading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
        >
          {isLoading ? 'Connecting...' : 'Start Conversation'}
        </button>
        <button
          onClick={stopConversation}
          disabled={!isConnected}
          className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
        >
          Stop Conversation
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Status */}
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        <p className="text-sm text-gray-600">
          Status:{' '}
          <span
            className={`font-semibold ${
              isConnected ? 'text-green-600' : 'text-gray-600'
            }`}
          >
            {isConnected
              ? 'Connected'
              : isLoading
                ? 'Connecting...'
                : 'Disconnected'}
          </span>
        </p>
      </div>

      {/* Messages Display */}
      {messages.length > 0 && (
        <div className="flex flex-col gap-3 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-semibold text-gray-700 sticky top-0 bg-gray-50">
            Conversation
          </h3>
          {messages.map((msg, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <p className="text-xs text-gray-500">
                {msg.role === 'user' ? 'You' : 'Agent'} •{' '}
                {msg.timestamp.toLocaleTimeString()}
              </p>
              <p
                className={`text-sm px-3 py-2 rounded ${
                  msg.role === 'user'
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {msg.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
