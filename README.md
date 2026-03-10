# Sports Intel AI

## Project Overview
Sports Intel AI is an advanced, AI-powered sports performance intelligence application for cricket and football. It helps coaches and sports analysts analyze player trends, performance metrics, and match dynamics to make data-driven decisions.

## Architecture
The project follows a modern monorepo structure, cleanly separating the frontend from the backend services.

```text
sports-intel-ai/
├── frontend/          # React/Vite-based user interface
├── backend/
│   ├── api/           # Firebase Cloud Functions / backend API
│   ├── ml-service/    # AI/ML models and prediction scripts
│   ├── scripts/       # Data aggregation and processing scripts
│   ├── data/          # Local JSON and SQLite datasets
│   └── python/        # Assorted python utility scripts
├── firebase/          # Firebase configuration and security rules
└── docs/              # Documentation and architecture diagrams
```

## Tech Stack
- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Firebase Cloud Functions, Node.js, Python
- **Database**: Firebase Firestore, SQLite
- **Machine Learning**: Custom Python-based ML services

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- Firebase CLI (`npm install -g firebase-tools`)

### How to Run Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

### How to Run Backend
1. **Firebase API (Functions)**:
   Navigate to the API folder, install dependencies, and start the emulator:
   ```bash
   cd backend/api
   npm install
   npm run serve
   ```
2. **Data & Python Scripts**:
   The `backend/scripts/` and `backend/python/` directories contain scripts for syncing and updating data.
   For example, you can run Node.js data scripts:
   ```bash
   node backend/scripts/update-dates.js
   ```

### Deployment
To deploy the full application to Firebase:
```bash
cd firebase
firebase deploy
```
