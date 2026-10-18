#!/usr/bin/env python3
"""
scripts/apply_kinetica_report_updates.py
Master production script to apply all requested modifications to Kinetica_Project_Report_Final.docx:
1. Abstract strictly <= 30 lines (Times New Roman 14 Underlined Bold CAPS heading, justified 12pt body).
2. Table of Contents formatted in normal black and white matching Picture 1 (borderless, white bg, black text, no 'Chapter/Section' header).
3. All tables formatted with normal white background and black single borders.
4. Remove Physical Traffic Environment table (Table 8 / Picture 2).
5. Remove all raw Schema dataclass tables and Appendix A schema code dump; streamline Section 3.2.
6. Conclusion is purely descriptive, ~3 pages long (~1,180 words, 5 structured subsections, no tables/broken math).
7. Cite all 35 references [1] through [35] in-text across the report.
8. Format References in Google Scholar / APA format ([1]. Author (Year)...).
9. Enforce all template font sizes and margins: Left 3.81cm, Right/Top/Bottom 2.54cm, TNR 16/14/12pt.
"""

import re
import shutil
import docx
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls, qn

BACKUP_PATH = "report_new/Kinetica_Project_Report_Final_BACKUP.docx"
TARGET_PATH = "report_new/Kinetica_Project_Report_Final.docx"

def set_cell_white_bg(cell):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn('w:shd'))
    if shd is not None:
        tcPr.remove(shd)
    shd_xml = f'<w:shd {nsdecls("w")} w:val="clear" w:color="auto" w:fill="FFFFFF"/>'
    tcPr.append(parse_xml(shd_xml))

def set_table_black_borders(table):
    tblPr = table._tbl.tblPr
    existing_borders = tblPr.find(qn('w:tblBorders'))
    if existing_borders is not None:
        tblPr.remove(existing_borders)
    borders_xml = f"""
    <w:tblBorders {nsdecls("w")}>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    </w:tblBorders>
    """
    tblPr.append(parse_xml(borders_xml))

def set_table_no_borders(table):
    tblPr = table._tbl.tblPr
    existing_borders = tblPr.find(qn('w:tblBorders'))
    if existing_borders is not None:
        tblPr.remove(existing_borders)
    borders_xml = f"""
    <w:tblBorders {nsdecls("w")}>
        <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
    </w:tblBorders>
    """
    tblPr.append(parse_xml(borders_xml))

def remove_table_element(table):
    tbl_elem = table._tbl
    parent = tbl_elem.getparent()
    if parent is not None:
        parent.remove(tbl_elem)

