# Project Kinetica: Technical Report & Documentation

**Course:** BCSE497J — Project I (Fall Semester 2026–2027)  
**Students:** Vaibhav P.K (23BDS1148), Mithil Girish (23BDS1168)  
**Department:** School of Computer Science and Engineering (SCOPE), VIT Chennai  

---

## Document Index & Chapter Navigation

This directory houses the complete, publication-grade academic report for Project Kinetica. Each chapter is modularized into its own markdown document, fully backed by empirical telemetry from the `results/` directory and passing unit tests.

| Document | Title / Content Description | Backing Artifacts & References |
|---|---|---|
| [`preliminary_pages.md`](file:///F:/project/Kinetica/report/preliminary_pages.md) | Title page, Bonafide Certificate, Declaration, Acknowledgments, Abstract, Table of Contents, Lists of Figures/Tables/Abbreviations. | VIT Chennai BCSE497J Guidelines |
| [`ch1_introduction.md`](file:///F:/project/Kinetica/report/ch1_introduction.md) | Urban mobility context, failure of fixed-timer controllers, emergency preemption deficiencies, 4-pillar CPS architecture, research objectives, scope boundaries, and formal Success Criteria (SC1–SC4). | Proposal & System Architecture |
| [`ch2_literature.md`](file:///F:/project/Kinetica/report/ch2_literature.md) | Comprehensive review of ATSC paradigms, Edge Vision in ITS, stochastic queuing, emergency preemption, and statistical benchmarking. Includes full comparative matrix and derivation of 5 core research gaps. | [`lit_review_matrix.md`](file:///F:/project/Kinetica/report/lit_review_matrix.md), [`references.bib`](file:///F:/project/Kinetica/report/references.bib) |
| [`ch3_methodology.md`](file:///F:/project/Kinetica/report/ch3_methodology.md) | Detailed mathematical models and architectural design: Data contracts (`schemas/lane_state.py`), Edge Vision & Homography ($H$), EWMA arrival modeling & Webster kinematic clearance, `LanePriorityHeap` & anti-starvation aging, directed-graph corridor preemption, and statistical analytics. | `schemas/`, `vision/`, `actuation/`, `preemption/`, `analytics/` |
| [`ch4_implementation_results.md`](file:///F:/project/Kinetica/report/ch4_implementation_results.md) | Quantitative experimental results: Vision frame rates (55.5 FPS) & confusion matrices, Poisson goodness-of-fit check ($\chi^2 = 2522.27, p=0.000$), heap latency benchmarks ($< 0.0008\text{ ms}$), Mann-Whitney U test wait reduction ($\Delta = 15.29\text{s}, p < 0.001$), bottleneck Gini importances, and publication figures. | `results/*.json`, `results/figures/*.png` |
| [`ch5_conclusion.md`](file:///F:/project/Kinetica/report/ch5_conclusion.md) | Synthesis of achievements, formal verification of SC1–SC4, environmental and societal impact analysis, system limitations, and detailed roadmap for ML trajectory prediction and vision-based saturation flow estimation. | `success_criteria.md`, `results/end_to_end_summary.json` |
| [`bibliography.md`](file:///F:/project/Kinetica/report/bibliography.md) | Formatted IEEE-style academic bibliography covering all 18 primary cited literature sources across the four research pillars. | [`references.bib`](file:///F:/project/Kinetica/report/references.bib) |
| [`appendices.md`](file:///F:/project/Kinetica/report/appendices.md) | Supplementary materials: full Pydantic data contract code, 62/62 automated Pytest execution logs, system hyperparameter table, and full end-to-end simulation summary JSON. | `schemas/lane_state.py`, `results/end_to_end_summary.json` |

---

## Literature Review Source Notes & Matrix
- [`lit_review_matrix.md`](file:///F:/project/Kinetica/report/lit_review_matrix.md): Full comparative matrix cross-referencing all 16 papers.
- [`notes_sciencedirect.md`](file:///F:/project/Kinetica/report/notes_sciencedirect.md): Critical analysis of Papageorgiou et al. (2020).
- [`notes_iet.md`](file:///F:/project/Kinetica/report/notes_iet.md): Critical analysis of Smith et al. (2022).
- [`notes_ieee_11380918.md`](file:///F:/project/Kinetica/report/notes_ieee_11380918.md): Critical analysis of Wang et al. (2023).
- [`notes_ieee_11490570.md`](file:///F:/project/Kinetica/report/notes_ieee_11490570.md): Critical analysis of Chen et al. (2024).
- [`notes_ijsrem.md`](file:///F:/project/Kinetica/report/notes_ijsrem.md): Critical analysis of Kumar et al. (2024).
- [`references.bib`](file:///F:/project/Kinetica/report/references.bib): Machine-readable BibTeX source bibliography.
