# Project Kinetica — Execution Plan

**Course:** BCSE497J — Project I, Fall Semester 2026-2027
**Team:** 23BDS1148, 23BDS1168 (Mithil Girish)
**Source documents:** `Project_Kinetica_Proposal.pdf`, `BCSE497J_Project_I_Guidelines_01.pdf`

This plan is written to be executed by an agentic AI coding workflow (Claude Code / equivalent), one phase at a time. Each phase ends in a **verifiable artifact** — a script, a dataset, a metric, a document section — so an agent (or a reviewer) can check "done" without ambiguity. Phases map directly onto the four modules from the proposal (Vision → Actuation → Preemption → Predictive Validation) and are sequenced to land *before* each SCOPE review deadline with margin, not on the deadline itself.

---

## 0. Review Calendar (hard external deadlines — do not move)

| Review | Focus | Marks | Date | Plan phase that must be DONE by then |
|---|---|---|---|---|
| Review 1 (Guide) | Title, abstract, problem, objectives, scope, preliminary plan | 5 | 9–11 Jul 2026 | Phase 0 + this plan.md itself |
| Review 2 (Panel) | Domain/problem, literature review, methodology, design | 20 | 19 Aug 2026 | Phase 1 + Phase 2 (Vision backend) + **Frontend (Next.js UI & Mock Data Componentization)** |
| Review 3 (Panel) | Implementation progress (~50% scope), interim results | 20 | 16 Sep 2026 | Phase 3 (Actuation backend) + **Frontend (Live WebSocket/Telemetry Integration)** |
| Review 4 (Guide) | Complete implementation, final results, report verification | 25 | 12–16 Oct 2026 | Phase 4 (Preemption) + Phase 5 (Analytics) + **Frontend (Emergency Override & Analytics Dashboard)** |
| Draft/Report Review (Guide) | Cumulative draft, technical consistency, citations | 5 | 12–16 Oct 2026 | Phase 6 (report chapters 1–4 complete) |
| Review 5 (Panel) | Final technical evaluation, demo, report, viva | 25 | 21 Oct 2026 | Phase 6 (all chapters) + Phase 7 (demo-ready end-to-end full stack) |

> Note: Review 1's date (9–11 Jul 2026) has already passed relative to when this plan is being written (30 Jul 2026). Flag this to the guide in the first meeting — either Review 1 was conducted informally already, or the cohort's actual schedule has shifted from this template. Do not silently assume; confirm and correct the table above before treating any downstream date as fixed.

---

## Phase 0 — Foundations & Repo Scaffolding
*Target: complete now, before any module work starts.*

### 0.1 Repository Initialization
This task involves creating the foundational directory structure and standard configuration files for the Kinetica monorepo. It is necessary to ensure that all subsequent modules have clearly defined namespaces and separation of concerns from the start. Tools like basic shell commands (`mkdir`, `touch`) and Git will be used to scaffold the required subdirectories (`vision/`, `actuation/`, `preemption/`, `analytics/`, `schemas/`, `frontend/`). The specific deliverable is a fully structured and committed Git repository with the correct root-level and module-level directories ready for population.

### 0.2 README Setup
This step focuses on writing a comprehensive `README.md` that contains the project's abstract, objective, and high-level architecture. It is essential for onboarding new developers, guiding agentic sessions, and providing external reviewers a clear summary of Kinetica's purpose. The technique involves writing standard Markdown to synthesize the core objectives from the proposal document into a concise introduction. The final deliverable is a polished `README.md` file located at the root of the repository.

### 0.3 Environment Setup
Here, we will define the configuration templates and environment variables needed to run the project. This is critical for preventing secrets or local paths from being hardcoded into the source files, ensuring cross-environment portability. We will use standard dotenv practices to specify paths, model locations, and camera stream URLs. The deliverable is a `.env.example` file that lists all required keys without exposing actual sensitive values, along with instructions on how to instantiate it.

### 0.4 Dependency Manifest
This task entails compiling a master list of all external Python libraries and their versions required across all four modules of Kinetica. It guarantees a reproducible and isolated execution environment, preventing "works on my machine" issues. Tools involved include pip and potentially virtual environment managers like venv or conda. The output deliverable is a standardized `requirements.txt` file (or `pyproject.toml`) that can be used to install every necessary package in one command.

### 0.5 Language/Runtime Selection for Vision
In this step, we explicitly define and document the technology stack for the Vision module, primarily selecting Python, OpenCV, and the YOLO framework. This formalizes the toolchain so that all subsequent development in the vision pipeline relies on compatible runtimes and APIs. We will review project constraints to ensure this stack offers the required performance for real-time object detection. The deliverable is an architecture notes section or a small ADR (Architecture Decision Record) confirming the vision stack.

### 0.6 Language/Runtime Selection for Actuation
This task establishes the programming language and core mathematical libraries (such as NumPy or SciPy) to be used for the Actuation module. It is necessary because the module requires efficient numerical computation to evaluate Poisson arrival models and queue estimates dynamically. The evaluation involves checking library support for the required statistical goodness-of-fit tests and exponential moving averages. The outcome is a documented decision confirming the stack for the actuation engine.

### 0.7 Language/Runtime Selection for Preemption
This step locks in the technology choices for the Preemption module, which centers on directed graph routing and max-heap priority queues. Formalizing this ensures we use robust data structure libraries (like NetworkX for Python) instead of reinventing the wheel. The technique includes researching the most efficient routing algorithm implementations available in the chosen language ecosystem. The deliverable is a finalized tech stack decision for preemption recorded in the project documentation.

### 0.8 Language/Runtime Selection for Analytics
Here we finalize the tools and libraries for the Predictive Validation and Analytics module, specifically focusing on machine learning and statistical testing frameworks. It is vital for ensuring we have reliable, peer-reviewed implementations of regression trees (e.g., scikit-learn) and hypothesis tests (e.g., SciPy stats). We will evaluate the integration of these libraries with our data ingestion pipeline. The specific deliverable is a documented confirmation of the analytics runtime environment and its dependencies.

### 0.9 AGENTS.md Configuration
This task focuses on writing `AGENTS.md`, which acts as the strict operating manual for all autonomous AI coding sessions working on this repository. It is absolutely essential to prevent agents from hallucinating rules, deviating from module boundaries, or silently breaking cross-cutting schemas. The authoring process involves synthesizing project constraints, module ownership, and success criteria into a clear markdown instruction set. The deliverable is the finalized `AGENTS.md` file placed in the root directory.