def main():
    print(f"Restoring clean document from {BACKUP_PATH}...")
    shutil.copy(BACKUP_PATH, TARGET_PATH)
    doc = docx.Document(TARGET_PATH)
    print(f"Loaded {len(doc.paragraphs)} paragraphs and {len(doc.tables)} tables.")

    # 1. PAGE MARGINS
    print("\n--- 1. Setting Page Margins ---")
    for s in doc.sections:
        s.page_width = Cm(21.0)
        s.page_height = Cm(29.7)
        s.left_margin = Cm(3.81)
        s.right_margin = Cm(2.54)
        s.top_margin = Cm(2.54)
        s.bottom_margin = Cm(2.54)
    print("Page margins set to Left 3.81cm, Right/Top/Bottom 2.54cm.")

    # 2. REMOVE UNWANTED TABLES
    print("\n--- 2. Removing Unwanted Tables ---")
    tables_to_remove = []
    for t in doc.tables:
        if len(t.rows) == 0:
            continue
        first_txt = t.cell(0, 0).text.strip().replace('\n', ' ')
        if "PHYSICAL TRAFFIC ENVIRONMENT" in first_txt:
            print("  Found Physical Traffic Environment table -> Removing.")
            tables_to_remove.append(t)
        elif "class LaneObservation" in first_txt and "dataclass" in first_txt:
            print("  Found LaneObservation dataclass code table -> Removing.")
            tables_to_remove.append(t)
        elif "class PhaseDecision" in first_txt and "dataclass" in first_txt:
            print("  Found PhaseDecision dataclass code table -> Removing.")
            tables_to_remove.append(t)
        elif "class PriorityEvent" in first_txt and "dataclass" in first_txt:
            print("  Found PriorityEvent dataclass code table -> Removing.")
            tables_to_remove.append(t)
        elif "schemas/lane_state.py - Foundational Data Contracts" in first_txt:
            print("  Found Appendix A schemas/lane_state.py code table -> Removing.")
            tables_to_remove.append(t)
        elif "Criterion" in first_txt and len(t.rows[0].cells) > 2 and "Measured Quantitative Outcome" in t.rows[0].cells[2].text:
            print("  Found Table 5.1 Success Criteria matrix in Chapter 5 -> Removing.")
            tables_to_remove.append(t)
        elif "Economic / Impact Dimension" in first_txt:
            print("  Found Table 5.2 Economic impact audit in Chapter 5 -> Removing.")
            tables_to_remove.append(t)

    for t in tables_to_remove:
        remove_table_element(t)
    print(f"Removed {len(tables_to_remove)} tables. Remaining tables: {len(doc.tables)}.")

    # 3. STREAMLINE SECTION 3.2 (REMOVE SCHEMA) & RENUMBER APPENDICES
    print("\n--- 3. Streamlining Section 3.2 & Renumbering Appendices ---")
    for p in doc.paragraphs:
        txt = p.text.strip()
        if "3.2 FOUNDATIONAL DATA CONTRACTS & SCHEMA IMMUTABILITY" in txt:
            p.text = "3.2 INTER-MODULE DATA ARCHITECTURE & SAFETY INVARIANTS"
        elif "3.2.1 `LANEOBSERVATION` SCHEMA SPECIFICATION" in txt:
            p.text = "3.2.1 LANE OBSERVATION DATA STRUCTURE & PHYSICAL INVARIANTS"
        elif "3.2.2 `PHASEDECISION` SCHEMA SPECIFICATION" in txt:
            p.text = "3.2.2 PHASE DECISION COMMAND ARCHITECTURE & ACTUATION CONSTRAINTS"
        elif "3.2.3 `PRIORITYEVENT` SCHEMA SPECIFICATION" in txt:
            p.text = "3.2.3 PRIORITY EVENT STRUCTURE & OVERRIDE PROTOCOLS"
        elif "Schema Immutability Rule (AGENTS.md Rule 4)" in txt:
            p.text = "In distributed cyber-physical traffic control systems, architectural stability requires deterministic, strongly-typed data exchanges between sensing, actuation, and preemption modules. To eliminate runtime data divergence, race conditions, or uncoordinated modifications, Project Kinetica strictly enforces structured inter-module communication protocols across all architectural layers."
        elif "All inter-module communication is governed by three strongly-typed, immutable dataclasses defined in a single authoritative source file: schemas/lane_state.py" in txt:
            p.text = "All inter-module communication is governed by three strongly-typed domain structures: LaneObservation, PhaseDecision, and PriorityEvent. Subsystems interact exclusively through these validated structures, ensuring seamless pipeline decoupling and preventing data ambiguity across the cyber-physical feedback loop."
        elif "APPENDIX A: COMPLETE DATA CONTRACT SCHEMAS" in txt:
            p.text = ""
        elif "The following Python source code represents the immutable foundational data contract" in txt:
            p.text = ""
        elif "APPENDIX B: ALGORITHMIC IMPLEMENTATIONS" in txt:
            p.text = "APPENDIX A: ALGORITHMIC IMPLEMENTATIONS"
        elif "B.1 TOMBSTONE-PURGED BINARY MAX-HEAP SCHEDULER" in txt:
            p.text = "A.1 TOMBSTONE-PURGED BINARY MAX-HEAP SCHEDULER (`PREEMPTION/HEAP.PY`)"
        elif "B.2 DIRECTED-GRAPH LOOKAHEAD CORRIDOR ROUTER" in txt:
            p.text = "A.2 DIRECTED-GRAPH LOOKAHEAD CORRIDOR ROUTER (`PREEMPTION/GRAPH_ROUTER.PY`)"
        elif "APPENDIX C: AUTOMATED PYTEST VERIFICATION SUITE EXECUTION AUDIT" in txt:
            p.text = "APPENDIX B: AUTOMATED PYTEST VERIFICATION SUITE EXECUTION AUDIT"
        elif "APPENDIX D: SYNTHETIC SCENARIO GENERATOR & CONFIGURATION MATRIX" in txt:
            p.text = "APPENDIX C: SYNTHETIC SCENARIO GENERATOR & CONFIGURATION MATRIX"
        elif "APPENDIX E: EDGE HARDWARE BENCHMARK & NVIDIA JETSON DEPLOYMENT SPECIFICATION" in txt:
            p.text = "APPENDIX D: EDGE HARDWARE BENCHMARK & NVIDIA JETSON DEPLOYMENT SPECIFICATION"
        elif "Figure E.1:" in txt:
            p.text = p.text.replace("Figure E.1:", "Figure D.1:")
        elif "APPENDIX F: REVIEW PRESENTATION TRANSCRIPTS & INDIVIDUAL CONTRIBUTION BREAKDOWN" in txt:
            p.text = "APPENDIX E: REVIEW PRESENTATION TRANSCRIPTS & INDIVIDUAL CONTRIBUTION BREAKDOWN"
        elif "F.1 INDIVIDUAL WORK BREAKDOWN" in txt:
            p.text = "E.1 INDIVIDUAL WORK BREAKDOWN AND TEAM OWNERSHIP MATRIX"
        elif "Table F.1:" in txt:
            p.text = p.text.replace("Table F.1:", "Table E.1:")

    # Update Table 11 (Module Ownership) text
    for t in doc.tables:
        if len(t.rows) > 0 and "Module Name" in t.cell(0, 0).text:
            for r in t.rows:
                if "Schema" in r.cells[0].text:
                    r.cells[0].text = "Data Layer"
                    r.cells[1].text = "schemas/lane_state.py"
                    r.cells[2].text = "LaneObservation, PhaseDecision, PriorityEvent Data Models"
                    r.cells[3].text = "None (Foundational Shared Layer)"
                elif "Live Schemas" in r.cells[3].text:
                    r.cells[3].text = r.cells[3].text.replace("Live Schemas", "Live Data Models")

    # 4. CONDENSE ABSTRACT (STRICTLY <= 30 LINES)
    print("\n--- 4. Formatting Abstract (<= 30 lines) ---")
    abstract_start = None
    abstract_end = None
    for i, p in enumerate(doc.paragraphs):
        if "EXECUTIVE ABSTRACT" in p.text.upper() or p.text.strip() == "ABSTRACT":
            abstract_start = i
        if abstract_start is not None and i > abstract_start:
            if "ACKNOWLEDGMENT" in p.text.upper() or "CONTENTS" in p.text.upper():
                abstract_end = i
                break

    if abstract_start is not None and abstract_end is not None:
        p_head = doc.paragraphs[abstract_start]
        p_head.text = "ABSTRACT"
        p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_head.paragraph_format.space_before = Pt(12)
        p_head.paragraph_format.space_after = Pt(12)
        for r in p_head.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(14)
            r.bold = True
            r.underline = True
            r.font.color.rgb = RGBColor(0, 0, 0)

        for idx in range(abstract_start + 1, abstract_end):
            doc.paragraphs[idx].text = ""

        p_body = doc.paragraphs[abstract_start + 1]
        p_body.text = (
            "Urban traffic congestion represents one of the most critical socio-economic, environmental, and public "
            "safety challenges in modern metropolitan networks, causing billions of dollars in economic productivity losses "
            "and exacerbating emergency vehicle delays that compromise the critical \"Golden Hour\" of trauma care. "
            "Conventional traffic signal systems rely predominantly on rigid, open-loop fixed-timer controllers operating "
            "on static Webster timing splits, incapable of adapting to asymmetric vehicular demand surges or coordinating "
            "emergency preemption across multi-intersection corridors. To eliminate these systemic failure modes, this "
            "project introduces Project Kinetica—a closed-loop cyber-physical system (CPS) that replaces fixed-timer "
            "controllers with an edge-native, perception-driven, and statistically-modeled signal actuation platform. "
            "Kinetica integrates four tightly coupled architectural pillars: (1) real-time YOLOv8 neural detection combined "
            "with planar homography inverse perspective mapping (IPM) to compute true spatial queue lengths (in meters) "
            "and density, paired with an optical emergency livery classifier; (2) demand-responsive stochastic actuation "
            "tracking Poisson arrival rates via Exponentially Weighted Moving Average (EWMA), bounding green times via "
            "Webster-kinematic formulations, and filtering phase terminations using inter-vehicle density gap-outs; "
            "(3) deterministic emergency preemption utilizing a thread-safe, tombstone-purged binary max-heap with "
            "anti-starvation aging (sub-microsecond O(log N) dispatch) and a directed-graph lookahead router providing "
            "green-wave preclearance; and (4) predictive analytics combining asynchronous multi-modal telemetry "
            "harmonization (merge_asof), regression tree bottleneck forecasting, and formal inferential hypothesis testing. "
            "Validated across 113 automated unit and scenario tests, Kinetica achieves a 57.0% reduction in civilian vehicle "
            "wait times (decreasing delays from 42.6 s to 18.3 s, p < 0.001, Cohen's d = 17.15), decisively rejecting the null "
            "hypothesis of baseline equivalence while guaranteeing zero emergency preemption failures."
        )
        p_body.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_body.paragraph_format.line_spacing = 1.5
        p_body.paragraph_format.space_after = Pt(12)
        for r in p_body.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(12)
            r.font.color.rgb = RGBColor(0, 0, 0)

        p_kw = doc.paragraphs[abstract_start + 2]
        p_kw.text = (
            "Keywords: Cyber-Physical Systems (CPS), Intelligent Transportation Systems (ITS), Edge Computer Vision, "
            "Planar Homography, Inverse Perspective Mapping, Stochastic Actuation, Poisson Arrival Process, Webster Delay "
            "Model, Priority Max-Heap, Emergency Vehicle Preemption, Green Wave Corridor Routing, Formal Hypothesis Testing."
        )
        p_kw.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_kw.paragraph_format.line_spacing = 1.5
        p_kw.paragraph_format.space_after = Pt(12)
        for r in p_kw.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(12)
            r.font.color.rgb = RGBColor(0, 0, 0)
            if "Keywords:" in r.text:
                r.bold = True

    # 5. CHAPTER 5 - ONLY DESCRIPTIVE & ~3 PAGES
    print("\n--- 5. Rewriting Chapter 5 as Descriptive Narrative (~3 pages) ---")
    ch5_start = None
    ch5_end = None
    for i, p in enumerate(doc.paragraphs):
        if "CHAPTER 5: CONCLUSION & FUTURE WORK" in p.text.upper():
            ch5_start = i
        if ch5_start is not None and i > ch5_start:
            if p.text.strip().upper() == "REFERENCES":
                ch5_end = i
                break

    if ch5_start is not None and ch5_end is not None:
        for idx in range(ch5_start + 1, ch5_end):
            doc.paragraphs[idx].text = ""

        ch5_sections = [
            ("CHAPTER 5: CONCLUSION & FUTURE WORK", "CH_HEAD"),
            ("5.1 SUMMARY OF RESEARCH ACHIEVEMENTS AND SYSTEM REALIZATION", "SEC_HEAD"),
            (
                "This project successfully designed, implemented, and empirically validated Project Kinetica, a production-grade "
                "closed-loop cyber-physical system (CPS) that replaces antiquated, open-loop fixed-timer traffic controllers with "
                "an intelligent, perception-driven, and statistically-grounded signal actuation architecture. Over the course "
                "of this research, four major engineering and theoretical breakthroughs were achieved across the cyber-physical "
                "feedback loop. First, an edge-native spatial perception pipeline was developed using YOLOv8 deep convolutional "
                "neural networks paired with metric planar homography inverse perspective mapping (IPM). This architecture "
                "resolves the long-standing limitation of perspective compression, accurately transforming camera-space detections "
                "into true physical queue lengths (in meters) and spatial vehicle density (veh/m) across individual approach lanes. "
                "Furthermore, a zero-false-positive multi-attribute classifier successfully distinguishes emergency vehicle liveries "
                "and optical warning lightbars from civilian vehicles, ensuring reliable preemption triggering.", "BODY"
            ),
            (
                "Second, the system formulated a demand-responsive actuation engine that continuously tracks non-stationary "
                "vehicular arrivals using an Exponentially Weighted Moving Average (EWMA) Poisson arrival rate estimator. Dynamic "
                "green phase splits are allocated using a modified Webster-kinematic formulation that guarantees safe, bounded "
                "intervals between 10.0 and 60.0 seconds, while incorporating real-time saturation flow rates. Crucially, runtime "
                "Poisson goodness-of-fit hypothesis auditing ensures actuation decisions remain statistically grounded, while an "
                "adaptive headway density gap-out filter terminates green phases early when headway exceeds 3.0 seconds, completely "
                "eliminating wasted green intervals and maximizing intersection throughput.", "BODY"
            ),
            (
                "Third, the research established a deterministic priority preemption engine powered by a thread-safe, "
                "tombstone-purged binary max-heap. By incorporating dynamic urgency aging, the scheduler eliminates cross-street "
                "civilian starvation while delivering sub-microsecond preemption dispatch latencies. Beyond isolated junctions, "
                "a directed-graph lookahead router propagates green-wave preclearance commands across multi-intersection arterial "
                "corridors, flushing civilian queue backlogs before the approaching emergency vehicle arrives at the stopline. "
                "Fourth, an asynchronous telemetry harmonization pipeline (merge_asof) unites perception logs and actuation decisions, "
                "powering a non-parametric regression tree that accurately forecasts post-preemption secondary bottlenecks, while "
                "formal inferential hypothesis testing replaces anecdotal percentage claims with mathematical rigor.", "BODY"
            ),
            ("5.2 EMPIRICAL FINDINGS AND TESTABLE HYPOTHESIS VERIFICATION", "SEC_HEAD"),
            (
                "In strict accordance with empirical research methodology and project verification protocols, all four formal "
                "Success Criteria (SC1 through SC4) were evaluated across 113 automated unit, integration, and scenario tests in pytest. "
                "Under Success Criterion 1 (SC1: Perception-Driven Actuation Proportionality), empirical validation confirmed that "
                "allocated green durations exhibit a monotonic, positive correlation with physical spatial queue length. Under "
                "heavy congestion regimes with 75.0 m queues, the controller dynamically expands phase green times to the 60.0-second "
                "kinematic ceiling, while uncongested 5.0 m queues are allocated minimum 10.0-second clearance phases, achieving "
                "perfect proportional allocation across all test scenarios.", "BODY"
            ),
            (
                "Under Success Criterion 2 (SC2: Sub-Second Preemption Latency), the priority preemption engine demonstrated an "
                "algorithmic heap insertion and phase-transition command latency of less than 1.0 microsecond (0.00078 ms), well "
                "below the strict 500 ms cyber-physical threshold. The total physical transition duration, including standard 3.0-second "
                "yellow clearance and 1.5-second all-red safety buffers, executed within 4.501 seconds, completely eliminating "
                "yellow-trapping hazards and ensuring fail-safe signal transitions.", "BODY"
            ),
            (
                "Under Success Criterion 3 (SC3: Corridor Lookahead Preclearance), the directed-graph router successfully projected "
                "emergency vehicle trajectories across an arterial corridor consisting of four sequential signalized intersections. "
                "Downstream junctions initiated green-wave preclearance between 7.5 and 15.0 seconds in advance of arrival, completely "
                "flushing standing civilian queues and allowing emergency ambulances to maintain uninterrupted free-flow cruise speeds "
                "of 48.0 km/h with zero deceleration events.", "BODY"
            ),
            (
                "Under Success Criterion 4 (SC4: Statistical Validation of Delay Reduction), a rigorous paired hypothesis test was "
                "conducted comparing Kinetica against a standard fixed-timer Webster baseline across 100 synchronized simulation epochs. "
                "The fixed-timer controller produced a mean civilian delay of 42.64 seconds with a standard deviation of 1.48 seconds, "
                "whereas Kinetica reduced average civilian delay to 18.32 seconds with a standard deviation of 0.81 seconds. This represents "
                "an extraordinary 57.04% reduction in civilian vehicular wait times. Welch's unequal variances t-test yielded t = 143.51 "
                "(p < 0.001), and the non-parametric Mann-Whitney U test yielded U = 0.0 (p < 0.001), decisively rejecting the null "
                "hypothesis of equivalence. Furthermore, calculation of Cohen's d effect size yielded d = 17.15, far exceeding the "
                "standard threshold for high practical significance and confirming that Kinetica delivers massive, statistically "
                "indisputable performance improvements.", "BODY"
            ),
            ("5.3 OPERATIONAL INSIGHTS, CYBER-PHYSICAL DYNAMICS, AND DELIMITATIONS", "SEC_HEAD"),
            (
                "The end-to-end evaluation of Project Kinetica yields several vital engineering insights regarding cyber-physical "
                "interactions in urban traffic systems. A paramount finding is that metric spatial queue measurement (queue length in "
                "meters and spatial density in veh/m) provides vastly superior control fidelity compared to raw vehicle counts or "
                "traditional in-pavement inductive loop occupancy. Bounding box counts fail to capture spatial packing, vehicle mix "
                "(such as long transit buses versus passenger cars), or approach spillback risks. By rectifying camera perspectives "
                "through planar homography, Kinetica establishes an accurate spatial representation of traffic volume that directly "
                "correlates with kinematic clearance requirements.", "BODY"
            ),
            (
                "Furthermore, the investigation into post-preemption dynamics revealed that emergency signal preemption naturally "
                "induces secondary queue accumulations along non-preempted cross-streets. The regression tree bottleneck forecasting "
                "model demonstrated that physical queue length accounts for 70.97% of secondary delay variance, while vehicle count "
                "accounts for 29.03%. By leveraging these predictive importances, downstream controllers can proactively stage recovery "
                "timing plans to dissipate cross-street queues immediately following emergency clearance.", "BODY"
            ),
            (
                "In adhering to scientific rigor, several operational delimitations and cyber-physical boundary conditions must be "
                "acknowledged. First, vision-based edge sensing relies on optical visibility; adverse meteorological conditions such "
                "as torrential monsoon rainfall, dense fog, or direct optical sun glare can attenuate neural detection confidences. "
                "To mitigate this, Kinetica incorporates autonomous fail-safe fallbacks to conservative historical time-of-day splits "
                "whenever vision confidence drops below operational thresholds. Second, physical camera vibration caused by wind or "
                "heavy freight vehicles can induce perspective homography drift over time, necessitating periodic automated fiducial "
                "recalibration. Third, multi-intersection green waves depend on reliable inter-junction communication networks; packet "
                "drops are handled gracefully by falling back to autonomous isolated edge actuation.", "BODY"
            ),
            ("5.4 QUANTITATIVE SOCIETAL, ENVIRONMENTAL, AND ECONOMIC IMPACT", "SEC_HEAD"),
            (
                "The practical deployment of Project Kinetica across real-world urban signal networks offers profound quantitative "
                "benefits spanning public health, environmental sustainability, and municipal economics. In emergency medical "
                "services (EMS), patient survival in acute trauma, cardiac arrest, and stroke depends entirely on treatment within the "
                "critical 'Golden Hour'. In dense metropolitan environments where emergency vehicles frequently average transit "
                "speeds below 12 km/h due to signal gridlock, Kinetica's multi-intersection green waves elevate average emergency "
                "speeds to 48 km/h, reducing corridor transit times by over 68% and eliminating hazardous queue-trapping incidents. "
                "When deployed across a city network of 250 signalized intersections, this capability is projected to prevent hundreds "
                "of avoidable fatalities annually.", "BODY"
            ),
            (
                "From an environmental perspective, vehicular idling at redundant red signals represents a massive, preventable "
                "source of fuel waste and toxic air emissions. With passenger vehicles consuming approximately 0.6 liters of fuel "
                "per hour of idling, Kinetica's 24.3-second delay reduction per vehicle saves 0.00406 liters of fuel per intersection "
                "crossing. At a standard 4-approach arterial intersection servicing 35,000 vehicles daily, this equates to an annual "
                "savings of over 51,800 liters of fuel and an annual reduction of 119.8 metric tons of carbon dioxide (CO2) emissions "
                "per intersection, alongside substantial decreases in localized carbon monoxide, particulate matter (PM2.5), and "
                "nitrogen oxides (NOx).", "BODY"
            ),
            (
                "From an economic standpoint, the monetization of reduced civilian delays—calculated at a standard urban time value "
                "of $5.00 per vehicle-hour—yields over $437,000 in annual productivity savings per intersection. With commercial-grade "
                "edge compute hardware and industrial IP cameras requiring less than $7,500 in capital deployment costs per junction, "
                "Project Kinetica delivers a full infrastructure return on investment (ROI) within approximately two weeks of active "
                "operation, providing municipalities with an exceptionally cost-effective smart city mobility solution.", "BODY"
            ),
            ("5.5 STRATEGIC ROADMAP FOR REAL-WORLD DEPLOYMENT AND FUTURE RESEARCH", "SEC_HEAD"),
            (
                "Project Kinetica establishes an extensible cyber-physical foundation that opens multiple promising trajectories "
                "for future transportation research and municipal deployment. The immediate operational roadmap focuses on transitioning "
                "the validated system from synthetic hardware-in-the-loop environments into active municipal field pilot deployments. "
                "Deploying industrial NVIDIA Jetson Orin NX edge accelerators interfaced directly to standard NEMA TS2 traffic "
                "controller assemblies via Synchronous Data Link Control (SDLC) along an active arterial corridor in Chennai will "
                "provide invaluable real-world field verification under heterogeneous Indian traffic conditions.", "BODY"
            ),
            (
                "From an architectural perspective, future expansions include integrating emerging Vehicle-to-Everything (V2X) "
                "communication protocols, such as Dedicated Short-Range Communications (DSRC) and Cellular-V2X (C-V2X). A hybrid "
                "V2X-vision framework will enable approaching emergency vehicles to broadcast cryptographically authenticated "
                "Basic Safety Messages (BSMs) containing high-precision trajectory and GNSS telemetry, fusing telematics with edge "
                "camera homography observations to achieve centimeter-level localization even under severe optical occlusions.", "BODY"
            ),
            (
                "Additionally, the system architecture can be augmented with multi-modal thermal infrared sensing to provide "
                "uncompromised 24-hour perception regardless of lighting or adverse weather conditions, while facilitating dedicated "
                "pedestrian safety actuation at mid-block crossings. Finally, exploring decentralized Multi-Agent Deep Reinforcement "
                "Learning (MADRL) over edge-mesh radio topologies represents an exciting avenue for emergent grid-wide traffic "
                "coordination. In conclusion, Project Kinetica decisively demonstrates that uniting edge computer vision, stochastic "
                "arrival modeling, priority heap preemption, and predictive analytics transforms urban traffic management from "
                "antiquated open-loop timers into a resilient, adaptive, and life-saving cyber-physical reality.", "BODY"
            )
        ]

        curr_idx = ch5_start
        for txt, p_type in ch5_sections:
            p = doc.paragraphs[curr_idx]
            p.text = txt
            if p_type == "CH_HEAD":
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_before = Pt(12)
                p.paragraph_format.space_after = Pt(12)
                for r in p.runs:
                    r.font.name = "Times New Roman"
                    r.font.size = Pt(16)
                    r.bold = True
                    r.font.color.rgb = RGBColor(0, 0, 0)
            elif p_type == "SEC_HEAD":
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                p.paragraph_format.space_before = Pt(12)
                p.paragraph_format.space_after = Pt(6)
                for r in p.runs:
                    r.font.name = "Times New Roman"
                    r.font.size = Pt(14)
                    r.bold = True
                    r.font.color.rgb = RGBColor(0, 0, 0)
            elif p_type == "BODY":
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                p.paragraph_format.line_spacing = 1.5
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(6)
                for r in p.runs:
                    r.font.name = "Times New Roman"
                    r.font.size = Pt(12)
                    r.bold = False
                    r.font.color.rgb = RGBColor(0, 0, 0)
            curr_idx += 1

    # 6. IN-TEXT CITATIONS [1] TO [35]
    print("\n--- 6. Adding In-Text Citations [1] to [35] ---")
    replacements_list = [
        ("Masood et al. (2020) and Al-Dhamari et al. (2022)", "Masood et al. [19] and Al-Dhamari et al. [1]"),
        ("(Breiman et al., 1984)", "(Breiman et al. [2], 1984)"),
        ("Cohen's d", "Cohen's d [3]"),
        ("(May, 1990; Daganzo, 1997)", "(May [20], 1990; Daganzo [4], 1997; Zheng [35], 2014)"),
        ("(Dijkstra, 1959)", "(Dijkstra [5], 1959)"),
        ("Federal Highway Administration (FHWA)", "Federal Highway Administration (FHWA) [6]"),
        ("MULTIBAND (Gartner et al., 1991)", "MULTIBAND (Gartner et al. [7], 1991)"),
        ("(Gerlough & Schuhl, 1955; Newell, 1982)", "(Gerlough & Schuhl [8], 1955; Newell [22], 1982)"),
        ("Gross et al., 2008", "Gross et al. [9], 2008"),
        ("(Mallot et al., 1991; Hartley & Zisserman, 2004)", "(Mallot et al. [17], 1991; Hartley & Zisserman [10], 2004)"),
        ("SCOOT's dispersion models assume", "SCOOT's dispersion models (Hunt et al. [11], 1981; Robertson [26], 1969) assume"),
        ("Institute of Transportation Engineers (ITE)", "Institute of Transportation Engineers (ITE) [12]"),
        ("YOLOv8 Architecture (Ultralytics, 2023):", "YOLOv8 Architecture (Ultralytics [13], 2023):"),
        ("(Silberschatz et al., Operating System Concepts; Kleinrock, Queueing Systems)",
         "(Silberschatz et al. [27], Operating System Concepts; Kleinrock [14], Queueing Systems)"),
        ("Little (1966)", "Little [15] (1966)"),
        ("SCATS (Lowrie, 1982)", "SCATS (Lowrie [16], 1982)"),
        ("Mann-Whitney U Test", "Mann-Whitney U Test [18]"),
        ("NEMA TS2", "NEMA TS2 [21]"),
        ("scikit-learn", "scikit-learn [23]"),
        ("You Only Look Once (YOLO)", "You Only Look Once (YOLO) [24]"),
        ("Ren et al. (2015)", "Ren et al. [25] (2015)"),
        ("(HCM 2010)", "(HCM 2010 [28], [29])"),
        ("SciPy", "SciPy [30]"),
        ("Webster's classic delay formula", "Webster's [31] classic delay formula"),
        ("Webster's formulation", "Webster's [31] formulation"),
        ("Webster cycle splits", "Webster cycle splits [31]"),
        ("Welch's Two-Sample t-Test", "Welch's Two-Sample t-Test [32]"),
        ("(Zhao et al., 2017; Yu et al., 2018)", "(Zhao et al. [34], 2017; Yu et al. [33], 2018)")
    ]

    total_citations_added = 0
    for p in doc.paragraphs[:ch5_start]:
        for src, tgt in replacements_list:
            if src in p.text and not ("[" in p.text and tgt in p.text):
                p.text = p.text.replace(src, tgt, 1)
                total_citations_added += 1

    print(f"In-text citations verified and added: {total_citations_added} replacements made.")

    # 7. FORMAT REFERENCES SECTION IN APA / GOOGLE SCHOLAR FORMAT
    print("\n--- 7. Formatting References in Google Scholar / APA format ---")
    refs_idx = None
    app_idx = None
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip().upper() == "REFERENCES":
            refs_idx = i
        if refs_idx is not None and i > refs_idx:
            if p.text.strip().upper() == "APPENDICES":
                app_idx = i
                break

    if refs_idx is not None and app_idx is not None:
        p_ref = doc.paragraphs[refs_idx]
        p_ref.text = "REFERENCES"
        p_ref.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_ref.paragraph_format.space_before = Pt(12)
        p_ref.paragraph_format.space_after = Pt(12)
        for r in p_ref.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(16)
            r.bold = True
            r.font.color.rgb = RGBColor(0, 0, 0)

        apa_bib = [
            "[1]. Al-Dhamari, A., Sudirman, R., & Mahmood, N. H. (2022). Transfer learning with deep convolutional neural network for emergency vehicle detection and classification. IEEE Access, 10, 31920–31932. https://doi.org/10.1109/ACCESS.2022.3160277",
            "[2]. Breiman, L., Friedman, J. H., Olshen, R. A., & Stone, C. J. (1984). Classification and Regression Trees. Wadsworth & Brooks/Cole Advanced Books & Software.",
            "[3]. Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences (2nd ed.). Lawrence Erlbaum Associates.",
            "[4]. Daganzo, C. F. (1997). Fundamentals of Transportation and Traffic Operations. Pergamon Press.",
            "[5]. Dijkstra, E. W. (1959). A note on two problems in connexion with graphs. Numerische Mathematik, 1(1), 269–271. https://doi.org/10.1007/BF01386390",
            "[6]. Federal Highway Administration. (2006). Traffic Detector Handbook (Report No. FHWA-HRT-06-108, 3rd ed.). U.S. Department of Transportation.",
            "[7]. Gartner, N. H., Assman, S. F., Lasaga, F., & Hou, D. L. (1991). MULTIBAND - A variable-bandwidth arterial progression scheme. Transportation Research Record, 1287, 212–222.",
            "[8]. Gerlough, D. L., & Schuhl, A. (1955). Poisson and Traffic. The Eno Foundation for Highway Traffic Control.",
            "[9]. Gross, D., Shortle, J. F., Thompson, J. M., & Harris, C. M. (2008). Fundamentals of Queueing Theory (4th ed.). John Wiley & Sons.",
            "[10]. Hartley, R., & Zisserman, A. (2004). Multiple View Geometry in Computer Vision (2nd ed.). Cambridge University Press. https://doi.org/10.1017/CBO9780511811685",
            "[11]. Hunt, P. B., Robertson, D. I., Bretherton, R. D., & Winton, R. I. (1981). SCOOT - A Traffic Responsive Method of Coordinating Traffic Signals (TRRL Laboratory Report LR 1014). Transport and Road Research Laboratory.",
            "[12]. Institute of Transportation Engineers. (2020). Traffic Engineering Handbook (7th ed.). John Wiley & Sons.",
            "[13]. Jocher, G., Chaurasia, A., & Qiu, J. (2023). Ultralytics YOLOv8 (Version 8.0.0) [Computer software]. https://github.com/ultralytics/ultralytics",
            "[14]. Kleinrock, L. (1975). Queueing Systems, Volume 1: Theory. John Wiley & Sons.",
            "[15]. Little, J. D. C. (1966). The synchronization of traffic signals by mixed-integer linear programming. Operations Research, 14(4), 568–594. https://doi.org/10.1287/opre.14.4.568",
            "[16]. Lowrie, P. R. (1982). The Sydney Co-ordinated Adaptive Traffic System - Principles, Methodology, Algorithms. Proceedings of the International Conference on Road Traffic Signalling, 67–70.",
            "[17]. Mallot, H. A., Bülthoff, H. H., Little, J. J., & Bohrer, S. (1991). Inverse perspective mapping simplifies optical flow computation and obstacle detection. Biological Cybernetics, 64(3), 177–185. https://doi.org/10.1007/BF00201977",
            "[18]. Mann, H. B., & Whitney, D. R. (1947). On a test of whether one of two random variables is stochastically larger than the other. The Annals of Mathematical Statistics, 18(1), 50–60. https://doi.org/10.1214/aoms/1177730491",
            "[19]. Masood, A., Sheng, B., Li, P., Hou, X., Wei, X., Qin, J., & Feng, D. (2020). Computer-assisted intelligent traffic signal controller using deep convolutional neural networks. IEEE Transactions on Intelligent Transportation Systems, 21(9), 3703–3714. https://doi.org/10.1109/TITS.2019.2933758",
            "[20]. May, A. D. (1990). Traffic Flow Fundamentals. Prentice-Hall.",
            "[21]. National Electrical Manufacturers Association. (2003). NEMA Standards Publication TS 2-2003: Traffic Controller Assemblies with NTCIP Requirements. NEMA.",
            "[22]. Newell, G. F. (1982). Applications of Queueing Theory (2nd ed.). Chapman and Hall.",
            "[23]. Pedregosa, F., Varoquaux, G., Gramfort, A., Michel, V., Thirion, B., Grisel, O., Blondel, M., Prettenhofer, P., Weiss, R., Dubourg, V., Vanderplas, J., Passos, A., Cournapeau, D., Brucher, M., Perrot, M., & Duchesnay, E. (2011). Scikit-learn: Machine learning in Python. Journal of Machine Learning Research, 12, 2825–2830.",
            "[24]. Redmon, J., Divvala, S., Girshick, R., & Farhadi, A. (2016). You only look once: Unified, real-time object detection. Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR), 779–788. https://doi.org/10.1109/CVPR.2016.91",
            "[25]. Ren, S., He, K., Girshick, R., & Sun, J. (2015). Faster R-CNN: Towards real-time object detection with region proposal networks. Advances in Neural Information Processing Systems (NeurIPS), 28, 91–99.",
            "[26]. Robertson, D. I. (1969). TRANSYT: A Traffic Network Study Tool (TRRL Report LR 253). Transport and Road Research Laboratory.",
            "[27]. Silberschatz, A., Galvin, P. B., & Gagne, G. (2018). Operating System Concepts (10th ed.). John Wiley & Sons.",
            "[28]. Transportation Research Board. (2010). Highway Capacity Manual 2010. National Research Council.",
            "[29]. Transportation Research Board. (2016). Highway Capacity Manual: A Guide for Multimodal Mobility Analysis (6th ed.). National Research Council.",
            "[30]. Virtanen, P., Gommers, R., Oliphant, T. E., Haberland, M., Reddy, T., Cournapeau, D., Burovski, E., Peterson, P., Weckesser, W., Bright, J., van der Walt, S. J., Brett, M., Wilson, J., Millman, K. J., Mayorov, N., Nelson, A. R. J., Jones, E., Kern, R., Larson, E., … SciPy 1.0 Contributors. (2020). SciPy 1.0: Fundamental algorithms for scientific computing in Python. Nature Methods, 17(3), 261–272. https://doi.org/10.1038/s41592-019-0686-2",
            "[31]. Webster, F. V. (1958). Traffic Signal Settings (Road Research Technical Paper No. 39). Her Majesty's Stationery Office.",
            "[32]. Welch, B. L. (1947). The generalization of 'Student's' problem when several different population variances are involved. Biometrika, 34(1/2), 28–35. https://doi.org/10.2307/2332510",
            "[33]. Yu, B., Yin, H., & Zhu, Z. (2018). Spatio-temporal graph convolutional networks: A deep learning framework for traffic forecasting. Proceedings of the 27th International Joint Conference on Artificial Intelligence (IJCAI), 3634–3640. https://doi.org/10.24963/ijcai.2018/505",
            "[34]. Zhao, Z., Chen, W., Wu, X., Chen, P. C. Y., & Liu, J. (2017). LSTM network: A deep learning approach for short-term traffic forecast. IET Intelligent Transport Systems, 11(2), 68–75. https://doi.org/10.1049/iet-its.2016.0208",
            "[35]. Zheng, Z. (2014). Recent developments and research needs in modeling lane changing. Transportation Research Part B: Methodological, 60, 16–32. https://doi.org/10.1016/j.trb.2013.11.009"
        ]

        ref_c = 0
        for p_i in range(refs_idx + 1, app_idx):
            p = doc.paragraphs[p_i]
            if ref_c < len(apa_bib):
                p.text = apa_bib[ref_c]
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                p.paragraph_format.line_spacing = 1.15
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(4)
                for r in p.runs:
                    r.font.name = "Times New Roman"
                    r.font.size = Pt(11)
                    r.font.color.rgb = RGBColor(0, 0, 0)
                ref_c += 1
            else:
                p.text = ""

    # 8. TABLE FORMATTING: WHITE BACKGROUND & CLEAN BLACK BORDERS
    print("\n--- 8. Formatting All Tables (White Background & Black Lines) ---")
    for tbl_idx, table in enumerate(doc.tables):
        is_toc = False
        if len(table.rows) > 0:
            first_row_txt = " ".join(c.text.strip() for c in table.rows[0].cells)
            if "Declaration of Authorship" in first_row_txt or "Chapter / Section" in first_row_txt:
                is_toc = True

        if is_toc:
            # Table of Contents: borderless, white bg, black text matching Picture 1
            set_table_no_borders(table)
            if len(table.rows) > 0 and "Chapter / Section" in table.rows[0].cells[0].text:
                table._tbl.remove(table.rows[0]._tr)

            for r in table.rows:
                set_cell_white_bg(r.cells[0])
                set_cell_white_bg(r.cells[1])
                set_cell_white_bg(r.cells[2])
                c0 = r.cells[0].text.strip()
                c1 = r.cells[1].text.strip()
                if "Executive Abstract" in c1:
                    r.cells[1].text = "Abstract"
                elif "Foundational Data Contracts & Schema Immutability" in c1:
                    r.cells[1].text = "Inter-Module Data Architecture & Safety Invariants"
                elif "Summary of Research Contributions" in c1:
                    r.cells[1].text = "Summary of Research Achievements and System Realization"
                elif "Success Criteria Final Verification Audit (SC1-SC4)" in c1:
                    r.cells[1].text = "Empirical Findings and Testable Hypothesis Verification"
                elif "Quantitative Societal, Environmental & Economic Impact" in c1:
                    r.cells[1].text = "Operational Insights, Cyber-Physical Dynamics, and Delimitations"
                elif "Threats to Validity & Cyber-Physical Scoping Boundaries" in c1:
                    r.cells[1].text = "Quantitative Societal, Environmental, and Economic Impact"
                elif "Strategic Directions for Future Research" in c1:
                    r.cells[1].text = "Strategic Roadmap for Real-World Deployment and Future Research"
                elif "Complete Data Contracts, Core Algorithms & Test Audits" in c1:
                    r.cells[1].text = "Algorithmic Implementations, Verification Audit & Hardware Specs"

                for cell in r.cells:
                    for p in cell.paragraphs:
                        for r_run in p.runs:
                            r_run.font.name = "Times New Roman"
                            r_run.font.size = Pt(11)
                            r_run.font.color.rgb = RGBColor(0, 0, 0)
                            if c0.startswith("CHAPTER") or c1 in ["CONTENTS", "LIST OF FIGURES", "LIST OF TABLES", "LIST OF ACRONYMS"]:
                                r_run.bold = True
        else:
            # All other tables: white background, single black borders
            set_table_black_borders(table)
            for r_idx, r in enumerate(table.rows):
                is_head = (r_idx == 0)
                for cell in r.cells:
                    set_cell_white_bg(cell)
                    for p in cell.paragraphs:
                        p.paragraph_format.line_spacing = 1.15
                        for r_run in p.runs:
                            r_run.font.name = "Times New Roman"
                            r_run.font.size = Pt(9.5 if is_head else 9.0)
                            r_run.font.color.rgb = RGBColor(0, 0, 0)
                            if is_head:
                                r_run.bold = True

    # 9. ENFORCE FONT SIZES, JUSTIFICATION & STYLES ACROSS WHOLE DOCUMENT
    print("\n--- 9. Enforcing Template Font Size & Justification Rules ---")
    for i, p in enumerate(doc.paragraphs):
        txt = p.text.strip()
        if not txt:
            continue

        is_prelim_title = (i < 35 and any(term in txt for term in [
            "PROJECT KINETICA", "BACHELOR OF TECHNOLOGY", "VELLORE INSTITUTE",
            "Submitted in partial", "by", "SCHOOL OF COMPUTER SCIENCE"
        ]))

        is_ch_head = bool(re.match(r'^CHAPTER\s+\d+[:\s]', txt) or txt in [
            "DECLARATION OF AUTHORSHIP", "BONAFIDE CERTIFICATE", "ABSTRACT",
            "EXECUTIVE ABSTRACT", "ACKNOWLEDGMENTS", "TABLE OF CONTENTS", "CONTENTS",
            "LIST OF FIGURES", "LIST OF TABLES", "LIST OF ABBREVIATIONS & SYMBOLS",
            "REFERENCES", "APPENDICES"
        ])

        is_sec_head = bool(re.match(r'^\d+\.\d+\s+[A-Z]', txt) or re.match(r'^[A-E]\.\d+\s+[A-Z]', txt) or re.match(r'^APPENDIX\s+[A-E]:', txt))
        is_subsec_head = bool(re.match(r'^\d+\.\d+\.\d+\s+[A-Z]', txt))
        is_caption = bool(txt.startswith("Figure ") or txt.startswith("Table "))

        if is_prelim_title:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif is_ch_head:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(12)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(16)
                r.bold = True
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif is_sec_head:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(6)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(14)
                r.bold = True
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif is_subsec_head:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(4)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(12)
                r.bold = True
                r.font.color.rgb = RGBColor(0, 0, 0)
        elif is_caption:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(6)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(10)
                r.font.color.rgb = RGBColor(0, 0, 0)
        else:
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.line_spacing = 1.5
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(6)
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.size = Pt(12)
                r.font.color.rgb = RGBColor(0, 0, 0)

    print("\n--- 10. Saving Final Document ---")
    doc.save(TARGET_PATH)
    print(f"Document successfully saved to {TARGET_PATH}!")

if __name__ == "__main__":
    main()
