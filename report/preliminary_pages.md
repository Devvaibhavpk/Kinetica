# Project Kinetica: Preliminary Pages & Academic Front-Matter

**Course Code:** BCSE497J — Project I  
**Academic Year:** 2026–2027 (Fall Semester)  
**Programme:** Bachelor of Technology in Computer Science and Engineering with Specialization in Data Science  
**Institution:** School of Computer Science and Engineering (SCOPE), Vellore Institute of Technology (VIT), Chennai  

---

## Title Page

<div align="center">

# PROJECT KINETICA
### A Closed-Loop Cyber-Physical System for Perception-Driven Traffic Signal Control, Stochastic Queue Actuation, and Priority-Aware Green Wave Preemption

<br/>

*A Project Report submitted in partial fulfillment of the requirements for the award of the degree of*

**BACHELOR OF TECHNOLOGY**  
in  
**COMPUTER SCIENCE AND ENGINEERING WITH SPECIALIZATION IN DATA SCIENCE**

<br/>

*Submitted by:*  
**VAIBHAV P.K** (Reg. No: 23BDS1148)  
**MITHIL GIRISH** (Reg. No: 23BDS1168)

<br/>

*Under the Guidance of:*  
**FACULTY PROJECT GUIDE**  
School of Computer Science and Engineering (SCOPE)  
Vellore Institute of Technology (VIT), Chennai

<br/>

**VELLORE INSTITUTE OF TECHNOLOGY (VIT), CHENNAI**  
Vandalur-Kelambakkam Road, Chennai – 600127, Tamil Nadu, India  
**October 2026**

</div>

---

## Bonafide Certificate

This is to certify that the project report entitled **"PROJECT KINETICA: A Closed-Loop Cyber-Physical System for Perception-Driven Traffic Signal Control, Stochastic Queue Actuation, and Priority-Aware Green Wave Preemption"** submitted by **VAIBHAV P.K (23BDS1148)** and **MITHIL GIRISH (23BDS1168)** in partial fulfillment of the requirements for the award of the degree of **Bachelor of Technology in Computer Science and Engineering with Specialization in Data Science** to the School of Computer Science and Engineering (SCOPE), Vellore Institute of Technology (VIT), Chennai, is a bonafide record of the work carried out under my supervision and guidance during the academic year 2026–2027.

<br/><br/>

----------------------------------------- &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; -----------------------------------------  
**Project Guide** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Head of Department (SCOPE)**  
School of Computer Science & Engineering &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; School of Computer Science & Engineering  
VIT Chennai &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; VIT Chennai  

<br/>

The candidate was examined in the Viva-Voce Examination held on ____________________ at VIT Chennai.

<br/><br/>

----------------------------------------- &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; -----------------------------------------  
**Internal Examiner** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **External Examiner**  

---

## Declaration of Authorship

We hereby declare that the project work entitled **"PROJECT KINETICA: A Closed-Loop Cyber-Physical System for Perception-Driven Traffic Signal Control, Stochastic Queue Actuation, and Priority-Aware Green Wave Preemption"** is an authentic record of our original work carried out under the supervision of our Faculty Guide.

We further declare that the content of this project report has not been submitted either in part or in full to any other University or Institution for the award of any degree, diploma, or fellowship. All sources of academic literature, mathematical formulations, and software libraries utilized within this study have been explicitly cited and acknowledged in the bibliography.

<br/><br/>

**VAIBHAV P.K** (Reg. No: 23BDS1148)  
**MITHIL GIRISH** (Reg. No: 23BDS1168)  
School of Computer Science and Engineering (SCOPE)  
Vellore Institute of Technology (VIT), Chennai  
Date: October 03, 2026  

---

## Acknowledgments

We express our deepest sense of gratitude to our respected Chancellor, Vice-President, Vice-Chancellor, and Pro-Vice-Chancellor of Vellore Institute of Technology (VIT) Chennai, for providing an inspiring academic atmosphere and state-of-the-art computational infrastructure that enabled the realization of this research project.

