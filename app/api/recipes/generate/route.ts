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

CRITICAL: Return ONLY valid JSON. Do NOT include markdown code blocks, do NOT include any explanatory text before or after the JSON. Return ONLY the raw JSON object starting with { and ending with }.

Required JSON structure:
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
}

Return ONLY the JSON object, nothing else.`;

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

    // Parse the JSON response - handle markdown code blocks and extra text
    let recipeData;
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = recipeText.trim();
      
      // Remove markdown code block markers (```json ... ``` or ``` ... ```)
      jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      
      // Try to find JSON object in the text if there's extra content
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      recipeData = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse recipe JSON:', recipeText);
      console.error('Parse error:', e);
      return NextResponse.json(
        { error: 'Failed to parse generated recipe', details: e instanceof Error ? e.message : String(e) },
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
    console.error('Full error:', error);
    
    // Check for specific error types
    const errorString = errorMessage.toLowerCase();
    let userFriendlyMessage = 'Failed to generate recipe';
    let statusCode = 500;
    
    if (errorString.includes('overloaded') || errorString.includes('overload')) {
      userFriendlyMessage = 'The AI service is currently overloaded. Please try again in a few moments.';
      statusCode = 503; // Service Unavailable
    } else if (errorString.includes('rate limit') || errorString.includes('quota')) {
      userFriendlyMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
      statusCode = 429; // Too Many Requests
    } else if (errorString.includes('api key') || errorString.includes('authentication')) {
      userFriendlyMessage = 'API authentication failed. Please check your API key configuration.';
      statusCode = 401;
    } else if (errorString.includes('timeout') || errorString.includes('timed out')) {
      userFriendlyMessage = 'Request timed out. Please try again.';
      statusCode = 504; // Gateway Timeout
    } else {
      userFriendlyMessage = `Failed to generate recipe: ${errorMessage}`;
    }
    
    return NextResponse.json(
      { 
        error: userFriendlyMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: statusCode }
    );
  }
}
