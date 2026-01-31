-- CreateTable
CREATE TABLE "SkinAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageBase64" TEXT NOT NULL,
    "imagePath" TEXT,
    "symptoms" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "skinConditions" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "aiResponse" TEXT NOT NULL,
    "confidence" REAL,
    "analysisDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "notes" TEXT
);

-- CreateIndex
CREATE INDEX "SkinAnalysis_analysisDate_idx" ON "SkinAnalysis"("analysisDate");

-- CreateIndex
CREATE INDEX "SkinAnalysis_riskLevel_idx" ON "SkinAnalysis"("riskLevel");
