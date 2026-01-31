import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "prisma");
const dbPath = path.join(dbDir, "dev.db");

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create or open database
const db = new Database(dbPath);

// Initialize schema
function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS SkinAnalysis (
      id TEXT PRIMARY KEY,
      imageBase64 TEXT,
      imagePath TEXT,
      imageFormat TEXT CHECK(imageFormat IN ('JPEG', 'PNG')) DEFAULT 'JPEG',
      imageSize INTEGER,
      symptoms TEXT,
      redFlagSymptoms TEXT,
      riskLevel TEXT CHECK(riskLevel IN ('low', 'medium', 'high')),
      skinConditions TEXT,
      recommendations TEXT,
      aiResponse TEXT,
      localAIResults TEXT,
      cloudAnalysisStatus TEXT CHECK(cloudAnalysisStatus IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
      confidence REAL,
      analysisDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      processingStartedAt DATETIME,
      processingCompletedAt DATETIME,
      notes TEXT,
      dataRetentionPolicy TEXT DEFAULT 'retain',
      isEncrypted INTEGER DEFAULT 0,
      captureMethod TEXT CHECK(captureMethod IN ('camera', 'gallery'))
    );

    CREATE TABLE IF NOT EXISTS RedFlagSuggestions (
      id TEXT PRIMARY KEY,
      symptomText TEXT UNIQUE NOT NULL,
      category TEXT,
      priority INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ProcessingLog (
      id TEXT PRIMARY KEY,
      analysisId TEXT NOT NULL,
      stage TEXT,
      status TEXT CHECK(status IN ('started', 'completed', 'failed')),
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysisId) REFERENCES SkinAnalysis(id)
    );

    CREATE TABLE IF NOT EXISTS DataDeletion (
      id TEXT PRIMARY KEY,
      analysisId TEXT NOT NULL,
      deletionRequestedAt DATETIME,
      deletionCompletedAt DATETIME,
      status TEXT CHECK(status IN ('pending', 'completed')) DEFAULT 'pending',
      FOREIGN KEY (analysisId) REFERENCES SkinAnalysis(id)
    );

    CREATE INDEX IF NOT EXISTS idx_analysisDate ON SkinAnalysis(analysisDate);
    CREATE INDEX IF NOT EXISTS idx_riskLevel ON SkinAnalysis(riskLevel);
    CREATE INDEX IF NOT EXISTS idx_cloudAnalysisStatus ON SkinAnalysis(cloudAnalysisStatus);
    CREATE INDEX IF NOT EXISTS idx_captureMethod ON SkinAnalysis(captureMethod);
    CREATE INDEX IF NOT EXISTS idx_processingLog_analysisId ON ProcessingLog(analysisId);
    CREATE INDEX IF NOT EXISTS idx_dataDeletion_analysisId ON DataDeletion(analysisId);
  `);

  // Initialize default red flag suggestions
  initializeRedFlagSuggestions();
}

// Initialize on startup
initializeSchema();

// Initialize default red flag suggestions
function initializeRedFlagSuggestions() {
  const redFlagSymptoms = [
    { text: 'Bleeding', category: 'critical', priority: 1 },
    { text: 'Itching', category: 'symptom', priority: 2 },
    { text: 'Fast Growth', category: 'critical', priority: 1 },
    { text: 'Pain', category: 'symptom', priority: 2 },
    { text: 'Color Changes', category: 'critical', priority: 1 },
    { text: 'Irregular Borders', category: 'symptom', priority: 2 },
    { text: 'Asymmetrical', category: 'critical', priority: 1 },
    { text: 'Oozing', category: 'critical', priority: 1 },
    { text: 'Non-healing', category: 'critical', priority: 1 },
    { text: 'Scaly', category: 'symptom', priority: 2 },
    { text: 'Raised', category: 'symptom', priority: 2 },
    { text: 'Tender', category: 'symptom', priority: 2 },
  ];

  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM RedFlagSuggestions');
  const count = (checkStmt.get() as any).count;

  if (count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO RedFlagSuggestions (id, symptomText, category, priority)
      VALUES (?, ?, ?, ?)
    `);

    for (const symptom of redFlagSymptoms) {
      const id = generateId();
      insertStmt.run(id, symptom.text, symptom.category, symptom.priority);
    }
  }
}

