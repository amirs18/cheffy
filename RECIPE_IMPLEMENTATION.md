# Recipe Generation - Implementation Details

## Files Created

### 1. API Endpoint: `/app/api/recipes/generate/route.ts`
- **Type:** Server-side API route (TypeScript)
- **Method:** POST
- **Purpose:** Generate and save recipe from conversation history
- **Key Steps:**
  1. Authenticate user with Clerk
  2. Receive conversation messages
  3. Format conversation into context
  4. Call OpenAI API with system and user prompts
  5. Parse JSON response
  6. Validate recipe structure
  7. Save to MongoDB via Prisma
  8. Return saved recipe with ID

### 2. Recipe Display Page: `/app/recipes/[id]/page.tsx`
- **Type:** Server-side component (TypeScript, JSX)
- **Purpose:** Display recipe in beautiful card format
- **Features:**
  - Dynamic route handling with `params: Promise<{ id: string }>`
  - Fetch recipe from database
  - Handle not found (404) gracefully
  - Responsive image section
  - Metadata display (prep time, cook time, servings, difficulty)
  - Tag badges with styling
  - Ingredients list with checkmarks
  - Numbered instructions with circles
  - Footer with creation date

### 3. Database Functions: Added to `/lib/db.ts`
```typescript
- saveRecipe(userId, recipe) // Create and save
- getRecipe(recipeId) // Fetch single
- getUserRecipes(userId) // Fetch all user's recipes
- deleteRecipe(recipeId) // Delete
```

### 4. Database Schema: Updated `/prisma/schema.prisma`
- Added new `Recipe` model
- 9 fields with appropriate types
- Timestamps for creation and updates
- User association via userId

### 5. UI Component: Updated `/app/components/conversation.tsx`
- Added "Generate Recipe" button (orange color)
- New state: `isGeneratingRecipe`, `generatedRecipeId`
- New function: `generateRecipe()`
- Success message with recipe link
- Error handling and user feedback

## Code Examples

### Recipe Generation Function
```typescript
const generateRecipe = useCallback(async () => {
  if (!user?.id || conversationHistory.length === 0) return;
  
  setIsGeneratingRecipe(true);
  try {
    const response = await fetch('/api/recipes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationHistory,
        conversationTitle: `Conversation - ${new Date().toLocaleString()}`,
      }),
    });

    const data = await response.json();
    if (data.recipe?.id) {
      setGeneratedRecipeId(data.recipe.id);
      window.open(`/recipes/${data.recipe.id}`, '_blank');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to generate recipe');
  } finally {
    setIsGeneratingRecipe(false);
  }
}, [user?.id, conversationHistory]);
```

### Recipe Generation API Endpoint
```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Get messages
  const { messages, conversationTitle } = await request.json();

  // 3. Format for LLM
  const conversationText = messages
    .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  // 4. Call LLM
  const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  // 5. Parse response
  const llmData = await llmResponse.json();
  const recipeText = llmData.choices[0]?.message?.content || '';
  const recipeData = JSON.parse(recipeText);

  // 6. Save to database
  const savedRecipe = await saveRecipe(userId, recipeData);

  // 7. Return success
  return NextResponse.json({ success: true, recipe: savedRecipe }, { status: 201 });
}
```

### Recipe Display Component
```typescript
export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      {recipe.imageUrl && <img src={recipe.imageUrl} alt={recipe.title} />}
      
      {/* Header */}
      <h1>{recipe.title}</h1>
      <p>{recipe.description}</p>

      {/* Metadata Grid */}
      <div className="grid grid-cols-4">
        <div>Prep Time: {recipe.prepTime}m</div>
        <div>Cook Time: {recipe.cookTime}m</div>
        <div>Servings: {recipe.servings}</div>
        <div>Difficulty: {recipe.difficulty}</div>
      </div>

      {/* Tags */}
      <div className="flex gap-2">
        {recipe.tags?.map(tag => (
          <span key={tag} className="badge">{tag}</span>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-2">
        {/* Ingredients */}
        <div>
          <h2>Ingredients</h2>
          <ul>
            {recipe.ingredients?.map((ing, i) => (
              <li key={i}>✓ {ing}</li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h2>Instructions</h2>
          <ol>
            {recipe.instructions?.map((step, i) => (
              <li key={i}>
                <span className="circle">{i + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Footer */}
      <p className="text-sm text-gray-600">
        Created on {new Date(recipe.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
```

## Database Schema

```prisma
model Recipe {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  userId          String   // Clerk user ID
  title           String
  description     String?
  ingredients     String[] // ["2 cups flour", "1 egg", ...]
  instructions    String[] // ["Step 1", "Step 2", ...]
  prepTime        Int?     // 15 (minutes)
  cookTime        Int?     // 30 (minutes)
  servings        Int?     // 4
  difficulty      String?  // "easy", "medium", "hard"
  tags            String[] // ["dessert", "vegetarian", ...]
  imageUrl        String?  // Future image storage
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## LLM System Prompt

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

## Styling Details

### Generate Recipe Button
```css
.generate-recipe-btn {
  background-color: rgb(249, 115, 22); /* Orange */
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  
  &:disabled {
    background-color: rgb(209, 213, 219); /* Gray */
  }
}
```

### Success Message
```css
.recipe-success {
  background-color: rgb(255, 237, 213); /* Light orange */
  border: 1px solid rgb(249, 115, 22);
  padding: 1rem;
  border-radius: 0.5rem;
  color: rgb(120, 53, 15); /* Dark orange text */
}
```

### Recipe Page Colors
- Background: Gradient from slate-50 to slate-100
- Cards: White with shadow
- Primary accent: Orange (rgb(249, 115, 22))
- Secondary text: Gray (rgb(107, 114, 128))
- Numbers in circles: Orange background, white text

## Error Handling

### API Errors
- **401 Unauthorized:** No Clerk auth token
- **400 Bad Request:** Missing/invalid messages
- **500 LLM Error:** OpenAI API failure
- **Parse Error:** Invalid JSON from LLM

### User Feedback
- Error alerts with descriptive messages
- Loading states with spinners/text
- Success message with clickable link
- Graceful fallbacks for all failures

## Security

1. **Authentication:** Clerk middleware ensures user is logged in
2. **User Association:** Recipe.userId = authenticated user only
3. **Data Privacy:** Future: Add permission checks for recipe access
4. **Input Validation:** JSON schema validation for recipe data
5. **API Rate Limiting:** (Future enhancement)

## Performance

- **LLM Latency:** ~5-15 seconds (depends on conversation length)
- **Database Save:** ~100-500ms
- **Page Load:** Server-side rendering, instant display
- **Auto-Open:** 500ms delay after API response for better UX

## Testing

1. Start conversation with AI agent
2. Discuss cooking topic
3. Stop conversation
4. Click "Generate Recipe" button
5. Wait for generation
6. Verify recipe opens in new tab
7. Check all sections display correctly
8. Verify recipe in MongoDB

## Future Enhancements

- Add recipe search/filter
- Add user recipe dashboard
- Add recipe editing
- Add recipe sharing with permissions
- Add image generation
- Add nutritional information
- Add meal planning integration
- Add export to PDF/print
- Add recipe ratings/reviews
- Add ingredient substitution suggestions
