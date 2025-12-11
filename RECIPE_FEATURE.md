# Recipe Generation Feature - Implementation Summary

## Overview
Added a complete recipe generation system that allows users to send their conversation history to an AI-powered LLM to generate structured recipes that are saved to MongoDB and displayed in a beautiful recipe card format.

## Architecture

### 1. Database Schema (Prisma)
**New Recipe Model:**
```prisma
model Recipe {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  userId          String   // Clerk user ID - who created it
  title           String
  description     String?
  ingredients     String[] // Array of ingredient strings
  instructions    String[] // Array of instruction steps
  prepTime        Int?     // In minutes
  cookTime        Int?     // In minutes
  servings        Int?
  difficulty      String?  // "easy", "medium", "hard"
  tags            String[] // Categories/tags like "vegetarian", "gluten-free"
  imageUrl        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Key Features:**
- `userId`: Tracks who created the recipe (Clerk user ID)
- NOT associated with conversations (independent collection)
- Structured data for ingredients, instructions, times, difficulty levels, and tags
- Timestamps for creation and updates

### 2. Database Functions (`/lib/db.ts`)
New functions added:
- `saveRecipe()` - Create and save a new recipe
- `getRecipe()` - Fetch a single recipe by ID
- `getUserRecipes()` - Fetch all recipes created by a user
- `deleteRecipe()` - Delete a recipe by ID

### 3. API Endpoints

#### POST `/api/recipes/generate`
**Purpose:** Generate a recipe from conversation history using LLM

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "conversationTitle": "string"
}
```

**Process:**
1. Authenticates user via Clerk
2. Formats conversation history into context
3. Sends to OpenAI API with specialized system prompt
4. Parses JSON response from LLM
5. Validates recipe structure
6. Saves to MongoDB with user ID
7. Returns saved recipe with ID

**Response:**
```json
{
  "success": true,
  "recipe": {
    "id": "...",
    "userId": "...",
    "title": "Recipe Name",
    "description": "...",
    "ingredients": [...],
    "instructions": [...],
    "prepTime": 15,
    "cookTime": 30,
    "servings": 4,
    "difficulty": "easy",
    "tags": [...],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 4. Recipe Display Page (`/recipes/[id]`)
**Features:**
- Server-side rendered for SEO
- Beautiful recipe card layout with:
  - Large hero image area
  - Recipe title and description
  - Metadata grid: prep time, cook time, servings, difficulty
  - Tag/category badges
  - Ingredients list with checkmarks
  - Numbered step-by-step instructions
  - Creation date footer

**Styling:**
- Gradient background (slate-50 to slate-100)
- Card-based layout with shadows
- Orange accent color for cooking-related elements
- Responsive design (mobile-friendly)
- Professional typography with clear hierarchy

### 5. UI Components

#### Generate Recipe Button (`/components/conversation.tsx`)
**Location:** Below the conversation messages, next to Save Conversation button

**Features:**
- Orange button for visual distinction
- Disabled during conversation, if no messages, or while generating
- Shows "Generating Recipe..." loading state
- Opens recipe in new tab automatically
- Displays success message with clickable recipe link
- Error handling with user-friendly alerts

**New State Management:**
```typescript
const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
const [generatedRecipeId, setGeneratedRecipeId] = useState<string | null>(null);
```

**Flow:**
1. User clicks "Generate Recipe" button
2. Sends POST request to `/api/recipes/generate` with conversation history
3. LLM processes conversation and returns recipe
4. Recipe saved to MongoDB
5. Success message appears with link
6. Recipe automatically opens in new tab

## LLM Integration

**Model:** OpenAI's `gpt-4o-mini`

**System Prompt:**
```
You are a professional chef and recipe creator. Based on the conversation provided, 
create a structured recipe in JSON format.

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
}
```

**Configuration:**
- Temperature: 0.7 (balanced creativity)
- Max tokens: 2000 (ensures complete recipes)

## User Experience Flow

1. **Start conversation** with ElevenLabs AI agent
2. **Discuss recipe ideas** through voice conversation
3. **Stop conversation** when done
4. **Click "Generate Recipe"** button
5. **AI processes** entire conversation to create structured recipe
6. **Recipe saved** to MongoDB with user ID
7. **Recipe opens** in new browser tab with beautiful formatting
8. **User can share link** to recipe from URL

## Technical Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js 16 (App Router), Clerk Auth
- **Database:** MongoDB with Prisma ORM v6.19
- **LLM:** OpenAI API (gpt-4o-mini)
- **UI Framework:** React hooks for state management

## Files Modified/Created

### New Files:
- `/app/api/recipes/generate/route.ts` - Recipe generation endpoint
- `/app/recipes/[id]/page.tsx` - Recipe display page
- (Implied: Prisma migration in `.prisma/migrations/`)

### Modified Files:
- `/prisma/schema.prisma` - Added Recipe model
- `/lib/db.ts` - Added recipe CRUD functions
- `/app/components/conversation.tsx` - Added recipe generation button and state

## Security Considerations

1. **User Authentication:** All endpoints require Clerk authentication
2. **User Association:** Recipes are tied to the authenticated user's ID
3. **Data Privacy:** Users can only access their own recipes (enforced in future implementation)
4. **Input Validation:** Recipe JSON is validated before saving to database

## Future Enhancements

1. Add GET endpoint to retrieve user's recipes
2. Add editing/updating functionality for recipes
3. Add recipe sharing (with/without permissions)
4. Add recipe search and filtering
5. Add recipe ratings/favorites
6. Add image generation from description
7. Add export to common recipe formats (PDF, etc.)
8. Add print-friendly recipe view

## Error Handling

- 401 Unauthorized: User not authenticated
- 400 Bad Request: Invalid messages format or missing required fields
- 500 Internal Server Error: LLM API failure or database error
- Parse errors: Invalid JSON from LLM with fallback message
- Network errors: User-friendly error alerts

## Environment Variables Required

```
OPENAI_API_KEY=sk_... # Or ELEVENLABS_API_KEY
```

## Testing Checklist

- [ ] Start conversation with AI agent
- [ ] Say something about cooking/recipes
- [ ] Stop conversation
- [ ] Click "Generate Recipe" button
- [ ] Wait for recipe generation
- [ ] Verify recipe opens in new tab
- [ ] Check recipe displays correctly with all sections
- [ ] Verify recipe saved to MongoDB
- [ ] Share recipe link with others (future: add link sharing)
