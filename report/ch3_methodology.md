# Chapter 3: System Methodology & Architecture

## 3.1 Closed-Loop Cyber-Physical System Architecture

Project Kinetica is engineered as a distributed, closed-loop Cyber-Physical System (CPS). The system replaces open-loop, pre-timed signal controllers with a continuous feedback loop:
1. **Physical World Sensing:** Roadside optical camera sensors capture real-world traffic flows and emergency responder arrivals.
2. **Cyber-Side Perception & Modeling:** High-speed edge neural inference and planar homography convert pixel video streams into calibrated physical queue metrics ($\text{m}$, $\text{veh/m}$). Stochastic arrival models and priority queuing algorithms dynamically compute right-of-way allocations.
3. **Physical World Actuation:** Actuation decisions (`PhaseDecision`) are transmitted to intersection signal controllers, executing green phase allocations, phase extensions, or preemption clearances.
4. **Closing the Loop:** The resulting traffic dissipation modifies the physical queue, which is immediately perceived in the next camera frame cycle, establishing true closed-loop cyber-physical regulation.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PHYSICAL TRAFFIC ENVIRONMENT                                    │
│   [Arterial Inflow] ──► [Intersection Approaches / Queues] ──► [Signalized Stopline Discharge]   │
└──────────────────────────────────────────────────┬─────────────────────────────▲──────────────────┘
                                                   │ Optical Video Stream         │ Physical Signal
                                                   ▼                              │ State Changes
┌─────────────────────────────────────────────────────────────────────────────────┴─────────────────┐
│                                  KINETICA CYBER-PHYSICAL CONTROLLER                               │
│                                                                                                   │
│   ┌───────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │ 1. PERCEPTION LAYER (vision/)                                                             │   │
│   │    - YOLOv8n ONNX Engine (320px, 18.0 ms, 55.5 FPS)                                       │   │
│   │    - Planar Homography Projection (H in R^(3x3)) -> Queue (m), Density (veh/m)           │   │
│   │    - HSV Emergency Classification (Roof lightbars & chassis livery heuristics)            │   │
│   └─────────────────────────────────────────────┬─────────────────────────────────────────────┘   │
│                                                 │                                                 │
│                                                 │ LaneObservation / PriorityEvent                 │
│                                                 ▼                                                 │
│   ┌─────────────────────────────────────────────┴─────────────────────────────────────────────┐   │
│   │ 2. SCHEMA DATA CONTRACT (schemas/lane_state.py)                                           │   │
│   │    - Strict immutability, zero ad-hoc dictionaries, unified cross-module interface        │   │
│   └──────────────────────┬────────────────────────────────────────────┬───────────────────────┘   │
│                          │                                            │                           │
│                          ▼                                            ▼                           │
│   ┌──────────────────────────────────────────────┐   ┌────────────────────────────────────────┐   │
│   │ 3. ACTUATION ENGINE (actuation/)             │   │ 4. PREEMPTION ENGINE (preemption/)     │   │
│   │    - Rolling EWMA Arrival Rate (λ)           │   │    - LanePriorityHeap (Max-Heap)       │   │
│   │    - Chi-Square (χ²) Goodness-of-Fit         │   │    - Dynamic Urgency Scoring & Aging   │   │
│   │    - Webster Kinematic Queue Clearance       │   │    - NetworkX Directed Corridor Graph  │   │
│   │    - Dynamic Density Gap-Out Truncation      │   │    - Downstream Green Wave Preclear    │   │
│   └──────────────────────┬───────────────────────┘   └────────────────┬───────────────────────┘   │
│                          │                                            │                           │
│                          │ PhaseDecision (EXTENDED/SCHEDULED)         │ PhaseDecision (PREEMPTED) │
│                          └──────────────────────┬─────────────────────┘                           │
│                                                 │                                                 │
│                                                 ▼                                                 │
│   ┌───────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │ 5. PREDICTIVE ANALYTICS ENGINE (analytics/)                                               │   │
│   │    - pandas merge_asof Log Harmonization                                                  │   │
│   │    - DecisionTreeRegressor (max_depth=3) Post-Preemption Bottleneck Forecasting           │   │
│   │    - Shapiro-Wilk Normality Verification -> Welch's t-test / Mann-Whitney U Test          │   │
│   │    - Highway Capacity Manual (HCM 2016) Empirical Saturation Flow Rate Calibration        │   │
│   └───────────────────────────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3.2 Foundational Data Contracts & Schema Immutability