export interface SkinAnalysisData {
  imageBase64: string;
  imagePath?: string;
  imageFormat?: 'JPEG' | 'PNG';
  imageSize?: number;
  symptoms: string;
  redFlagSymptoms?: string[];
  riskLevel: "low" | "medium" | "high";
  skinConditions: string;
  recommendations: string;
  aiResponse: string;
  localAIResults?: string;
  confidence?: number;
  notes?: string;
  captureMethod?: 'camera' | 'gallery';
  dataRetentionPolicy?: 'retain' | 'delete_after_30_days' | 'delete_after_7_days';
  isEncrypted?: boolean;
}

export interface SkinAnalysis extends SkinAnalysisData {
  id: string;
  analysisDate: string;
  updatedAt: string;
  cloudAnalysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingStartedAt?: string;
  processingCompletedAt?: string;
}

export interface RedFlagSuggestion {
  id: string;
  symptomText: string;
  category: string;
  priority: number;
  createdAt: string;
}

export interface ProcessingLogEntry {
  id: string;
  analysisId: string;
  stage: string;
  status: 'started' | 'completed' | 'failed';
  details?: string;
  timestamp: string;
}

export interface DataDeletionRecord {
  id: string;
  analysisId: string;
  deletionRequestedAt: string;
  deletionCompletedAt?: string;
  status: 'pending' | 'completed';
}

