"""
Preliminary pages content for Project Kinetica Academic Report.
BCSE497J Project I Deliverable, VIT Chennai.
"""

COVER_PAGE_MD = """# BCSE497J — PROJECT I REPORT

<div align="center">

# PROJECT KINETICA
## A Closed-Loop Cyber-Physical System for Perception-Driven Traffic Signal Control, Stochastic Queue Actuation, and Priority-Aware Green Wave Preemption

<br/>

*A Project Report submitted in partial fulfillment of the requirements for the award of the degree of*

### **BACHELOR OF TECHNOLOGY**
in  
### **COMPUTER SCIENCE AND ENGINEERING WITH SPECIALIZATION IN DATA SCIENCE**

<br/>

**Submitted by:**  
**VAIBHAV P.K** (Register No: **23BDS1148**)  
**MITHIL GIRISH** (Register No: **23BDS1168**)

<br/>

**Under the Guidance of:**  
**Dr. R. KRITHIGA** (`krithiga.r@vit.ac.in`)  
*Associate Professor, Department of Data Science*  
*School of Computer Science and Engineering*

<br/>
<br/>

<img src="https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/Vellore_Institute_of_Technology_seal_2017.svg/1200px-Vellore_Institute_of_Technology_seal_2017.svg.png" width="140" alt="VIT Logo"/>

<br/>
<br/>

**SCHOOL OF COMPUTER SCIENCE AND ENGINEERING**  
**VELLORE INSTITUTE OF TECHNOLOGY (VIT), CHENNAI**  
**Vandalur-Kelambakkam Road, Chennai – 600 127, Tamil Nadu, India**

**OCTOBER 2026**

</div>
"""

TITLE_PAGE_MD = """# PROJECT KINETICA: A CLOSED-LOOP CYBER-PHYSICAL SYSTEM FOR PERCEPTION-DRIVEN TRAFFIC SIGNAL CONTROL, STOCHASTIC QUEUE ACTUATION, AND PRIORITY-AWARE GREEN WAVE PREEMPTION

<div align="center">

*A Project Report submitted in partial fulfillment of the requirements for the award of the degree of*

### **BACHELOR OF TECHNOLOGY**
in  
### **COMPUTER SCIENCE AND ENGINEERING WITH SPECIALIZATION IN DATA SCIENCE**

<br/>

**Submitted by:**  
**VAIBHAV P.K** (Register No: **23BDS1148**)  
**MITHIL GIRISH** (Register No: **23BDS1168**)

<br/>

**Under the Guidance of:**  
**Dr. R. KRITHIGA**  
*School of Computer Science and Engineering, VIT Chennai*

<br/>

**SCHOOL OF COMPUTER SCIENCE AND ENGINEERING**  
**VELLORE INSTITUTE OF TECHNOLOGY (VIT), CHENNAI**  
**OCTOBER 2026**

</div>
"""

DECLARATION_MD = """# DECLARATION OF AUTHORSHIP

We hereby declare that the Project I report entitled **"PROJECT KINETICA: A Closed-Loop Cyber-Physical System for Perception-Driven Traffic Signal Control, Stochastic Queue Actuation, and Priority-Aware Green Wave Preemption"** submitted to the School of Computer Science and Engineering, Vellore Institute of Technology, Chennai, in partial fulfillment of the requirements for the award of the degree of **Bachelor of Technology in Computer Science and Engineering with Specialization in Data Science**, is a bonafide record of original work carried out by us under the supervision and guidance of **Dr. R. KRITHIGA**, Associate Professor, School of Computer Science and Engineering.

We further declare that the empirical findings, mathematical derivations, software architectures, algorithms, simulation pipelines, and experimental results embodied in this report have not been submitted to any other university, institute, or examining body for the award of any degree, diploma, associateship, fellowship, or other similar title.

Where other authors' published contributions, open-source libraries, academic papers, and benchmark datasets have been utilized, they have been comprehensively and explicitly cited in the body of the report and listed in the References section in full compliance with academic integrity standards and IEEE/APA formatting conventions.

<br/>
<br/>

**Place:** VIT Chennai, Vandalur-Kelambakkam Road, Chennai – 600 127  
**Date:** October 13, 2026

<br/>
<br/>

**VAIBHAV P.K** (Register No: **23BDS1148**)  
School of Computer Science and Engineering, VIT Chennai  

<br/>

**MITHIL GIRISH** (Register No: **23BDS1168**)  
School of Computer Science and Engineering, VIT Chennai  
"""