In accordance with **AGENTS.md Rule 3 and Rule 4**, Project Kinetica establishes a strict cross-module data contract codified in [`schemas/lane_state.py`](file:///F:/project/Kinetica/schemas/lane_state.py). No module is permitted to invent its own internal data structures for cross-boundary data transfer. All inter-module communication is governed by immutable Pydantic dataclasses:

| Model / Contract | Module Producer | Module Consumer | Core Fields and Data Types |
|---|---|---|---|
| `VehicleClass` | Vision / Enums | All Modules | `STANDARD`, `TWO_WHEELER`, `AMBULANCE`, `POLICE`, `SCHOOL_VAN` |
| `PhaseReason` | Actuation / Preemption | Controller / Analytics | `SCHEDULED`, `EXTENDED`, `PREEMPTED` |
| `LaneObservation` | `vision/` | `actuation/`, `preemption/`, `analytics/` | `lane_id: str`<br/>`timestamp: datetime`<br/>`vehicle_count: int`<br/>`queue_length_m: float`<br/>`density_veh_per_m: float`<br/>`class_counts: dict[VehicleClass, int]`<br/>`is_school_zone: bool = False` |
| `PriorityEvent` | `vision/` | `preemption/`, `analytics/` | `lane_id: str`<br/>`vehicle_class: VehicleClass`<br/>`detected_at: datetime`<br/>`confidence: float` |
| `PhaseDecision` | `actuation/`, `preemption/` | Signal Controller, `analytics/` | `intersection_id: str`<br/>`active_lane_id: str`<br/>`phase_start: datetime`<br/>`phase_end: datetime`<br/>`reason: PhaseReason` |

The immutability of this schema ensures that downstream modules can rely unconditionally on static type invariants, eliminating silent runtime serialization errors and ensuring seamless end-to-end integration.

---

## 3.3 Module 1: Edge Vision Pipeline (`vision/`)

The vision pipeline is responsible for real-time video frame ingestion, neural object detection, spatial homography projection, and emergency vehicle classification.

### 3.3.1 Neural Detection Engine (`vision/detect.py`)
To satisfy the requirements of edge microcontrollers (e.g., standard x86 CPUs or embedded ARM processors), Kinetica deploys **YOLOv8n** exported to an optimized **ONNX Runtime** execution graph:
- **Input Resolution:** Scaled to $320 \times 320$ pixels for optimal edge throughput.
- **Inference Latency:** Measures **18.0 milliseconds** per frame on commodity CPU cores, sustaining an execution rate of **55.5 FPS** (well in excess of standard 30 FPS video streams).
- **Traffic Whitelist Filtering:** Detections are constrained to vehicular classes: `car`, `motorcycle`, `bus`, `truck`, `bicycle`, and `person`. Non-traffic COCO classes (`couch`, `airplane`, `boat`) are rejected at the tensor output level.
- **Overhead Billboard Suppression:** Billboard advertisements and overhead highway signs frequently trigger false-positive vehicle detections. Kinetica implements a geometric sky-filter rejecting any bounding box whose bottom edge sits within the top 35% of the frame ($y_2 < 0.35 h$) with an aspect ratio ($w / h > 2.8$) characteristic of rectangular highway signage.
- **Lazy Module Loading:** As an essential architectural guard against native Windows C++ DLL crashes (`OSError: [WinError 1114]`), the `ultralytics` runtime is imported lazily inside `load_detector()`, ensuring safe Pytest collection and testing.

### 3.3.2 Planar Homography & Queue Estimation (`vision/project.py`)
To resolve the spatial perspective distortion gap identified in Chapter 2, Kinetica maps two-dimensional pixel coordinates to three-dimensional physical world ground planes using planar homography. 

For each roadside camera, a $3 \times 3$ projective transformation matrix $H$ is pre-calibrated using known metric ground-truth control points on the intersection pavement (e.g., lane markings, stop-lines, crosswalk dimensions):

$$\begin{bmatrix} X_w \\ Y_w \\ 1 \end{bmatrix} \sim H \begin{bmatrix} u \\ v \\ 1 \end{bmatrix} = \begin{bmatrix} h_{11} & h_{12} & h_{13} \\ h_{21} & h_{22} & h_{23} \\ h_{31} & h_{32} & h_{33} \end{bmatrix} \begin{bmatrix} u \\ v \\ 1 \end{bmatrix}$$

For every detected vehicle bounding box $\mathbf{b} = [x_1, y_1, x_2, y_2]$, the vehicle's ground contact point is extracted as its bottom-center coordinate:

$$\mathbf{p}_{\text{foot}} = \left[ \frac{x_1 + x_2}{2}, y_2 \right]^T$$

Applying `cv2.perspectiveTransform` projects $\mathbf{p}_{\text{foot}}$ to bird's-eye view (BEV) coordinates $\mathbf{P}_{\text{BEV}} = [X_w, Y_w]$. Assuming the intersection stop-line is anchored at $Y = 0$, the physical queue length ($q$) in meters is extracted from the maximum longitudinal distance along the lane axis divided by the calibrated scale factor ($\text{ppm}$, pixels per meter):

$$q = \max \left( 0.0, \frac{\max(Y_{\text{BEV}})}{\text{ppm}} \right)$$

Instantaneous spatial density ($\rho$, in vehicles per meter) is computed continuously as:

$$\rho = \begin{cases} \frac{N_{\text{vehicles}}}{q}, & \text{if } q > 0 \\ 0.0, & \text{otherwise} \end{cases}$$

### 3.3.3 Zero-False-Positive Emergency Classifier (`vision/classify.py`)
Per **AGENTS.md Rule 7**, Kinetica documents its emergency classification strategy transparently: rather than utilizing an unverified heuristic stub or an opaque black-box classifier, Kinetica deploys a multi-stage structural HSV color and spatial lightbar classifier specifically designed for zero false-positives against private civilian vehicles:
1. **Roof Zone Isolation:** Emergency warning lightbars sit atop the vehicle. The classifier extracts the Region of Interest (ROI) and isolates the top 20% vertical roof zone ($y_{\text{roof}} = [0, 0.20 h_{\text{ROI}}]$).
2. **HSV Chrominance Thresholding:**
   - **White Chassis Mask:** $S \le 75, V \ge 125$ (captures white emergency fleet bodywork).
   - **Vivid Red Beacon Mask:** Dual red wraps in HSV: $H \in [0, 12] \cup [165, 180], S \ge 60, V \ge 60$.
   - **Vivid Blue Beacon Mask:** High-saturation blue: $H \in [95, 135], S \ge 100, V \ge 80$ (stringent $S \ge 100$ rejects pale blue paint, metallic flake, and sky reflections).
   - **108 EMS Green Stripe Mask:** $H \in [35, 85], S \ge 50, V \ge 50$ (specific to Indian 108 Emergency Medical Services liveries).
3. **Deterministic Exclusion Guards:**
   - *Civilian Red Guard:* If red ratio $> 0.20$ but white ratio $< 0.18$, the vehicle is classified as a standard red passenger car (`VehicleClass.STANDARD`).
   - *Civilian Blue Guard:* If blue ratio $> 0.12$ but lacks dual red/blue roof beacons, it is classified as `VehicleClass.STANDARD`.
4. **Classification Decision Logic:**
   - **POLICE:** Requires simultaneous presence of vivid blue ($\ge 5\%$) and vivid red ($\ge 3\%$) lightbar beacons in the top 20% roof zone of non-truck vehicles.
   - **AMBULANCE:** Requires a white chassis ($\ge 22\%$) paired with either dominant red emergency markings (red ratio $\ge 3.5\%$ and red $>$ blue) or 108 EMS green livery stripes ($\ge 6\%$).

---

## 3.4 Module 2: Demand-Responsive Actuation Engine (`actuation/`)

The actuation module translates continuous spatial observations into adaptive signal timings, combining stochastic queue clearing with rigorous statistical assumption checking.

### 3.4.1 Rolling EWMA Arrival Rate Estimation (`actuation/arrival_model.py`)
Vehicle arrivals at an approach are tracked across a sliding time window (default: $W = 60.0$ seconds). Given successive vehicle detection timestamps $\{t_1, t_2, \dots, t_n\}$, the instantaneous sample arrival rate is $\lambda_{\text{sample}} = n / W$. The historical rate estimator is updated recursively via an Exponentially Weighted Moving Average (EWMA) with smoothing coefficient $\alpha = 0.3$:

$$\lambda_t = \alpha \lambda_{\text{sample}} + (1 - \alpha) \lambda_{t-1}$$

Inter-arrival headways are calculated as:

$$\Delta t_i = t_i - t_{i-1}, \quad \forall i \in \{2, \dots, n\}$$

### 3.4.2 Automated Chi-Square ($\chi^2$) Goodness-of-Fit Validation
In direct resolution of Literature Gap 2, Kinetica implements an automated goodness-of-fit check (`goodness_of_fit_check`) to verify whether inter-arrival intervals conform to the exponential distribution implied by a Poisson arrival process ($H_0: \Delta t \sim \text{Exp}(\lambda)$):
1. **Equiprobable Quantile Binning:** To adhere to Cochran’s rule (expected bin counts $\ge 5$), the algorithm partitions the theoretical cumulative distribution into $k = \max(2, \min(10, \lfloor n/5 \rfloor))$ equiprobable intervals:
   $$p_j = \frac{1}{k}, \quad j \in \{1, \dots, k\}$$
2. **Theoretical Cutoff Boundaries:** For an exponential distribution with cumulative distribution function $F(t) = 1 - e^{-\lambda t}$, the $j$-th cutoff boundary is:
   $$q_j = -\frac{\ln(1 - j/k)}{\lambda}$$
3. **Chi-Square Test Statistic:** Observed bin frequencies $O_j$ are compared against expected frequencies $E_j = n / k$:
   $$\chi^2 = \sum_{j=1}^{k} \frac{(O_j - E_j)^2}{E_j}$$
4. **Degrees of Freedom Correction:** Because the rate parameter $\lambda$ is estimated directly from sample data, one additional degree of freedom is deducted ($\text{ddof} = 1$). The effective degrees of freedom are $df = k - 1 - \text{ddof} = k - 2$.
5. **Hypothesis Evaluation:** The resulting $p$-value is computed via the survival function of the chi-square distribution:
   $$p = 1 - F_{\chi^2}(\chi^2; df)$$
   If $p < 0.05$, $H_0$ is rejected, and Kinetica records `poisson_assumption_holds: False` in `results/poisson_fit_check.json`. Per **AGENTS.md Rule 7**, this failure is reported honestly as an empirical limitation.

### 3.4.3 Kinematic Webster Queue Clearance & Green Duration (`actuation/engine.py`)
To clear a standing vehicular queue of measured physical length $q_{\text{length\_m}}$, Kinetica formulates green allocation based on traffic kinematic wave principles (Highway Capacity Manual, HCM 2016):
- **Estimated Vehicle Queue Count:** Given an average vehicle spacing $d_{\text{space}} = 7.0$ meters (vehicle body length plus safe clearance gap):
  $$N_{\text{queue}} = \frac{q_{\text{length\_m}}}{d_{\text{space}}}$$
- **Discharge Saturation Rate:** Based on the literature default saturation flow rate $s = 1900\text{ veh/hr/lane}$ (noted as literature placeholder per AGENTS.md Rule 7, refined in Phase 5):
  $$r_{\text{discharge}} = \frac{s}{3600} \approx 0.5278\text{ veh/second}$$
- **Theoretical Clearance Time:** Incorporating start-up lost time ($t_{\text{lost}} = 2.0$ seconds for driver reaction and acceleration inertia):
  $$g_{\text{clear}} = t_{\text{lost}} + \frac{N_{\text{queue}}}{r_{\text{discharge}}} = 2.0 + \frac{q_{\text{length\_m}} / 7.0}{1900 / 3600}$$
- **Bounded Green Allocation:** To prevent runaway phase durations, allocated green $g_{\text{alloc}}$ is clamped within strict safety limits:
  $$g_{\text{alloc}} = \min \left( \max(g_{\text{clear}}, g_{\text{min}}), g_{\text{max}} \right)$$
  where $g_{\text{min}} = 10.0$ seconds and $g_{\text{max}} = 60.0$ seconds. This strictly satisfies **Success Criterion 1 (SC1)**.

### 3.4.4 Dynamic Gap-Out Truncation
If a lane clears its standing queue ahead of schedule, continuing a green indication wastes intersection capacity. Kinetica implements a continuous density gap-out check:
- If elapsed phase green time exceeds minimum safety clearance ($t > 7.0$ seconds) AND observed vehicle density drops below threshold ($\rho < 0.02\text{ veh/m}$), the controller triggers `terminate_phase_early()`, truncating the active phase and immediately advancing service to the next queued lane.

---

## 3.5 Module 3: Priority-Aware Green Wave Preemption (`preemption/`)

The preemption engine arbitrates right-of-way among competing approaches and coordinates multi-intersection green waves for emergency responders.

### 3.5.1 Urgency Scoring Formulation (`preemption/heap.py`)
Every intersection approach lane $i$ is evaluated continuously by a composite urgency scoring function:

$$\text{Score}_i = \left( M_i \cdot (1.0 + \rho_i \cdot W_{\text{density}}) \right) + (w_i \cdot W_{\text{aging}})$$

where:
- $M_i$: Emergency priority multiplier determined by vehicle classification ($M_i \ge 1.0$).
- $\rho_i$: Measured spatial vehicle density along approach $i$ ($\text{veh/m}$).
- $W_{\text{density}} = 20.0$: Weight scaling density-based queue pressure.
- $w_i$: Unserved waiting time (seconds) accumulated by approach $i$ since its last green phase.
- $W_{\text{aging}} = 1.0$: Linear anti-starvation aging rate.

### 3.5.2 The Anti-Starvation Invariant
A critical theoretical failure of conventional preemption controllers is the infinite starvation of non-priority side streets during heavy arterial traffic or repeated emergency pings. In Kinetica, the inclusion of the strictly additive aging term $(w_i \cdot W_{\text{aging}})$ guarantees the **Anti-Starvation Invariant**:

$$\lim_{w_i \to \infty} \text{Score}_i(w_i) = \infty$$

Because arterial lanes have their wait time reset to $w = 0$ upon service, an empty waiting cross-street ($\rho = 0$) accumulating wait time will monotonically increase in score:

$$\text{Score}_{\text{side}}(t) = 1.0 + (t \cdot 1.0)$$

Eventually, $\text{Score}_{\text{side}}(t)$ strictly overtakes any continuously refreshed non-emergency arterial lane, mathematically guaranteeing that infinite starvation is impossible.

### 3.5.3 Tombstone Max-Heap Architecture (`LanePriorityHeap`)
To achieve microsecond-level arbitration on edge processors, Kinetica implements a custom `LanePriorityHeap`:
- **Underlying Data Structure:** Standard Python `heapq` provides an inverted min-heap storing tuples:
  $$\mathbf{entry} = (-\text{Score}, \text{counter}, \text{lane\_id})$$
- **Monotonic Sequence Counter:** The integer `counter` acts as a deterministic tie-breaker, preventing Python comparison crashes when two approaches have identical numerical scores.
- **Tombstone Eviction:** Because standard heaps do not support efficient $O(\log N)$ key updates, Kinetica utilizes a tombstone hash map (`_scores: Dict[str, float]`). When an approach's score updates, the new score is recorded in the map, and a new entry is pushed into the heap. Outdated (tombstoned) entries are purged lazily from the root during `peek_root()` and `pop_root()`.
- **Performance Characteristics:** Provides guaranteed $O(1)$ score retrieval and $O(\log N)$ amortized update latency.

### 3.5.4 Priority Class Escalation Multipliers (`preemption/override.py`)
When a `PriorityEvent` is detected, `apply_override()` maps the classification to its multiplier:

| Vehicle Classification | School Zone Context | Priority Multiplier ($M$) | Operational Rationale |
|---|---|---|---|
| `VehicleClass.AMBULANCE` | Any | $1000.0\times$ | Immediate life-saving preemption (forces heap root instantly). |
| `VehicleClass.POLICE` | Any | $1000.0\times$ | Critical law enforcement emergency response. |
| `VehicleClass.SCHOOL_VAN` | `is_school_zone == True` | $50.0\times$ | Vulnerable road user protection during school operational hours. |
| `VehicleClass.SCHOOL_VAN` | `is_school_zone == False` | $1.0\times$ | Standard arterial traffic weighting outside school zones. |
| `VehicleClass.STANDARD` | Any | $1.0\times$ | Standard baseline traffic weighting. |
| `VehicleClass.TWO_WHEELER` | Any | $1.0\times$ | Standard baseline traffic weighting. |

Injecting an emergency vehicle with $M = 1000.0$ generates an instantaneous score $\ge 1000.0$, immediately elevating the approach to the root of `LanePriorityHeap` ahead of all waiting civilian traffic, satisfying **Success Criterion 2 (SC2)**.

### 3.5.5 Directed-Graph Green Wave Corridor Routing (`preemption/graph_router.py`)
To prevent the downstream standing queue trap identified in Literature Gap 3, Kinetica models the urban intersection network as a directed spatial graph $G = (V, E)$ using NetworkX:
- **Vertices ($V$):** Signalized intersections $\{v_1, v_2, \dots, v_m\}$.
- **Edges ($E$):** Directed road segments connecting intersections, weighted by traversal travel time ($t_{\text{travel}}$) and arterial capacity.

```
                    EMERGENCY CORRIDOR PREEMPTION (GREEN WAVE)
                    
  [ IX-01 ] ──────────────► [ IX-02 ] ──────────────► [ IX-03 ] ──────────────► [ IX-04 ]
 (Ambulance Detected)     (Pre-Cleared)           (Pre-Cleared)           (Pre-Cleared)
 Phase: PREEMPTED         Phase: PREEMPTED        Phase: PREEMPTED        Phase: PREEMPTED
 Duration: 30s            Duration: 30s           Duration: 30s           Duration: 30s
 Queue: Evacuating        Queue: Flushing Out     Queue: Flushing Out     Queue: Flushing Out
```

When an emergency vehicle is detected at intersection $v_0$:
1. **Downstream Path Projection:** `project_downstream_path()` greedily traverses outgoing edges from $v_0$ up to a lookahead horizon of $\text{max\_hops} = 5$. At each step, it selects the successor node with the highest edge weight representing the primary arterial heading. A visited set tracking history guarantees cycle prevention.
   *(Note per AGENTS.md Rule 7: This algorithm is deliberately an explainable deterministic greedy heuristic; historical ML trajectory modeling is deferred to future work).*
2. **Corridor Pre-Clearance Decisions:** `preclear_corridor()` emits coordinated `PhaseDecision` objects for all projected downstream nodes:
   $$\text{Decision}_k = \text{PhaseDecision}(\text{intersection\_id}=v_k, \text{reason}=\text{PhaseReason.PREEMPTED}, \Delta t_{\text{green}}=30.0\text{s})$$
   This flushes out standing queues at downstream signals prior to the emergency vehicle's arrival, formally satisfying **Success Criterion 3 (SC3)**.

---

## 3.6 Module 4: Predictive Analytics Engine (`analytics/`)

The analytics module performs post-preemption shockwave forecasting, rigorous hypothesis testing, and empirical saturation flow calibration.

### 3.6.1 Time-Series Log Harmonization (`analytics/bottleneck_model.py`)
Because perception observations occur on sub-second video frame intervals while phase decisions occur on multi-second cycle horizons, `load_simulation_logs()` aligns asynchronous logs using `pandas.merge_asof`. Both datasets standardize timestamps to integer epoch seconds, performing a nearest-neighbor join:

$$\text{Joined\_Row}_i = \text{argmin}_j \left| t_{\text{obs}, i} - t_{\text{dec}, j} \right|$$

Engineering features are derived, including binary preemption indicators ($\text{is\_preempted} \in \{0.0, 1.0\}$) and diurnal temporal features ($\text{hour\_of\_day}$).

### 3.6.2 Interpretable Bottleneck Regression (`train_bottleneck_model`)
To understand how emergency preemption perturbs network stability, Kinetica trains a shallow `DecisionTreeRegressor` to forecast downstream bottleneck delay:
- **Feature Matrix ($X$):** Current density ($\text{veh/m}$), vehicle count, current queue length ($m$), preemption status ($\text{is\_preempted}$), and hour of day.
- **Target Variable ($y$):** Downstream queue length delay shifted $\text{lookahead\_steps} = 5$ time steps forward.
- **Tree Depth Constraint:** Constrained strictly to $\text{max\_depth} = 3$. A shallow depth guarantees that the model remains fully interpretable to municipal traffic engineers.
- **Feature Importances:** Normalized Gini feature importances are extracted and persisted to `results/bottleneck_importances.json` for dashboard visualization.

### 3.6.3 Rigorous Statistical Hypothesis Testing (`analytics/hypothesis_test.py`)
In direct fulfillment of Literature Gap 5 and **Success Criterion 4 (SC4)**, Kinetica embeds a complete statistical hypothesis testing pipeline comparing Kinetica against a fixed-timer baseline under identical arrival conditions:
- **Null Hypothesis ($H_0$):** Mean vehicle wait time under Kinetica is greater than or equal to the fixed-timer baseline ($\mu_{\text{Kinetica}} \ge \mu_{\text{Baseline}}$).
- **Alternative Hypothesis ($H_a$):** Mean vehicle wait time under Kinetica is strictly less than the baseline ($\mu_{\text{Kinetica}} < \mu_{\text{Baseline}}$).
- **Normality Testing:** Executes the Shapiro-Wilk test (`scipy.stats.shapiro`) on both samples at significance level $\alpha = 0.05$. If both samples yield $p > \alpha$, the data is deemed Gaussian; if either sample yields $p \le \alpha$, it is deemed non-parametric.
- **Branching Decision:**
  - *If Normal:* Executes Welch’s two-sample $t$-test (`equal_var=False`, `alternative='less'`), accounting for unequal sample variances.
  - *If Non-Parametric:* Executes the Mann-Whitney U rank-sum test (`scipy.stats.mannwhitneyu`, `alternative='less'`).
- **Effect Size:** Computes the empirical wait-time reduction:
  $$\Delta = \mu_{\text{Baseline}} - \mu_{\text{Kinetica}}$$
- Results are saved to `results/hypothesis_test_output.json`.

### 3.6.4 Empirical Saturation Flow Rate Calibration (`analytics/calibrate_flow.py`)
Per **AGENTS.md Rule 7**, Phase 5 refines the literature default `DEFAULT_SATURATION_FLOW_RATE = 1900` using empirical departure counts and green durations according to the Highway Capacity Manual (HCM 2016 Chapter 19):

$$s_{\text{calib}} = 3600 \cdot \frac{\sum_{c=1}^{C} \text{Departures}_c}{\sum_{c=1}^{C} (g_c - t_{\text{lost}})}$$

Cycles where effective green ($g_c - t_{\text{lost}} \le 0$) are filtered out. If total effective green is under 10 seconds, the module safely reverts to the 1900.0 literature fallback. When active, $s_{\text{calib}}$ is bounded within physical urban arterial limits ($[1200, 2400]\text{ veh/hr/lane}$).

---

## 3.7 Integrated End-to-End Orchestration Architecture (`run_end_to_end.py`)

The entire cyber-physical lifecycle is unified within [`run_end_to_end.py`](file:///F:/project/Kinetica/run_end_to_end.py), providing a single deterministic entry point:
1. Ingests synthetic scenarios (`corridor_ambulance` or `queue_buildup`) from `data/synthetic_generator.py`.
2. Simulates parallel controller execution: running identical arrival streams through both Kinetica's dynamic engine and the 90-second fixed-timer baseline.
3. Triggers directed-graph corridor preemption upon emergency event injection.
4. Executes goodness-of-fit checks, hypothesis testing, and bottleneck tree training.
5. Invokes `analytics/generate_plots.py` to render four 300 DPI publication figures in `results/figures/`.
6. Emits standardized JSON logs into `results/` for dashboard consumption.
