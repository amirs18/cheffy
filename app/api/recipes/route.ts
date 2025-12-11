import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        // Get all recipes, ordered by creation date
        const recipes = await prisma.recipe.findMany({
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(
            {
                success: true,
                recipes,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching recipes:", error);
        return NextResponse.json(
            { error: "Failed to fetch recipes" },
            { status: 500 }
        );
    }
}
