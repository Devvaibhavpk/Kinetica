# Article Review Notes: IEEE Xplore 11490570
**Title:** Emergency Vehicle Preemption and Corridor-Level Traffic Signal Control  
**Journal:** IEEE Xplore (2024)  
**Citation Key:** `ieee_11490570`  
**Access Status:** Requires institutional access — pull via VIT library portal  

---

### 1. Methodology & Sensing Approach
* Relies on **dedicated onboard GPS transponders** installed in emergency vehicles and connected via wireless roadside units (RSUs).
* Supplemented by stop-line inductive loops.
* **Limitations**: High hardware infrastructure cost; cannot detect unequipped emergency vehicles (e.g. private ambulances or school vans).

### 2. Priority & Preemption Mechanism
* Implements binary local override: when a GPS ping enters the intersection boundary, opposing phases are immediately cut short.
* **Limitations**: Lacks priority queue aging, meaning non-priority lanes can suffer severe starvation if multiple emergency pings occur back-to-back. Lacks multi-node graph projection for ahead-of-time corridor preemption.

### 3. Validation & Testing
* Tested in microscopic simulation environments (e.g. SUMO).
* Evaluates preemption response latency but omits normality verification (Shapiro-Wilk) and paired statistical hypothesis testing ($p$-values).

### 4. Critical Gaps Addressed by Kinetica
1. **Zero-Hardware Infrastructure Perception**: Kinetica uses camera-based YOLO classification (`vision/classify.py`) requiring zero onboard vehicle transponders.
2. **Starvation Prevention**: Kinetica incorporates an aging function in its Max-Heap priority queue (`preemption/heap.py`) to guarantee non-priority lanes are never starved indefinitely.
3. **Corridor Preemption**: Kinetica projects emergency vehicle paths across multi-intersection directed graphs (`preemption/graph_router.py`) to pre-clear green waves downstream.
