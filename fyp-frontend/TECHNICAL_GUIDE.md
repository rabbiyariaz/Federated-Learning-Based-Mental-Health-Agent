# Frontend Technical Guide

## Architecture Overview
React + Vite SPA with React Router for mental health monitoring. Uses Tailwind CSS, Chart.js for visualizations, and localStorage for data persistence. Integrates with FastAPI backend for ML inference and chat.

## Core Structure

### Application Entry (`src/`)
- **main.jsx**: React 18 entry point, renders `App` component
- **App.jsx**: Router setup with `MainLayout`, route definitions, `ProtectedRoute` for consent
- **index.css**: Global Tailwind styles

### Layout (`src/layout/`)
- **MainLayout.jsx**: Shared layout with navbar (Home, Screening, Chat, History, Admin), footer, `<Outlet />` for nested routes

### Pages (`src/pages/`)
- **HomePage.jsx**: Landing page with study introduction
- **ScreeningPage.jsx**: Initial screening/consent flow
- **PHQPage.jsx**: PHQ-8 questionnaire (8 questions, 0-3 scale, total 0-24), saves to localStorage
- **EMAPage.jsx**: Daily Ecological Momentary Assessment (6 questions, 1-5 scale), tracks 14-day study
- **ChatPage.jsx**: Chat interface with message history, calls `/chat` API, saves to history
- **DashboardPage.jsx**: Chart.js visualizations (mood, anhedonia, energy, PHQ-8 comparison), reads localStorage
- **HistoryPage.jsx**: Displays saved chat/assessment history
- **ReportPage.jsx**: Study report summary (PHQ change, EMA completion)
- **AdminDashboardPage.jsx**: Federated learning metrics visualization (mock data)

### Components (`src/components/`)
- **ChatInput.jsx**: Text input with send button, disabled state
- **ChatMessage.jsx**: Message bubble (user/agent styling)
- **MoodQuestions.jsx**: EMA mood question component (1-5 scale)
- **MetricsChart.jsx**: Reusable Chart.js wrapper for FL metrics
- **ClientNode.jsx**: Client status visualization for admin dashboard
- **RoundTimeline.jsx**: FL training round timeline component
- **ScreeningResults.jsx**: Screening outcome display

### Utilities (`src/utils/`)
- **api.js**: Backend API client functions
  - `analyzeText()`: Mock text analysis (emotions, risk level)
  - `sendChatMessage()`: POST to `/chat` with message/history
  - `getFederatedMetrics()`: Mock FL metrics (clients, rounds, model status)
- **scoring.js**: PHQ-8 and EMA calculation utilities
  - `calculatePHQScore()`: Sums responses (0-24)
  - `calculateEMAAverage()`: Mean across days for a question
  - `calculateEMAVariability()`: Standard deviation for symptom stability
  - `getPHQSeverityLabel()`: Severity interpretation (informational only)
- **storage.js**: localStorage helpers for study data persistence

### API Integration (`src/api/`)
- **backend.js**: Direct backend calls
  - `checkHealth()`: GET `/health`
  - `predictText()`: POST `/predict` for ML inference

## Data Flow
1. User interaction → Component state update
2. Form submission → API call (`api.js` or `backend.js`)
3. Backend response → State update → UI re-render
4. Data persistence → `localStorage` via `storage.js` utilities

## State Management
- **Local State**: React `useState` hooks in components
- **Persistence**: `localStorage` key `studyData` (PHQ-8, EMA entries, chat history)
- **Routing**: React Router v6 with nested routes

## Key Features
- **PHQ-8 Assessment**: Baseline (Day 0) and follow-up (Day 14) tracking
- **EMA Monitoring**: 14-day daily check-ins with 6 symptom questions
- **Chat Agent**: RAG-based responses using knowledge base retrieval
- **Dashboard Visualizations**: Line charts (EMA trends), bar charts (PHQ comparison)
- **History Tracking**: All assessments and chats saved locally

## Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Theme**: Dark slate background (`slate-900`), teal accents (`teal-400`)
- **Responsive**: Mobile-first design with breakpoints

## Key Classes/Components Summary
- **ChatPage**: Manages chat state, message history, API integration, auto-scroll
- **PHQPage**: Form validation, score calculation, localStorage persistence
- **DashboardPage**: Data aggregation, Chart.js configuration, trend visualization
- **scoring.js utilities**: Centralized calculation functions for PHQ-8 and EMA metrics

