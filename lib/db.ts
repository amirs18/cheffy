import { prisma } from './prisma';

export async function saveConversation(
  userId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  title?: string
) {
  try {
    console.log('Attempting to save conversation:', {
      userId,
      messageCount: messages.length,
      title,
    });

    // For MongoDB, we might need to create conversation first, then messages
    // Try nested create first, but have fallback
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title,
        messages: {
          create: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        },
      },
      include: {
        messages: true,
      },
    });
    
    console.log('Conversation saved successfully:', conversation.id);
    return conversation;
  } catch (error) {
    console.error('Error saving conversation in db.ts:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

export async function getConversation(conversationId: string) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return conversation;
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  }
}

export async function getUserConversations(userId: string) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Only get the first message as preview
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return conversations;
  } catch (error) {
    console.error('Error getting user conversations:', error);
    throw error;
  }
}

export async function addMessageToConversation(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  try {
    const message = await prisma.message.create({
      data: {
        conversationId,
        role,
        content,
      },
    });

    // Update the conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    throw error;
  }
}

export async function deleteConversation(conversationId: string) {
  try {
    await prisma.conversation.delete({
      where: { id: conversationId },
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
) {
  try {
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });
    return conversation;
  } catch (error) {
    console.error('Error updating conversation title:', error);
    throw error;
  }
}
export async function saveRecipe(
  userId: string,
  recipe: {
    title: string;
    description?: string;
    ingredients: string[];
    instructions: string[];
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    difficulty?: string;
    tags?: string[];
    imageUrl?: string;
  }
) {
  try {
    const savedRecipe = await prisma.recipe.create({
      data: {
        userId,
        ...recipe,
      },
    });
    return savedRecipe;
  } catch (error) {
    console.error('Error saving recipe:', error);
    throw error;
  }
}

export async function getRecipe(recipeId: string) {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });
    return recipe;
  } catch (error) {
    console.error('Error getting recipe:', error);
    throw error;
  }
}

export async function getUserRecipes(userId: string) {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return recipes;
  } catch (error) {
    console.error('Error getting user recipes:', error);
    throw error;
  }
}

export async function deleteRecipe(recipeId: string) {
  try {
    await prisma.recipe.delete({
      where: { id: recipeId },
    });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
}