CERTIFICATE_MD = """# BONAFIDE CERTIFICATE

This is to certify that the Project I report entitled **"PROJECT KINETICA: A Closed-Loop Cyber-Physical System for Perception-Driven Traffic Signal Control, Stochastic Queue Actuation, and Priority-Aware Green Wave Preemption"** is a bonafide record of work carried out by:

<div align="center">

**VAIBHAV P.K** (Register No: **23BDS1148**)  
**MITHIL GIRISH** (Register No: **23BDS1168**)  

</div>

in partial fulfillment of the requirements for the award of the degree of **Bachelor of Technology in Computer Science and Engineering with Specialization in Data Science** of the School of Computer Science and Engineering, Vellore Institute of Technology, Chennai, during the academic year 2026–2027.

The work reported herein represents the original independent contributions of the students conducted under my direct guidance. To the best of my knowledge, this report has not formed the basis for the award of any degree or diploma elsewhere.

<br/>
<br/>
<br/>

________________________________________  
**Dr. R. KRITHIGA**  
*Project Guide & Supervisor*  
Associate Professor, Department of Data Science  
School of Computer Science and Engineering  
Vellore Institute of Technology, Chennai – 600 127  

<br/>
<br/>

________________________________________  
**INTERNAL EXAMINER**  
School of Computer Science and Engineering  
Vellore Institute of Technology, Chennai  

<br/>

________________________________________  
**EXTERNAL EXAMINER**  
School of Computer Science and Engineering  
Vellore Institute of Technology, Chennai  

<br/>
<br/>

________________________________________  
**HEAD OF DEPARTMENT**  
Department of Data Science / Computing Technologies  
School of Computer Science and Engineering  
Vellore Institute of Technology, Chennai – 600 127  

*(School Seal)*
"""

