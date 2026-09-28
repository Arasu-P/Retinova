# NetraAI — Explainable AI for Diabetic Retinopathy Screening in Rural India

**Problem Statement:** SIH26038  
**Team:** Career Crafters  
**Designation:** AI-Assisted Clinical Tele-Ophthalmology & Operational Capacity Platform  

---

## 🌟 Executive Summary
**NetraAI** is a clinical-grade, model-agnostic web application designed to empower ASHA workers, primary healthcare practitioners, and district ophthalmologists across rural India with automated Diabetic Retinopathy (DR) grading, Platt-calibrated confidence intervals, Grad-CAM transparent visual explanations, and district-level operational capacity simulations using MATLAB Simulink / SimEvents.

---

## 🏗️ System Architecture & Service Boundaries

```
                    ┌──────────────────────────────┐
                    │  React 18 + Tailwind UI      │
                    │  - 4-Step Guided Screening   │
                    │  - Zoom/Pan Overlay Viewer   │
                    │  - Grad-CAM Attention Heatmap│
                    │  - SimEvents Simulation UI   │
                    └──────────────┬───────────────┘
                                   │ REST API / JWT
                                   ▼
                    ┌──────────────────────────────┐
                    │  Node.js / TS Backend API    │
                    │  - Auth & RBAC               │
                    │  - PostgreSQL / Relational DB│
                    │  - File Storage Service      │
                    └───────┬──────────────┬───────┘
                            │              │
             ┌──────────────┘              └──────────────┐
             ▼                                            ▼
┌─────────────────────────┐                  ┌─────────────────────────┐
│ AI Inference Boundary   │                  │ SimEvents Capacity Engine│
│ - Mock Heuristic Engine │                  │ - Discrete-Event Model  │
│ - MATLAB Service Client │                  │ - MATLAB Simulink Engine│
└────────────┬────────────┘                  └────────────┬────────────┘
             │                                            │
             ▼                                            ▼
   MATLAB AI Pipeline:                          MATLAB Simulink Model:
   1. Image Quality (IQA)                       1. Poisson Patient Arrival
   2. CLAHE Enhancement                         2. Fundus Camera Queue
   3. Retinal Segmentation                      3. IQA Feedback Re-scan
   4. MobileNetV2 Grading                       4. AI Server Concurrency
   5. Platt Calibration                         5. Doctor Review Bottleneck
   6. Grad-CAM Explainability                   6. Resource Gap Allocation
```

---

## 🚀 Key Features

1. **Guided 4-Step Screening Workflow**:
   - **Step 1:** Select existing rural patient or 1-click register new patient.
   - **Step 2:** Acquire fundus image (drag-and-drop / upload / hardware camera interface).
   - **Step 3:** Automated Image Quality Assessment (Sharpness, Illumination, FOV, Artifact area with Pass/Fail feedback).
   - **Step 4:** Real-time multi-stage AI inference stepper.

2. **Interactive Retinal Image Viewer**:
   - High-fidelity zoom, pan, fit-to-screen, and blend opacity slider.
   - Dynamic layer toggling: *Original Raw*, *Enhanced CLAHE*, *Retinal Vessel Map*, *Lesion Candidates*, and *Grad-CAM Heatmap*.

3. **Clinically Grounded Explainable AI (Grad-CAM)**:
   - Transparent saliency attribution: "Why did the AI make this prediction?".
   - Calibrated Confidence using Temperature Scaling & Platt Scaling (differentiating from uncalibrated softmax).
   - Lesion candidate counts and vascular coverage statistics.

4. **District Operational Resource Simulation (Simulink / SimEvents)**:
   - Estimate rural district throughput, waiting times, and station utilizations.
   - Automated bottleneck detection (*Camera Station*, *AI Compute*, or *Specialist Doctor Review*).
   - Recommended resource allocation outputs.

5. **Role-Based Access Control & 1-Click Demo Personas**:
   - **ASHA / Field Worker:** Patient check-in & image capture.
   - **Ophthalmologist / Doctor:** Detailed grading review, Grad-CAM inspection, referral triage action recorder.
   - **District Health Officer:** District analytics & Simulink capacity modeling.
   - **Lead System Admin:** Complete administrative controls.

---

## 🛠️ Technology Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Backend:** Node.js, Express, TypeScript, Multer, JWT, Bcrypt, Zod
- **Database:** PostgreSQL (with zero-config local relational fallback for instant execution)
- **AI/ML Integration:** Model-agnostic REST service boundary ready for MATLAB Production Server

---

## 📦 Quick Start / Running Locally

### 1. Backend Setup
```bash
cd backend
npm install
npm run build
npm start
```
*Backend runs on `http://localhost:5000` with pre-seeded demonstration data.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🔑 Demo Login Credentials
For rapid evaluation during SIH review, use the **1-Click Demo Personas** on the login screen, or sign in manually with:

| Persona | Email | Password |
| :--- | :--- | :--- |
| **Lead Admin** | `admin@netra-ai.org` | `demo1234` |
| **ASHA Worker** | `asha.worker@netra-ai.org` | `demo1234` |
| **Ophthalmologist** | `doctor@netra-ai.org` | `demo1234` |
| **District Officer** | `manager@netra-ai.org` | `demo1234` |

---

## 🐳 Docker Deployment
```bash
docker-compose up --build
```
Access the application at `http://localhost:3000`.