### 0.10 Interface Contracts Definition
This step involves mapping out the exact data exchange formats and boundaries between the four independent modules of Kinetica. It is critical because independent, parallel development of Vision, Actuation, and Preemption relies on these shared contracts to function coherently during integration. We will use system design principles to outline the JSON-like structures that each module produces and consumes. The deliverable is a comprehensive interface specification document or section that dictates cross-module data flow.

### 0.11 LaneObservation Schema
Here we will programmatically define the `LaneObservation` data schema, which acts as the primary output of the Vision module and the input to downstream systems. This is necessary to enforce strict typing and prevent data mismatch errors when passing queue length and density metrics. We will likely use Python's `dataclasses` or `pydantic` to create a robust, immutable data model. The deliverable is the defined `LaneObservation` class within the `schemas/lane_state.py` file.

### 0.12 PriorityEvent Schema
This task involves writing the exact schema for a `PriorityEvent`, detailing how emergency or high-priority vehicles are represented. It is required so the Preemption module knows exactly what fields (e.g., vehicle type, lane, urgency) it will receive when an ambulance is detected. Tools like `pydantic` will be employed to validate the fields and ensure strict type checking. The output deliverable is the `PriorityEvent` definition inside `schemas/lane_state.py`.

### 0.13 PhaseDecision Schema
This step focuses on defining the `PhaseDecision` schema, which dictates the output format of both the Actuation and Preemption modules when they mandate a traffic light change. It is essential for standardizing the intersection's control signals, whether they stem from normal dynamic green logic or an emergency override. The task utilizes Python typing features to ensure all decision reasons and timings are explicitly captured. The deliverable is the `PhaseDecision` class located in `schemas/lane_state.py`.

### 0.14 Success Criteria Checklist Definition
In this task, we will extract the four core testable assertions (SC1–SC4) and formally document them into a checklist. This provides a hard metric for project completion, ensuring that the system's claims (like beating a fixed-timer baseline) are measured and proven rather than just asserted. The technique is simply precise markdown writing, ensuring each criteria maps to a specific integration test. The deliverable is the `success_criteria.md` file containing the checkboxes and testing instructions.

### 0.15 Verification of Phase 0 Artifacts
This final step of Phase 0 acts as a comprehensive audit to ensure all scaffolding, schemas, and rule documents are correctly in place. It prevents downstream modules from failing due to missing foundations or malformed data contracts. The process involves manually or programmatically checking the existence and validity of files like `AGENTS.md`, `schemas/lane_state.py`, and `success_criteria.md`. The deliverable is a signed-off verification, allowing the project to proceed to parallel module development.

---

## Phase 1 — Domain Research & Literature Review
*Target: complete before Review 2.*

### 1.1 Source Triage Preparation
This task kicks off the literature review by gathering, organizing, and categorizing the academic papers relevant to intelligent traffic systems and computer vision. It is necessary to establish a structured foundation of prior art, which will directly inform the methodology and gap analysis for Kinetica. We will use reference management techniques and folder organization to triage PDFs and DOIs. The deliverable is an organized directory of references and an initial reading list.

### 1.2 ScienceDirect Article Review
Here, we will deeply analyze a specific ScienceDirect article (S240589632032629X) to extract its approaches to traffic state estimation and priority routing. This is critical for understanding the current industry standards and limitations in adaptive traffic control. The technique involves critical reading and note-taking to isolate the paper's methodology, results, and shortcomings. The deliverable is a concise summary and data extraction notes for this specific article, ready to be fed into the gap matrix.

### 1.3 IET ITS Article Review
This task involves reviewing a key IET Intelligent Transport Systems article (10.1049/itr2.12518) focused on advanced queue detection or actuation models. It is essential because it provides literature-backed insights into how mathematical models (like Poisson arrivals) are typically applied in traffic engineering. We will systematically extract the metrics and algorithms used by the authors. The specific deliverable is a comprehensive set of review notes highlighting the paper's relevance and limitations.

### 1.4 IEEE Xplore 11380918 Review
In this step, we analyze IEEE Xplore paper 11380918 to understand its implementation of computer vision or machine learning in traffic monitoring. This helps Kinetica avoid repeating known pitfalls in YOLO-based or OpenCV-based vehicle detection pipelines. The process requires evaluating the paper's model accuracy, latency, and dataset choices. The deliverable is a detailed extraction of the paper's methodology and a critique of its performance for our gap analysis.

### 1.5 IEEE Xplore 11490570 Review
This task centers on reviewing IEEE Xplore paper 11490570, specifically looking for its approach to emergency vehicle preemption or corridor routing. It is necessary to identify how previous systems handle max-heap or graph-based priority, so Kinetica can improve upon those architectures. We will read the paper focusing closely on its algorithmic complexity and real-world applicability. The specific output is a synthesized summary that isolates the paper's routing logic and its corresponding gaps.

### 1.6 IJSREM Paper Review
Here we will examine an open-access paper from IJSREM to evaluate alternative, potentially more modern or cost-effective approaches to smart traffic management. This broadens the literature review beyond high-tier journals to include recent implementations that might be closer to our MVP scope. The technique involves extracting the practical constraints and architectural simplifications the authors made. The deliverable is a set of review notes outlining the paper's practical contributions and flaws.

### 1.7 References BibTeX Generation
This task involves compiling all reviewed papers and sources into a standardized BibTeX format for formal citation. It is an absolute requirement for academic integrity and is necessary to automatically generate the bibliography for the final project report. We will use reference management tools or manual formatting to ensure correct IEEE citation styles. The final deliverable is a complete and validated `report/references.bib` file containing all project citations.

### 1.8 Gap Analysis Table Setup
This step focuses on initializing a structured matrix that compares Kinetica's proposed features against the capabilities of existing literature. It is crucial for visually demonstrating the project's novelty and justifying the engineering effort to the review panel. The technique uses markdown table formatting to create axes of comparison (e.g., dynamic vs static, multi-node vs single-node). The deliverable is the skeleton `report/lit_review_matrix.md` file ready for population.

### 1.9 Sensing Method Extraction
In this task, we will populate the gap analysis matrix with the specific sensing methods (e.g., inductive loops vs. camera-based YOLO) used in the reviewed papers. This is necessary to contrast our edge-vision approach with traditional hardware-heavy traffic sensing infrastructure. We will synthesize our reading notes to accurately fill out the relevant matrix column. The deliverable is a completed 'Sensing Method' column in the `lit_review_matrix.md` file.

### 1.10 Priority Mechanism Extraction
Here, we will map out how different papers handle vehicle prioritization, extracting details on whether they use simple heuristics or complex graph routing. This highlights Kinetica's unique max-heap and directed-graph approach compared to baseline FIFO or manual override methods. The process involves transferring specific algorithmic details from our paper notes into the gap analysis. The deliverable is the populated 'Priority Mechanism' section of the literature review matrix.