ABSTRACT_MD = r"""# EXECUTIVE ABSTRACT

Urban traffic congestion represents one of the most critical socio-economic, environmental, and public safety challenges faced by modern metropolitan areas worldwide. In fast-growing developing megacities, such as Chennai, Bengaluru, and Mumbai, traffic congestion accounts for economic productivity losses exceeding $22 billion annually and causes severe air pollution, fuel wastage, and hazardous delays for emergency response vehicles. Conventional urban traffic signal systems rely predominantly on rigid, fixed-timer cycle controllers operating on pre-programmed timing splits (e.g., standard Webster cycle splits designed under stationary conditions). These legacy systems are fundamentally open-loop: they cannot sense real-time queue accumulation, cannot dynamically modulate signal phases in response to asymmetric vehicular demand surges, and lack automated, coordinated preemption capabilities to clear arterial corridors for approaching ambulances, fire engines, or police cruisers. When priority vehicles encounter signalized intersections, they are frequently trapped behind civilian queue spillbacks, resulting in life-threatening delays that compromise the critical "Golden Hour" of emergency trauma care.

To resolve these systemic failure modes, this project presents **Project Kinetica**—a production-grade, closed-loop cyber-physical system (CPS) that replaces static fixed-timer controllers with an edge-native, perception-driven, statistically-modeled, and priority-aware signal actuation platform. Kinetica establishes a deterministic, high-throughput feedback control loop that spans spatial edge perception, stochastic traffic flow modeling, greedy heap-based priority preemption, corridor-wide graph routing, and automated post-clearing predictive analytics. 

The Kinetica architecture is structured around four tightly coupled, mathematically rigorous architectural pillars governed by strict, immutable data contracts (`LaneObservation`, `PhaseDecision`, and `PriorityEvent`):

1. **Pillar 1: Edge Vision & Spatial Queue Perception.** Deploying real-time YOLOv8 convolutional neural network object detection integrated with inverse perspective mapping (IPM) planar homography matrices ($H \in \mathbb{R}^{3 \times 3}$). The pipeline transforms distorted camera-space bounding boxes into metric bird's-eye ground coordinates ($X, Y$), measuring true physical queue lengths (in meters) and vehicular density ($\text{veh}/\text{m}$) across individual approach lanes. A zero-false-positive multi-attribute classifier detects emergency vehicle liveries and optical lightbars without disrupting baseline signal cycles on false detections.

2. **Pillar 2: Demand-Responsive Stochastic Actuation.** Utilizing an Exponentially Weighted Moving Average (EWMA) to track non-stationary Poisson arrival rates ($\hat{\lambda}_t$) in real time. Dynamic green durations are computed using a modified Webster-kinematic formulation that guarantees bounded cycle times ($g_{\min} \le g_i \le g_{\max}$) while incorporating saturation flow rates ($S = 1900\,\text{veh}/\text{hr}/\text{lane}$). An automated Chi-Square ($\chi^2$) goodness-of-fit test continuously audits the validity of the Poisson assumption. A dynamic density gap-out algorithm terminates green phases early when inter-vehicle headways exceed 3.0 seconds, eliminating wasted green time.

3. **Pillar 3: Priority Preemption & Corridor Routing.** Implemented via a thread-safe, tombstone-purged binary max-heap with dynamic urgency aging, preventing priority inversion and cross-street starvation. Emergency overrides immediately preempt signal ordering ($O(\log N)$ latency $< 1\,\mu\text{s}$), promoting priority vehicles ahead of FIFO queues. Across multi-intersection arterials, a directed-graph lookahead router projects emergency arrival trajectories and propagates green-wave pre-clearance across downstream nodes, flushing queues before the emergency vehicle arrives.

4. **Pillar 4: Predictive Analytics, Bottleneck Forecasting & Statistical Rigor.** Harmonizing multi-modal edge telemetry using asynchronous temporal joins (`merge_asof`). A non-parametric regression tree model forecasts secondary queue bottlenecks post-preemption, identifying physical queue length ($70.97\%$ importance) and vehicle count ($29.03\%$) as primary predictors. Crucially, Kinetica replaces anecdotal percentage claims with formal hypothesis testing: a paired Mann-Whitney U test proves Kinetica reduces civilian wait times from $42.6\,\text{s}$ to $18.3\,\text{s}$ (a **$57.0\%$ delay reduction**, $p < 0.001$, Cohen's $d = 17.15$), decisively rejecting the null hypothesis of equivalence.

All four formal Success Criteria (SC1 through SC4) were subjected to rigorous verification across 113 automated unit, integration, and scenario tests in pytest. The complete hardware-in-the-loop and synthetic simulation environment proves that Project Kinetica delivers a robust, fail-safe, and scalable cyber-physical traffic management platform suitable for real-world deployment on NVIDIA Jetson edge accelerators and standard NEMA TS2 traffic signal cabinets.

<br/>

**Keywords:** Cyber-Physical Systems (CPS), Intelligent Transportation Systems (ITS), Edge Computer Vision, Planar Homography, Inverse Perspective Mapping, Stochastic Actuation, Poisson Arrival Process, Webster Delay Formula, Priority Max-Heap, Emergency Vehicle Preemption, Green Wave Corridor Routing, Welch's t-Test, Mann-Whitney U Test, Bottleneck Regression.
"""

ACKNOWLEDGEMENTS_MD = """# ACKNOWLEDGMENTS

The successful realization of Project Kinetica has been a profoundly rewarding and intellectually enriching endeavor. We take this opportunity to express our deepest gratitude to all individuals and institutions who have supported, guided, and encouraged us throughout this journey.

First and foremost, we extend our heartfelt gratitude and utmost reverence to our esteemed Project Guide, **Dr. R. KRITHIGA**, Associate Professor, Department of Data Science, School of Computer Science and Engineering, Vellore Institute of Technology, Chennai. Her unwavering technical guidance, profound domain insights in data engineering and intelligent systems, meticulous reviews, and constant encouragement have been the driving force behind the methodological rigor and architectural integrity of this project. Her insistence on formal statistical validation and empirical verification shaped our decision to implement hypothesis-tested success criteria.

We express our profound gratitude to **Dr. G. VISWANATHAN**, Honorable Founder and Chancellor of Vellore Institute of Technology, for establishing a world-class institution with state-of-the-art computational infrastructure, research laboratories, and an environment fostering innovation, excellence, and societal impact. We also express our sincere appreciation to the Vice Presidents, the Vice Chancellor, the Pro-Vice Chancellor, and the Executive Director of VIT Chennai for their visionary leadership.

We extend our sincere thanks to **Dr. VISWANATHAN V**, Dean, School of Computer Science and Engineering, **Dr. NITHYANANDAM P**, Associate Dean, and **Dr. SUGANYA G**, Associate Dean, for their administrative support, strategic oversight, and continuous encouragement of high-impact engineering projects.

Our sincere thanks are also extended to the **Head of Department**, Department of Data Science / Computing Technologies, and the **Project Coordination Committee (BCSE497J)** for organizing well-structured review milestones, maintaining clear academic standards, and providing insightful feedback during the interim reviews.

We are immensely indebted to our families and parents for their unconditional love, moral support, patience, and sacrifices throughout our academic pursuits. Their encouragement has been our steadfast pillar of strength.

Finally, we thank our peers, classmates, and friends at VIT Chennai for their stimulating discussions, collaborative spirit, and valuable constructive critiques during the development, testing, and documentation of this work.

<br/>
<br/>

**VAIBHAV P.K** (23BDS1148)  
**MITHIL GIRISH** (23BDS1168)  
*School of Computer Science and Engineering*  
*Vellore Institute of Technology, Chennai*
"""

