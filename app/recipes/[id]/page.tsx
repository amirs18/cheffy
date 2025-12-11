import { auth } from '@clerk/nextjs/server';
import { getRecipe } from '@/lib/db';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Recipe',
  description: 'View recipe details',
};

interface RecipePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const { userId } = await auth();

  const recipe = await getRecipe(id);

  if (!recipe) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          {recipe.imageUrl && (
            <div className="relative w-full h-96 overflow-hidden">
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{recipe.title}</h1>
            {recipe.description && (
              <p className="text-lg text-gray-700 mb-6">{recipe.description}</p>
            )}

            {/* Recipe Meta Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-t border-b border-gray-200">
              {recipe.prepTime && (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-600">Prep Time</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {recipe.prepTime}m
                  </span>
                </div>
              )}
              {recipe.cookTime && (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-600">Cook Time</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {recipe.cookTime}m
                  </span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-600">Servings</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {recipe.servings}
                  </span>
                </div>
              )}
              {recipe.difficulty && (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-600">Difficulty</span>
                  <span className="text-2xl font-bold capitalize text-orange-600">
                    {recipe.difficulty}
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="mt-6">
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Ingredients */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Ingredients</h2>
            <ul className="space-y-3">
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                recipe.ingredients.map((ingredient: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-orange-600 font-bold mr-3">✓</span>
                    <span className="text-gray-700">{ingredient}</span>
                  </li>
                ))
              ) : (
                <p className="text-gray-500">No ingredients listed</p>
              )}
            </ul>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Instructions</h2>
            <ol className="space-y-4">
              {recipe.instructions && recipe.instructions.length > 0 ? (
                recipe.instructions.map((instruction: string, index: number) => (
                  <li key={index} className="flex gap-4">
                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-orange-600 text-white font-bold text-sm">
                      {index + 1}
                    </span>
                    <p className="text-gray-700 pt-1">{instruction}</p>
                  </li>
                ))
              ) : (
                <p className="text-gray-500">No instructions provided</p>
              )}
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Created on {new Date(recipe.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