### 1.11 Statistical Validation Methods Extraction
This task documents the validation techniques (e.g., simulation, hypothesis testing, informal observation) utilized by prior works to prove their system's efficacy. It is critical to show that Kinetica's use of formal hypothesis testing (t-tests/Mann-Whitney) represents a more rigorous evaluation standard than many existing papers. We will analyze the 'Results' sections of the literature to complete this mapping. The output is a filled-out 'Validation Method' column in the gap analysis matrix.

### 1.12 Single vs Multi-intersection Gap Verification
This step explicitly drafts the argument outlining how prior systems often fail to scale beyond a single isolated intersection, setting up Kinetica's corridor-level routing. It is necessary to articulate the specific problem statement that the Preemption module's graph router solves. The technique involves writing a persuasive, literature-backed narrative for the project report. The deliverable is a drafted section of prose detailing the multi-intersection gap in the literature review chapter.

### 1.13 Normality/Hypothesis Gap Verification
Here we will draft the argument highlighting that many traffic control papers assert performance improvements without rigorous statistical significance testing. This directly justifies Kinetica's Phase 5 Analytics module and its strict adherence to distribution checking and hypothesis testing. We will synthesize findings from the gap matrix into a formal academic argument. The specific deliverable is the drafted text arguing the necessity of formal statistical validation for the report.

### 1.14 Dataset Feasibility Check
This task involves investigating the availability, licensing, and quality of real-world traffic camera footage for training and testing the vision pipeline. It is essential to determine early on whether the project can rely on empirical data or if it must build a synthetic data generator to proceed. The process includes searching public datasets (like MS COCO or specific traffic datasets) and evaluating their relevance. The deliverable is a set of notes summarizing the dataset options and their feasibility.

### 1.15 Decision on Dataset vs Synthetic Generator
Based on the feasibility check, this step formally decides whether to use real traffic footage or a synthetic event generator for the project's data source. This is a massive architectural decision that dictates how Phase 2 and Phase 5 will be executed and tested. We will weigh the pros and cons of data availability versus the control offered by synthetic generation. The final deliverable is a documented decision recorded in the `data/DATASET_SOURCE.md` file, setting the path forward.

---

## Phase 2 — Module 1: Vision System
*Target: working prototype before Review 3.*

### 2.1 Data Ingestion Setup
This task involves writing the boilerplate code to load video frames, RTSP streams, or synthetic data arrays into the system. It is necessary as it forms the foundational pipeline that feeds raw visual information into the object detection models. The technique utilizes OpenCV's `VideoCapture` or custom array loading functions to establish a stable frame rate and resolution. The deliverable is a working script within the `vision/` directory capable of reliably outputting a stream of frames.

### 2.2 OpenCV Pipeline Initialization
Here we configure the core OpenCV image processing pipeline, including frame resizing, color space conversions, and region-of-interest (ROI) masking. This step is critical to optimize the input frames, ensuring the YOLO model only processes the actual road area, thereby reducing computational latency. We will use `cv2.resize`, `cv2.cvtColor`, and polygon masking techniques. The deliverable is an optimized image preprocessing function that preps frames for neural network inference.

### 2.3 Synthetic Event Generator Fallback
If real dataset access is unavailable, this task involves writing a Python tool to procedurally generate synthetic traffic scenarios, such as bounding boxes over time. It is absolutely necessary to unblock backend development (Actuation/Preemption) by providing them with realistic `LaneObservation` data without needing actual cameras. The technique involves modeling vehicle kinematics and generating JSON streams that simulate YOLO outputs. The deliverable is a functional `data/synthetic_generator.py` script.

### 2.4 Queue Buildup Scenario Scripting
This step focuses on scripting a specific synthetic scenario where vehicle density steadily increases in a lane, simulating a red-light queue buildup. It is required to test whether the Actuation module correctly senses the growing queue and triggers a dynamic green extension. We will program the synthetic generator to produce a specific timeline of coordinates corresponding to stopping vehicles. The output is a predefined scenario configuration file named `queue_buildup`.

### 2.5 Ambulance Corridor Scenario Scripting
Here we will script a scenario where a high-priority emergency vehicle (like an ambulance) travels rapidly across multiple intersections. This is crucial for verifying that the Preemption module's graph routing and override logic function correctly under strict time constraints. The technique involves defining a trajectory that spans several graph nodes in the synthetic generator. The deliverable is an `ambulance_corridor` scenario configuration ready for Phase 4 testing.

### 2.6 YOLOv8 Model Selection
This task involves evaluating and selecting the appropriate YOLOv8 model variant (e.g., nano, small, or medium) based on the project's accuracy vs. latency requirements. It is necessary to strike the right balance between real-time processing speed on edge hardware and detection reliability. The process includes reviewing Ultralytics benchmarks and running preliminary tests on sample frames. The deliverable is a documented decision specifying the exact YOLOv8 version to be used.

### 2.7 YOLOv8 Weights Import
In this step, we will programmatically download, instantiate, and cache the pre-trained weights for the chosen YOLOv8 model. It is essential for enabling the system to perform zero-shot detection of standard vehicle classes like cars, buses, and trucks immediately. We will use the Ultralytics Python API to load the model and prepare it for inference. The specific deliverable is an integrated and loadable YOLOv8 object in the vision pipeline script.

### 2.8 Object Detection Implementation
This task wires the preprocessed OpenCV frames directly into the YOLOv8 inference engine to output raw bounding boxes and class probabilities. It is the core mechanism of the Vision module, transforming raw pixels into actionable vehicle location data. We will utilize the model's `predict` function and parse the resulting tensor outputs. The deliverable is a working Python function that returns a list of detected objects per frame.

### 2.9 Fine-tuning YOLOv8 on a custom dataset for emergency vehicles
Here we will curate a specific dataset of emergency vehicles (ambulances, police cars) and fine-tune our YOLOv8 model to recognize these priority classes accurately. This is a hard requirement because standard YOLO weights often struggle to differentiate an ambulance from a standard truck, which would break the Preemption module. The technique involves annotating images and running PyTorch-based training loops. The deliverable is a `.pt` weights file custom-trained for priority vehicle detection.

### 2.10 Homography Perspective Projection
This step involves implementing a perspective transform to map standard 2D camera coordinates (pixels) into a top-down, bird's-eye view. It is necessary to eliminate the distortion caused by camera angles, allowing for accurate physical distance and density calculations along the lane. We will use `cv2.findHomography` and `cv2.warpPerspective` with manually defined source and destination points. The deliverable is a projection function that accurately maps vehicle bounding boxes to a planar grid.

