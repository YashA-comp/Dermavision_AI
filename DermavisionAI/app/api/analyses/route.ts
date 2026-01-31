import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// GET all analyses (with pagination and filtering)
export async function GET(req: NextRequest) {
  try {
    // Database disabled - return empty results
    return NextResponse.json({
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      },
    });
  } catch (error: any) {
    console.error("Error fetching analyses:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
