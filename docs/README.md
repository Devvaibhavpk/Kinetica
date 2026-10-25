# Project Kinetica — Documentation

Welcome to the technical documentation for **Project Kinetica**, an open-source, closed-loop cyber-physical traffic control platform.

---

## 📚 Technical Manuals & Guides

### 1. Perception & Deep Learning Pipeline
- **[Edge Traffic Perception & Training Pipeline](MODEL_TRAINING_AND_DATASET_PIPELINE.md)**  
  End-to-end technical manual covering multi-dataset merging (7,534 images across 5 datasets), YOLOv8 nano fine-tuning on GPU, MoRTH AIS-125 livery decomposition for emergency vehicles, and ONNX graph optimization.
- **[Google Colab Training Quickstart Guide](COLAB_TRAINING_GUIDE.md)**  
  Reproducible walkthrough to train the custom YOLOv8 edge detector on Google Colab with automated dataset streaming and checkpoint generation.
- **[Dataset Architecture & Training Strategy](MODEL_PLAN.md)**  
  Class taxonomy mapping and dataset harmonization across overhead vehicle datasets, auto-rickshaws, and emergency vehicles.

---

## 🏗️ Core Architecture & Operational Contracts

- **[`schemas/lane_state.py`](../schemas/lane_state.py):** Immutable Pydantic data schemas defining `LaneObservation`, `PriorityEvent`, and `PhaseDecision`.
- **[`build-spec.md`](build-spec.md):** Architectural specifications, algorithmic definitions, and verification criteria.
- **[`plan.md`](plan.md):** Comprehensive engineering milestones and roadmap.
- **[`design.md`](design.md):** Design tokens, telemetry color systems, and UI state ramp specifications for the Next.js Control Room dashboard.
- **[`success_criteria.md`](success_criteria.md):** Four formal automated Pytest assertions (SC1–SC4) verifying demand-responsive green allocation, priority preemption, corridor coordination, and statistical delay reduction.
- **[`AGENTS.md`](../AGENTS.md):** Operating rules and cross-cutting constraints for agentic workflows.