### 2.11 Lane Distance Mapping
Following the homography projection, this task calculates the actual physical distance (in meters) of each vehicle from the intersection stop line. It is critical for determining whether a vehicle is actively waiting in the queue or simply approaching from afar. The process uses simple Euclidean geometry on the transformed bird's-eye coordinates based on a known scale factor. The specific output is a function that annotates each detected vehicle with its distance to the intersection.

### 2.12 Density Estimation Logic
Here we implement the algorithm to calculate the density of vehicles within specific segments of the lane (e.g., vehicles per 10 meters). This metric is required by both the Actuation module (for flow rate) and Preemption module (for the priority scoring function). The technique involves counting detected objects within defined distance thresholds along the lane polygon. The deliverable is a robust density calculation function providing real-time congestion metrics.

### 2.13 Queue Length Calculation
This task focuses on determining the total continuous length of stopped or slow-moving vehicles behind the intersection line. It is a primary trigger for dynamic phase termination, ensuring the green light only stays on as long as the queue exists. The logic will identify the furthest vehicle in the continuous block of stopped traffic based on velocity and spacing. The deliverable is a function that outputs the precise queue length in meters.

### 2.14 Vehicle Classification Implementation
In this step, we map the raw YOLO class IDs to Kinetica's specific ontology (e.g., categorizing a motorcycle as a 'two-wheeler' and a truck as a 'heavy vehicle'). It is necessary because different vehicle classes have different impacts on saturation flow rate and discharge times. We will build a translation dictionary that maps raw detections to our internal schema definitions. The specific deliverable is a classification parser integrated into the detection loop.

### 2.15 Phase 2 Testing and Deliverables
This final task of Phase 2 involves wrapping the entire vision pipeline so that it continuously outputs validated `LaneObservation` and `PriorityEvent` objects conforming exactly to our schemas. It proves that the Vision module can successfully feed the downstream actuation engines. The technique involves writing unit tests that assert the output types and running a test video through the pipeline. The deliverable is a fully integrated, tested vision module ready for Phase 3 integration.

---

## Phase 3 — Module 2: Actuation Engine
*Target: working before Review 3; fully integrated by Review 4.*

### 3.1 Actuation Module Initialization
This task sets up the directory and foundational boilerplate for the Actuation module, which handles standard traffic light timing. It is necessary to establish the namespace and entry points for the logic that will consume `LaneObservation` data. The process involves creating the `actuation/` directory and basic Python files like `engine.py` and `arrival_model.py`. The deliverable is a clean, structural skeleton for the module.

### 3.2 Poisson Arrival Modeling Setup
Here we implement the mathematical framework to model vehicle arrivals at the intersection as a Poisson process. This is critical for predicting short-term traffic volume and setting baseline green times dynamically based on statistical probabilities rather than fixed timers. We will use standard probability formulas and SciPy libraries to construct the model. The output is a Python class dedicated to managing Poisson arrival calculations.

### 3.3 Arrival Rate Estimator Logic
This step focuses on writing the specific logic that parses incoming `LaneObservation` data to calculate the raw, real-time vehicle arrival rate (lambda). It is necessary to continuously feed the Poisson model with actual, observed traffic data. The technique involves counting new unique vehicle detections entering the camera's far field over a set time period. The deliverable is a function that outputs the current arrival rate in vehicles per minute.

### 3.4 Exponential Moving Average Implementation
In this task, we will apply an Exponential Moving Average (EMA) to the raw arrival rates to smooth out momentary spikes and dips in traffic. This is required to prevent the traffic light timing from oscillating wildly due to noise or sudden, isolated platoons of cars. The process uses a simple recursive mathematical formula to blend historical data with new observations. The specific deliverable is an EMA smoothing function integrated into the rate estimator.

### 3.5 Goodness-of-Fit Test Setup
Here we set up the statistical apparatus to continuously verify that the observed traffic actually follows a Poisson distribution. This is essential for academic rigor, as many systems assume Poisson arrivals without proof; Kinetica will monitor this assumption and flag when it breaks down (e.g., during extreme congestion). We will utilize SciPy's statistical testing suite for this purpose. The deliverable is a structured test harness for evaluating distribution fit.

### 3.6 Chi-Square Dispersion Test
This step involves executing a specific Chi-Square dispersion test on recent arrival windows to check the variance-to-mean ratio. It is necessary as a concrete mechanism to prove or disprove the Poisson assumption in real-time. The technique involves bucketing arrival counts and calculating the Chi-Square statistic against the theoretical distribution. The output is a function that returns a boolean indicating whether the Poisson assumption holds, alongside a p-value.

### 3.7 Log Results for Poisson Assumption
This task focuses on logging the results of the goodness-of-fit tests to a persistent file for later use in Phase 5 analytics. It is crucial to have a historical record demonstrating when the traffic model was mathematically valid and when it failed. We will use Python's logging or JSON serialization libraries to write these metrics out. The deliverable is a structured log file containing timestamps and corresponding Chi-Square p-values.

### 3.8 Saturation Flow Rate Calibration
Here we will define and implement the `DEFAULT_SATURATION_FLOW_RATE` (e.g., 1900 veh/hr/lane) as a baseline metric for how fast a queue can clear. This is required to calculate the exact duration needed to discharge a detected queue during a green phase. The process involves documenting the literature-backed default while ensuring the variable is exposed for future empirical tuning. The specific deliverable is the defined constant and its associated queue clearance calculation logic.

### 3.9 Dynamic Green Extension Logic
This step implements the core algorithm that decides whether to extend an ongoing green light based on approaching traffic density and the Poisson arrival model. It is necessary to maximize throughput by not cutting off platoons that are just about to cross the intersection. The technique compares the predicted arrivals against maximum green time limits to make an extension decision. The deliverable is a function that calculates an optimal green extension time.

### 3.10 Queue Estimate Integration
In this task, we wire the real-time queue length calculated by the Vision module directly into the Actuation module's state machine. This ensures that the base green time is explicitly proportional to the number of vehicles currently waiting, rather than a fixed arbitrary number. We will parse the `LaneObservation` schema to extract the queue metric. The deliverable is an integrated data flow where queue length dictates baseline phase duration.

### 3.11 Discharge Time Computation
Here we write the specific mathematical calculation that determines exactly how many seconds are required to clear the current queue, based on the saturation flow rate and vehicle class mix. It is critical for ensuring the green light stays on just long enough to empty the lane without wasting time on an empty intersection. The logic uses standard kinematic and flow rate equations. The output is a function returning the required discharge time in seconds.

