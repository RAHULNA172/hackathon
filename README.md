# Intelligent Work Prioritization Assistant

A full-stack application that dynamically prioritizes and reorganizes work items in real time using an AI priority engine.

## Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MongoDB (or Docker to run everything)

## Architecture
- **Frontend**: Next.js (App Router), TailwindCSS, Lucide React
- **Backend**: Node.js, Express, Mongoose, JWT Auth
- **AI Service**: Python, FastAPI
- **Database**: MongoDB

## How to Run Locally (Without Docker)

### 1. Database
Make sure you have MongoDB running locally on `mongodb://127.0.0.1:27017`

### 2. Python AI Service
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload
```
Runs on `http://localhost:8000`

### 3. Backend (Node.js)
```bash
cd backend
npm install
npm run dev
```
Runs on `http://localhost:5000`

### 4. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:3000`

## Features Included
1. **JWT Authentication**: Full login and registration system.
2. **Dynamic Task Prioritization**: Real-time calculation of priority based on deadline, impact, and effort.
3. **Voice Input**: Use the Web Speech API to dictate task titles directly.
4. **Responsive Dashboard**: Beautiful, glassmorphic dark-mode dashboard showing tasks sorted strictly by AI Priority.
