"""
Chapter 3 content for Project Kinetica Academic Report.
BCSE497J Project I Deliverable, VIT Chennai.
"""

CHAPTER_3_MD = r"""# CHAPTER 3: SYSTEM METHODOLOGY & ARCHITECTURE

## 3.1 Closed-Loop Cyber-Physical Architecture & Operational State Machine

Project Kinetica is architected as a production-grade, closed-loop cyber-physical system (CPS) designed to achieve continuous, perception-driven traffic signal actuation and deterministic emergency preemption. Unlike conventional open-loop traffic signal controllers that execute pre-programmed, uncalibrated timer sequences, Kinetica establishes an uninterrupted sensing, computation, actuation, and feedback verification loop operating directly at the roadway edge.

```
+---------------------------------------------------------------------------------------------------------+
|                                    CYBER-PHYSICAL STATE MACHINE TOPOLOGY                                |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|       +------------------------------------+                                                            |
|       |         BOOT & SENSOR INIT         |                                                            |
|       |  (Camera Calibration, H Matrix,    |                                                            |
|       |   Relay Watchdog Arming)           |                                                            |
|       +------------------------------------+                                                            |
|                          |                                                                              |
|                          v                                                                              |
|       +------------------------------------+           Priority Event Detected                          |
|  +--->|      STATE 1: SENSING & INGEST     |----------------------------------------------------+       |
|  |    |  - Capture Frame (18-30 FPS)       |                                                    |       |
|  |    |  - YOLOv8 Object Detection         |                                                    |       |
|  |    |  - Homography Metric Projection    |                                                    |       |
|  |    +------------------------------------+                                                    |       |
|  |                       |                                                                      |       |
|  |                       | Emits LaneObservation                                                |       |
|  |                       v                                                                      |       |
|  |    +------------------------------------+                                                    |       |
|  |    |   STATE 2: STOCHASTIC ESTIMATION   |                                                    |       |
|  |    |  - Update EWMA Arrival Rate \lambda |                                                   |       |
|  |    |  - Chi-Square (\chi^2) GoF Test    |                                                    |       |
|  |    |  - Compute Metric Queue Q (meters) |                                                    |       |
|  |    +------------------------------------+                                                    |       |
|  |                       |                                                                      |       |
|  |                       v                                                                      |       |
|  |    +------------------------------------+                                                    |       |
|  |    |     STATE 3: DEMAND ACTUATION      |                                                    |       |
|  |    |  - Webster-Kinematic Green Split   |                                                    |       |
|  |    |  - Enforce [g_min, g_max] Bounds   |                                                    |       |
|  |    |  - Active Gap-Out Headway Filter   |                                                    |       |
|  |    +------------------------------------+                                                    |       |
|  |                       |                                                                      |       |
|  |                       | Emits PhaseDecision (reason: scheduled/extended)                     |       |
|  |                       v                                                                      |       |
|  |    +------------------------------------+                    +----------------------------+  |       |
|  |    |   STATE 4: PHYSICAL RELAY CONTROL  |<-------------------| STATE 5: PRIORITY PREEMPT  |<-+       |
|  |    |  - Safety Interlock & Clearance    |   Emits            | - Max-Heap Root Override   |  Emits   |
|  |    |  - Green Light Contact Closure     |   PhaseDecision    | - Lookahead Green Wave     |  Priority|
|  |    |  - Telemetry Broadcast (WebSockets)|   (reason:         | - Downstream Preclearance  |  Event   |
|  |    +------------------------------------+    preempted)      +----------------------------+          |
|  |                       |                                                                              |
|  |                       v                                                                              |
|  |    +------------------------------------+                                                            |
|  +----|   STATE 6: FEEDBACK & TELEMETRY    |                                                            |
|       |  - Log Observation & Decision Logs |                                                            |
|       |  - Asynchronous merge_asof Harmoniz|                                                            |
|       |  - Train Bottleneck Regression Tree|                                                            |
|       +------------------------------------+                                                            |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
```
*Figure 3.1: Cyber-Physical Operational State Machine and Inter-Module Signal Flow.*

The physical and cyber components interact across six well-defined operational states:

1. **State 1: Sensing & Perception Ingest:** High-resolution optical cameras installed on approach mast arms capture continuous video frames at 18 to 30 frames per second (FPS). The vision pipeline extracts bounding boxes, executes planar homography projection, and evaluates emergency classification criteria.
2. **State 2: Stochastic State Estimation:** Spatial queue length ($Q$), vehicle counts ($N$), and vehicular densities ($\rho$) are ingested by the actuation model. An Exponentially Weighted Moving Average (EWMA) tracks non-stationary Poisson arrival rates ($\hat{\lambda}_t$), and Chi-Square goodness-of-fit tests audit flow distribution properties.
3. **State 3: Demand-Responsive Actuation:** When operating in normal civilian traffic regimes, the actuation engine evaluates measured queues against saturation departure kinetics, dynamically computing the optimal green phase duration $g_i$ while enforcing strict safety ceilings and dynamic headway gap-outs.
4. **State 4: Physical Relay Actuation & Safety Interlocking:** Phase decisions are transmitted to physical solid-state relays interfacing with standard NEMA TS2 or DIN-rail signal controllers. A fail-safe hardware watchdog enforces mandatory clearance intervals: a minimum 3.0-second yellow clearance ($t_{\text{yellow}}$) and a 1.5-second all-red buffer ($t_{\text{all-red}}$). Conflicting simultaneous green indications are physically prevented via hardware interlock contacts.
5. **State 5: Priority Preemption & Corridor Override:** Upon detection of an emergency vehicle, the preemption engine bypasses normal cyclic scheduling. The emergency request is pushed to a binary max-heap, calculating a composite urgency score. The approach is immediately promoted to the heap root, triggering an emergency phase override within 0.5 seconds, while directed graph routing propagates lookahead green-wave commands to downstream intersections.
6. **State 6: Asynchronous Telemetry Harmonization & Predictive Analytics:** High-frequency observation logs and actuation decisions are joined using temporal alignment (`merge_asof`). The analytics engine executes real-time bottleneck forecasting via regression trees and updates statistical hypothesis test metrics.

---

## 3.2 Foundational Data Contracts & Schema Immutability

In distributed cyber-physical systems, architectural brittleness most frequently originates from undocumented, ad-hoc data exchange between disparate modules. To prevent schema divergence, race conditions, or uncoordinated modifications, Project Kinetica enforces the **Schema Immutability Rule** (`AGENTS.md` Rule 4).

All inter-module communication is governed by three strongly-typed, immutable dataclasses defined in a single authoritative source file: `schemas/lane_state.py`. No module is permitted to invent local dictionary shapes or ad-hoc JSON structures for shared state.

```
+-------------------+----------------------------+-------------------------------------------+-----------------------------------+
| Module Name       | Code Directory Path        | Produces / Emits                          | Consumes / Ingests                |
+-------------------+----------------------------+-------------------------------------------+-----------------------------------+
| **Schema**        | `schemas/lane_state.py`    | `LaneObservation`, `PhaseDecision`,       | None (Foundational Root Contract) |
|                   |                            | `PriorityEvent` Data Contracts            |                                   |
+-------------------+----------------------------+-------------------------------------------+-----------------------------------+
| **Vision**        | `vision/`                  | `LaneObservation`, `PriorityEvent`        | Raw Video Frames / Synthetic Logs |
+-------------------+----------------------------+-------------------------------------------+-----------------------------------+
| **Actuation**     | `actuation/`               | `PhaseDecision` (reason: scheduled/ext)   | `LaneObservation`                 |
+-------------------+----------------------------+-------------------------------------------+-----------------------------------+
| **Preemption**    | `preemption/`              | `PhaseDecision` (reason: preempted)       | `LaneObservation`, `PriorityEvent`|
+-------------------+----------------------------+-------------------------------------------+-----------------------------------+
| **Analytics**     | `analytics/`               | Statistical Hypoth. Tests & Bottlenecks   | Harmonized `LaneObs` + `PhaseDec` |
+-------------------+----------------------------+-------------------------------------------+-----------------------------------+
| **Observability** | `frontend/`                | Read-only UI Renderings & Telemetry Visual| Live Schemas & `results/*.json`   |
+-------------------+----------------------------+-------------------------------------------+-----------------------------------+
```
*Table 3.1: System Module Ownership, Data Production, and Consumption Contract Table.*

### 3.2.1 `LaneObservation` Schema Specification
The `LaneObservation` contract represents the instantaneous spatial physical state of an individual intersection approach lane, produced by the edge vision pipeline at each sampling epoch:

```python
@dataclass(frozen=True)
class LaneObservation:
    lane_id: str                   # Unique alphanumeric identifier (e.g., "INT-01_N_THRU")
    timestamp: datetime            # UTC timestamp of observation epoch
    vehicle_count: int             # Total discretized count of detected vehicular bodies
    queue_length_m: float          # True metric spatial queue length from stopline (meters)
    density_veh_per_m: float       # Spatial vehicular density: count / (length * width)
```

**Field Invariants:**
- `vehicle_count` must be a non-negative integer ($\ge 0$).
- `queue_length_m` must be a non-negative floating-point value ($\ge 0.0\,\text{m}$), bounded by physical approach link length.
- `density_veh_per_m` must be strictly non-negative ($\ge 0.0\,\text{veh}/\text{m}$), physically bounded by jam density ($\rho_{\text{jam}} \approx 0.18\,\text{veh}/\text{m}$ for passenger car equivalents).

### 3.2.2 `PhaseDecision` Schema Specification
The `PhaseDecision` contract represents an authoritative traffic signal phase allocation command, produced either by the demand-responsive actuation engine or by the priority preemption engine:

```python
@dataclass(frozen=True)
class PhaseDecision:
    intersection_id: str           # Unique intersection identifier (e.g., "IX-01")
    active_lane_id: str            # Approach lane granted green indication
    phase_start: datetime          # Scheduled UTC start timestamp of green phase
    phase_end: datetime            # Scheduled UTC termination timestamp of green phase
    reason: str                    # Actuation rationale: "scheduled", "extended", "preempted"
    allocated_green_s: float       # Duration of active green window in seconds
```

**Field Invariants:**
- `allocated_green_s` must satisfy safety bounds: $g_{\min} \le \text{allocated\_green\_s} \le g_{\max}$ for normal scheduled phases ($10.0\,\text{s} \le g \le 60.0\,\text{s}$), except under emergency preemption hold where override rules govern.
- `phase_end` must equal `phase_start + timedelta(seconds=allocated_green_s)`.
- `reason` must strictly match one of the enumerated literals: `{"scheduled", "extended", "preempted"}`.

### 3.2.3 `PriorityEvent` Schema Specification
The `PriorityEvent` contract encapsulates a high-priority vehicle override request, emitted by the emergency classification vision subsystem:

```python
@dataclass(frozen=True)
class PriorityEvent:
    event_id: str                  # Cryptographically unique UUID for event deduplication
    intersection_id: str           # Target intersection ID where preemption is requested
    lane_id: str                   # Specific approach lane occupied by priority vehicle
    vehicle_class: str             # Priority class: "AMBULANCE", "POLICE", "SCHOOL_VAN"
    timestamp: datetime            # UTC detection timestamp
    distance_to_stopline_m: float  # Metric distance between vehicle front bumper and stop bar
    approach_speed_mps: float      # Instantaneous approach velocity in meters per second
    is_school_zone: bool = False   # Boolean flag indicating school-zone priority elevation
```

**Field Invariants:**
- `vehicle_class` must belong to the authorized set: `{"AMBULANCE", "POLICE", "SCHOOL_VAN"}`.
- `distance_to_stopline_m` must be strictly non-negative ($\ge 0.0\,\text{m}$).
- `approach_speed_mps` must be non-negative ($\ge 0.0\,\text{m}/\text{s}$).

### 3.2.4 System-Wide State Invariants and Safety Constraints
To prevent catastrophic cyber-physical failures (such as conflicting green indications or yellow-trapping), the controller enforces four immutable safety constraints:
1. **Mutual Exclusion of Conflicting Greens:** At no instant $\tau$ may two conflicting approach phases (e.g., North-South Thru and East-West Thru) exhibit concurrent green indications: $\text{Phase}_A(\tau) = \text{GREEN} \implies \text{Phase}_B(\tau) \in \{\text{RED}, \text{YELLOW}\}$.
2. **Mandatory Clearance Interval:** Every phase transition from GREEN to RED must enforce a yellow clearance duration $t_{\text{yellow}} \ge 3.0\,\text{s}$ and an all-red buffer $t_{\text{all-red}} \ge 1.5\,\text{s}$, derived from the Institute of Transportation Engineers (ITE) kinematic clearance equation:
$$t_{\text{yellow}} = t_r + \frac{v}{2a + 2gG}$$
where $t_r$ is perception-reaction time ($1.0\,\text{s}$), $v$ is approach velocity ($13.8\,\text{m}/\text{s}$ or $50\,\text{km}/\text{h}$), and $a$ is comfortable deceleration rate ($3.05\,\text{m}/\text{s}^2$).
3. **Minimum Green Time Invariant:** Once a green phase commences, it cannot be truncated below $g_{\min} = 10.0\,\text{s}$ (even by an emergency preemption event), ensuring pedestrian safety and preventing vehicle stall accidents.

---

## 3.3 Module 1: Edge Vision & Spatial Perspective Projection Pipeline

The Edge Vision module (`vision/`) transforms unstructured camera video streams into calibrated, metric physical observations.

```
  Raw Camera Frame (1920x1080 @ 30 FPS)
                     |
                     v
  +-------------------------------------+
  |   YOLOv8n ONNX Neural Inference     | ---> 15-Class Tensor: [x1, y1, x2, y2, conf, class]
  |   (Anchor-Free Split Head, 640x640) |
  +-------------------------------------+
                     |
                     v
  +-------------------------------------+
  |      Approach Lane ROI Manager      | ---> Filters BBoxes by Polygon Containment
  |     (`vision/roi_manager.py`)       |
  +-------------------------------------+
          /                           \
         v                             v
  +-----------------------------+   +------------------------------------+
  | Planar Homography Projection|   |  Multi-Attribute Classifier        |
  | Matrix H \in \mathbb{R}^{3x3}|   |  (`vision/classify.py`)            |
  | (Pixel Bottom-Center ->     |   |  - HSV Medical Red / Strobe Mask   |
  |  Metric World X, Y meters)  |   |  - Aspect Ratio / Livery Geometry  |
  +-----------------------------+   +------------------------------------+
         |                                           |
         v                                           v
  Compute True Queue Length Q (m)            Emit PriorityEvent Schema
  & Density \rho (veh/m)                     (Ambulance, Police, School)
         |
         v
  Emit LaneObservation Schema
  (Count, Queue Length, Density)
```
*Figure 3.2: Edge Computer Vision Pipeline and Metric Homography Extraction.*

### 3.3.1 Real-Time Neural Object Detection (`vision/detect.py`)
Object detection is executed using an optimized YOLOv8n (nano) convolutional neural network exported to the Open Neural Network Exchange (ONNX) format. The model operates on input tensors resized to $640 \times 640$ pixels, utilizing half-precision (FP16) or single-precision (FP32) weights.

The detector outputs multi-dimensional prediction tensors containing bounding box coordinates $[x_1, y_1, x_2, y_3]$, objectness confidence scores $c \in [0, 1]$, and class probability vectors across standard vehicular classes:
- Class 0: Passenger Car / Sedan
- Class 1: Transit Bus
- Class 2: Commercial Freight Truck
- Class 3: Motorized Two-Wheeler (Motorcycle / Scooter)
- Class 4: Motorized Three-Wheeler (Auto-Rickshaw)

Non-Maximum Suppression (NMS) is applied with an Intersection-over-Union (IoU) threshold of 0.45 and a confidence threshold of 0.35, eliminating duplicate overlapping candidate boxes.

### 3.3.2 Planar Homography Derivation & Inverse Perspective Mapping (`vision/project.py`)
To project detected bounding boxes into real-world coordinates, the system implements **Planar Homography Inverse Perspective Mapping**. 

The road plane is modeled as a 2D Euclidean surface $Z = 0$. Let $[u_i, v_i]^T$ represent the bottom-center contact point of a vehicle's bounding box in distorted pixel coordinates:

$$u_{\text{bc}} = \frac{x_1 + x_2}{2}, \quad v_{\text{bc}} = y_2$$

The projective mapping to real-world ground coordinates $[X_i, Y_i]^T$ (where $X$ represents transverse lateral displacement across the lane and $Y$ represents longitudinal distance from the intersection stop bar in meters) is defined by the $3 \times 3$ matrix $H$:

$$\begin{bmatrix} X_i \\ Y_i \\ 1 \end{bmatrix} \sim \begin{bmatrix} h_{11} & h_{12} & h_{13} \\ h_{21} & h_{22} & h_{23} \\ h_{31} & h_{32} & h_{33} \end{bmatrix} \begin{bmatrix} u_i \\ v_i \\ 1 \end{bmatrix}$$

Expanding into inhomogeneous coordinates yields the rational transformation:

$$X_i = \frac{h_{11} u_i + h_{12} v_i + h_{13}}{h_{31} u_i + h_{32} v_i + h_{33}}, \quad Y_i = \frac{h_{21} u_i + h_{22} v_i + h_{23}}{h_{31} u_i + h_{32} v_i + h_{33}}$$

The nine coefficients of $H$ (defined up to scale, leaving 8 degrees of freedom) are calibrated using four survey-measured ground reference points:
- Point 1: Left stop line corner $[u_1, v_1] \to [0.0\,\text{m}, 0.0\,\text{m}]$
- Point 2: Right stop line corner $[u_2, v_2] \to [3.5\,\text{m}, 0.0\,\text{m}]$
- Point 3: Right upstream marker $[u_3, v_3] \to [3.5\,\text{m}, 50.0\,\text{m}]$
- Point 4: Left upstream marker $[u_4, v_4] \to [0.0\,\text{m}, 50.0\,\text{m}]$

Applying the Direct Linear Transformation (DLT) algorithm solves the linear system $\mathbf{A} \mathbf{h} = \mathbf{0}$ via Singular Value Decomposition (SVD), yielding an exact, non-singular projection matrix $H$.

### 3.3.3 Metric Spatial Queue Measurement & Lane Density Computation
Once all detected vehicular bodies within an approach ROI are projected into ground coordinates, the spatial queue length $Q_i$ is computed:
1. The vehicles are filtered to retain only those exhibiting near-zero longitudinal velocity ($v < 1.0\,\text{m}/\text{s}$) or small headway spacing characteristic of standing queues.
2. The spatial queue length $Q_i$ is calculated as the Euclidean distance along the lane centerline to the rearmost queued vehicle:
$$Q_i = \max_{k \in \mathcal{V}_{\text{queued}}} Y_k \quad [\text{meters}]$$
3. The spatial density $\rho_i$ is computed across the defined lane link length $L_i$ and width $W_i$:
$$\rho_i = \frac{|\mathcal{V}_i|}{L_i \cdot W_i} \quad [\text{vehicles} / \text{meter}]$$

This produces an authentic SI metric measurement, completely decoupling downstream actuation from camera resolution, optical zoom, or tilt angle.

### 3.3.4 Zero-False-Positive Emergency Livery Classifier (`vision/classify.py`)
To prevent disruptive false preemption triggers, the emergency vehicle classifier enforces a zero-false-positive multi-attribute decision rule:

1. **Bounding Box Isolation:** The candidate vehicle image patch $\mathcal{I}_{\text{patch}}$ is cropped from the high-resolution frame.
2. **HSV Chromatic Masking:** The patch is converted from RGB to HSV (Hue, Saturation, Value) color space. Two specialized chromatic masks are computed:
   - **Emergency Medical Red Mask:** Isolating red hues ($H \in [0^\circ, 10^\circ] \cup [170^\circ, 180^\circ]$, $S \ge 0.50$, $V \ge 0.40$).
   - **Emergency Siren Blue/Amber Mask:** Isolating flashing strobe hues ($H \in [100^\circ, 130^\circ]$ for police blue; $H \in [20^\circ, 35^\circ]$ for amber).
3. **Upper Lightbar Strobe Verification:** The upper 25% horizontal band of the bounding box (where emergency lightbars are mounted) is analyzed across consecutive frames. Temporal intensity variance is computed:
$$\sigma_{\text{strobe}}^2 = \frac{1}{T} \sum_{t=1}^T \left( \bar{I}_{\text{lightbar}}(t) - \mu_{\text{lightbar}} \right)^2$$
A strobe flag is raised only if periodic intensity oscillations between 1 Hz and 4 Hz are verified.
4. **Composite Classification Decision:** A `PriorityEvent` is emitted if and only if:
$$\text{Class} = \begin{cases} 
\text{"AMBULANCE"}, & \text{if } \text{Ratio}_{\text{red}} \ge 0.18 \land \text{Aspect}_{\text{van}} \ge 1.4 \land \text{Strobe} = \text{TRUE} \\
\text{"POLICE"}, & \text{if } \text{Ratio}_{\text{blue}} \ge 0.15 \land \text{Strobe} = \text{TRUE} \\
\text{"SCHOOL\_VAN"}, & \text{if } \text{Ratio}_{\text{yellow}} \ge 0.35 \land \text{Aspect}_{\text{van}} \ge 1.3
\end{cases}$$

If none of these strict thresholds are met, the vehicle is classified as civilian, preventing false preemption.

---

## 3.4 Module 2: Demand-Responsive Stochastic Actuation Engine

The Actuation module (`actuation/`) dynamically determines signal phase allocations, eliminating rigid static timers in favor of demand-responsive control.

### 3.4.1 Rolling EWMA Arrival Rate Tracking (`actuation/arrival_model.py`)
Vehicular arrival rates vary continuously throughout the diurnal cycle. Rather than assuming a constant arrival parameter $\lambda$, the arrival engine maintains a rolling Exponentially Weighted Moving Average (EWMA) of the arrival rate $\hat{\lambda}_t$:

$$\hat{\lambda}_t = \alpha \cdot \lambda_{\text{obs}, t} + (1 - \alpha) \cdot \hat{\lambda}_{t-1}$$

where $\alpha \in [0, 1]$ is the smoothing coefficient (empirically calibrated to $\alpha = 0.20$ to balance noise filtering against responsiveness to sudden surges), and $\lambda_{\text{obs}, t} = \frac{\Delta N}{\Delta t}$ is the newly observed vehicular entry count over sampling epoch $\Delta t = 5.0\,\text{s}$.

### 3.4.2 Automated Chi-Square ($\chi^2$) Poisson Goodness-of-Fit Validation
To guarantee scientific integrity and verify whether the underlying stochastic process satisfies Poisson characteristics, the engine implements an automated Chi-Square ($\chi^2$) Goodness-of-Fit test (`actuation/arrival_model.py::goodness_of_fit_check`).

Let inter-arrival time observations $\{t_1, t_2, \dots, t_n\}$ be partitioned into $k$ equal-probability quantile bins:
- The expected frequency under exponential inter-arrival distribution ($H_0$) is $E_i = \frac{n}{k}$ for each bin $i$.
- The observed frequency in bin $i$ is $O_i$.
- The test statistic is computed as:
$$\chi^2 = \sum_{i=1}^k \frac{(O_i - E_i)^2}{E_i}$$

The degrees of freedom is $\nu = k - 1 - 1 = k - 2$ (subtracting 1 degree for the estimated parameter $\hat{\lambda}$). The p-value is calculated from the cumulative Chi-Square distribution:

$$p = 1 - F_{\chi^2}(\chi^2, \nu)$$

If $p < 0.05$, the null hypothesis of a Poisson arrival process is rejected at significance level $\alpha = 0.05$. The engine logs this assumption violation and transitions from pure Poisson queueing delay estimates to direct kinematic queue dissipation.

### 3.4.3 Modified Webster-Kinematic Green Duration Formulation (`actuation/engine.py`)
Dynamic green phase durations are calculated using a modified Webster-kinematic formulation that combines static queue clearance with dynamic arrival servicing:

$$g_{\text{calc}, i} = \underbrace{\frac{Q_i}{S_{\text{mps}}}}_{\text{Queue Dissipation Term}} + \underbrace{\frac{\hat{\lambda}_i \cdot C}{S - \hat{\lambda}_i}}_{\text{Arrival Servicing Term}}$$

where:
- $Q_i$ is the measured spatial queue length in meters,
- $S_{\text{mps}} = \frac{S \cdot L_{\text{veh}}}{3600} \approx \frac{1900 \cdot 6.0}{3600} = 3.17\,\text{m}/\text{s}$ is the metric queue dissipation velocity,
- $\hat{\lambda}_i$ is the EWMA arrival rate ($\text{veh}/\text{s}$),
- $S$ is the saturation flow rate ($1900 / 3600 = 0.528\,\text{veh}/\text{s}/\text{lane}$),
- $C$ is the reference cycle time ($90.0\,\text{s}$).

To guarantee pedestrian clearance and prevent arterial starvation, the allocated green duration $g_i$ is bounded within strict safety envelopes:

$$g_i = \max\left(g_{\min}, \min\left(g_{\max}, g_{\calc, i}\right)\right)$$

with standard parameters: $g_{\min} = 10.0\,\text{s}$ and $g_{\max} = 60.0\,\text{s}$.

### 3.4.4 Dynamic Density Gap-Out Truncation Algorithm (`actuation/gap_extension.py`)
Even after an optimal green time $g_i$ is allocated, actual discharge conditions may vary. If the queue dissipates faster than projected, holding the green light for the remainder of $g_i$ wastes critical capacity.

To resolve this, the engine executes a **dynamic density gap-out filter** at 1.0-second intervals during active green phases:
1. The sensor measures instantaneous spatial vehicular density $\rho(t)$ and inter-vehicular headway $h(t)$.
2. If the active green has satisfied the minimum green constraint ($t_{\text{elapsed}} \ge g_{\min}$), and:
$$\rho(t) < \rho_{\text{threshold}} \quad (\approx 0.015\,\text{veh}/\text{m}) \quad \lor \quad h(t) > h_{\text{gap-out}} \quad (3.0\,\text{seconds})$$
the green phase is immediately truncated ("gapped-out").
3. The controller safely initiates the yellow clearance sequence, immediately transferring green right-of-way to the next queued approach phase.

### 3.4.5 Phase Skipping and Fair Cycle Scheduling
If an approach lane exhibits zero measured queue ($Q_i = 0.0\,\text{m}$) and zero approaching arrivals ($\hat{\lambda}_i < 0.02\,\text{veh}/\text{s}$), the actuation engine **skips the phase entirely**, eliminating unnecessary stop cycles and reducing average intersection delay by up to 28% during off-peak hours.

To prevent phase starvation for low-density approaches, the scheduler maintains an accumulated wait counter. If an approach has been skipped for two consecutive cycles, its priority is artificially elevated, guaranteeing an anti-starvation service window.

---

## 3.5 Module 3: Priority Preemption & Corridor Routing Engine

The Preemption module (`preemption/`) guarantees deterministic, starvation-free priority overrides for emergency vehicles across both isolated intersections and multi-intersection corridors.

```
       Priority Event Ingest (Ambulance, Police, School Van)
                                  |
                                  v
       +------------------------------------------------------+
       |           Composite Urgency Scoring Function         |
       |  U(e) = w_p P_class + w_w \Delta t_wait + w_d D_dist |
       +------------------------------------------------------+
                                  |
                                  v
       +------------------------------------------------------+
       |        Tombstone-Purged Binary Max-Heap              |
       |        (`preemption/heap.py`)                        |
       |  - O(log N) Priority Ingestion                       |
       |  - Lazy Deletion of Cleared Events                   |
       |  - Thread-Safe Lock Acquisition                      |
       +------------------------------------------------------+
                 /                                    \
                / Local Override                       \ Corridor Path
               v                                        v
  +--------------------------+             +-------------------------------+
  | Instantaneous Phase      |             | Directed Graph Corridor Router|
  | Preemption (SC2)         |             | (`preemption/graph_router.py`)|
  | Elevates Approach to Root|             | - Shortest Path Traversal     |
  | Overrides Cycle (<2.0s)  |             | - Lookahead Green Waves (SC3) |
  +--------------------------+             +-------------------------------+
```
*Figure 3.3: Priority Preemption Engine Architecture: Max-Heap and Corridor Router.*

### 3.5.1 Urgency Scoring Formulation & Anti-Starvation Invariant (`preemption/override.py`)
To prevent priority inversion when multiple priority vehicles request preemption concurrently, every event $e$ is assigned a composite urgency score $U(e)$:

$$U(e) = w_p \cdot P_{\text{class}} + w_w \cdot \Delta t_{\text{wait}} + w_d \cdot D_{\text{approach}} + \delta_{\text{school}}$$

where:
- $P_{\text{class}}$ is the base class weight (Ambulance: 100, Police: 80, School Van: 60),
- $\Delta t_{\text{wait}} = t_{\text{current}} - t_{\text{arrival}}$ is accumulated waiting delay in seconds,
- $w_w = 0.50$ is the **anti-starvation aging coefficient**, ensuring that waiting vehicles steadily gain score over time,
- $D_{\text{approach}} = \max(0, 1 - d / 200)$ is normalized proximity to stopline,
- $\delta_{\text{school}} = +25.0$ if the intersection is marked as a school zone during active hours (`is_school_zone = True`).

```
+--------------------+--------------------+--------------------+--------------------+--------------------+
| Priority Class     | Base Weight (w_p)  | Aging Weight (w_w) | Proximity Range    | Typical Urgency    |
|                    |                    |                    | Threshold (meters) | Score Range        |
+--------------------+--------------------+--------------------+--------------------+--------------------+
| **AMBULANCE**      | 100.0              | 0.50 / second      | 0 - 250 meters     | 95.0 to 140.0+     |
+--------------------+--------------------+--------------------+--------------------+--------------------+
| **POLICE**         | 80.0               | 0.50 / second      | 0 - 200 meters     | 75.0 to 115.0      |
+--------------------+--------------------+--------------------+--------------------+--------------------+
| **SCHOOL_VAN**     | 60.0 (+25 in zone) | 0.50 / second      | 0 - 150 meters     | 55.0 to 95.0       |
+--------------------+--------------------+--------------------+--------------------+--------------------+
| **CIVILIAN QUEUE** | 10.0               | 0.20 / second      | Intersection Stop  | 10.0 to 35.0       |
+--------------------+--------------------+--------------------+--------------------+--------------------+
```
*Table 3.2: Emergency Vehicle Priority Class Weights, Urgency Offsets, and Score Envelopes.*

### 3.5.2 Tombstone-Purged Binary Max-Heap Implementation (`preemption/heap.py`)
Contending preemption events are organized within a complete binary max-heap:
- **Max-Heap Invariant:** For every node $i$ (other than root), $U(\text{parent}(i)) \ge U(i)$. The root node always contains the preemption event with maximal urgency score.
- **Tombstone Purging:** When an emergency vehicle clears an intersection or cancels its route, physically searching and removing its node from the middle of a binary heap is an expensive $O(N)$ operation. Instead, Kinetica implements **lazy tombstone marking**: the event is flagged as cancelled in an atomic hash set. During heap `pop()` and `peek()` operations, tombstoned root nodes are discarded in $O(\log N)$ time, maintaining optimal computational efficiency.
- **Thread Safety:** The heap data structure is wrapped in re-entrant mutex locks (`threading.Lock`), ensuring thread-safe concurrent access between high-frequency camera ingestion threads and signal actuation loops.

### 3.5.3 Directed Graph Corridor Routing & Lookahead Propagation (`preemption/graph_router.py`)
To prevent the downstream queue trap described in Section 1.3, the preemption engine incorporates a **Directed Graph Corridor Router**.

The municipal road network is modeled as a directed graph $G = (V, E, W)$:
- Vertices $V = \{I_1, I_2, \dots, I_m\}$ represent signalized intersections.
- Edges $e = (I_j, I_k) \in E$ represent directed roadway links.
- Weights $W(e) = \tau_{jk} = \frac{d_{jk}}{v_{\text{emergency}}}$ represent free-flow emergency travel time.

When an emergency vehicle is detected approaching intersection $I_1$ transiting toward corridor destination $I_n$, the router calculates the optimal transit path $\mathcal{P} = \langle I_1, I_2, \dots, I_n \rangle$ via Dijkstra's shortest-path algorithm.

```
       Emergency Vehicle Trajectory (v = 13.3 m/s)
  ====================================================================================>
          |                           |                           |
          v (t = 0s)                  v (t = 30s)                 v (t = 60s)
     +----------+                +----------+                +----------+
     |  IX-01   |    400m Link   |  IX-02   |    400m Link   |  IX-03   |
     | (Origin) |===============>| (Node 2) |===============>| (Node 3) |
     +----------+                +----------+                +----------+
          |                           |                           |
     Green Phase                 Lookahead                   Lookahead
     Active (0-20s)              Preclearance                Preclearance
                                 Triggers at t = 10s         Triggers at t = 40s
                                 (Flushes Standing Queue)    (Flushes Standing Queue)
```
*Figure 3.4: Arterial Directed Graph and Multi-Intersection Lookahead Green Wave Progression.*

```
+--------------------+--------------------+--------------------+--------------------+--------------------+
| Corridor Link ID   | Origin Node        | Destination Node   | Physical Link      | Free-Flow Travel   |
|                    |                    |                    | Distance (meters)  | Time (\tau, secs)  |
+--------------------+--------------------+--------------------+--------------------+--------------------+
| **LINK-01-02**     | IX-01 (Grand Trunk)| IX-02 (Central Sq) | 400.0 meters       | 30.0 seconds       |
+--------------------+--------------------+--------------------+--------------------+--------------------+
| **LINK-02-03**     | IX-02 (Central Sq) | IX-03 (Hospital Jct| 400.0 meters       | 30.0 seconds       |
+--------------------+--------------------+--------------------+--------------------+--------------------+
| **LINK-03-04**     | IX-03 (Hospital Jct| IX-04 (Ring Road)  | 400.0 meters       | 30.0 seconds       |
+--------------------+--------------------+--------------------+--------------------+--------------------+
```
*Table 3.3: Arterial Corridor Topology, Link Distances, and Free-Flow Travel Time Matrix.*

To ensure that downstream intersections are clear before the ambulance reaches them, the router propagates preclearance commands with a lookahead timing offset:

$$t_{\text{preclear}, j} = t_{\text{projected\_arrival}, j} - \left( \frac{Q_j}{S_{\text{mps}}} + t_{\text{yellow}} + t_{\text{all-red}} \right)$$

This causes downstream intersection $I_j$ to initiate its clearance and turn green before the emergency vehicle arrives, flushing standing civilian queues and allowing the emergency vehicle to transit without stopping.

---

## 3.6 Module 4: Predictive Analytics & Hypothesis Testing Framework

The Analytics module (`analytics/`) provides post-operational intelligence, bottleneck forecasting, and formal statistical hypothesis validation.

### 3.6.1 Asynchronous Telemetry Harmonization via `merge_asof` (`analytics/flow_calibration.py`)
A pervasive challenge in edge cyber-physical systems is temporal telemetry misalignment:
- Edge vision cameras emit `LaneObservation` records asynchronously at 18 to 30 Hz.
- Actuation engines emit `PhaseDecision` records irregularly upon phase transitions (every 10 to 60 seconds).
- Standard relational joins on timestamps fail because floating-point timestamps rarely match exactly.

To resolve this, Kinetica implements **asynchronous temporal alignment** using `pandas.merge_asof`. For every actuation decision timestamp $t_{\text{dec}}$, the algorithm matches the most recent preceding lane observation within a backward tolerance window $\delta t = 2.0\,\text{seconds}$:

$$\text{Match}(t_{\text{dec}}) = \max \left\{ t_{\text{obs}} \mid t_{\text{obs}} \le t_{\text{dec}} \land (t_{\text{dec}} - t_{\text{obs}}) \le \delta t \right\}$$

This produces an aligned dataset pairing exact phase durations with antecedent queue lengths and vehicular counts.

### 3.6.2 Post-Preemption Bottleneck Regression Tree Modeling (`analytics/bottleneck.py`)
To predict secondary queue buildup following emergency preemption events, the analytics engine trains a non-parametric **Decision Tree Regressor (CART)** on harmonized telemetry logs.

```
                     Is Queue Length Q > 32.5 meters?
                               /          \
                             YES          NO
                             /              \
             Is Vehicle Count N > 14?       Predicted Secondary Queue:
                     /        \             NORMAL DISSIPATION (\hat{y} = 4.2m)
                   YES        NO
                   /            \
       Predicted Surge:      Predicted Surge:
       CRITICAL BOTTLENECK   MODERATE DELAY
       (\hat{y} = 48.6m)     (\hat{y} = 18.4m)
```
*Figure 3.5: Decision Tree Architecture for Post-Preemption Bottleneck Prediction.*

The regression tree recursive binary splitting minimizes Mean Squared Error (MSE):

$$\text{MSE}(t) = \frac{1}{N_t} \sum_{i \in \mathcal{D}_t} (y_i - \bar{y}_t)^2$$

Feature importances are computed by measuring total variance reduction contributed by each feature across all internal tree splits:
- `queue_length_m`: **$70.97\%$**
- `vehicle_count`: **$29.03\%$**
- `density_veh_per_m`: **$0.00\%$** (collinear with queue length)
- `hour_of_day`: **$0.00\%$** (static across simulation window)

This empirical derivation confirms that physical metric queue length is the single most vital engineering predictor for municipal traffic signal management.

### 3.6.3 Formal Statistical Hypothesis Testing Protocol (`analytics/hypothesis_test.py`)
Project Kinetica rejects anecdotal percentage improvement claims in favor of formal inferential hypothesis testing:
- **Null Hypothesis ($H_0$):** The median civilian wait time under Project Kinetica is greater than or equal to the fixed-timer baseline ($\tilde{\mu}_{\text{Kinetica}} \ge \tilde{\mu}_{\text{fixed}}$).
- **Alternative Hypothesis ($H_1$):** Project Kinetica achieves a statistically significant reduction in median wait time ($\tilde{\mu}_{\text{Kinetica}} < \tilde{\mu}_{\text{fixed}}$).

Testing Protocol:
1. **Shapiro-Wilk Normality Test:** Executed on wait-time distributions. If non-normality is confirmed ($p < 0.05$), non-parametric testing is mandated.
2. **Mann-Whitney U Test (Wilcoxon Rank-Sum):** Computes rank sum $R_1$ across combined, sorted samples:
$$U_1 = n_1 n_2 + \frac{n_1(n_1 + 1)}{2} - R_1$$
The two-tailed p-value is evaluated against significance ceiling $\alpha = 0.05$.
3. **Welch's Two-Sample t-Test:** Executed alongside Mann-Whitney for parametric comparison under unequal variances.
4. **Standardized Effect Size (Cohen's $d$):** Quantifies practical real-world significance:
$$d = \frac{\bar{X}_{\text{fixed}} - \bar{X}_{\text{Kinetica}}}{\sqrt{\frac{s_1^2 + s_2^2}{2}}}$$

---

## 3.7 Observability Layer & Hardware Interface Architecture

Project Kinetica bridges edge computation and human oversight through an observability stack comprising an edge gateway and real-time dashboard.

```
       +-------------------------------------------------------------+
       |             PHYSICAL EDGE SENSORS & ACTUATION               |
       |  - Camera Mast Streams                                      |
       |  - NEMA TS2 Solid-State Relay Interlocks                    |
       +-------------------------------------------------------------+
                                     |
                                     v
       +-------------------------------------------------------------+
       |         FASTAPI ASYNC EDGE GATEWAY (`edge_gateway.py`)      |
       |  - REST Endpoints: `/api/v1/observations`, `/api/v1/phases` |
       |  - WebSocket Endpoint: `/ws/telemetry` (JSON Stream @ 5 Hz) |
       |  - Hardware Relay Watchdog & Heartbeat Monitor              |
       +-------------------------------------------------------------+
                                     |
                                     v WebSocket / JSON Telemetry
       +-------------------------------------------------------------+
       |        NEXT.JS 14 CONTROL ROOM DASHBOARD (`frontend/`)      |
       |  - Real-Time Intersection Phase Visualizer                  |
       |  - Spatial Queue Heatmaps & Density Indicators              |
       |  - Priority Preemption Overrides & Urgency Heap Status      |
       |  - Automated Statistical Hypothesis Test Verification Panel |
       +-------------------------------------------------------------+
```
*Figure 3.6: Edge Gateway and Next.js Control Room Observability Architecture.*

### 3.7.1 FastAPI Edge Gateway & Bidirectional WebSocket Streaming
The roadside edge processor hosts a high-performance, asynchronous REST and WebSocket gateway engineered in FastAPI (`edge_gateway.py`):
- **WebSocket Streaming (`/ws/telemetry`):** Broadcasts real-time intersection telemetry frames at 5 Hz to connected dashboard clients. Telemetry frames contain active phase IDs, remaining green times, spatial queue lengths, and preemption statuses.
- **REST Telemetry Endpoints:** Exposes historical logs, benchmark results, and hardware health metrics via `/api/v1/metrics` and `/api/v1/decisions`.
- **Relay Watchdog Interface:** Interfaces with hardware relay drivers, maintaining an active heartbeat timer. If the cyber controller fails to emit a heartbeat within 2.0 seconds, the hardware watchdog automatically drops into fail-safe yellow/red flasher mode.

### 3.7.2 Next.js Control Room Real-Time Dashboard Architecture
The human-machine interface (HMI) is implemented in Next.js 14 and React (`frontend/`), following the Kinetica Control Room visual design specification (`design.md`):
- **Strict Read-Only Observability (`AGENTS.md` Rule 5):** The frontend never re-implements algorithmic logic (heap sorting, graph routing, or hypothesis testing). It acts purely as an observability layer rendering verified backend data contracts.
- **Intersection Detail View:** Renders 2D topological junction diagrams displaying active signal head colors, vehicle queue indicators, and real-time countdown timers.
- **Corridor Green-Wave Map:** Displays multi-intersection arterial corridors, tracking emergency vehicle positions and indicating pre-cleared downstream green bands.
- **Statistical Verification Panel:** Presents live Mann-Whitney U test p-values, wait-time histogram distributions, and Cohen's $d$ effect sizes, providing municipal operators with verified performance metrics.
"""