### 3.12 Dynamic Phase Termination Logic
This task focuses on the logic to prematurely terminate a green phase (gap out) if the queue has cleared and no new vehicles are approaching, even if the allocated green time hasn't expired. It is essential for minimizing delay on cross-streets when the active lane is empty. The technique involves continuously monitoring the density metric and triggering a state change when it drops below a threshold. The deliverable is the phase termination trigger function.

### 3.13 PhaseDecision Generation
In this step, we ensure that every action taken by the Actuation engine—whether extending, terminating, or scheduling a phase—is packaged strictly into a `PhaseDecision` schema object. This is necessary for standardization and logging, ensuring downstream analytics modules can parse the decisions uniformly. We will instantiate the schema class with the calculated timings and reasons. The specific deliverable is the fully compliant output formatting of the actuation module.

### 3.14 Estimator Convergence Testing
This task involves writing and running unit tests to prove that the Exponential Moving Average arrival rate estimator converges accurately on a known hidden value when fed synthetic data. It is crucial for validating the mathematical correctness of our traffic modeling before deploying it. The process uses the synthetic event generator to create a stable flow and asserts that the estimator matches it. The deliverable is a passing pytest suite for the estimator logic.

### 3.15 Green Duration Scaling Verification
Here we formally execute and verify Success Criterion 1 (SC1), proving that the allocated green time scales proportionally with the detected queue length compared to a static baseline. This is a foundational project claim that must be demonstrably true via a test. We will simulate various queue lengths and assert that the `PhaseDecision` durations adjust accordingly. The specific deliverable is a passing SC1 test run, flipping the checkbox in `success_criteria.md`.

---

## Phase 4 — Module 3: Green Wave Preemption
*Target: working before Review 3/4.*

### 4.1 Preemption Directory Setup
This task initializes the directory structure and core files for the Preemption module, which handles emergency vehicle overrides. It is necessary to separate the complex max-heap and graph routing logic from the standard actuation engine. The process involves creating the `preemption/` directory and files like `heap.py` and `graph_router.py`. The deliverable is the structural skeleton ready for preemption algorithm implementation.

### 4.2 Max-Heap Priority Queue Setup
Here we implement a max-heap data structure to manage the priority of all waiting lanes and approaching emergency vehicles. This is critical because it replaces a standard round-robin traffic light cycle with a system that strictly serves the highest-priority demand first. We will utilize Python's `heapq` library, modifying it to support dynamic priority updates. The specific deliverable is a functional max-heap priority queue class.

### 4.3 Priority Score Function Implementation
This step focuses on writing the mathematical function `f(wait_time, queue_density)` that calculates the base priority score for standard traffic lanes. It is necessary to ensure that lanes with high congestion or long wait times naturally rise to the top of the max-heap to be served next. The technique involves balancing the weights of wait time against vehicle count to prevent unfairness. The deliverable is the scoring function integrated with the heap.

### 4.4 Aging Mechanism and Invariant Test
In this task, we implement an 'aging' mechanism that continuously increases the priority score of unserved lanes over time, and write an invariant test to prove it. This is essential to guarantee that a low-traffic lane will eventually get a green light, rather than being permanently ignored in favor of high-traffic lanes. The process involves a time-based multiplier and a unit test asserting monotonic score growth. The deliverable is the aging logic and its passing test.

### 4.5 Starvation Prevention Validation
Here we specifically test the limits of the aging mechanism to ensure that no lane experiences 'starvation' (waiting indefinitely). This is a critical safety and fairness requirement for any dynamic traffic system. We will run simulations where a low-volume cross-street is pitted against a high-volume main artery, ensuring the cross-street eventually triggers a `PhaseDecision`. The specific output is a documented test proving starvation is mathematically impossible in Kinetica.

### 4.6 Heap Performance Benchmarking
This step involves benchmarking the performance of the max-heap recalculations at scale, testing with n=4, 8, and 16 lanes. It is necessary to prove that dynamic priority scoring does not introduce unacceptable computational latency that would lag the traffic lights. We will use the `timeit` module to measure the execution speed of resorting the heap under load. The deliverable is a performance benchmark report confirming sub-millisecond execution times.

### 4.7 Emergency Override Multipliers Logic
In this task, we implement massive score multipliers specifically triggered when a `PriorityEvent` (like an ambulance or police car) is detected. This is the core mechanism of preemption, forcing the emergency vehicle's lane to instantly jump to the top of the max-heap. The technique involves parsing the `PriorityEvent` schema and applying a multiplier (e.g., 1000x) to that lane's score. The deliverable is the functioning emergency override logic.

### 4.8 School Van Escalating Priority Logic
Here we implement a specialized, time-conditional priority escalation for school vans, where their priority multiplier increases significantly only during specific school-zone hours. This demonstrates a nuanced, rule-based priority system beyond simple binary overrides. The process checks system time against predefined bounds to apply the specific `is_school_zone` multiplier. The specific deliverable is the time-aware priority logic for school vehicles.

### 4.9 Priority Event Override Testing
This step focuses on formally executing and verifying Success Criterion 2 (SC2), proving that an injected `PriorityEvent` successfully forces an immediate phase change in a single intersection. This is a primary claim of the project that must be validated via a strict test harness. We will simulate an ambulance arrival and assert that the current phase is terminated and the ambulance's lane receives green. The deliverable is a passing SC2 test and an updated `success_criteria.md`.

### 4.10 Directed Graph Setup with NetworkX
In this task, we will initialize a directed graph data structure to represent a corridor of multiple consecutive intersections. This is required for the system to project an ambulance's path forward and preempt lights before the vehicle even arrives. We will use the Python `NetworkX` library to instantiate the graph nodes and edges. The output deliverable is the graph routing initialization script in `preemption/graph_router.py`.

### 4.11 Intersection Grid Graph Modeling
Here we define the specific nodes (intersections) and edges (roads with travel times) that represent the physical layout of the test corridor. It is necessary to map out the spatial relationships so the routing algorithm knows which intersection is downstream of the current one. The technique involves manually or programmatically adding weighted edges to the NetworkX graph. The deliverable is a fully modeled intersection grid ready for pathfinding.

### 4.12 Greedy Heading-Based Path Projection
This step implements a greedy, heading-based projection algorithm to predict the future path of an emergency vehicle through the graph based on its current trajectory. It is an essential, MVP-level heuristic that allows for multi-intersection preemption without relying on complex, deferred ML routing models. The logic calculates the most likely next node based on the vehicle's current velocity vector. The specific deliverable is the path projection function.