TABLE_OF_CONTENTS_MD = """# TABLE OF CONTENTS

| Chapter / Section | Title | Page No. |
|---|---|---|
| | **PRELIMINARY PAGES** | |
| | Title Page | i |
| | Declaration of Authorship | ii |
| | Bonafide Certificate | iii |
| | Executive Abstract | iv |
| | Acknowledgments | vi |
| | Table of Contents | vii |
| | List of Figures | x |
| | List of Tables | xii |
| | List of Abbreviations & Symbols | xiv |
| **CHAPTER 1** | **INTRODUCTION** | **1** |
| 1.1 | Context and Urban Mobility Crisis | 1 |
| 1.2 | Limitations of Legacy Traffic Signal Control Paradigms | 3 |
| 1.2.1 | Fixed-Timer Signal Controllers and Static Cycle Splits | 3 |
| 1.2.2 | Inductive Loop and Actuated Controller Vulnerabilities | 5 |
| 1.2.3 | Centralized Adaptive Systems (SCATS/SCOOT) Failures in Mixed Traffic | 6 |
| 1.3 | The Emergency Preemption Failure in Modern Cities | 7 |
| 1.3.1 | The "Golden Hour" Delay Crisis in Indian Urban Arterials | 7 |
| 1.3.2 | Sensor and Acoustic Line-of-Sight Failures | 8 |
| 1.3.3 | Priority Inversion and Downstream Spillback Traps | 9 |
| 1.4 | Project Kinetica Overview: A Closed-Loop Cyber-Physical System | 10 |
| 1.5 | The Four Architectural Pillars | 12 |
| 1.5.1 | Pillar 1: Edge Vision & Spatial Queue Perception | 12 |
| 1.5.2 | Pillar 2: Demand-Responsive Actuation via Stochastic Modeling | 13 |
| 1.5.3 | Pillar 3: Priority Preemption & Corridor Routing | 14 |
| 1.5.4 | Pillar 4: Predictive Analytics, Bottleneck Forecasting & Statistical Rigor | 15 |
| 1.6 | Project Objectives & Testable Success Criteria (SC1–SC4) | 16 |
| 1.7 | Delimitations and Project Scoping Boundaries | 18 |
| 1.8 | Organization of the Report | 19 |
| **CHAPTER 2** | **LITERATURE REVIEW & THEORETICAL FOUNDATION** | **20** |
| 2.1 | Evolution of Urban Traffic Signal Control Paradigms | 20 |
| 2.2 | Computer Vision and Edge Sensing in Intelligent Transportation Systems | 23 |
| 2.2.1 | Deep Learning Detectors: From Two-Stage R-CNN to YOLOv8 | 23 |
| 2.2.2 | Perspective Distortion and Inverse Perspective Mapping (IPM) | 25 |
| 2.2.3 | Vision-Based Emergency Vehicle Classification and Livery Detection | 27 |
| 2.3 | Stochastic Modeling of Traffic Arrivals & Queue Dynamics | 29 |
| 2.3.1 | Point Processes and Poisson Traffic Arrival Characteristics | 29 |
| 2.3.2 | Webster's Delay Model and Saturation Flow Theory | 31 |
| 2.3.3 | M/M/1 and M/G/1 Queueing Delay Formulations | 33 |
| 2.4 | Emergency Vehicle Preemption & Corridor Routing Mechanisms | 35 |
| 2.4.1 | Local Preemption vs. Coordinated Arterial Green Waves | 35 |
| 2.4.2 | Priority Queue Scheduling Algorithms and Starvation Mitigation | 37 |
| 2.4.3 | Directed Graph Traversal and Lookahead Travel-Time Projection | 39 |
| 2.5 | Machine Learning & Statistical Validation in Traffic Systems | 41 |
| 2.5.1 | Non-Parametric Bottleneck Regression Trees | 41 |
| 2.5.2 | Formal Hypothesis Testing Standards in Transportation Engineering | 43 |
| 2.6 | Comprehensive Literature Review Matrix | 45 |
| 2.7 | Identification of Key Research Gaps Addressed by Kinetica | 48 |
| **CHAPTER 3** | **SYSTEM METHODOLOGY & ARCHITECTURE** | **50** |
| 3.1 | Closed-Loop Cyber-Physical Architecture & Operational State Machine | 50 |
| 3.2 | Foundational Data Contracts & Schema Immutability | 53 |
| 3.2.1 | `LaneObservation` Schema Specification | 54 |
| 3.2.2 | `PhaseDecision` Schema Specification | 55 |
| 3.2.3 | `PriorityEvent` Schema Specification | 56 |
| 3.2.4 | System-Wide State Invariants and Safety Constraints | 57 |
| 3.3 | Module 1: Edge Vision & Spatial Perspective Projection Pipeline | 58 |
| 3.3.1 | Real-Time Neural Object Detection (`vision/detect.py`) | 58 |
| 3.3.2 | Planar Homography Derivation & Inverse Perspective Mapping (`vision/project.py`) | 60 |
| 3.3.3 | Metric Spatial Queue Measurement & Lane Density Computation | 62 |
| 3.3.4 | Zero-False-Positive Emergency Livery Classifier (`vision/classify.py`) | 64 |
| 3.4 | Module 2: Demand-Responsive Stochastic Actuation Engine | 66 |
| 3.4.1 | Rolling EWMA Arrival Rate Tracking (`actuation/arrival_model.py`) | 66 |
| 3.4.2 | Automated Chi-Square ($\chi^2$) Poisson Goodness-of-Fit Validation | 68 |
| 3.4.3 | Modified Webster-Kinematic Green Duration Formulation (`actuation/engine.py`) | 70 |
| 3.4.4 | Dynamic Density Gap-Out Truncation Algorithm (`actuation/gap_extension.py`) | 72 |
| 3.4.5 | Phase Skipping and Fair Cycle Scheduling | 74 |
| 3.5 | Module 3: Priority Preemption & Corridor Routing Engine | 75 |
| 3.5.1 | Urgency Scoring Formulation & Anti-Starvation Invariant (`preemption/override.py`) | 75 |
| 3.5.2 | Tombstone-Purged Binary Max-Heap Implementation (`preemption/heap.py`) | 77 |
| 3.5.3 | Directed Graph Corridor Routing & Lookahead Propagation (`preemption/graph_router.py`) | 79 |
| 3.6 | Module 4: Predictive Analytics & Hypothesis Testing Framework | 81 |
| 3.6.1 | Asynchronous Telemetry Harmonization via `merge_asof` (`analytics/flow_calibration.py`) | 81 |
| 3.6.2 | Post-Preemption Bottleneck Regression Tree Modeling (`analytics/bottleneck.py`) | 83 |
| 3.6.3 | Formal Statistical Hypothesis Testing Protocol (`analytics/hypothesis_test.py`) | 85 |
| 3.7 | Observability Layer & Hardware Interface Architecture | 87 |
| 3.7.1 | FastAPI Edge Gateway & Bidirectional WebSocket Streaming | 87 |
| 3.7.2 | Next.js Control Room Real-Time Dashboard Architecture | 89 |
| **CHAPTER 4** | **IMPLEMENTATION, EXPERIMENTAL EVALUATION & RESULTS** | **91** |
| 4.1 | Experimental Environment, Simulation Setup & Synthetic Data Generator | 91 |
| 4.2 | Module 1: Edge Vision & Emergency Classification Results | 94 |
| 4.2.1 | Hardware Inference Latency and Throughput Benchmarks | 94 |
| 4.2.2 | Emergency Livery Classifier Confusion Matrix & Precision-Recall | 96 |
| 4.3 | Module 2: Demand-Responsive Actuation & Poisson Goodness-of-Fit | 98 |
| 4.3.1 | Verification of Success Criteria 1 (SC1): Queue-Proportional Green Allocation | 98 |
| 4.3.2 | Empirical Poisson Goodness-of-Fit Analysis Across Traffic Regimes | 100 |
| 4.4 | Module 3: Priority Preemption Benchmarks & Green Wave Latency | 102 |
| 4.4.1 | Max-Heap Micro-Benchmark and Latency Scaling ($N=4$ to $32$) | 102 |
| 4.4.2 | Verification of Success Criteria 2 (SC2): Immediate Priority Phase Override | 104 |
| 4.4.3 | Verification of Success Criteria 3 (SC3): Multi-Intersection Corridor Preemption | 106 |
| 4.5 | Module 4: Statistical Hypothesis Testing Results (SC4 Validation) | 108 |
| 4.5.1 | Paired Wait-Time Distribution & Normality Diagnostics | 108 |
| 4.5.2 | Formal Mann-Whitney U & Welch's Two-Sample t-Test Significance ($p < 0.001$) | 110 |
| 4.5.3 | Effect Size Computation (Cohen's $d = 17.15$) and Distribution Shifts | 112 |
| 4.6 | Post-Preemption Bottleneck Forecasting & Feature Importances | 114 |
| 4.7 | Saturation Flow Rate ($S$) Empirical Calibration | 116 |
| 4.8 | Comprehensive Master Pipeline Integration Benchmark | 118 |
| **CHAPTER 5** | **CONCLUSION & FUTURE WORK** | **121** |
| 5.1 | Summary of Research Contributions | 121 |
| 5.2 | Success Criteria Final Verification Audit (SC1–SC4) | 123 |
| 5.3 | Quantitative Societal, Environmental & Economic Impact | 125 |
| 5.3.1 | Emergency Medical Services & Healthcare Outcomes | 125 |
| 5.3.2 | Fuel Conservation & Urban Emissions Mitigation | 126 |
| 5.3.3 | Municipal Economic Productivity & Infrastructure Return on Investment | 127 |
| 5.4 | Threats to Validity, Cyber-Physical Limitations & Scoping Boundaries | 128 |
| 5.5 | Strategic Directions for Future Research | 130 |
| | **REFERENCES** | **132** |
| | Formatted Academic Bibliography in IEEE / APA Style | 132 |
| | **APPENDICES** | **138** |
| Appendix A | Core Schema Implementation Code (`schemas/lane_state.py`) | 138 |
| Appendix B | Algorithmic Implementations (Heap, Router, Arrival Engine) | 143 |
| Appendix C | Automated Pytest Verification Suite Execution Audit (113 Passing Tests) | 148 |
| Appendix D | Synthetic Scenario Generator & Configuration Matrix | 152 |
| Appendix E | Edge Hardware Benchmark & NVIDIA Jetson Deployment Specification | 156 |
| Appendix F | Review Presentation Transcripts & Individual Contribution Breakdown | 160 |
"""

