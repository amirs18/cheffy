import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { saveRecipe } from '@/lib/db';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if API key is configured
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('Missing API key: GOOGLE_GENERATIVE_AI_API_KEY not set');
      return NextResponse.json(
        { error: 'Missing API key. Please configure GOOGLE_GENERATIVE_AI_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { messages, conversationTitle } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // Build conversation context for the LLM
    const conversationText = messages
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // Prompt for recipe generation
    const systemPrompt = `You are a professional chef and recipe creator. Based on the conversation provided, create a structured recipe in JSON format.

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "title": "Recipe Name",
  "description": "Short description of the dish",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "instructions": ["step 1", "step 2", "step 3"],
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "difficulty": "easy",
  "tags": ["tag1", "tag2"]
}`;

    const userPrompt = `Based on this conversation, create a recipe:\n\n${conversationText}`;

    // Use Vercel AI SDK with Gemini 2.5 Flash
    const model = google('gemini-2.5-flash');
    
    const { text: recipeText } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxOutputTokens: 2000,
    });

    // Parse the JSON response
    let recipeData;
    try {
      recipeData = JSON.parse(recipeText);
    } catch (e) {
      console.error('Failed to parse recipe JSON:', recipeText);
      return NextResponse.json(
        { error: 'Failed to parse generated recipe' },
        { status: 500 }
      );
    }

    // Validate recipe structure
    if (!recipeData.title || !recipeData.ingredients || !recipeData.instructions) {
      return NextResponse.json(
        { error: 'Invalid recipe structure' },
        { status: 400 }
      );
    }

    // Save recipe to database
    const savedRecipe = await saveRecipe(userId, {
      title: recipeData.title,
      description: recipeData.description || '',
      ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [],
      instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
      prepTime: recipeData.prepTime || 0,
      cookTime: recipeData.cookTime || 0,
      servings: recipeData.servings || 1,
      difficulty: recipeData.difficulty || 'medium',
      tags: Array.isArray(recipeData.tags) ? recipeData.tags : [],
      imageUrl: recipeData.imageUrl,
    });

    return NextResponse.json(
      {
        success: true,
        recipe: savedRecipe,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error generating recipe:', errorMessage);
    return NextResponse.json(
      { error: `Failed to generate recipe: ${errorMessage}` },
      { status: 500 }
    );
  }
}