### 4.13 Pre-issue Green Timing Implementation
In this task, we calculate and schedule the exact timing required to pre-issue a green light at a downstream intersection, allowing the ambulance to arrive at a "green wave" without stopping. It is critical for minimizing emergency response times across a corridor. The process uses the distance between nodes and the vehicle's speed to calculate a time-to-arrival offset. The deliverable is a function that sends a scheduled `PhaseDecision` to downstream nodes.

### 4.14 Corridor Preemption Testing
Here we formally execute and verify Success Criterion 3 (SC3), proving that a single `PriorityEvent` successfully triggers a sequence of green lights across a multi-node graph. This validates the entire green-wave corridor concept. We will simulate the ambulance's movement and assert that the sequential intersections turn green in the correct order and timing. The specific deliverable is a passing SC3 test run and an updated `success_criteria.md`.

### 4.15 Review 4 Corridor Demo Preparation
This final step in Phase 4 involves preparing a clean, reproducible script that visually or textually demonstrates the corridor preemption scenario for the Review 4 panel. It is necessary to have a bulletproof demonstration that clearly communicates the complex routing logic to a non-technical audience. We will wrap the SC3 test into an easy-to-run demo script with clear console logging. The deliverable is a polished demo artifact ready for presentation.

---

## Phase 5 — Module 4: Predictive Validation & Analytics
*Target: results in place before Review 4.*

### 5.1 Analytics Initialization
This task sets up the directory structure and scaffolding for the Predictive Validation and Analytics module. It is necessary to create a dedicated space for post-run data analysis, ensuring it does not clutter the real-time operational code. The process involves creating the `analytics/` folder and initial analysis scripts. The deliverable is the base directory ready for scikit-learn and SciPy integration.

### 5.2 Fixed-Timer Baseline Controller Setup
Here we implement a naive, traditional fixed-timer traffic controller (e.g., 60 seconds green, 60 seconds red) to act as a control group. This is absolutely critical; without a baseline, it is impossible to statistically prove that Kinetica improves anything. The technique involves writing a simple loop that ignores all camera data and blindly cycles phases. The specific deliverable is the `baseline_controller.py` script.

### 5.3 End-to-End Scenario Replay Setup
This step focuses on wiring up a test harness that can run the exact same synthetic traffic scenario (from Phase 2) through both Kinetica and the Baseline controller. It is necessary to generate perfectly comparable, apple-to-apple log data for the subsequent statistical tests. We will build a runner script that executes the simulation twice and logs the outcomes. The deliverable is the `scenario_runner.py` script ready for data collection.

### 5.4 Kinetica vs Baseline Data Collection
In this task, we actually execute the end-to-end scenarios and collect the comprehensive logs of wait times, queue lengths, and throughput for both controllers. This generates the raw dataset required for the regression trees and hypothesis testing. The process simply involves running the harnesses and ensuring data is correctly serialized to disk. The output deliverable is a set of raw JSON log files for both the control and experimental groups.

### 5.5 Regression-Tree Model Setup for Forecasting
This step initializes a scikit-learn decision tree regressor intended to forecast future bottlenecks based on current intersection states. It demonstrates Kinetica's predictive capabilities, pushing the project beyond mere reactive control. We will import the necessary ML libraries and set up the model hyperparameters. The deliverable is a configured, untrained `DecisionTreeRegressor` object within the analytics pipeline.

### 5.6 Feature Extraction from Logs
Here we write the code to parse the raw `LaneObservation` and `PhaseDecision` JSON logs and extract the specific features (like current density and time-of-day) needed to train the regression tree. This is a critical data wrangling step to convert operational logs into an ML-ready format. The technique involves flattening JSON structures into pandas DataFrames or NumPy arrays. The specific deliverable is a feature extraction function that outputs a clean feature matrix (X).

### 5.7 Target Variable Definition
This task involves calculating the specific target variable (y) for the ML model: the downstream delay or bottleneck severity that occurred minutes after the extracted features were recorded. It is necessary to train the model to predict the *future* state based on the *current* state. The process requires time-shifting the log data to align current observations with future outcomes. The deliverable is the calculated target array ready for model training.

### 5.8 Decision Tree Training
In this step, we actually train the regression tree on the extracted features and target variables, and evaluate its predictive accuracy using a train/test split. This validates whether the intersection's state contains enough signal to accurately forecast short-term traffic jams. We will use scikit-learn's `fit` and `predict` methods, calculating the Mean Squared Error (MSE). The output is the trained ML model and its basic performance metrics.

### 5.9 Feature Importance Formatting
This task extracts the feature importance weights from the trained decision tree to understand which metrics (e.g., queue length vs. time-since-last-green) most strongly predict a bottleneck. This provides valuable insights for the final report, moving from a 'black box' model to explainable analytics. We will query the `feature_importances_` attribute of the model and sort the results. The deliverable is a structured list or table of the most critical predictive features.

### 5.10 Wait-Time Independence Verification
Here we extract the individual vehicle wait times from the Kinetica and Baseline logs and verify that the samples are independent. This is a necessary prerequisite check before selecting which statistical hypothesis test to run. The process involves ensuring that the data points used for testing do not suffer from severe autocorrelation. The deliverable is a confirmed, clean dataset of wait times ready for normality testing.

### 5.11 Shapiro-Wilk Normality Test
This step runs the Shapiro-Wilk test on the wait-time dataset to determine if the data is normally distributed. This is a critical branching point in the analytics methodology; parametric tests require normality, while non-parametric tests do not. We will use `scipy.stats.shapiro` to calculate the p-value. The specific deliverable is a logged result confirming whether the wait-time data is normal or skewed.

### 5.12 Branching Logic: t-test vs Mann-Whitney U
Based on the results of the normality test, this task implements the logic to automatically select either an independent t-test (if normal) or a Mann-Whitney U test (if skewed). This ensures the project uses mathematically sound statistical methods regardless of the data's shape. The technique involves a simple conditional statement branching to different SciPy functions. The deliverable is the dynamic test-selection logic.

### 5.13 Hypothesis Test Execution
In this task, we formally execute the chosen statistical test to compare Kinetica's wait times against the Baseline, proving Success Criterion 4 (SC4). This is the ultimate validation of the entire project, yielding a p-value that proves the dynamic system is statistically significantly better than a fixed timer. We run the SciPy test and check if p < 0.05. The specific deliverable is a passing SC4 test and the flipping of the final checkbox in `success_criteria.md`.

