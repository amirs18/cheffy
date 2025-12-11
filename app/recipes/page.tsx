"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface Recipe {
    id: string;
    userId: string;
    title: string;
    description?: string;
    ingredients: string[];
    instructions: string[];
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    difficulty?: string;
    tags: string[];
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export default function RecipesPage() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRecipes = async () => {
            try {
                const response = await fetch("/api/recipes");
                if (!response.ok) {
                    throw new Error("Failed to fetch recipes");
                }
                const data = await response.json();
                setRecipes(data.recipes || []);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "An error occurred"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchRecipes();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const getUserDisplayName = (userId: string) => {
        // For now, show a shortened version of the user ID
        // In the future, you could fetch user info from Clerk
        return `User ${userId.substring(0, 8)}...`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading recipes...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Error: {error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        All Recipes
                    </h1>
                    <p className="text-gray-600">
                        Discover recipes created by our community
                    </p>
                </div>

                {recipes.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-600 text-lg">
                            No recipes yet. Start a conversation to generate
                            your first recipe!
                        </p>
                        <Link
                            href="/"
                            className="mt-4 inline-block px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Go to Home
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recipes.map((recipe) => (
                            <Link
                                key={recipe.id}
                                href={`/recipes/${recipe.id}`}
                                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
                            >
                                {recipe.imageUrl && (
                                    <div className="relative w-full h-48">
                                        <Image
                                            src={recipe.imageUrl}
                                            alt={recipe.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div className="p-6">
                                    <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                                        {recipe.title}
                                    </h2>
                                    {recipe.description && (
                                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                            {recipe.description}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {recipe.difficulty && (
                                            <span
                                                className={`px-2 py-1 text-xs rounded-full ${
                                                    recipe.difficulty === "easy"
                                                        ? "bg-green-100 text-green-800"
                                                        : recipe.difficulty ===
                                                          "medium"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-red-100 text-red-800"
                                                }`}
                                            >
                                                {recipe.difficulty}
                                            </span>
                                        )}
                                        {recipe.prepTime && (
                                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                                Prep: {recipe.prepTime}min
                                            </span>
                                        )}
                                        {recipe.cookTime && (
                                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                                Cook: {recipe.cookTime}min
                                            </span>
                                        )}
                                        {recipe.servings && (
                                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                                {recipe.servings} servings
                                            </span>
                                        )}
                                    </div>
                                    {recipe.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {recipe.tags
                                                .slice(0, 3)
                                                .map((tag, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            {recipe.tags.length > 3 && (
                                                <span className="px-2 py-1 text-xs text-gray-500">
                                                    +{recipe.tags.length - 3}{" "}
                                                    more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                        <p className="text-xs text-gray-500">
                                            Created by{" "}
                                            {getUserDisplayName(recipe.userId)}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {formatDate(recipe.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
