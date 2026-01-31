import { NextRequest, NextResponse } from "next/server";
import database from "@/lib/sqlite";

export const dynamic = 'force-dynamic';

interface Params {
  id: string;
}

// GET specific analysis by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;

    const analysis = database.getAnalysisById(id);

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Error fetching analysis:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// UPDATE analysis (add notes)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { notes } = body;

    const analysis = database.updateAnalysisNotes(id, notes);

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Error updating analysis:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE analysis
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;

    const success = database.deleteAnalysis(id);

    if (!success) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Analysis deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting analysis:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
