"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, type AnamClient } from "@anam-ai/js-sdk";
import { connectElevenLabs } from "@/lib/elevenlabs";
import { useUser } from "@clerk/nextjs";

interface Message {
    role: "user" | "agent";
    text: string;
    timestamp: Date;
}

interface AnamConversationProps {
    conversationId?: string;
    onConversationSaved?: () => void;
}

export function AnamConversation({
    conversationId,
    onConversationSaved,
}: AnamConversationProps) {
    const { user, isLoaded: isUserLoaded } = useUser();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingConversation, setIsLoadingConversation] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
    const [generatedRecipeId, setGeneratedRecipeId] = useState<string | null>(
        null
    );
    const [recipeError, setRecipeError] = useState<string | null>(null);
    const [isRetryableError, setIsRetryableError] = useState(false);
    const anamClientRef = useRef<AnamClient | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    // Load conversation when conversationId changes
    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            return;
        }

        setIsLoadingConversation(true);
        const loadConversation = async () => {
            try {
                console.log("Loading conversation:", conversationId);
                const response = await fetch(
                    `/api/conversations/${conversationId}`
                );

                if (!response.ok) {
                    console.error(
                        "Failed to load:",
                        response.status,
                        response.statusText
                    );
                    throw new Error("Failed to load conversation");
                }

                const data = await response.json();
                console.log("Loaded data:", data);

                if (data.conversation && data.conversation.messages) {
                    // Convert API format to Anam message format
                    const loadedMessages = data.conversation.messages.map(
                        (msg: { role: string; content: string }) => ({
                            role: msg.role === "user" ? "user" : "agent",
                            text: msg.content,
                            timestamp: new Date(),
                        })
                    );
                    console.log("Mapped messages:", loadedMessages);
                    setMessages(loadedMessages);
                } else {
                    console.log("No messages found in response");
                    setMessages([]);
                }
            } catch (error) {
                console.error("Error loading conversation:", error);
                setMessages([]);
            } finally {
                setIsLoadingConversation(false);
            }
        };

        loadConversation();
    }, [conversationId]);

    const startConversation = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Get configuration from server
            const configResponse = await fetch("/api/anam/config");
            if (!configResponse.ok) {
                const errorData = await configResponse.text();
                console.error("Config response:", errorData);
                throw new Error(
                    `Failed to fetch configuration: ${configResponse.status} - ${errorData}`
                );
            }
            const { anamSessionToken, elevenLabsAgentId } =
                await configResponse.json();

            if (!anamSessionToken || !elevenLabsAgentId) {
                throw new Error(
                    "Missing session token or agent ID. Check your environment variables."
                );
            }

            // Initialize Anam avatar with audio passthrough (mic disabled since ElevenLabs handles it)
            const anamClient = createClient(anamSessionToken, {
                disableInputAudio: true, // ElevenLabs handles microphone input
            });

            await anamClient.streamToVideoElement("anam-video");
            anamClientRef.current = anamClient;

            // Create agent audio input stream for lip-sync
            const audioInputStream = anamClient.createAgentAudioInputStream({
                encoding: "pcm_s16le",
                sampleRate: 16000,
                channels: 1,
            });

            // Connect to ElevenLabs
            const cleanup = await connectElevenLabs(elevenLabsAgentId, {
                onReady: () => {
                    console.log("ElevenLabs connected");
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
                        { role: "user", text, timestamp: new Date() },
                    ]);
                },
                onAgentResponse: (text) => {
                    setMessages((prev) => [
                        ...prev,
                        { role: "agent", text, timestamp: new Date() },
                    ]);
                    audioInputStream.endSequence();
                },
                onInterrupt: () => {
                    // Handle barge-in (user interrupts agent)
                    audioInputStream.endSequence();
                },
                onDisconnect: () => {
                    console.log("ElevenLabs disconnected");
                    setIsConnected(false);
                },
                onError: (error) => {
                    console.error("ElevenLabs error:", error);
                    setError(error.message);
                    setIsConnected(false);
                },
            });

            cleanupRef.current = cleanup;
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Unknown error";
            setError(message);
            setIsLoading(false);
            console.error("Failed to start conversation:", err);
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
            const message =
                err instanceof Error ? err.message : "Unknown error";
            setError(message);
            console.error("Error stopping conversation:", err);
        }
    }, []);

    const saveConversation = useCallback(async () => {
        if (!isUserLoaded) {
            console.log("User data is still loading, please wait...");
            alert("Please wait for authentication to complete");
            return;
        }

        if (!user?.id) {
            console.log("No user ID available - user may not be authenticated");
            alert("Please sign in to save conversations");
            return;
        }

        if (messages.length === 0) {
            console.log("No conversation history to save");
            alert(
                "No conversation messages to save. Start a conversation first."
            );
            return;
        }

        setIsSaving(true);
        try {
            // Convert messages format from Anam format to API format
            const conversationHistory = messages.map((msg) => ({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.text,
            }));

            const response = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    messages: conversationHistory,
                    title: `Conversation with AI - ${new Date().toLocaleString()}`,
                }),
            });

            if (!response.ok) {
                let errorMessage = "Failed to save conversation";
                let errorDetails = "";

                const responseClone = response.clone();

                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                    errorDetails = errorData.details || errorData.message || "";
                    console.error("API error response:", errorData);
                    console.error("Error details:", errorDetails);
                } catch {
                    try {
                        const textResponse = await responseClone.text();
                        console.error(
                            "Raw error response (text):",
                            textResponse
                        );
                        errorDetails = textResponse;
                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    } catch {
                        console.error("Failed to read error response");
                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    }
                }

                const fullErrorMessage = errorDetails
                    ? `${errorMessage}: ${errorDetails}`
                    : errorMessage;
                throw new Error(fullErrorMessage);
            }

            const data = await response.json();
            console.log("Conversation saved:", data);
            setMessages([]); // Clear messages after saving
            onConversationSaved?.(); // Notify parent to refresh sidebar
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            console.error("Error saving conversation:", message, error);
            alert(`Failed to save conversation: ${message}`);
        } finally {
            setIsSaving(false);
        }
    }, [user?.id, messages, onConversationSaved, isUserLoaded]);

    const generateRecipe = useCallback(async () => {
        if (!isUserLoaded) {
            console.log("User data is still loading, please wait...");
            alert("Please wait for authentication to complete");
            return;
        }

        if (!user?.id) {
            console.log("No user ID available - user may not be authenticated");
            alert("Please sign in to generate recipes");
            return;
        }

        if (messages.length === 0) {
            console.log("No conversation history to generate recipe");
            alert(
                "No conversation messages to generate recipe from. Start a conversation first."
            );
            return;
        }

        setIsGeneratingRecipe(true);
        setGeneratedRecipeId(null);
        setRecipeError(null);
        setIsRetryableError(false);
        try {
            // Convert messages format from Anam format to API format
            const conversationHistory = messages.map((msg) => ({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.text,
            }));

            const response = await fetch("/api/recipes/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: conversationHistory,
                    conversationTitle: `Conversation with AI - ${new Date().toLocaleString()}`,
                }),
            });

            if (!response.ok) {
                let errorMessage = "Failed to generate recipe";
                let shouldRetry = false;

                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;

                    // Check if this is a retryable error
                    if (
                        response.status === 503 ||
                        response.status === 429 ||
                        response.status === 504
                    ) {
                        shouldRetry = true;
                    }
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    if (
                        response.status === 503 ||
                        response.status === 429 ||
                        response.status === 504
                    ) {
                        shouldRetry = true;
                    }
                }

                // Store error state for UI display
                setIsRetryableError(shouldRetry);
                setRecipeError(errorMessage);

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log("Recipe generated:", data);

            if (data.recipe && data.recipe.id) {
                setGeneratedRecipeId(data.recipe.id);
                // Open recipe in a new tab
                setTimeout(() => {
                    window.open(`/recipes/${data.recipe.id}`, "_blank");
                }, 500);
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            console.error("Error generating recipe:", message);

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
    }, [user?.id, messages, isUserLoaded, isRetryableError, recipeError]);

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
                    style={{ minHeight: "400px" }}
                    autoPlay
                    playsInline
                />
                {!isConnected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <p className="text-white text-lg">
                            {isLoading
                                ? "Connecting..."
                                : "Click Start to begin conversation"}
                        </p>
                    </div>
                )}
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2 flex-wrap justify-center">
                <button
                    onClick={startConversation}
                    disabled={isConnected || isLoading}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                >
                    {isLoading ? "Connecting..." : "Start Conversation"}
                </button>
                <button
                    onClick={stopConversation}
                    disabled={!isConnected}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                >
                    Stop Conversation
                </button>
                <button
                    onClick={saveConversation}
                    disabled={isSaving || messages.length === 0 || isConnected}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                >
                    {isSaving ? "Saving..." : "Save Conversation"}
                </button>
                <button
                    onClick={generateRecipe}
                    disabled={
                        isGeneratingRecipe ||
                        messages.length === 0 ||
                        isConnected
                    }
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                >
                    {isGeneratingRecipe
                        ? "Generating Recipe..."
                        : "Generate Recipe"}
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
                    Status:{" "}
                    <span
                        className={`font-semibold ${
                            isConnected ? "text-green-600" : "text-gray-600"
                        }`}
                    >
                        {isConnected
                            ? "Connected"
                            : isLoading
                            ? "Connecting..."
                            : "Disconnected"}
                    </span>
                </p>
            </div>

            {/* Messages Display */}
            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-lg border">
                <h3 className="font-semibold text-gray-700 sticky top-0 bg-gray-50">
                    Conversation
                </h3>
                {isLoadingConversation ? (
                    <div className="flex items-center justify-center py-8">
                        <p className="text-gray-500">Loading conversation...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-gray-400">
                        <p>Start a conversation or select a saved one...</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                            <p className="text-xs text-gray-500">
                                {msg.role === "user" ? "You" : "Agent"} •{" "}
                                {msg.timestamp.toLocaleTimeString()}
                            </p>
                            <p
                                className={`text-sm px-3 py-2 rounded ${
                                    msg.role === "user"
                                        ? "bg-blue-100 text-blue-900"
                                        : "bg-gray-200 text-gray-900"
                                }`}
                            >
                                {msg.text}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* Recipe Generation Success */}
            {generatedRecipeId && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-orange-800">
                        ✓ Recipe generated! Opening in a new tab...{" "}
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

            {/* Recipe Generation Error */}
            {recipeError && (
                <div
                    className={`mt-4 p-4 border rounded-lg ${
                        isRetryableError
                            ? "bg-yellow-50 border-yellow-200"
                            : "bg-red-50 border-red-200"
                    }`}
                >
                    <p
                        className={
                            isRetryableError
                                ? "text-yellow-800"
                                : "text-red-800"
                        }
                    >
                        {isRetryableError ? "⚠️" : "❌"} {recipeError}
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
                            {isGeneratingRecipe
                                ? "Retrying..."
                                : "Retry Recipe Generation"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
