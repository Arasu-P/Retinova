# Retinova — AI-Powered Clinical Diabetic Retinopathy Screening & Operational Capacity Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/Frontend-React_18_%7C_TypeScript_%7C_TailwindCSS-61DAFB?logo=react)](DR/frontend)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_%7C_Express_%7C_TypeScript-339933?logo=node.js)](DR/backend)
[![Python](https://img.shields.io/badge/Bridge-FastAPI_%7C_MATLAB_Engine-3776AB?logo=python)](DR/backend/matlab_bridge.py)
[![MATLAB](https://img.shields.io/badge/Clinical_Engine-MATLAB_%7C_Simulink_%7C_SimEvents-E16724?logo=mathworks)](DR_Screening_MATLAB)

---

## 👁️ Overview & Clinical Mission

**Retinova** is a clinical-grade, end-to-end tele-ophthalmology and operational intelligence platform designed to bring automated, explainable **Diabetic Retinopathy (DR)** screening to rural and resource-constrained healthcare ecosystems.

Diabetic Retinopathy is one of the leading causes of preventable blindness globally. In low- and middle-income regions, access to trained ophthalmologists is severely limited, leading to late-stage diagnoses. Retinova addresses this systemic bottleneck by:

1. **Empowering Frontline Healthcare Workers (e.g., ASHA Workers & PHC Staff)** with real-time fundus Image Quality Assessment (IQA) and guided acquisition.
2. **Delivering Calibrated Multi-Class DR Grading** conforming to the International Clinical Diabetic Retinopathy (ICDR) scale.
3. **Providing Clinically Actionable Visual Explainability (Grad-CAM)** so clinicians can immediately verify the anatomical basis of AI recommendations.
4. **Optimizing District-Level Healthcare Capacity** via discrete-event queuing simulations (MATLAB Simulink / SimEvents) that detect camera, compute, and specialist bottlenecks.

---

## 🏗️ System Architecture

Retinova bridges modern web microservices with clinical MATLAB algorithmic engines:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER (WEB)                              │
│  React 18 + TypeScript + Tailwind CSS                                       │
│  • 4-Step Guided Screening Workflow        • Multi-Layer Retinal Viewer     │
│  • Interactive Grad-CAM Heatmap Blend      • District Capacity Dashboard    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API / JWT
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND API GATEWAY                               │
│  Node.js + Express + TypeScript                                             │
│  • Role-Based Access Control (RBAC)        • Patient & Screening Records    │
│  • Clinical Audit Log & Report Dispatcher  • Relational Store (PostgreSQL)  │
└───────────────────────┬───────────────────────────────┬─────────────────────┘
                        │                               │
                        ▼                               ▼
       ┌─────────────────────────────────┐   ┌───────────────────────────────┐
       │   FASTAPI PYTHON MATLAB BRIDGE  │   │  SIMEVENTS CAPACITY ENGINE    │
       │   `DR/backend/matlab_bridge.py` │   │  MATLAB Simulink Discrete-    │
       │   • MATLAB Engine for Python    │   │  Event Queuing Architecture   │
       │   • Live Multi-Stage Inference  │   │  • Arrival Poisson Processes  │
       │   • High-Res Saliency Maps      │   │  • Bottleneck Diagnostics     │
       └────────────────┬────────────────┘   └───────────────┬───────────────┘
                        │                                    │
                        ▼                                    ▼
       ┌─────────────────────────────────────────────────────────────────────┐
       │                 MATLAB CLINICAL PIPELINE CORE                       │
       │   `DR_Screening_MATLAB/`                                            │
       │   Module 1: Image Quality Assessment (IQA Sharpness & Artifacts)    │
       │   Module 2: Retinal Enhancement (Adaptive CLAHE Filtering)          │
       │   Module 3: Retinal Blood Vessel & Lesion Segmentation              │
       │   Module 4: Deep Learning DR Classifier (Platt-Calibrated)          │
       │   Module 5: Grad-CAM Explainability Heatmap Generator               │
       │   Module 6: District Operational Capacity Simulation Engine         │
       └─────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Modules & Capabilities

### 1. Guided 4-Step Clinical Screening Workflow
- **Step 1: Patient Selection & Registration:** One-click lookup or rapid registration of rural community patients with biometric and demographic tracking.
- **Step 2: Fundus Image Ingestion:** Drag-and-drop or direct camera feed capture supporting standard fundus cameras (macula- and disc-centered fields).
- **Step 3: Real-Time Quality Gating (IQA):** Instant validation of image clarity, field of view, illumination uniformity, and motion blur before submitting for grading, eliminating ungradable re-examinations.
- **Step 4: Multi-Stage Inference Stepper:** Live visual pipeline tracking preprocessing, vessel segmentation, deep inference, and explainability extraction.

### 2. Multi-Layer Retinal Inspection Viewer
- High-fidelity zoom, pan, and fit-to-screen controls.
- Dynamic alpha-blending slider for continuous Grad-CAM heatmap overlay.
- Layer toggling:
  - *Original Raw Fundus*
  - *Contrast-Enhanced CLAHE*
  - *Vascular Tree Segmentation*
  - *Candidate Lesions (Microaneurysms / Exudates)*
  - *Grad-CAM Attention Heatmap*

### 3. Calibrated Grading & Explainability
- **Clinical ICDR Scale:**
  - **Grade 0:** No Apparent Retinopathy
  - **Grade 1:** Mild Non-Proliferative DR (NPDR)
  - **Grade 2:** Moderate NPDR
  - **Grade 3:** Severe NPDR
  - **Grade 4:** Proliferative Diabetic Retinopathy (PDR)
- **Platt & Temperature Calibration:** Produces honest, statistically calibrated confidence scores rather than overconfident uncalibrated softmax logits.
- **Transparent Grad-CAM Saliency:** Generates gradient-weighted class activation maps indicating the exact retinal micro-structures triggering the diagnosis.

### 4. District Operational Resource Planning (SimEvents / Simulink)
- Discrete-event simulation of district healthcare networks:
  - Patient Poisson arrival rates across Primary Health Centers (PHCs).
  - Fundus camera queue latency and re-scan loop overhead from failed IQAs.
  - Tele-ophthalmology network bandwidth and AI inference server concurrency.
  - Specialist ophthalmologist review queues.
- Automated bottleneck detection (Camera Station vs. AI Server vs. Specialist Availability) with actionable allocation recommendations.

---

## 📂 Repository Structure

```
Retinova/
├── DR/                                    # Full-Stack Web Application
│   ├── backend/                           # Node.js / Express API & Python Bridge
│   │   ├── src/                           # Backend TypeScript source code
│   │   │   ├── controllers/               # Auth, Screening, Patient, & Report handlers
│   │   │   ├── services/                  # Business logic & AI orchestration
│   │   │   ├── routes/                    # Express routing endpoints
│   │   │   └── types/                     # Shared TypeScript interfaces
│   │   ├── matlab_bridge.py               # FastAPI Python service bridging to MATLAB Engine
│   │   ├── Dockerfile                     # Containerization recipe for backend API
│   │   └── package.json                   # Backend dependencies & scripts
│   ├── frontend/                          # React 18 + Vite + Tailwind UI
│   │   ├── src/
│   │   │   ├── components/                # Reusable UI & clinical viewer components
│   │   │   ├── pages/                     # Guided screening, dashboard, & reports
│   │   │   ├── context/                   # Auth & application state providers
│   │   │   └── services/                  # API client services
│   │   ├── vite.config.ts                 # Vite bundling configuration
│   │   └── package.json                   # Frontend dependencies
│   ├── database/                          # Relational schemas & migrations
│   │   └── schema.sql                     # PostgreSQL schema definition
│   ├── docs/                              # Technical, clinical, & latency audits
│   ├── docker-compose.yml                 # Multi-service container orchestration
│   └── .env.example                       # Safe environment variable template
│
├── DR_Screening_MATLAB/                   # MATLAB Clinical AI & Simulation Core
│   ├── module1_IQA/                       # Image Quality Assessment algorithms
│   ├── module2_Enhancement/               # CLAHE & retinal contrast enhancement
│   ├── module3_Segmentation/              # Retinal vessel & lesion segmentation
│   ├── module4_Grading_Final/             # Deep learning DR grading & evaluation
│   ├── module5_Explainability/            # Grad-CAM heatmap generation scripts
│   ├── module6_Simulink/                  # SimEvents district capacity queuing model
│   ├── run_DR_Screening.m                 # Master MATLAB screening entry point
│   └── run_GradCAM.m                      # Standalone Grad-CAM execution script
│
├── .gitignore                             # Comprehensive repository security exclusions
└── README.md                              # Main platform documentation
```

---

## 🛠️ Quick Start & Local Development

### Prerequisites
- **Node.js:** v18.x or v20.x LTS
- **Python:** 3.10+ (with `fastapi`, `uvicorn`, `numpy`, `pillow`, `scipy`)
- **MATLAB:** R2022b or later (Optional for full live engine: Image Processing Toolbox, Deep Learning Toolbox, Simulink, SimEvents)
- **Git**

---

### 1. Clone & Configure Environment

```bash
git clone https://github.com/Arasu-P/Retinova.git
cd Retinova
```

Copy the environment configuration template:

```bash
cp DR/.env.example DR/backend/.env
```

Edit `DR/backend/.env` if adjusting database URLs or service ports.

---

### 2. Run Backend API

```bash
cd DR/backend
npm install
npm run build
npm start
```
*The API gateway runs on `http://localhost:5000`.*

---

### 3. Run Frontend Application

In a new terminal:

```bash
cd DR/frontend
npm install
npm run dev
```
*The web interface runs on `http://localhost:5173`.*

---

### 4. (Optional) Start MATLAB Python Bridge

To run live MATLAB inference instead of the built-in mock fallback:

```bash
cd DR/backend
python matlab_bridge.py
```
*The FastAPI bridge runs on `http://localhost:8000`.*

---

## 👥 Demo Clinical Personas

The platform includes pre-seeded demonstration accounts for end-to-end evaluation:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **ASHA / Field Worker** | `asha.worker@netra-ai.org` | `demo1234` | Patient intake, camera ingestion, screening workflow |
| **District Ophthalmologist** | `doctor@netra-ai.org` | `demo1234` | Detailed grading review, Grad-CAM inspection, referral triage |
| **District Health Officer** | `dho@netra-ai.org` | `demo1234` | District analytics, SimEvents operational bottleneck modeling |
| **System Administrator** | `admin@netra-ai.org` | `demo1234` | Full configuration, user management, and audit logs |

---

## 🔒 Security, Compliance & Data Hygiene

- **Sensitive Data Exclusion:** Environment credentials (`.env`), private keys, and patient identifiers are strictly excluded via `.gitignore`.
- **Model Checkpoints:** Large binary model weights (`*.pt`, `*.ckpt` > 100MB) are kept out of Git tracking to maintain repository integrity and comply with GitHub limits.
- **De-Identification:** Screening tests utilize anonymized reference indices conforming to clinical privacy best practices.

---

## 📄 License & Attribution

This project is released under the [MIT License](LICENSE).  
Developed for rural tele-ophthalmology research and clinical decision support.