We convey our sincere thanks to the Dean and Associate Deans of the School of Computer Science and Engineering (SCOPE) for their constant encouragement, academic facilitation, and administrative support throughout the development of BCSE497J Project I.

We remain profoundly indebted to our **Faculty Project Guide**, whose insightful critical feedback, rigorous methodological expectations, and continuous encouragement guided our engineering decisions across all development phases. Their insistence on statistical rigor, reproducible benchmarking, and strict architectural discipline significantly elevated the academic caliber of this project.

We also thank the members of the Project Review Committee for their constructive evaluations and recommendations during each review milestone, which helped refine our system constraints and sharpen our evaluation methodologies.

Finally, we express our heartfelt appreciation to our parents, family members, and peers for their unconditional understanding, encouragement, and moral support during the intensive phases of this engineering endeavor.

---

## Executive Abstract

Urban traffic intersections remain dominated by rigid, fixed-timer signal controllers originally formulated in the mid-twentieth century. These open-loop systems allocate static green splits regardless of actual instantaneous queue demand, inducing substantial vehicular delay, unnecessary fuel consumption, elevated carbon emissions, and hazardous impediments to emergency first responders. While modern Intelligent Transportation Systems (ITS) have explored Adaptive Traffic Signal Control (ATSC), existing commercial systems (e.g., SCATS, SCOOT) rely heavily on intrusive pavement hardware, lack spatial queue perception, blindly assume stationary arrival distributions without goodness-of-fit validation, and handle emergency preemption via isolated single-intersection overrides that fail to prevent network-wide queue shockwaves or non-priority traffic starvation.

**Project Kinetica** addresses these systemic limitations through a closed-loop Cyber-Physical System (CPS) integrating four mathematically grounded, perception-driven pillars:
1. **Edge Computer Vision & Spatial Homography:** A lightweight YOLOv8n detector optimized via ONNX Runtime executing at 55.5 frames per second (18.0 ms inference latency on commodity CPU hardware). Bounding box bottom-centers are projected onto planar roadway coordinates via camera homography matrices ($H$), transforming discrete pixel detections into continuous physical queue lengths ($m$) and spatial densities ($\text{veh/m}$).
2. **Stochastic Actuation Engine:** An Exponentially Weighted Moving Average (EWMA) arrival rate estimator ($\lambda$) combined with an automated Chi-Square ($\chi^2$) goodness-of-fit test using equiprobable quantile binning. Webster kinematic queue clearance models determine optimal green extensions ($[10.0\text{s}, 60.0\text{s}]$), augmented by dynamic density gap-out logic to truncate green phases when queues dissipate.
3. **Green-Wave Preemption & Priority Queuing:** A dynamic `LanePriorityHeap` data structure combining vehicle-class multipliers (1000.0$\times$ for ambulances/police, 50.0$\times$ for school vans in active zones) with an additive anti-starvation aging term ($+1.0 \cdot w$), guaranteeing that low-density cross-streets are never indefinitely starved. Multi-intersection corridors are modeled as directed graphs in NetworkX, greedily projecting downstream paths and issuing coordinated pre-clearance phase decisions ahead of emergency vehicle arrival.
4. **Predictive Analytics & Rigorous Hypothesis Testing:** A shallow, interpretable `DecisionTreeRegressor` (max depth 3) trained on merged simulation logs to forecast post-preemption secondary bottleneck delays and extract Gini feature importances. A formal hypothesis testing engine applies Shapiro-Wilk normality testing and dynamically branches to Welch’s $t$-test or the non-parametric Mann-Whitney U test to prove wait-time reduction against fixed-timer baselines.

