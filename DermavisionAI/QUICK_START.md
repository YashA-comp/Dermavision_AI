# Database Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. View Your Analysis History

Add this to your app's route:

```tsx
// app/history/page.tsx
import { AnalysisHistoryPage } from "@/components/analysis-history";

export default function HistoryPage() {
  return <AnalysisHistoryPage />;
}
```

Then visit: `http://localhost:3000/history`

---

### 2. Test the Endpoints

```bash
# Get all analyses
curl http://localhost:3000/api/analyses

# Get with pagination
curl http://localhost:3000/api/analyses?page=1&limit=5

# Filter by risk level
curl http://localhost:3000/api/analyses?riskLevel=high

# Get single analysis
curl http://localhost:3000/api/analyses/clx...id...

# Update notes
curl -X PUT http://localhost:3000/api/analyses/clx...id... \
  -H "Content-Type: application/json" \
  -d '{"notes":"Follow up needed"}'

# Delete analysis
curl -X DELETE http://localhost:3000/api/analyses/clx...id...
```

---

### 3. Use in Your Components

```tsx
"use client";

import { useAnalysisHistory } from "@/hooks/use-analysis-history";

export default function MyComponent() {
  const { 
    analyses, 
    loading, 
    pagination, 
    fetchAnalyses,
    deleteAnalysis,
    updateNotes 
  } = useAnalysisHistory();

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Your Analyses ({pagination.total})</h2>
      
      {analyses.map(analysis => (
        <div key={analysis.id}>
          <p>Risk: <strong>{analysis.riskLevel}</strong></p>
          <p>Date: {new Date(analysis.analysisDate).toLocaleDateString()}</p>
          <button onClick={() => deleteAnalysis(analysis.id)}>
            Delete
          </button>
        </div>
      ))}

      {pagination.pages > 1 && (
        <div>
          <button onClick={() => fetchAnalyses(pagination.page - 1)}>
            Previous
          </button>
          <span>{pagination.page} / {pagination.pages}</span>
          <button onClick={() => fetchAnalyses(pagination.page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 4. View Database (Optional)

```bash
npx prisma studio
```

Opens a web interface to view/edit your database.

---

## 📁 Where's My Data?

Your database file: `prisma/dev.db` (local SQLite database)

---

## ✅ What Works Now

✅ **Automatic Saving** - Every skin analysis automatically saves to database  
✅ **Retrieve History** - View all past analyses  
✅ **Filter** - Filter by risk level  
✅ **Paginate** - Handle large datasets efficiently  
✅ **Update Notes** - Add notes to analyses  
✅ **Delete** - Remove analyses  

---

## 🔧 Make Changes to Database Schema

1. Edit `prisma/schema.prisma`
2. Run: `npx prisma migrate dev --name description_of_change`
3. Done! Database and code updated automatically

---

## 🐛 Something Wrong?

Check the server logs (terminal where you ran `npm run dev`):
- Look for "Analysis saved to database" messages
- Check for "Database save error" warnings

---

## 📚 Learn More

- Full documentation: `DATABASE_IMPLEMENTATION.md`
- Prisma docs: https://prisma.io/docs
- SQLite docs: https://sqlite.org/docs.html

---

Happy analyzing! 🎉