### 5.14 Results Persistence
This step involves saving all the analytical outputs—the model accuracy, feature importances, normality results, and the final hypothesis test p-value—into a single, structured JSON file. It is necessary to provide a stable, unchanging source of truth for the report writing phase, preventing numbers from shifting during drafting. The process uses standard file I/O and JSON serialization. The deliverable is the finalized `hypothesis_test_output.json` file.

### 5.15 Comparison Plots Generation
The final task of Phase 5 utilizes matplotlib or seaborn to generate visual charts (e.g., box plots or histograms) comparing Kinetica's performance against the baseline. These visualizations are crucial for making the statistical results easily digestible for the review panel and the final report. We will script the generation of these charts based on the test data. The deliverable is a set of saved PNG or SVG plot files in the `results/` directory.

---

## Phase 6 — Report Writing
*Target: Draft by Review 3, complete by Review 4.*

### 6.1 Report Structure Initialization
This task involves creating the skeleton markdown or LaTeX files for all five chapters of the final project report. It is necessary to establish the document structure early so that content can be slotted in as phases are completed, preventing a massive documentation bottleneck at the end. We will scaffold standard academic sections (Introduction, Lit Review, Methodology, Results, Conclusion). The deliverable is a set of blank, properly titled chapter files.

### 6.2 Artifact Gathering Verification
Before writing the methodology and results chapters, this step performs a strict audit to ensure all necessary `results/*.json` files, benchmarks, and plots actually exist. This enforces the rule that no section of the report is written speculatively without backing data. The process involves a checklist review against the outputs of Phases 2-5. The specific deliverable is a verification sign-off allowing drafting to commence.

### 6.3 Preliminary Pages Setup
Here we draft the standard preliminary pages required by the university formatting guidelines, including the title page, abstract, acknowledgments, and table of contents. It is essential for presenting a professional, submission-ready document to the review panel. The technique involves precise formatting according to the provided `BCSE497J_Project_I_Guidelines_01.pdf`. The deliverable is the finalized front-matter of the project report.

### 6.4 Chapter 1: Introduction Drafting
This task focuses on writing the Introduction chapter, clearly defining the problem statement regarding inefficient fixed-timer traffic lights and outlining Kinetica's objectives and scope. It is necessary to set the stage for the reviewer, explaining exactly what the project intends to solve and what it explicitly will not cover. We will synthesize the original proposal into formal academic prose. The output is a complete draft of Chapter 1.

### 6.5 Chapter 2: Literature Review Integration
In this step, we convert the raw notes and the `lit_review_matrix.md` from Phase 1 into a cohesive narrative chapter. This proves to the panel that the team understands the existing state of the art and clearly justifies the engineering gaps Kinetica fills. The process involves synthesizing the review notes and weaving in the generated BibTeX citations. The specific deliverable is a complete, well-cited Chapter 2.

### 6.6 Chapter 3: Methodology and Architecture Drafting
This task involves writing the detailed architectural explanation of how the Vision, Actuation, and Preemption modules interconnect. It is crucial for explaining the 'how' of the project, detailing the use of YOLOv8, Poisson modeling, and max-heap priority structures. We will reference the defined schemas and draw upon system design diagrams. The deliverable is a comprehensive Chapter 3 detailing the system's inner workings.

### 6.7 Chapter 4: Setup and Implementation Details
Here we document the specific environment configurations, hardware assumptions, and software stacks used to build Kinetica. It is necessary for reproducibility, ensuring that a reader understands the exact parameters under which the system was developed and tested. The technique includes summarizing the `.env` setup, Python dependencies, and any custom YOLO training details. The output is the first half of Chapter 4, focused on implementation.

### 6.8 Chapter 4: Testing and Validation Results
This step entails writing up the concrete performance metrics, such as the heap sorting benchmarks from Phase 4 and the vision pipeline latency from Phase 2. It is required to demonstrate that the system meets its non-functional performance requirements. We will pull directly from the generated test logs to populate tables and charts in the text. The specific deliverable is the performance validation section of Chapter 4.

### 6.9 Chapter 4: Statistical Analysis Integration
In this task, we integrate the final hypothesis test results, p-values, and comparison plots from Phase 5 into the report, formally concluding that Kinetica outperforms the baseline. This is arguably the most important section of the document, as it proves the core thesis of the project. We will carefully format the statistical outcomes into academic language. The deliverable is the completed Results section of Chapter 4.

### 6.10 Blocked Section Identification
This step involves scanning the drafted chapters and inserting explicit `<!-- BLOCKED: awaiting results/X -->` markers wherever data or a chart is still missing from the implementation phases. This adheres strictly to the rule against fabricating placeholder numbers or writing speculative prose. The process is a manual or automated review of the text against the artifacts directory. The output is a clearly marked draft indicating what remains to be finished.

### 6.11 Chapter 5: Conclusion and Findings
Here we write the final conclusions, summarizing how the project successfully met all four testable criteria (SC1-SC4) and what impact this has on the problem statement. It is necessary to tie the entire narrative together and provide a strong closing argument for the system's efficacy. The technique involves synthesizing the results from Chapter 4 into high-level takeaways. The specific deliverable is the Conclusion section of Chapter 5.

### 6.12 Chapter 5: Deferred Items and Future Work
This task explicitly documents the features that were intentionally scoped out of the MVP—such as historical route ML prediction—and positions them as future work. It is crucial for demonstrating scoping discipline to the review panel and showing a roadmap for potential future iterations. We will review the initial proposal and plan document to identify these deferred items. The deliverable is the Future Work section completing Chapter 5.

### 6.13 References Compilation
In this step, we finalize the bibliography, ensuring all in-text citations correctly map to the entries in the `references.bib` file and are formatted to IEEE standards. It is an absolute requirement for academic submission to prevent accidental plagiarism and maintain formatting compliance. We will use a LaTeX compiler or a markdown citation tool to generate the final reference list. The output deliverable is the complete, formatted Bibliography section.

### 6.14 Appendices Organization
This task involves gathering supplementary materials, such as complex schema JSON examples, large confusion matrices, or detailed test output logs, and formatting them into the report's appendices. It is necessary to provide deep technical evidence without cluttering the main narrative flow of the chapters. The process includes selecting the most relevant artifacts and inserting them with proper headings. The deliverable is the finalized Appendices section.

### 6.15 Similarity/Plagiarism Check
The final step of Phase 6 requires running the complete report draft through a standard plagiarism detection tool (like Turnitin or an open-source equivalent). This is a mandatory safety check before any formal university submission to ensure academic integrity. The technique involves uploading the document, reviewing the similarity score, and revising any improperly cited text. The specific deliverable is a clean similarity report and a submission-ready document.

---

