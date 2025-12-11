"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

interface ConversationItem {
    id: string;
    title: string | null;
    updatedAt: string;
    messageCount?: number;
}

interface ConversationSidebarProps {
    onSelectConversation?: (id: string) => void;
    selectedId?: string;
    refreshTrigger?: number;
}

export function ConversationSidebar({
    onSelectConversation,
    selectedId,
    refreshTrigger,
}: ConversationSidebarProps) {
    const { user } = useUser();
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Only fetch if user is loaded and authenticated
        if (!user) return;

        setLoading(true);

        const fetchConversations = async () => {
            try {
                const response = await fetch("/api/conversations");

                if (response.status === 401) {
                    console.log(
                        "User not authenticated, skipping conversation fetch"
                    );
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.status}`);
                }

                const data = await response.json();

                if (data.conversations) {
                    const formattedConversations = data.conversations.map(
                        (conv: any) => ({
                            id: conv.id,
                            title: conv.title || "Untitled",
                            updatedAt: new Date(
                                conv.updatedAt
                            ).toLocaleString(),
                            messageCount: conv.messages?.length || 0,
                        })
                    );
                    setConversations(formattedConversations);
                }
            } catch (error) {
                console.error("Error fetching conversations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
    }, [user?.id, refreshTrigger]);

    if (loading) {
        return (
            <div className="p-4 flex-1 overflow-y-auto">
                <p className="text-gray-500">Loading chats...</p>
            </div>
        );
    }

    return (
        <div className="p-4 flex-1 overflow-y-auto">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Past Chats</h2>
            {conversations.length === 0 ? (
                <p className="text-sm text-gray-500">No conversations yet</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => onSelectConversation?.(conv.id)}
                            className={`text-left p-3 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer border ${
                                selectedId === conv.id
                                    ? "bg-blue-200 border-blue-400"
                                    : "bg-white border-gray-300"
                            }`}
                        >
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {conv.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {conv.messageCount} messages
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {conv.updatedAt}
                            </p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