LIST_OF_FIGURES_MD = """# LIST OF FIGURES

| Figure No. | Caption | Page No. |
|---|---|---|
| Figure 1.1 | Project Kinetica Closed-Loop Cyber-Physical System Architecture | 11 |
| Figure 1.2 | Anatomy of Urban Intersection Deadlock and Golden Hour Ambulance Traps | 8 |
| Figure 2.1 | Evolution of Urban Traffic Signal Control: From Fixed Splits to Autonomous CPS | 22 |
| Figure 2.2 | Perspective Geometric Distortion: Camera View Space vs. Metric Road Space | 26 |
| Figure 2.3 | Poisson Inter-Arrival Exponential Distribution vs. Congested Renewal Processes | 30 |
| Figure 2.4 | Webster Two-Term Delay Curve as a Function of Volume-to-Capacity Ratio ($x$) | 32 |
| Figure 3.1 | Detailed Sensor-to-Actuator Cyber-Physical Pipeline and Schema Exchange | 52 |
| Figure 3.2 | Inverse Perspective Mapping via Planar Homography Matrix ($H \in \mathbb{R}^{3 \times 3}$) | 61 |
| Figure 3.3 | Priority Max-Heap Binary Tree Architecture with Dynamic Urgency Aging | 78 |
| Figure 3.4 | Time-Space Diagram of Multi-Intersection Lookahead Green Wave Progression | 80 |
| Figure 3.5 | Decision Tree Architecture for Post-Preemption Bottleneck Prediction | 84 |
| Figure 3.6 | Distributed Edge Gateway and Next.js Control Room Observability Stack | 88 |
| Figure 4.1 | Empirical Poisson Inter-Arrival Distribution Fit and Goodness-of-Fit Test ($\chi^2 = 6.40$) | 101 |
| Figure 4.2 | Metric Queue Length Timeline: Kinetica Dynamic Actuation vs. Fixed-Timer Baseline | 105 |
| Figure 4.3 | Civilian Vehicular Wait-Time Distribution Comparison (57.0% Delay Reduction) | 111 |
| Figure 4.4 | Decision Tree Bottleneck Predictor Feature Importances (Queue: 70.97%, Count: 29.03%) | 115 |
| Figure 4.5 | Edge Hardware Inference Latency Distributions: CPU APU vs. Projected Jetson Orin | 95 |
"""

