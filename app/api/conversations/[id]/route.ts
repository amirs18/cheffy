import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getConversation } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const conversationId = id;

    if (!conversationId) {
      console.error('No conversation ID provided');
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching conversation:', conversationId, 'for user:', userId);

    console.log('Fetching conversation:', conversationId, 'for user:', userId);

    const conversation = await getConversation(conversationId);

    if (!conversation) {
      console.error('Conversation not found:', conversationId);
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (conversation.userId !== userId) {
      console.error('User does not own conversation:', userId, conversation.userId);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    console.log('Successfully loaded conversation:', conversationId);
    return NextResponse.json(
      {
        success: true,
        conversation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}