## Phase 7 — Integration, Demo & Final Panel Prep
*Target: Review 5, 21 Oct 2026.*

### 7.1 End-to-End Test Script Setup
This task involves writing a master `run_end_to_end.py` script that acts as the single entry point to boot up the Vision, Actuation, and Preemption modules simultaneously. It is necessary for the final demonstration, proving that the disparate components function together seamlessly in real-time. The process includes writing subprocess managers or unified async loops to run the modules concurrently. The deliverable is a functional master integration script.

### 7.2 Vision to Analytics Pipeline Wiring
Here we ensure that the live outputs from the fully integrated system are correctly piping into the Analytics module's logging mechanisms in real-time. This confirms that the data collection pipeline used for the final tests is identical to the one used in the production configuration. We will trace the `LaneObservation` data flow from the YOLO output down to the JSON serializer. The specific deliverable is a verified, unbroken data pipeline.

### 7.3 Baseline Comparison Replay Verification
This step involves running the final version of the integrated system against the baseline controller one last time to ensure that the performance improvements are still reproducible. It is a critical safeguard to guarantee that late-stage bug fixes haven't accidentally broken the system's core efficacy before the final review. We will execute the comparison harness and check the outputs against Phase 5 results. The deliverable is confirmation of reproducible results.

### 7.4 SC1 Evaluation Execution
In this task, we perform a live or recorded execution specifically demonstrating Success Criterion 1—showing the green phase extending proportionally to a growing queue. It is required to physically prove this capability to the Review 5 panel, rather than just pointing to a test log. The technique involves running the `queue_buildup` synthetic scenario and narrating the state changes. The output is a demo-ready recording or script for SC1.

### 7.5 SC2 Evaluation Execution
This step focuses on demonstrating Success Criterion 2, where an ambulance appearing at a single intersection instantly overrides the current phase. This visually proves the max-heap preemption logic to the panel. We will trigger a `PriorityEvent` in the running system and highlight the immediate phase change in the console or UI. The specific deliverable is a polished demonstration sequence validating local emergency override.

### 7.6 SC3 Evaluation Execution
Here we execute the demonstration for Success Criterion 3, showcasing the multi-intersection green wave for a high-priority vehicle. It is the most visually impressive and complex capability of Kinetica, vital for the final presentation. The process involves running the `ambulance_corridor` scenario and tracing the pre-issued green lights across the graph nodes. The deliverable is a clear, step-by-step demonstration of corridor preemption.

### 7.7 SC4 Evaluation Execution
This task involves presenting the statistical proof for Success Criterion 4, walking the panel through the hypothesis test results and comparison plots. Since statistical significance can't be easily shown in a real-time visual demo, it requires clear presentation of the Phase 5 artifacts. We will organize the charts and p-values into a digestible format. The specific output is the validation portion of the final presentation deck.

### 7.8 Research Publication Pre-requisites
In this step, we format a version of the final project report specifically to meet the submission guidelines of the target journal (e.g., IJSREM). This fulfills any course requirements regarding external publication of the project findings. The technique involves altering column layouts, citation styles, and abstract lengths according to the publisher's template. The deliverable is a journal-ready manuscript draft.

### 7.9 Manuscript Draft Review
This task involves a comprehensive proofread and peer-review of the journal manuscript to ensure high academic quality before submission. It is necessary to catch any lingering typos, logical flow issues, or formatting errors that could lead to immediate rejection. The process includes a thorough read-through by the team and potentially the project guide. The specific deliverable is the finalized, approved manuscript ready for upload.

### 7.10 Proof-of-Submission Gathering
Here we formally submit the manuscript to the chosen journal and collect the official receipt or confirmation email. This is often required by the university as proof that the publication criteria of the project have been met. The process is simply navigating the journal's submission portal and saving the resulting documentation. The deliverable is the stored proof-of-submission artifact for the project portfolio.

### 7.11 Viva Voce Script Preparation
This step focuses on writing a narrative script and anticipating questions for the final Review 5 viva voce examination. It is crucial for ensuring the team can clearly articulate the architecture, defend the technical choices (like max-heap vs ML routing), and explain the statistical results under pressure. We will draft talking points mapped to each core module. The output deliverable is a comprehensive Q&A prep document.

### 7.12 Perception-to-Validation Narrative Rehearsal
In this task, the team rehearses the entire presentation, ensuring a smooth narrative flow from the initial camera perception (Vision) all the way to the statistical validation (Analytics). It is necessary to present the project as a cohesive, single system rather than four disconnected modules. The process involves timed dry-runs of the speaking parts. The deliverable is a practiced, cohesive team presentation.

### 7.13 Success Criteria Recap Review
This step involves a final review of `success_criteria.md` to ensure every single box (SC1-SC4) is checked and backed by incontrovertible proof in the logs or demo. It acts as the ultimate sanity check before walking into the final panel review. The technique is a hard audit of the claims against the physical evidence. The specific deliverable is total confidence in the project's completed state.

### 7.14 Presentation Deck Finalization
Here we polish the final PowerPoint or slide deck, ensuring it contains all the necessary architectural diagrams, comparison plots, and summary metrics. It is the primary visual aid for the Review 5 panel, requiring high readability and professional aesthetics. We will incorporate feedback from previous reviews and refine the visual hierarchy. The output deliverable is the final, frozen presentation file.

### 7.15 Final Dry Run Execution
The absolute final step involves running the entire presentation, complete with the live or recorded software demonstrations, in a simulated review environment. This is critical to catch any last-minute technical glitches (like pathing issues or crashed scripts) before the actual panel sees them. The process mimics the exact constraints and timing of the final review. The deliverable is a fully verified, flawless execution of the project demo, marking the end of the Kinetica development cycle.

---

## Agent-Workflow Execution Notes

For running this plan through an agentic coding tool phase-by-phase:
- Treat `success_criteria.md` (Phase 0.3) as the test suite the agent checks against after every phase — don't let an agent mark a phase "done" without running the relevant assertion.
- Treat the schema file (Phase 0.2) as a contract an agent should never modify silently — a schema change is a cross-cutting decision that needs to be flagged, not made unilaterally mid-implementation of one module.
- Phases 2, 3, and 4 (Vision, Actuation, Preemption) are independently buildable in parallel once Phase 0 is done, since they only share the schema, not each other's code.
- Phase 5 is a hard dependency on having *some* end-to-end run of Phases 2–4 (even the synthetic fallback), so don't start it until at least one full scenario replay exists.
- Chapter drafts in Phase 6 should be generated *from* each phase's actual output artifacts (benchmark numbers, test results, confusion matrices) rather than written speculatively ahead of the implementation.