Empirical evaluation on an end-to-end multi-intersection corridor scenario (480 synchronized observation cycles) demonstrates that Kinetica reduces mean vehicle wait times by **15.05 to 15.29 seconds** compared to the 90-second fixed-timer control group, achieving decisive statistical significance ($p < 0.001$, Mann-Whitney U test, rejecting $H_0$ at $\alpha = 0.05$). Priority heap operations scale with sub-millisecond latencies ($< 0.0008\text{ ms}$ across 4 to 32 lanes), confirming real-time edge feasibility. All four primary success criteria (SC1–SC4) were formally validated and verified through automated test suites (62/62 unit tests passing). Project Kinetica demonstrates that low-cost edge vision and mathematically sound cyber-physical actuation can replace legacy traffic infrastructure with resilient, demand-responsive urban corridors.

---

## Table of Contents

- **Preliminary Pages**
  - Title Page
  - Bonafide Certificate
  - Declaration of Authorship
  - Acknowledgments
  - Executive Abstract
  - Table of Contents
  - List of Figures
  - List of Tables
  - List of Abbreviations
- **Chapter 1: Introduction**
  - 1.1 Problem Context & Urban Mobility Challenges
  - 1.2 Limitations of Legacy Fixed-Timer Controllers
  - 1.3 Emergency Preemption Deficiencies in Modern Urban Networks
  - 1.4 Project Kinetica Overview & Core Philosophy
  - 1.5 The Four Architectural Pillars
  - 1.6 Research Objectives and Scope Boundaries
  - 1.7 Formal Success Criteria (SC1–SC4)
  - 1.8 Document Structure
- **Chapter 2: Literature Review & Gap Analysis**
  - 2.1 Evolution of Adaptive Traffic Signal Control (ATSC)
  - 2.2 Pillar 1: Edge Computer Vision & Spatial Perspective Mapping
  - 2.3 Pillar 2: Stochastic Traffic Modeling & Arrival Estimation
  - 2.4 Pillar 3: Emergency Vehicle Preemption & Priority Scheduling
  - 2.5 Pillar 4: Post-Preemption Bottleneck Analytics & Statistical Benchmarking
  - 2.6 Comparative Literature Review Matrix
  - 2.7 Key Research Gaps Addressed by Kinetica
- **Chapter 3: System Methodology & Architecture**
  - 3.1 Closed-Loop Cyber-Physical System Architecture
  - 3.2 Foundational Data Contracts & Schema Immutability
  - 3.3 Module 1: Edge Vision Pipeline & Spatial Projection
  - 3.4 Module 2: Demand-Responsive Actuation Engine
  - 3.5 Module 3: Priority-Aware Green Wave Preemption
  - 3.6 Module 4: Predictive Analytics & Statistical Hypothesis Testing
  - 3.7 Integrated End-to-End Orchestration Architecture
- **Chapter 4: Experimental Implementation & Empirical Results**
  - 4.1 Experimental Environment & Simulation Setup
  - 4.2 Edge Vision & Emergency Vehicle Classification Evaluation
  - 4.3 Demand-Responsive Actuation & Poisson Goodness-of-Fit Analysis
  - 4.4 Priority Heap Scaling Latency & Green Wave Corridor Preemption
  - 4.5 Statistical Hypothesis Testing & Wait-Time Reduction (SC4)
  - 4.6 Bottleneck Delay Forecasting & Gini Feature Importances
  - 4.7 Saturation Flow Rate Empirical Calibration
  - 4.8 Verification of Formal Success Criteria
- **Chapter 5: Conclusion & Future Work**
  - 5.1 Summary of Research Achievements
  - 5.2 Success Criteria Verification Matrix
  - 5.3 Technical, Environmental, and Societal Impact
  - 5.4 System Limitations & Scoping Boundaries
  - 5.5 Directions for Future Work
- **References & Appendices**
  - Comprehensive Bibliography
  - Appendix A: Data Contract Schemas (`schemas/lane_state.py`)
  - Appendix B: Automated Test Suite Execution Logs
  - Appendix C: System Configuration & Hyperparameters
  - Appendix D: Full Simulation Trace Logs

---

## List of Figures

