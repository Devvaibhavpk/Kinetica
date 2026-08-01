# Literature Review Matrix — Project Kinetica

| Source | Sensing method | Priority mechanism | Statistical validation | Gap vs. Kinetica |
|---|---|---|---|---|
| `sciencedirect_s240589632032629x` | Inductive loop detectors & point-based sensor counting | Heuristic / rule-based FIFO emergency signal override | Unvalidated macroscopic traffic simulation (no significance test) | Lacks continuous vision queue density, max-heap dynamic priority, and formal hypothesis testing |
| `iet_itr2_12518` | Stop-line radar / ultrasonic sensors & basic video blob counting | Unconditional Poisson arrival model with static green extensions | Observational queue measurements without baseline control group hypothesis testing | Assumes Poisson distribution holds unconditionally without Chi-Square goodness-of-fit checks; no green wave preemption |
| `ieee_11380918` | Standard 2D YOLO vehicle detection (pixel-space bounding boxes) | None (pure monitoring and counting pipeline) | Model mAP / Precision-Recall evaluation on static benchmark images | Operates only in 2D pixel-space without homography perspective mapping; no priority routing or signal control |
| `ieee_11490570` | GPS transponders on emergency vehicles & inductive loop triggers | Binary local override (single-node preemption) | Simulated preemption latency comparison without normality testing | Requires dedicated vehicle GPS hardware; lacks Max-Heap priority aging and directed graph corridor routing |
| `ijsrem_ev_prioritization` | Basic camera image thresholding & low-resolution object detection | Static rule-based emergency signal override | Empirical demonstration on small test samples without statistical significance tests | Lacks homography spatial metrics, max-heap starvation prevention aging, and formal hypothesis testing |

---

## Key Literature Gaps Addressed by Project Kinetica

### 1. Single vs. Multi-Intersection Corridor Preemption Gap (Task 1.12)
Prior works (e.g. `sciencedirect_s240589632032629x`, `ieee_11490570`, `ijsrem_ev_prioritization`) focus almost exclusively on isolated, single-intersection override logic. When an emergency vehicle triggers a sensor, only the local intersection responds, resulting in stop-and-go delays at consecutive downstream lights. Kinetica bridges this gap by implementing **directed-graph corridor path projection** via NetworkX (`preemption/graph_router.py`), pre-clearing green waves across multi-intersection routes ahead of time.

### 2. Normality Assumptions & Hypothesis Testing Gap (Task 1.13)
Existing adaptive traffic systems (e.g. `iet_itr2_12518`) routinely assume vehicle arrival distributions follow a Poisson process without verifying variance-to-mean ratios, and report informal average delay reductions without rigorous statistical proof. Kinetica addresses this by:
1. **Dynamic Distribution Verification**: Continuously testing Poisson arrival assumptions via real-time Chi-Square dispersion tests (`actuation/arrival_model.py`).
2. **Formal Hypothesis Testing**: Conducting Shapiro-Wilk normality tests on wait-time data, dynamically selecting between paired independent $t$-tests and Mann-Whitney U tests (`analytics/hypothesis_test.py`), and asserting statistical significance ($p < 0.05$).
