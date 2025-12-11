import { Orb } from '@/components/ui/orb';
import { useConversation } from '@elevenlabs/react';
import { useCallback, useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

interface ConversationProps {
  conversationId?: string;
  onConversationSaved?: () => void;
}

export function Conversation({ conversationId, onConversationSaved }: ConversationProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [generatedRecipeId, setGeneratedRecipeId] = useState<string | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [isRetryableError, setIsRetryableError] = useState(false);

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
      console.log('Message received (full object):', JSON.stringify(message, null, 2));
      
      // ElevenLabs message structure can vary - try multiple properties
      const messageText = message.message || message.text || message.content || '';
      let messageRole: 'user' | 'assistant' | null = null;

      // Try different ways to detect the role
      if (message.source === 'user' || message.role === 'user' || message.type === 'user') {
        messageRole = 'user';
        console.log('Detected user message');
      } else if (message.source === 'ai' || message.role === 'assistant' || message.type === 'ai' || message.type === 'assistant') {
        messageRole = 'assistant';
        console.log('Detected AI/assistant message');
      }

      if (messageRole && messageText.trim()) {
        console.log(`Adding ${messageRole} message: "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`);
        setConversationHistory((prev) => {
          const updated = [...prev, { role: messageRole!, content: messageText.trim() }];
          console.log(`Updated history: ${updated.length} messages total`);
          return updated;
        });
      } else {
        console.warn('Skipped message - missing role or empty text', { 
          messageRole, 
          messageText: messageText.substring(0, 50),
          messageKeys: Object.keys(message)
        });
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
    if (!isUserLoaded) {
      console.log('User data is still loading, please wait...');
      alert('Please wait for authentication to complete');
      return;
    }

    if (!user?.id) {
      console.log('No user ID available - user may not be authenticated');
      alert('Please sign in to save conversations');
      return;
    }

    if (conversationHistory.length === 0) {
      console.log('No conversation history to save');
      alert('No conversation messages to save. Start a conversation first.');
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
        let errorMessage = 'Failed to save conversation';
        let errorDetails = '';
        
        // Clone the response so we can read it multiple times if needed
        const responseClone = response.clone();
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || errorData.message || '';
          console.error('API error response:', errorData);
          console.error('Error details:', errorDetails);
        } catch (parseError) {
          // If JSON parsing fails, try text
          try {
            const textResponse = await responseClone.text();
            console.error('Raw error response (text):', textResponse);
            errorDetails = textResponse;
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          } catch (textError) {
            console.error('Failed to read error response:', textError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        
        const fullErrorMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
        throw new Error(fullErrorMessage);
      }

      const data = await response.json();
      console.log('Conversation saved:', data);
      setConversationHistory([]); // Clear history after saving
      onConversationSaved?.(); // Notify parent to refresh sidebar
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error saving conversation:', message, error);
      alert(`Failed to save conversation: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, conversationHistory, onConversationSaved, isUserLoaded]);

  const generateRecipe = useCallback(async () => {
    if (!isUserLoaded) {
      console.log('User data is still loading, please wait...');
      alert('Please wait for authentication to complete');
      return;
    }

    if (!user?.id) {
      console.log('No user ID available - user may not be authenticated');
      alert('Please sign in to generate recipes');
      return;
    }

    if (conversationHistory.length === 0) {
      console.log('No conversation history to generate recipe');
      alert('No conversation messages to generate recipe from. Start a conversation first.');
      return;
    }

    setIsGeneratingRecipe(true);
    setGeneratedRecipeId(null);
    setRecipeError(null);
    setIsRetryableError(false);
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
        let shouldRetry = false;
        
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
          
          // Check if this is a retryable error
          if (response.status === 503 || response.status === 429 || response.status === 504) {
            shouldRetry = true;
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          if (response.status === 503 || response.status === 429 || response.status === 504) {
            shouldRetry = true;
          }
        }
        
        // Store error state for UI display
        setIsRetryableError(shouldRetry);
        setRecipeError(errorMessage);
        
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
      
      // Don't show alert if we're already showing error in UI
      if (!recipeError) {
        // Only show alert for non-retryable errors
        if (!isRetryableError) {
          alert(`Error: ${message}`);
        }
      }
    } finally {
      setIsGeneratingRecipe(false);
    }
  }, [user?.id, conversationHistory, isUserLoaded]);

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

      {recipeError && (
        <div className={`mt-4 p-4 border rounded-lg ${
          isRetryableError 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <p className={isRetryableError ? 'text-yellow-800' : 'text-red-800'}>
            {isRetryableError ? '⚠️' : '❌'} {recipeError}
          </p>
          {isRetryableError && (
            <button
              onClick={() => {
                setRecipeError(null);
                setIsRetryableError(false);
                generateRecipe();
              }}
              disabled={isGeneratingRecipe}
              className="mt-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300"
            >
              {isGeneratingRecipe ? 'Retrying...' : 'Retry Recipe Generation'}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <p>Status: {conversation.status}</p>
        <p>Agent is {conversation.isSpeaking ? 'speaking' : 'listening'}</p>
        <p className="text-sm text-gray-600">
          Messages: {conversationHistory.length}
        </p>
        {!isUserLoaded && (
          <p className="text-sm text-yellow-600">⏳ Loading user data...</p>
        )}
        {isUserLoaded && !user?.id && (
          <p className="text-sm text-red-600">⚠️ Please sign in to save conversations</p>
        )}
        {conversationHistory.length === 0 && conversation.status === 'idle' && (
          <p className="text-sm text-gray-500">💬 Start a conversation to save it</p>
        )}
      </div>
    </div>
  );
}
