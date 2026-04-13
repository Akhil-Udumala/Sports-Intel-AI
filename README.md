# 🏅 Sports Intel AI

[![React](https://img.shields.io/badge/Frontend-React%20%2F%20Vite-blue)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/ML%20Service-FastAPI-green)](https://fastapi.tiangolo.com/)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-orange)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Sports Intel AI is a cutting-edge, AI-powered sports performance intelligence platform for **Cricket** and **Football**. It empowers coaches and analysts with real-time tactical insights, injury predictions, and player performance metrics.

---

## 📸 Screenshots

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard" width="800">
  <br>
  <i>Main Analytics Dashboard - Multidisciplinary Sport Selection</i>
</p>

<table align="center">
  <tr>
    <td align="center">
      <img src="docs/screenshots/analysis.png" alt="Player Analysis" width="400">
      <br>
      <i>AI Player Analysis & Metrics</i>
    </td>
    <td align="center">
      <img src="docs/screenshots/comparison.png" alt="Player Comparison" width="400">
      <br>      
      <i>Head-to-Head Tactical Comparison</i>
    </td>
  </tr>
</table>

---

## 🚀 Features

- **AI Tactical Insights**: Real-time performance evaluation using custom ML models.
- **Injury Risk Prediction**: Predictive modeling to prevent player fatigue and injury.
- **Dynamic Comparisons**: Side-by-side analysis of players across different sports.
- **Admin Dashboard**: Centralized control for managing teams, players, and data synchronization.
- **Secure Architecture**: Firebase-backed authentication and data security.

---

## 🛠 Tech Stack

- **Frontend**: React, Vite, TailwindCSS, Framer Motion
- **Backend API**: Firebase Cloud Functions (Node.js)
- **ML Service**: Python, FastAPI, Scikit-Learn, Pandas
- **Database**: Firestore (NoSQL), SQLite (Local Datasets)

---

## 📦 Getting Started

### 1. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```

### 2. Run the Backend API
```bash
cd backend/api
npm install
# Use npx if firebase-tools is not installed globally
npx firebase emulators:start --only functions
```

### 3. Run the ML Service
```bash
cd backend/ml-service
source .venv/bin/activate  # Activate virtual environment
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 🏗 Project Structure

```text
sports-intel-ai/
├── frontend/          # React User Interface
├── backend/
│   ├── api/           # Firebase Cloud Functions (Node.js)
│   ├── ml-service/    # FastAPI ML Service & Models
│   ├── data/          # JSON & SQLite datasets
│   └── scripts/       # Data processing scripts
├── docs/              # Documentation & Screenshots
└── firebase/          # Firebase config & Security rules
```

---

## 📄 License

This project is licensed under the MIT License.
