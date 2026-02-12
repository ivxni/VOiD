# VOiD

**Be visible to friends. Invisible to machines.**

VOiD is a privacy-first camera app that applies adversarial perturbations to your photos, making them unreadable by AI facial recognition while remaining visually identical to the human eye.

## Architecture

```
VOiD/
├── mobile/          # Expo React Native App (TypeScript)
│   ├── app/         # Expo Router Screens
│   ├── components/  # Reusable UI Components
│   ├── lib/         # ML Engine, State, Constants
│   └── assets/      # Fonts, Images
├── backend/         # Python FastAPI Backend
│   ├── app/api/     # REST Endpoints (v1)
│   ├── app/core/    # Config, Security
│   └── app/db/      # Models, Database
└── README.md
```

## Tech Stack

### Mobile
- **Expo** (React Native) + TypeScript
- **Expo Router** for file-based routing
- **Zustand** for state management
- **On-device ML** (TFLite/ONNX) for image cloaking

### Backend
- **FastAPI** (Python 3.11+)
- **PostgreSQL** + SQLAlchemy (Async)
- **Apple Sign In** authentication

## Getting Started

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

### Backend API

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Edit with your values
uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs` when DEBUG=true.

## Design System

- **Background:** True Black (#000000) / Charcoal (#0A0A0A)
- **Text:** White (#FFFFFF) / Silver (#E0E0E0)
- **Accent:** Electric Purple (#8B5CF6) — used sparingly
- **Success:** Cyber Green (#00FF94)
- **Error:** Infrared Red (#FF2A2A)
- **Typography:** Inter (UI) + JetBrains Mono (data/technical)

## License

Proprietary. All rights reserved.