LIST_OF_TABLES_MD = """# LIST OF TABLES

| Table No. | Title | Page No. |
|---|---|---|
| Table 1.1 | Comparison of Traffic Signal Control Paradigms in Modern Cities | 6 |
| Table 1.2 | Formal Success Criteria Specification and Test Suite Verification Mapping | 17 |
| Table 2.1 | Comparative Literature Review Matrix: State-of-the-Art ITS vs. Project Kinetica | 46 |
| Table 3.1 | Module Ownership, Data Production, and Consumption Contract Table | 53 |
| Table 3.2 | Emergency Vehicle Priority Class Weights, Urgency Offsets, and Preemption Thresholds | 76 |
| Table 3.3 | Arterial Corridor Topology, Link Distances, and Free-Flow Travel Time Matrix | 80 |
| Table 4.1 | Edge Hardware Inference Benchmarks: AMD Ryzen APU vs. NVIDIA Jetson Orin Targets | 94 |
| Table 4.2 | Emergency Livery Classifier Confusion Matrix, Precision, Recall, and F1-Score | 96 |
| Table 4.3 | Success Criteria 1 (SC1) Verification: Queue Length vs. Allocated Green Duration | 99 |
| Table 4.4 | Poisson Goodness-of-Fit ($\chi^2$) Results Across Varying Traffic Volume Regimes | 100 |
| Table 4.5 | Binary Max-Heap Latency Scaling Across Variable Approach Lane Configurations | 103 |
| Table 4.6 | Success Criteria 2 (SC2) Verification: Preemption Phase Transition Latency Audit | 104 |
| Table 4.7 | Success Criteria 3 (SC3) Verification: Corridor Green Wave Progression Metrics | 107 |
| Table 4.8 | Paired Wait-Time Descriptive Statistics: Fixed-Timer Baseline vs. Project Kinetica | 109 |
| Table 4.9 | Success Criteria 4 (SC4) Verification: Formal Hypothesis Test Results ($p < 0.001$) | 110 |
| Table 4.10 | Bottleneck Decision Tree Regression Hyperparameters and Feature Importances | 114 |
| Table 4.11 | Empirical Saturation Flow Rate ($S$) Departure Measurements and Calibration | 116 |
| Table 4.12 | Comprehensive Master Benchmark: Fixed-Timer, Actuated, SCATS vs. Kinetica | 119 |
| Table 5.1 | Project Kinetica Final Success Criteria Verification and Audit Matrix | 123 |
| Table 5.2 | Environmental and Economic Impact Summary per Signalized Intersection / Year | 126 |
| Table F.1 | Project Work Breakdown and Individual Team Contributions Matrix | 162 |
"""

