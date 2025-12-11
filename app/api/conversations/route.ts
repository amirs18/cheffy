import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { saveConversation, getUserConversations } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { messages, title } = body;

    console.log('Received save request:', {
      userId,
      messageCount: messages?.length,
      title,
      messagesPreview: messages?.slice(0, 2),
    });

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    // Validate message structure
    const invalidMessages = messages.filter(
      (msg: any) => !msg.role || !msg.content || typeof msg.content !== 'string'
    );
    if (invalidMessages.length > 0) {
      console.error('Invalid message structure:', invalidMessages);
      return NextResponse.json(
        { error: 'Invalid message structure. Each message must have role and content.' },
        { status: 400 }
      );
    }

    const conversation = await saveConversation(
      userId,
      messages,
      title
    );

    return NextResponse.json(
      {
        success: true,
        conversation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving conversation:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Include more details in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'Failed to save conversation',
        details: errorMessage,
        ...(isDevelopment && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const conversations = await getUserConversations(userId);

    return NextResponse.json(
      {
        success: true,
        conversations,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
