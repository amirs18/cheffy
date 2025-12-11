'use client';

import { Orb } from '@/components/ui/orb';
import { useConversation } from '@elevenlabs/react';
import { useCallback, useState } from 'react';
import { useUser } from '@clerk/nextjs';

export function Conversation() {
  const { user } = useUser();
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);

  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => {
      console.log('Full message object:', message);
      
      // ElevenLabs uses 'source' property with 'user' or 'ai'
      const messageText = message.message || '';
      let messageRole: 'user' | 'assistant' | null = null;

      if (message.source === 'user') {
        messageRole = 'user';
      } else if (message.source === 'ai') {
        messageRole = 'assistant';
      }

      if (messageRole && messageText) {
        console.log(`Captured ${messageRole}: ${messageText}`);
        setConversationHistory((prev) => [
          ...prev,
          { role: messageRole, content: messageText },
        ]);
      } else {
        console.log('Skipped message - missing role or text');
      }
    },
    onError: (error) => console.error('Error:', error),
  });

  const startConversation = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start the conversation with your agent
      await conversation.startSession({
        agentId: 'agent_0201kc26hrr5f1qrpkwcq958cggc', // Replace with your agent ID
        userId: user?.id || 'unknown', // Use Clerk user ID
        connectionType: 'webrtc', // either "webrtc" or "websocket"
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation, user?.id]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const saveConversation = useCallback(async () => {
    if (!user?.id || conversationHistory.length === 0) {
      console.log('No user or conversation history to save');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          messages: conversationHistory,
          title: `Conversation with AI - ${new Date().toLocaleString()}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save conversation');
      }

      const data = await response.json();
      console.log('Conversation saved:', data);
      setConversationHistory([]); // Clear history after saving
    } catch (error) {
      console.error('Error saving conversation:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, conversationHistory]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Orb getInputVolume={conversation.getInputVolume} getOutputVolume={conversation.getOutputVolume} />
      <div className="flex gap-2">
        <button
          onClick={startConversation}
          disabled={conversation.status === 'connected'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Start Conversation
        </button>
        <button
          onClick={stopConversation}
          disabled={conversation.status !== 'connected'}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
        >
          Stop Conversation
        </button>
        <button
          onClick={saveConversation}
          disabled={isSaving || conversationHistory.length === 0 || conversation.status === 'connected'}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
        >
          {isSaving ? 'Saving...' : 'Save Conversation'}
        </button>
      </div>

      <div className="flex flex-col items-center">
        <p>Status: {conversation.status}</p>
        <p>Agent is {conversation.isSpeaking ? 'speaking' : 'listening'}</p>
        <p className="text-sm text-gray-600">
          Messages: {conversationHistory.length}
        </p>
      </div>
    </div>
  );
}
