import { Orb } from '@/components/ui/orb';
import { useConversation } from '@elevenlabs/react';
import { useCallback, useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

interface ConversationProps {
  conversationId?: string;
  onConversationSaved?: () => void;
}

export function Conversation({ conversationId, onConversationSaved }: ConversationProps) {
  const { user } = useUser();
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [generatedRecipeId, setGeneratedRecipeId] = useState<string | null>(null);

  // Load conversation when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      setConversationHistory([]);
      return;
    }

    setIsLoadingConversation(true);
    const loadConversation = async () => {
      try {
        console.log('Loading conversation:', conversationId);
        const response = await fetch(`/api/conversations/${conversationId}`);
        
        if (!response.ok) {
          console.error('Failed to load:', response.status, response.statusText);
          throw new Error('Failed to load conversation');
        }

        const data = await response.json();
        console.log('Loaded data:', data);
        
        if (data.conversation && data.conversation.messages) {
          const messages = data.conversation.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          }));
          console.log('Mapped messages:', messages);
          setConversationHistory(messages);
        } else {
          console.log('No messages found in response');
          setConversationHistory([]);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        setConversationHistory([]);
      } finally {
        setIsLoadingConversation(false);
      }
    };

    loadConversation();
  }, [conversationId]);

  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => {
      console.log('Message received:', message);
      console.log('Message source:', message.source);
      console.log('Message text:', message.message);
      
      // ElevenLabs uses 'source' property with 'user' or 'ai'
      const messageText = message.message || '';
      let messageRole: 'user' | 'assistant' | null = null;

      if (message.source === 'user') {
        messageRole = 'user';
        console.log('Detected user message');
      } else if (message.source === 'ai') {
        messageRole = 'assistant';
        console.log('Detected AI message');
      }

      if (messageRole && messageText.trim()) {
        console.log(`Adding ${messageRole} message: "${messageText}"`);
        setConversationHistory((prev) => {
          const updated = [...prev, { role: messageRole, content: messageText }];
          console.log('Updated history:', updated);
          return updated;
        });
      } else {
        console.log('Skipped message - missing role or empty text', { messageRole, messageText });
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
      onConversationSaved?.(); // Notify parent to refresh sidebar
    } catch (error) {
      console.error('Error saving conversation:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, conversationHistory, onConversationSaved]);

  const generateRecipe = useCallback(async () => {
    if (!user?.id || conversationHistory.length === 0) {
      console.log('No user or conversation history to generate recipe');
      return;
    }

    setIsGeneratingRecipe(true);
    setGeneratedRecipeId(null);
    try {
      const response = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          conversationTitle: `Conversation with AI - ${new Date().toLocaleString()}`,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate recipe';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Recipe generated:', data);
      
      if (data.recipe && data.recipe.id) {
        setGeneratedRecipeId(data.recipe.id);
        // Open recipe in a new tab
        setTimeout(() => {
          window.open(`/recipes/${data.recipe.id}`, '_blank');
        }, 500);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error generating recipe:', message);
      alert(`Error: ${message}`);
    } finally {
      setIsGeneratingRecipe(false);
    }
  }, [user?.id, conversationHistory]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <Orb getInputVolume={conversation.getInputVolume} getOutputVolume={conversation.getOutputVolume} />
      
      {/* Messages Display */}
      <div className="w-full max-w-2xl bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto flex flex-col gap-2 border border-gray-200">
        {isLoadingConversation ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading conversation...</p>
          </div>
        ) : conversationHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Start a conversation...</p>
          </div>
        ) : (
          conversationHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-300 text-gray-900 rounded-bl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
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
        <button
          onClick={generateRecipe}
          disabled={isGeneratingRecipe || conversationHistory.length === 0 || conversation.status === 'connected'}
          className="px-4 py-2 bg-orange-500 text-white rounded disabled:bg-gray-300"
        >
          {isGeneratingRecipe ? 'Generating Recipe...' : 'Generate Recipe'}
        </button>
      </div>

      {generatedRecipeId && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-orange-800">
            ✓ Recipe generated! Opening in a new tab...{' '}
            <a
              href={`/recipes/${generatedRecipeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:text-orange-900"
            >
              View Recipe
            </a>
          </p>
        </div>
      )}

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
