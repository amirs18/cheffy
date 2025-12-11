'use client';

import { Conversation } from './conversation';
import { ConversationSidebar } from './conversation-sidebar';
import { useState, useCallback } from 'react';

interface ClientWrapperProps {
  children?: React.ReactNode;
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleConversationSaved = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <main className="flex min-h-screen">
      <ConversationSidebar 
        onSelectConversation={setSelectedConversationId}
        selectedId={selectedConversationId}
        refreshTrigger={refreshTrigger}
      />
      <div className="flex-1 flex flex-col items-center justify-between p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
          <h1 className="text-4xl font-bold mb-8 text-center">
            ElevenLabs Agents
          </h1>
          <Conversation 
            conversationId={selectedConversationId}
            onConversationSaved={handleConversationSaved}
          />
        </div>
      </div>
    </main>
  );
}