LIST_OF_ABBREVIATIONS_MD = r"""# LIST OF ABBREVIATIONS & SYMBOLS

### Acronyms & Abbreviations

| Acronym | Expansion |
|---|---|
| **API** | Application Programming Interface |
| **APU** | Accelerated Processing Unit |
| **AUC-ROC**| Area Under the Receiver Operating Characteristic Curve |
| **CART** | Classification and Regression Trees |
| **CNN** | Convolutional Neural Network |
| **CPS** | Cyber-Physical System |
| **CPU** | Central Processing Unit |
| **CSV** | Comma-Separated Values |
| **DAG** | Directed Acyclic Graph |
| **DRL** | Deep Reinforcement Learning |
| **DSRC** | Dedicated Short-Range Communications |
| **EWMA** | Exponentially Weighted Moving Average |
| **FIFO** | First-In, First-Out |
| **FPS** | Frames Per Second |
| **GPU** | Graphics Processing Unit |
| **HSV** | Hue, Saturation, Value |
| **IEEE** | Institute of Electrical and Electronics Engineers |
| **IPM** | Inverse Perspective Mapping |
| **ITS** | Intelligent Transportation Systems |
| **JSON** | JavaScript Object Notation |
| **MADRL** | Multi-Agent Deep Reinforcement Learning |
| **NEMA** | National Electrical Manufacturers Association (TS2 Standard) |
| **ONNX** | Open Neural Network Exchange |
| **P95 / P99**| 95th / 99th Percentile Latency Metric |
| **REST** | Representational State Transfer |
| **RMSE** | Root Mean Square Error |
| **ROI** | Region of Interest / Return on Investment |
| **SC1–SC4**| Success Criteria 1 through 4 |
| **SCATS** | Sydney Coordinated Adaptive Traffic System |
| **SCOOT** | Split Cycle Offset Optimisation Technique |
| **TOC** | Table of Contents |
| **UTC** | Coordinated Universal Time |
| **V2I / V2X**| Vehicle-to-Infrastructure / Vehicle-to-Everything |
| **VIT** | Vellore Institute of Technology |
| **WLAN** | Wireless Local Area Network |
| **YOLO** | You Only Look Once (Object Detection Architecture) |

### Mathematical Symbols & Notation

| Symbol | Description | Standard Units |
|---|---|---|
| $\lambda$ | Vehicular Arrival Rate (Poisson Parameter) | vehicles / second ($\text{veh}/\text{s}$) |
| $\hat{\lambda}_t$ | Estimated Arrival Rate via EWMA Filter at Time $t$ | vehicles / second ($\text{veh}/\text{s}$) |
| $\alpha$ | EWMA Smoothing Constant ($\alpha \in [0, 1]$) / Hypothesis Test Significance Level | dimensionless |
| $\mu$ | Mean Vehicular Service / Departure Rate | vehicles / second ($\text{veh}/\text{s}$) |
| $\rho$ | Spatial Traffic Density along Approach Lane | vehicles / meter ($\text{veh}/\text{m}$) |
| $S$ | Saturation Flow Rate per Lane ($1900\,\text{veh}/\text{hr}/\text{lane}$) | vehicles / hour / lane |
| $C$ | Traffic Signal Cycle Time | seconds ($\text{s}$) |
| $g_i$ | Dynamic Green Phase Duration for Approach $i$ | seconds ($\text{s}$) |
| $g_{\min}, g_{\max}$ | Bounded Minimum and Maximum Green Phase Constraints | seconds ($\text{s}$) |
| $Q_i$ | Measured Spatial Queue Length on Approach Lane $i$ | meters ($\text{m}$) or vehicles |
| $h$ | Mean Vehicular Saturation Headway ($h \approx 1.9\,\text{s}$) | seconds / vehicle |
| $H$ | Planar Homography Transformation Matrix ($3 \times 3$) | dimensionless |
| $(u, v)$ | Pixel Coordinates in Distorted Camera Perspective Space | pixels ($\text{px}$) |
| $(X, Y)$ | Metric World Coordinates on Road Ground Plane | meters ($\text{m}$) |
| $U(e)$ | Urgency Score for Priority Event $e$ | dimensionless score |
| $P_{class}$ | Base Priority Class Weight (Ambulance: 100, Police: 80, School: 60) | dimensionless |
| $w_p, w_w, w_d$ | Weighting Coefficients for Priority, Wait Time, and Approach Distance | dimensionless |
| $\chi^2$ | Chi-Square Goodness-of-Fit Test Statistic | dimensionless |
| $t$ | Welch's Two-Sample t-Test Statistic | dimensionless |
| $U$ | Mann-Whitney U Non-Parametric Test Statistic | dimensionless |
| $p$ | Probability Value for Statistical Hypothesis Testing | dimensionless |
| $d$ | Cohen's Effect Size Metric | dimensionless |
| $G = (V, E, W)$| Directed Arterial Corridor Graph: Vertices, Edges, and Travel Times | — |
| $\tau_j$ | Projected Arrival Timestamp of Priority Vehicle at Intersection $j$ | seconds ($\text{s}$) |
"""
