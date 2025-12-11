# Recipe Generation Feature - Quick Reference

## How It Works

### 1. User Flow
```
Start Conversation → Chat with AI → Stop Conversation → Generate Recipe
                                                              ↓
                                                      LLM processes
                                                      conversation
                                                              ↓
                                                      Recipe saved to
                                                      MongoDB
                                                              ↓
                                                      Opens in new tab
```

### 2. Component Hierarchy
```
App/
├── Conversation Component
│   ├── ElevenLabs Voice Agent
│   ├── Message Display
│   ├── Control Buttons (Start, Stop, Save, Generate Recipe)
│   └── Success Message with Recipe Link
└── Recipe Page (Opens in new tab)
    ├── Hero Image
    ├── Recipe Info (title, description)
    ├── Metadata (prep time, cook time, servings, difficulty)
    ├── Tags
    ├── Ingredients List
    └── Step-by-Step Instructions
```

### 3. Data Flow
```
Conversation Messages
        ↓
    (POST /api/recipes/generate)
        ↓
   OpenAI API (gpt-4o-mini)
        ↓
   Parse Recipe JSON
        ↓
   Validate Structure
        ↓
   Save to MongoDB (Recipe collection)
        ↓
   Return Recipe ID
        ↓
   Open /recipes/[id] in new tab
```

### 4. Database Structure

#### Recipe Document
```javascript
{
  _id: ObjectId,
  userId: "clerk_user_id",
  title: "Chocolate Cake",
  description: "Delicious homemade chocolate cake",
  ingredients: [
    "2 cups flour",
    "1 cup sugar",
    "3 eggs"
  ],
  instructions: [
    "Mix dry ingredients",
    "Add wet ingredients",
    "Bake at 350°F for 30 minutes"
  ],
  prepTime: 15,
  cookTime: 30,
  servings: 8,
  difficulty: "easy",
  tags: ["dessert", "chocolate", "vegetarian"],
  imageUrl: null,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### 5. API Endpoints

#### Generate Recipe
```
POST /api/recipes/generate

Request:
{
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "conversationTitle": "Conversation with AI"
}

Response:
{
  "success": true,
  "recipe": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "user_2dL8...",
    "title": "Chocolate Cake",
    ...
  }
}
```

#### View Recipe
```
GET /recipes/[id]

Renders beautiful recipe page at /recipes/507f1f77bcf86cd799439011
```

### 6. Button States

| State | Start | Stop | Save | Generate |
|-------|-------|------|------|----------|
| Initial | ✓ | ✗ | ✗ | ✗ |
| Connected | ✗ | ✓ | ✗ | ✗ |
| With Messages | ✓ | ✗ | ✓ | ✓ |
| Saving | ✓ | ✗ | ⏳ | ✓ |
| Generating | ✓ | ✗ | ✓ | ⏳ |

### 7. Styling

**Generate Recipe Button:**
- Background: Orange (rgb(249, 115, 22))
- Text: White
- Hover: Darker orange
- Disabled: Gray

**Success Message:**
- Background: Light orange (rgb(255, 237, 213))
- Border: Orange
- Text: Dark orange

**Recipe Page:**
- Background: Gradient slate (50 to 100)
- Cards: White with shadow
- Accents: Orange for cooking elements
- Typography: Professional with hierarchy

### 8. Key Features

✅ **Conversation to Recipe:** LLM converts natural conversation into structured recipe
✅ **User Attribution:** Each recipe linked to creating user via Clerk ID
✅ **Independent Recipes:** Not tied to conversations (separate MongoDB collection)
✅ **Beautiful Display:** Professional recipe card with all details
✅ **Auto-Open:** New recipe automatically opens in new tab
✅ **Error Handling:** User-friendly error messages and alerts
✅ **Loading States:** Clear indication when generating
✅ **Responsive:** Works on desktop and mobile

### 9. LLM Configuration

**Model:** gpt-4o-mini (fast and cost-effective)
**Temperature:** 0.7 (balanced creativity vs accuracy)
**Max Tokens:** 2000 (ensures complete recipes)
**Format:** Strict JSON output

### 10. Future Enhancements

- [ ] User recipe dashboard
- [ ] Recipe editing
- [ ] Recipe sharing with permissions
- [ ] Image generation for recipes
- [ ] Recipe search/filter
- [ ] Favorites/ratings
- [ ] Export to PDF
- [ ] Print view
- [ ] Nutrition info calculation
- [ ] Ingredient substitutions

### 11. Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | User not logged in | Login with Clerk |
| 400 Bad Request | No messages | Have conversation first |
| 500 LLM Error | API failure | Check OPENAI_API_KEY |
| Parse Error | Invalid JSON | LLM format issue, retry |
| Empty Messages | No conversation | Start conversation |

### 12. Environment Setup

```bash
# Required environment variables
OPENAI_API_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
DATABASE_URL=mongodb+srv://...
```

### 13. Testing Commands

```bash
# Build
npm run build

# Start dev server
npm run dev

# Push database schema
npx prisma db push

# Generate Prisma client
npx prisma generate

# Open browser
open http://localhost:3000
```

### 14. Success Metrics

- ✅ Recipe generated in < 10 seconds
- ✅ Beautiful recipe display
- ✅ Recipe saved to MongoDB
- ✅ User attribution working
- ✅ Links open in new tab
- ✅ Error handling prevents crashes