| Figure Number | Caption / Description | Page |
|---|---|---|
| Figure 1.1 | Project Kinetica Closed-Loop Cyber-Physical System Architecture | Ch. 1 |
| Figure 2.1 | Evolution of Urban Traffic Control Paradigms | Ch. 2 |
| Figure 3.1 | Core Data Contract Flow across Perception, Actuation, and Preemption | Ch. 3 |
| Figure 3.2 | Camera Calibration and Planar Homography Projection Geometry ($H$) | Ch. 3 |
| Figure 3.3 | Inverted Max-Heap Structure with Tombstone Eviction and Urgency Scoring | Ch. 3 |
| Figure 3.4 | Directed Multi-Intersection Corridor Graph and Greedy Heading Projection | Ch. 3 |
| Figure 4.1 | Vehicle Wait Time Distributions: Kinetica vs. Fixed-Timer Baseline (`results/figures/wait_time_comparison.png`) | Ch. 4 |
| Figure 4.2 | Dynamic Queue Length Progression over Simulation Time (`results/figures/queue_length_timeline.png`) | Ch. 4 |
| Figure 4.3 | DecisionTreeRegressor Gini Feature Importances (`results/figures/bottleneck_feature_importances.png`) | Ch. 4 |
| Figure 4.4 | Empirical Inter-Arrival Distribution vs. Theoretical Poisson Curve (`results/figures/poisson_inter_arrival_fit.png`) | Ch. 4 |
| Figure 4.5 | LanePriorityHeap Latency vs. Lane Approach Count ($O(\log N)$ Scaling) | Ch. 4 |

---

## List of Tables

| Table Number | Title | Page |
|---|---|---|
| Table 1.1 | Four Formal Success Criteria (SC1–SC4) and Validation Test IDs | Ch. 1 |
| Table 2.1 | Comprehensive Literature Review Matrix across Four Core Research Pillars | Ch. 2 |
| Table 3.1 | Cross-Module Ownership and Schema Data Contract Matrix | Ch. 3 |
| Table 3.2 | Priority Vehicle Class Escalation Multipliers | Ch. 3 |
| Table 4.1 | Edge Computer Vision Detection and Latency Benchmarks | Ch. 4 |
| Table 4.2 | Emergency Vehicle Classifier Confusion Matrix | Ch. 4 |
| Table 4.3 | Chi-Square Goodness-of-Fit Test Parameters and Empirical Output | Ch. 4 |
| Table 4.4 | Priority Heap Benchmark Latencies across Variable Lane Counts ($N=4, 8, 16, 32$) | Ch. 4 |
| Table 4.5 | Comparative Hypothesis Testing Statistical Telemetry (Kinetica vs. Baseline) | Ch. 4 |
| Table 5.1 | Final Success Criteria Verification and Compliance Matrix | Ch. 5 |

---

## List of Abbreviations

| Abbreviation | Expanded Form |
|---|---|
| **ATSC** | Adaptive Traffic Signal Control |
| **BEV** | Bird's-Eye View |
| **CPS** | Cyber-Physical System |
| **CV** | Computer Vision / Connected Vehicle |
| **DSRC** | Dedicated Short-Range Communications |
| **EMA / EWMA** | Exponentially Weighted Moving Average |
| **EMS** | Emergency Medical Services |
| **EVP** | Emergency Vehicle Preemption |
| **FIFO** | First-In, First-Out |
| **FPS** | Frames Per Second |
| **HCM** | Highway Capacity Manual |
| **HSV** | Hue-Saturation-Value Color Space |
| **IoU** | Intersection over Union |
| **IPM** | Inverse Perspective Mapping |
| **ITS** | Intelligent Transportation Systems |
| **mAP** | Mean Average Precision |
| **MILP** | Mixed-Integer Linear Programming |
| **MOT** | Multi-Object Tracking |
| **MSE** | Mean Squared Error |
| **ONNX** | Open Neural Network Exchange |
| **RL** | Reinforcement Learning |
| **RSU** | Roadside Unit |
| **SC** | Success Criterion |
| **SUMO** | Simulation of Urban MObility |
| **V2I** | Vehicle-to-Infrastructure |
| **V2X** | Vehicle-to-Everything |
| **YOLO** | You Only Look Once |
