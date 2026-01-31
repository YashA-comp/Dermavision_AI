import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ✅ Official stable Gemini model names (2026)
const MODELS_TO_TRY = [
  "gemini-2.0-flash",
  "gemini-2.0-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

export async function POST(req: NextRequest) {
  console.log("🟢 /api/analyze hit");

  try {
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { image, symptoms, visionAnalysis } = body;

    // --- Extract Base64 image data ---
    if (!image) {
      return NextResponse.json(
        { error: "Image not provided" },
        { status: 400 }
      );
    }

    const mimeType = image.split(";")[0].split(":")[1] || "image/jpeg";
    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    // --- Combined prompt for medical analysis ---
    const promptText = `
You are a dermatology assistant AI.  
Analyze this skin image and provide:

1. **Likely condition(s)**  
2. **Risk level**  
3. **Whether the user should see a doctor**  
4. **Possible causes**  
5. **Non-medical general advice**

DO NOT give medical diagnosis. Give safe recommendations.

VISION AI result: ${visionAnalysis?.label || "unknown"}
User symptoms: ${symptoms || "not provided"}
    `.trim();

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ]
    };

    let lastError = "Unknown error";

    // 🔄 Try models sequentially until one works
    for (const modelName of MODELS_TO_TRY) {
      console.log(`🟡 Trying model: ${modelName}`);

      const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const json = await response.json();

        if (response.ok) {
          const text =
            json.candidates?.[0]?.content?.parts?.[0]?.text ||
            json.candidates?.[0]?.content?.parts?.[0]?.text ||
            null;

          if (text) {
            console.log(`🟢 SUCCESS: ${modelName}`);
            return NextResponse.json({ result: text });
          }

          lastError = "Model returned no text";
        } else {
          lastError = json.error?.message || "Unknown API error";
          console.error(`🔴 ${modelName}: ${lastError}`);
        }
      } catch (err: any) {
        lastError = err.message;
        console.error(`🔴 Network Error on ${modelName}:`, err.message);
      }
    }

    // If all models fail:
    return NextResponse.json(
      { error: `All Gemini models failed. Last error: ${lastError}` },
      { status: 503 }
    );
  } catch (error: any) {
    console.error("🔥 Fatal server error:", error.message);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
