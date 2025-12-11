"use client";

import { AnamConversation } from "./anam-conversation";
import { ConversationSidebar } from "./conversation-sidebar";
import { useState, useCallback } from "react";
import Image from "next/image";

interface ClientWrapperProps {
    children?: React.ReactNode;
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
    const [selectedConversationId, setSelectedConversationId] =
        useState<string>();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleConversationSaved = useCallback(() => {
        setRefreshTrigger((prev) => prev + 1);
    }, []);

    return (
        <main className="flex min-h-screen">
            <div className="flex flex-col w-64 bg-gray-100 border-r border-gray-300">
                <div className="p-4 border-b border-gray-300 flex items-center justify-center">
                    <Image
                        src="/logo.svg"
                        alt="Cheffy Logo"
                        width={60}
                        height={60}
                        className="object-contain"
                    />
                </div>
                <ConversationSidebar
                    onSelectConversation={setSelectedConversationId}
                    selectedId={selectedConversationId}
                    refreshTrigger={refreshTrigger}
                />
            </div>
            <div className="flex-1 flex flex-col items-center justify-between p-24">
                <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
                    <h1 className="text-4xl font-bold mb-8 text-center">
                        ElevenLabs Agents
                    </h1>
                    <AnamConversation
                        onConversationSaved={handleConversationSaved}
                    />
                </div>
            </div>
        </main>
    );
}