// Generate unique ID (cuid-like)
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${random}`;
}

export const database = {
  // IMAGE CAPTURE & UPLOAD (Requirements 1-2)
  saveSkinAnalysis(data: SkinAnalysisData): SkinAnalysis {
    const id = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO SkinAnalysis (
        id, imageBase64, imagePath, imageFormat, imageSize, symptoms, 
        redFlagSymptoms, riskLevel, skinConditions, recommendations, 
        aiResponse, localAIResults, confidence, analysisDate, updatedAt, 
        notes, captureMethod, dataRetentionPolicy, isEncrypted, cloudAnalysisStatus
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.imageBase64,
      data.imagePath ?? null,
      data.imageFormat ?? 'JPEG',
      data.imageSize ?? 0,
      data.symptoms,
      data.redFlagSymptoms ? JSON.stringify(data.redFlagSymptoms) : null,
      data.riskLevel,
      data.skinConditions,
      data.recommendations,
      data.aiResponse,
      data.localAIResults ?? null,
      data.confidence ?? 0.85,
      now,
      now,
      data.notes ?? null,
      data.captureMethod ?? 'camera',
      data.dataRetentionPolicy ?? 'retain',
      data.isEncrypted ? 1 : 0,
      'pending'
    );

    // Log the initial processing stage
    this.logProcessing(id, 'image_capture', 'completed', `Image captured via ${data.captureMethod || 'camera'}`);

    return {
      id,
      ...data,
      analysisDate: now,
      updatedAt: now,
      cloudAnalysisStatus: 'pending',
    };
  },

  // SYMPTOM INPUT (Requirement 3)
  updateSymptoms(id: string, symptoms: string, redFlagSymptoms?: string[]): SkinAnalysis | null {
    const stmt = db.prepare(`
      UPDATE SkinAnalysis 
      SET symptoms = ?, redFlagSymptoms = ?, updatedAt = ? 
      WHERE id = ? 
      RETURNING *
    `);
    const result = stmt.get(
      symptoms,
      redFlagSymptoms ? JSON.stringify(redFlagSymptoms) : null,
      new Date().toISOString(),
      id
    ) as any;
    
    if (result) {
      result.redFlagSymptoms = result.redFlagSymptoms ? JSON.parse(result.redFlagSymptoms) : [];
    }
    
    return result || null;
  },

  // RED FLAG SUGGESTIONS (Requirement 4)
  getRedFlagSuggestions(): RedFlagSuggestion[] {
    const stmt = db.prepare(`
      SELECT * FROM RedFlagSuggestions 
      ORDER BY priority ASC, symptomText ASC
    `);
    return stmt.all() as RedFlagSuggestion[];
  },

  getRedFlagSuggestionsByCategory(category: string): RedFlagSuggestion[] {
    const stmt = db.prepare(`
      SELECT * FROM RedFlagSuggestions 
      WHERE category = ? 
      ORDER BY priority ASC
    `);
    return stmt.all(category) as RedFlagSuggestion[];
  },

  addCustomRedFlagSuggestion(symptomText: string, category: string = 'custom', priority: number = 3): RedFlagSuggestion {
    const id = generateId();
    const stmt = db.prepare(`
      INSERT INTO RedFlagSuggestions (id, symptomText, category, priority)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, symptomText, category, priority);
    
    return {
      id,
      symptomText,
      category,
      priority,
      createdAt: new Date().toISOString(),
    };
  },

  // LOCAL AI PROCESSING (Requirement 5)
  updateLocalAIResults(id: string, localAIResults: string, confidence: number): SkinAnalysis | null {
    const stmt = db.prepare(`
      UPDATE SkinAnalysis 
      SET localAIResults = ?, confidence = ?, updatedAt = ?, processingStartedAt = CURRENT_TIMESTAMP
      WHERE id = ? 
      RETURNING *
    `);
    const result = stmt.get(localAIResults, confidence, new Date().toISOString(), id) as any;
    
    if (result) {
      result.redFlagSymptoms = result.redFlagSymptoms ? JSON.parse(result.redFlagSymptoms) : [];
    }
    
    return result || null;
  },

  // CLOUD ANALYSIS INTEGRATION (Requirement 6)
  updateCloudAnalysisStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    aiResponse?: string,
    skinConditions?: string,
    recommendations?: string,
    riskLevel?: string
  ): SkinAnalysis | null {
    const now = new Date().toISOString();
    let stmt;

    if (status === 'completed') {
      stmt = db.prepare(`
        UPDATE SkinAnalysis 
        SET cloudAnalysisStatus = ?, aiResponse = ?, skinConditions = ?, 
            recommendations = ?, riskLevel = ?, processingCompletedAt = ?, updatedAt = ?
        WHERE id = ? 
        RETURNING *
      `);
      const result = stmt.get(
        status,
        aiResponse ?? '',
        skinConditions ?? '[]',
        recommendations ?? '[]',
        riskLevel ?? 'medium',
        now,
        now,
        id
      ) as any;

      if (result) {
        this.logProcessing(id, 'cloud_analysis', 'completed', 'Cloud analysis completed successfully');
        result.redFlagSymptoms = result.redFlagSymptoms ? JSON.parse(result.redFlagSymptoms) : [];
      }

      return result || null;
    } else if (status === 'failed') {
      stmt = db.prepare(`
        UPDATE SkinAnalysis 
        SET cloudAnalysisStatus = ?, updatedAt = ?
        WHERE id = ? 
        RETURNING *
      `);
      const result = stmt.get(status, now, id) as any;

      if (result) {
        this.logProcessing(id, 'cloud_analysis', 'failed', 'Cloud analysis failed');
        result.redFlagSymptoms = result.redFlagSymptoms ? JSON.parse(result.redFlagSymptoms) : [];
      }

      return result || null;
    } else {
      stmt = db.prepare(`
        UPDATE SkinAnalysis 
        SET cloudAnalysisStatus = ?, updatedAt = ?
        WHERE id = ? 
        RETURNING *
      `);
      const result = stmt.get(status, now, id) as any;

      if (result) {
        this.logProcessing(id, 'cloud_analysis', 'started', 'Cloud analysis processing started');
        result.redFlagSymptoms = result.redFlagSymptoms ? JSON.parse(result.redFlagSymptoms) : [];
      }

      return result || null;
    }
  },

  // DATA PRIVACY & SECURITY (Requirement 7)
  setDataRetentionPolicy(id: string, policy: 'retain' | 'delete_after_30_days' | 'delete_after_7_days'): SkinAnalysis | null {
    const stmt = db.prepare(`
      UPDATE SkinAnalysis 
      SET dataRetentionPolicy = ?, updatedAt = ? 
      WHERE id = ? 
      RETURNING *
    `);
    const result = stmt.get(policy, new Date().toISOString(), id) as any;

    if (result) {
      result.redFlagSymptoms = result.redFlagSymptoms ? JSON.parse(result.redFlagSymptoms) : [];
    }

    return result || null;
  },

  markAsEncrypted(id: string): SkinAnalysis | null {
    const stmt = db.prepare(`
      UPDATE SkinAnalysis 
      SET isEncrypted = 1, updatedAt = ? 
      WHERE id = ? 
      RETURNING *
    `);
    const result = stmt.get(new Date().toISOString(), id) as any;

    if (result) {
      result.redFlagSymptoms = result.redFlagSymptoms ? JSON.parse(result.redFlagSymptoms) : [];
    }

    return result || null;
  },

  requestDataDeletion(id: string): DataDeletionRecord {
    const deletionId = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO DataDeletion (id, analysisId, deletionRequestedAt, status)
      VALUES (?, ?, ?, 'pending')
    `);

    stmt.run(deletionId, id, now);

    return {
      id: deletionId,
      analysisId: id,
      deletionRequestedAt: now,
      status: 'pending',
    };
  },

  completeDateDeletion(id: string): DataDeletionRecord | null {
    const stmt = db.prepare(`
      UPDATE DataDeletion 
      SET status = 'completed', deletionCompletedAt = ? 
      WHERE analysisId = ? 
      RETURNING *
    `);
    return (stmt.get(new Date().toISOString(), id) as DataDeletionRecord) || null;
  },

  // PROCESSING LOG
  logProcessing(analysisId: string, stage: string, status: 'started' | 'completed' | 'failed', details?: string): ProcessingLogEntry {
    const id = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO ProcessingLog (id, analysisId, stage, status, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, analysisId, stage, status, details ?? null, now);

    return {
      id,
      analysisId,
      stage,
      status,
      details,
      timestamp: now,
    };
  },

  getProcessingLog(analysisId: string): ProcessingLogEntry[] {
    const stmt = db.prepare(`
      SELECT * FROM ProcessingLog 
      WHERE analysisId = ? 
      ORDER BY timestamp ASC
    `);
    return stmt.all(analysisId) as ProcessingLogEntry[];
  },

  // QUERY METHODS
  getAllAnalyses(
    page = 1,
    limit = 10,
    riskLevel?: string
  ): { data: SkinAnalysis[]; total: number } {
    const offset = (page - 1) * limit;

    let countQuery = "SELECT COUNT(*) as count FROM SkinAnalysis";
    let dataQuery = "SELECT * FROM SkinAnalysis ORDER BY analysisDate DESC";

    const params: any[] = [];

    if (riskLevel) {
      countQuery += " WHERE riskLevel = ?";
      dataQuery += " WHERE riskLevel = ?";
      params.push(riskLevel);
    }

    const countStmt = db.prepare(countQuery);
    const total = (countStmt.get(...params) as any).count;

    const dataStmt = db.prepare(dataQuery + " LIMIT ? OFFSET ?");
    const data = dataStmt.all(...params, limit, offset) as any[];

    // Parse JSON fields
    const parsedData = data.map(item => ({
      ...item,
      redFlagSymptoms: item.redFlagSymptoms ? JSON.parse(item.redFlagSymptoms) : [],
      localAIResults: item.localAIResults ? JSON.parse(item.localAIResults) : null,
    }));

    return { data: parsedData, total };
  },

  getAnalysisById(id: string): SkinAnalysis | null {
    const stmt = db.prepare("SELECT * FROM SkinAnalysis WHERE id = ?");
    const result = stmt.get(id) as any;

    if (result) {
      result.redFlagSymptoms = result.redFlagSymptoms ? JSON.parse(result.redFlagSymptoms) : [];
      result.localAIResults = result.localAIResults ? JSON.parse(result.localAIResults) : null;
    }

    return result || null;
  },

  getAnalysesByStatus(status: 'pending' | 'processing' | 'completed' | 'failed', limit = 10): SkinAnalysis[] {
    const stmt = db.prepare(`
      SELECT * FROM SkinAnalysis 
      WHERE cloudAnalysisStatus = ? 
      ORDER BY analysisDate DESC 
      LIMIT ?
    `);
    const data = stmt.all(status, limit) as any[];

    return data.map(item => ({
      ...item,
      redFlagSymptoms: item.redFlagSymptoms ? JSON.parse(item.redFlagSymptoms) : [],
      localAIResults: item.localAIResults ? JSON.parse(item.localAIResults) : null,
    }));
  },

  updateAnalysisNotes(id: string, notes: string): SkinAnalysis | null {
    const stmt = db.prepare(
      "UPDATE SkinAnalysis SET notes = ?, updatedAt = ? WHERE id = ? RETURNING *"
    );
    const result = stmt.get(notes, new Date().toISOString(), id) as any;

    if (result) {
      result.redFlagSymptoms = result.redFlagSymptoms ? JSON.parse(result.redFlagSymptoms) : [];
      result.localAIResults = result.localAIResults ? JSON.parse(result.localAIResults) : null;
    }

    return result || null;
  },

  deleteAnalysis(id: string): boolean {
    const stmt = db.prepare("DELETE FROM SkinAnalysis WHERE id = ?");
    const result = stmt.run(id);
    return (result.changes ?? 0) > 0;
  },

  getAnalysisStats(): {
    total: number;
    byRiskLevel: Record<string, number>;
    byCloudAnalysisStatus: Record<string, number>;
    byCaptureMethod: Record<string, number>;
  } {
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM SkinAnalysis");
    const total = (countStmt.get() as any).count;

    const riskStmt = db.prepare(
      "SELECT riskLevel, COUNT(*) as count FROM SkinAnalysis GROUP BY riskLevel"
    );
    const byRiskLevel = (
      riskStmt.all() as Array<{ riskLevel: string; count: number }>
    ).reduce(
      (acc, item) => {
        acc[item.riskLevel] = item.count;
        return acc;
      },
      {} as Record<string, number>
    );

    const statusStmt = db.prepare(
      "SELECT cloudAnalysisStatus, COUNT(*) as count FROM SkinAnalysis GROUP BY cloudAnalysisStatus"
    );
    const byCloudAnalysisStatus = (
      statusStmt.all() as Array<{ cloudAnalysisStatus: string; count: number }>
    ).reduce(
      (acc, item) => {
        acc[item.cloudAnalysisStatus] = item.count;
        return acc;
      },
      {} as Record<string, number>
    );

    const methodStmt = db.prepare(
      "SELECT captureMethod, COUNT(*) as count FROM SkinAnalysis GROUP BY captureMethod"
    );
    const byCaptureMethod = (
      methodStmt.all() as Array<{ captureMethod: string; count: number }>
    ).reduce(
      (acc, item) => {
        acc[item.captureMethod] = item.count;
        return acc;
      },
      {} as Record<string, number>
    );

    return { total, byRiskLevel, byCloudAnalysisStatus, byCaptureMethod };
  },

  getAnalysisesNeedingRetention(): SkinAnalysis[] {
    const stmt = db.prepare(`
      SELECT * FROM SkinAnalysis 
      WHERE dataRetentionPolicy IN ('delete_after_7_days', 'delete_after_30_days')
      AND analysisDate < datetime('now', '-7 days')
      ORDER BY analysisDate ASC
    `);
    const data = stmt.all() as any[];

    return data.map(item => ({
      ...item,
      redFlagSymptoms: item.redFlagSymptoms ? JSON.parse(item.redFlagSymptoms) : [],
      localAIResults: item.localAIResults ? JSON.parse(item.localAIResults) : null,
    }));
  },
};

export default database;
