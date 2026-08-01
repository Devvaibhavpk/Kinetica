# Article Review Notes: IJSREM (2024)
**Title:** Priority Vehicle Detection and Smart Traffic Signal Overrides  
**Journal:** International Journal of Scientific Research in Engineering and Management (IJSREM)  
**Citation Key:** `ijsrem_ev_prioritization`  
**Access Status:** Open Access, CC-BY  

---

### 1. Methodology & Sensing Approach
* Uses basic camera image thresholding and lightweight pre-trained object detectors on low-resolution video feeds.
* Counts vehicles at the intersection but does not perform homography perspective transformation to measure real-world physical queue length in meters ($m$).

### 2. Priority & Preemption Mechanism
* Implements static rule-based priority overrides triggered whenever a priority vehicle class is detected.
* **Limitations**: Uses a rigid binary override without dynamic priority queueing, multi-vehicle ranking, or aging mechanisms to prevent non-priority traffic starvation.

### 3. Validation & Testing
* Demonstrates system functionality using small empirical test samples.
* Lacks statistical significance testing ($p$-values), distribution normality checks, or formal comparison against baseline controllers.

### 4. Critical Gaps Addressed by Kinetica
1. **Spatial Projection**: Kinetica converts 2D bounding boxes into real-world meter metrics (`vision/project.py`) via camera calibration.
2. **Dynamic Queue Management**: Kinetica ranks all competing lanes and priority vehicles using a Max-Heap (`preemption/heap.py`) with continuous aging multipliers.
3. **Formal Statistical Proof**: Kinetica measures performance improvements using paired sample hypothesis testing ($t$-test / Mann-Whitney U) in Phase 5 Analytics.
