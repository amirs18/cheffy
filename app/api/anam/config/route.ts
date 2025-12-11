import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const anamApiKey = process.env.ANAM_API_KEY;
    const anamAvatarId = process.env.ANAM_AVATAR_ID;
    const elevenLabsAgentId = process.env.ELEVENLABS_AGENT_ID;

    if (!anamApiKey || !anamAvatarId || !elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 400 }
      );
    }

    // Create Anam session token with audio passthrough enabled
    const response = await fetch('https://api.anam.ai/v1/auth/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anamApiKey}`,
      },
      body: JSON.stringify({
        personaConfig: {
          avatarId: anamAvatarId,
          enableAudioPassthrough: true, // Enable external audio input for ElevenLabs
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anam API error:', error);
      return NextResponse.json(
        { error: 'Failed to create Anam session token' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      anamSessionToken: data.sessionToken,
      elevenLabsAgentId,
    });
  } catch (error) {
    console.error('Error creating session token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
