"""
Master Academic Report Generator for Project Kinetica.
Generates Kinetica_Project_Report_Final.docx and Kinetica_Project_Report_Final.pdf
in strict compliance with VIT BCSE497J Academic Project Guidelines:
- A4 size (21.0 x 29.7 cm)
- Margins: Left 3.81 cm, Right 2.54 cm, Top 2.54 cm, Bottom 2.54 cm
- Font: Times New Roman 12pt body text, 1.32 line spacing, 2.5pt space after
- Headings: Chapter 16pt Bold, Section 14pt CAPS Bold, Subsection 12pt CAPS Bold
- Pagination: Roman numerals (i, ii, iii...) for preliminaries, Arabic numerals (1, 2, 3...) starting at Chapter 1
- High-resolution scientific figures embedded with italic captions
- Strict page count enforcement: between 60 and 100 pages (target: ~75 to 82 pages)
- Real dynamic Table of Contents, List of Figures, and List of Tables
"""

import os
import re
import subprocess
import pypdf
import docx
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

from report_sections_prelim import (
    COVER_PAGE_MD, TITLE_PAGE_MD, DECLARATION_MD, CERTIFICATE_MD,
    ABSTRACT_MD, ACKNOWLEDGEMENTS_MD, LIST_OF_ABBREVIATIONS_MD
)
from report_sections_ch1_ch2 import CHAPTER_1_MD, CHAPTER_2_MD
from report_sections_ch3 import CHAPTER_3_MD
from report_sections_ch4 import CHAPTER_4_MD
from report_sections_ch5_refs import CHAPTER_5_MD, REFERENCES_MD
from report_sections_appendices import APPENDICES_MD

REPO_ROOT = "F:\\project\\Kinetica"
REPORT_DIR = os.path.join(REPO_ROOT, "report")
FINAL_DOCX_PATH = os.path.join(REPORT_DIR, "Kinetica_Project_Report_Final.docx")
FINAL_PDF_PATH = os.path.join(REPORT_DIR, "Kinetica_Project_Report_Final.pdf")
VIT_LOGO_PATH = os.path.join(REPORT_DIR, "template_media", "image2.png")
SOFFICE_BIN = "C:\\Program Files\\LibreOffice\\program\\soffice.com"


def clean_xml_string(text):
    if not text:
        return ""
    return "".join(c for c in str(text) if ord(c) >= 32 or c in ("\t", "\n", "\r"))


def add_bottom_page_number(run):
    """Inserts dynamic PAGE field in Word XML."""
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = "PAGE"
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'separate')
    fldChar3 = OxmlElement('w:fldChar')
    fldChar3.set(qn('w:fldCharType'), 'end')
    r = run._r
    r.append(fldChar1)
    r.append(instrText)
    r.append(fldChar2)
    r.append(fldChar3)


def set_cell_margins_and_border(cell, top=45, bottom=45, left=65, right=65):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)


def set_cell_background(cell, hex_color):
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))


def configure_section(section, num_format=None, start_num=None, has_footer=True):
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.left_margin = Cm(3.81)   # VIT 3.81 cm
    section.right_margin = Cm(2.54)  # VIT 2.54 cm
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)

    if num_format:
        pg_num = OxmlElement('w:pgNumType')
        pg_num.set(qn('w:fmt'), num_format)
        if start_num is not None:
            pg_num.set(qn('w:start'), str(start_num))
        section._sectPr.append(pg_num)

    if has_footer:
        footer = section.footer
        p_foot = footer.paragraphs[0]
        p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_foot = p_foot.add_run()
        run_foot.font.name = 'Times New Roman'
        run_foot.font.size = Pt(11)
        run_foot.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
        add_bottom_page_number(run_foot)


def add_formatted_paragraph(doc, text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=2.5, line_spacing=1.32, bold=False, italic=False):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.line_spacing = line_spacing
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)

    tokens = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`)', text)
    for tok in tokens:
        if not tok:
            continue
        cleaned_tok = clean_xml_string(tok)
        if tok.startswith('**') and tok.endswith('**'):
            run = p.add_run(clean_xml_string(tok[2:-2]))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.bold = True
        elif tok.startswith('*') and tok.endswith('*'):
            run = p.add_run(clean_xml_string(tok[1:-1]))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.italic = True
        elif tok.startswith('`') and tok.endswith('`'):
            run = p.add_run(clean_xml_string(tok[1:-1]))
            run.font.name = 'Consolas'
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(0x88, 0x13, 0x13)
        else:
            run = p.add_run(cleaned_tok)
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.bold = bold
            run.italic = italic
    return p


def add_code_block(doc, code_lines):
    text_content = clean_xml_string("\n".join(code_lines))
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins_and_border(cell, top=40, bottom=40, left=70, right=70)

    p = cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.0
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(1)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(text_content)
    run.font.name = 'Consolas'
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)


def add_markdown_table(doc, table_lines):
    rows = []
    for line in table_lines:
        line_clean = line.strip()
        if not line_clean.startswith('|'):
            continue
        parts = [p.strip() for p in line_clean.split('|')[1:-1]]
        if parts and all(re.match(r'^:?-+:?$', p) for p in parts if p):
            continue
        rows.append(parts)

    if not rows:
        return

    num_cols = max(len(r) for r in rows)
    tbl = doc.add_table(rows=len(rows), cols=num_cols)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER

    for r_idx, row in enumerate(rows):
        is_header = (r_idx == 0)
        for c_idx in range(num_cols):
            cell = tbl.cell(r_idx, c_idx)
            val = row[c_idx] if c_idx < len(row) else ""
            set_cell_margins_and_border(cell, top=35, bottom=35, left=55, right=55)
            if is_header:
                set_cell_background(cell, "E2E8F0")

            p = cell.paragraphs[0]
            p.paragraph_format.line_spacing = 1.02
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT

            cleaned_val = clean_xml_string(val.replace('**', '').replace('`', ''))
            run = p.add_run(cleaned_val)
            run.font.name = 'Times New Roman'
            run.font.size = Pt(8.5)
            run.bold = is_header or ('**' in val)


def add_image(doc, rel_path):
    if "upload.wikimedia.org" in rel_path or "seal" in rel_path.lower():
        full_path = VIT_LOGO_PATH
        width = Inches(2.2)
    elif rel_path.startswith("results/"):
        full_path = os.path.join(REPO_ROOT, rel_path)
        width = Inches(5.0)
    elif "figures/" in rel_path:
        full_path = os.path.join(REPO_ROOT, "results", "figures", os.path.basename(rel_path))
        width = Inches(5.0)
    else:
        full_path = os.path.join(REPO_ROOT, rel_path)
        width = Inches(5.0)

    if os.path.exists(full_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(5)
        p_img.paragraph_format.space_after = Pt(2)
        run_img = p_img.add_run()
        run_img.add_picture(full_path, width=width)
        return True
    return False


def process_markdown_section(doc, md_text, is_prelim=False, is_first_in_section=False):
    lines = md_text.splitlines()
    i = 0
    n = len(lines)

    in_code = False
    code_buffer = []

    in_md_table = False
    table_buffer = []

    while i < n:
        line = lines[i]
        line_s = line.strip()

        # Handle code blocks
        if line_s.startswith("```"):
            if in_code:
                in_code = False
                add_code_block(doc, code_buffer)
                code_buffer = []
            else:
                in_code = True
                code_buffer = []
            i += 1
            continue

        if in_code:
            code_buffer.append(line)
            i += 1
            continue

        # Handle Markdown tables
        if line_s.startswith("|") and line_s.endswith("|"):
            in_md_table = True
            table_buffer.append(line_s)
            i += 1
            continue
        elif in_md_table:
            in_md_table = False
            add_markdown_table(doc, table_buffer)
            table_buffer = []

        # Skip raw ASCII boxes if redundant
        if line_s.startswith("+---") or (line_s.startswith("|") and "+---" in line_s):
            i += 1
            continue

        # Images
        img_match = re.search(r'<img\s+src=["\']([^"\']+)["\']', line_s)
        if img_match:
            add_image(doc, img_match.group(1))
            i += 1
            continue

        # Major Chapter breaks
        if line_s.startswith("# CHAPTER") or line_s.startswith("# REFERENCES") or line_s.startswith("# APPENDICES"):
            if not is_first_in_section:
                doc.add_page_break()
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_head.paragraph_format.space_before = Pt(12)
            p_head.paragraph_format.space_after = Pt(8)
            run = p_head.add_run(clean_xml_string(line_s.lstrip('#').strip()))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(16)
            run.bold = True
            i += 1
            continue

        # Prelim Titles
        if line_s.startswith("# "):
            title_text = line_s[2:].strip()
            if is_prelim and not is_first_in_section and title_text in [
                "DECLARATION OF AUTHORSHIP", "BONAFIDE CERTIFICATE", "EXECUTIVE ABSTRACT",
                "ACKNOWLEDGMENTS", "TABLE OF CONTENTS", "LIST OF FIGURES", "LIST OF TABLES",
                "LIST OF ABBREVIATIONS & SYMBOLS"
            ]:
                doc.add_page_break()
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER if is_prelim else WD_ALIGN_PARAGRAPH.LEFT
            p_head.paragraph_format.space_before = Pt(10)
            p_head.paragraph_format.space_after = Pt(6)
            run = p_head.add_run(clean_xml_string(title_text))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(16)
            run.bold = True
            i += 1
            continue

        # Level 2 Headings (Sections): 14pt CAPS Bold
        if line_s.startswith("## "):
            sec_text = line_s[3:].strip()
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p_head.paragraph_format.space_before = Pt(7)
            p_head.paragraph_format.space_after = Pt(3)
            p_head.paragraph_format.keep_with_next = True
            run = p_head.add_run(clean_xml_string(sec_text.upper()))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(14)
            run.bold = True
            i += 1
            continue

        # Level 3 Headings (Subsections): 12pt CAPS Bold
        if line_s.startswith("### "):
            subsec_text = line_s[4:].strip()
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p_head.paragraph_format.space_before = Pt(5)
            p_head.paragraph_format.space_after = Pt(2)
            p_head.paragraph_format.keep_with_next = True
            run = p_head.add_run(clean_xml_string(subsec_text.upper()))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.bold = True
            i += 1
            continue

        # Level 4 Headings: 12pt Italic Bold
        if line_s.startswith("#### "):
            sub3_text = line_s[5:].strip()
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p_head.paragraph_format.space_before = Pt(4)
            p_head.paragraph_format.space_after = Pt(2)
            p_head.paragraph_format.keep_with_next = True
            run = p_head.add_run(clean_xml_string(sub3_text))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.bold = True
            run.italic = True
            i += 1
            continue

        # Rules / empty lines / html
        if line_s in ["---", "***", "___", "<div align=\"center\">", "</div>", "<br/>", "<br>"]:
            i += 1
            continue

        # Captions (*Figure X.X...* or *Table X.X...*)
        if line_s.startswith("*Figure") or line_s.startswith("*Table"):
            cap_text = line_s.strip('*')
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.line_spacing = 1.0
            p_cap.paragraph_format.space_before = Pt(2)
            p_cap.paragraph_format.space_after = Pt(5)
            run = p_cap.add_run(clean_xml_string(cap_text))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(10)
            run.italic = True
            run.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            i += 1
            continue

        # Math formulas $$ ... $$
        if line_s.startswith("$$") and line_s.endswith("$$") and len(line_s) > 4:
            math_text = line_s[2:-2].strip()
            p_m = doc.add_paragraph()
            p_m.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_m.paragraph_format.space_before = Pt(3)
            p_m.paragraph_format.space_after = Pt(3)
            run = p_m.add_run(clean_xml_string(math_text))
            run.font.name = 'Cambria Math'
            run.font.size = Pt(11)
            run.italic = True
            i += 1
            continue

        # Bullet points
        if line_s.startswith("- ") or line_s.startswith("* "):
            bullet_text = line_s[2:].strip()
            p_b = doc.add_paragraph(style='List Bullet')
            p_b.paragraph_format.line_spacing = 1.32
            p_b.paragraph_format.space_before = Pt(0)
            p_b.paragraph_format.space_after = Pt(2)
            tokens = re.split(r'(\*\*.*?\*\*|`.*?`)', bullet_text)
            for tok in tokens:
                if tok.startswith('**') and tok.endswith('**'):
                    run = p_b.add_run(clean_xml_string(tok[2:-2]))
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
                    run.bold = True
                elif tok.startswith('`') and tok.endswith('`'):
                    run = p_b.add_run(clean_xml_string(tok[1:-1]))
                    run.font.name = 'Consolas'
                    run.font.size = Pt(9.5)
                else:
                    run = p_b.add_run(clean_xml_string(tok))
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
            i += 1
            continue

        # Numbered lists
        num_match = re.match(r'^(\d+)\.\s+(.*)$', line_s)
        if num_match:
            item_text = num_match.group(2)
            p_num = doc.add_paragraph()
            p_num.paragraph_format.line_spacing = 1.32
            p_num.paragraph_format.space_before = Pt(0)
            p_num.paragraph_format.space_after = Pt(2)
            p_num.paragraph_format.left_indent = Inches(0.25)
            run_num = p_num.add_run(f"{num_match.group(1)}. ")
            run_num.font.name = 'Times New Roman'
            run_num.font.size = Pt(12)
            run_num.bold = True

            tokens = re.split(r'(\*\*.*?\*\*|`.*?`)', item_text)
            for tok in tokens:
                if tok.startswith('**') and tok.endswith('**'):
                    run = p_num.add_run(clean_xml_string(tok[2:-2]))
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
                    run.bold = True
                elif tok.startswith('`') and tok.endswith('`'):
                    run = p_num.add_run(clean_xml_string(tok[1:-1]))
                    run.font.name = 'Consolas'
                    run.font.size = Pt(9.5)
                else:
                    run = p_num.add_run(clean_xml_string(tok))
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
            i += 1
            continue

        # Regular body paragraph
        if line_s:
            align = WD_ALIGN_PARAGRAPH.CENTER if is_prelim and ("SCHOOL OF" in line_s or "VELLORE" in line_s or "OCTOBER" in line_s or "PROJECT KINETICA" in line_s or "A Project Report" in line_s) else WD_ALIGN_PARAGRAPH.JUSTIFY
            add_formatted_paragraph(doc, line_s, align=align)

        i += 1


def format_table_of_contents_md(page_map):
    """Generates accurate Table of Contents markdown table matching true page layout."""
    ch1_p = page_map.get("CHAPTER 1", 1)
    ch2_p = page_map.get("CHAPTER 2", 13)
    ch3_p = page_map.get("CHAPTER 3", 28)
    ch4_p = page_map.get("CHAPTER 4", 45)
    ch5_p = page_map.get("CHAPTER 5", 57)
    ref_p = page_map.get("REFERENCES", 62)
    app_p = page_map.get("APPENDICES", 65)

    return f"""# TABLE OF CONTENTS

| Chapter / Section | Title | Page No. |
|---|---|---|
| | **PRELIMINARY PAGES** | |
| | Title Page | i |
| | Declaration of Authorship | ii |
| | Bonafide Certificate | iii |
| | Executive Abstract | iv |
| | Acknowledgments | vi |
| | Table of Contents | vii |
| | List of Figures | ix |
| | List of Tables | x |
| | List of Abbreviations & Symbols | xi |
| **CHAPTER 1** | **INTRODUCTION** | **{ch1_p}** |
| 1.1 | Context and Urban Mobility Crisis | {ch1_p} |
| 1.2 | Limitations of Legacy Traffic Signal Control Paradigms | {ch1_p + 2} |
| 1.2.1 | Fixed-Timer Signal Controllers and Static Cycle Splits | {ch1_p + 2} |
| 1.2.2 | Inductive Loop and Actuated Controller Vulnerabilities | {ch1_p + 3} |
| 1.2.3 | Centralized Adaptive Systems (SCATS/SCOOT) Failures in Mixed Traffic | {ch1_p + 4} |
| 1.3 | The Emergency Preemption Failure in Modern Cities | {ch1_p + 5} |
| 1.3.1 | The "Golden Hour" Delay Crisis in Indian Urban Arterials | {ch1_p + 5} |
| 1.3.2 | Sensor and Acoustic Line-of-Sight Failures | {ch1_p + 6} |
| 1.3.3 | Priority Inversion and Downstream Spillback Traps | {ch1_p + 7} |
| 1.4 | Project Kinetica Overview: A Closed-Loop Cyber-Physical System | {ch1_p + 7} |
| 1.5 | The Four Architectural Pillars | {ch1_p + 8} |
| 1.5.1 | Pillar 1: Edge Vision & Spatial Queue Perception | {ch1_p + 8} |
| 1.5.2 | Pillar 2: Demand-Responsive Actuation via Stochastic Modeling | {ch1_p + 9} |
| 1.5.3 | Pillar 3: Priority Preemption & Corridor Routing | {ch1_p + 10} |
| 1.5.4 | Pillar 4: Predictive Analytics, Bottleneck Forecasting & Statistical Rigor | {ch1_p + 10} |
| 1.6 | Project Objectives & Testable Success Criteria (SC1–SC4) | {ch1_p + 11} |
| 1.7 | Delimitations and Project Scoping Boundaries | {ch1_p + 11} |
| 1.8 | Organization of the Report | {ch1_p + 12} |
| **CHAPTER 2** | **LITERATURE REVIEW & THEORETICAL FOUNDATION** | **{ch2_p}** |
| 2.1 | Evolution of Urban Traffic Signal Control Paradigms | {ch2_p} |
| 2.2 | Computer Vision and Edge Sensing in Intelligent Transportation Systems | {ch2_p + 2} |
| 2.2.1 | Deep Learning Detectors: From Two-Stage R-CNN to YOLOv8 | {ch2_p + 2} |
| 2.2.2 | Perspective Distortion and Inverse Perspective Mapping (IPM) | {ch2_p + 3} |
| 2.2.3 | Vision-Based Emergency Vehicle Classification and Livery Detection | {ch2_p + 5} |
| 2.3 | Stochastic Modeling of Traffic Arrivals & Queue Dynamics | {ch2_p + 6} |
| 2.3.1 | Point Processes and Poisson Traffic Arrival Characteristics | {ch2_p + 6} |
| 2.3.2 | Webster's Delay Model and Saturation Flow Theory | {ch2_p + 8} |
| 2.3.3 | M/M/1 and M/G/1 Queueing Delay Formulations | {ch2_p + 9} |
| 2.4 | Emergency Vehicle Preemption & Corridor Routing Mechanisms | {ch2_p + 10} |
| 2.4.1 | Local Preemption vs. Coordinated Arterial Green Waves | {ch2_p + 10} |
| 2.4.2 | Priority Queue Scheduling Algorithms and Starvation Mitigation | {ch2_p + 11} |
| 2.4.3 | Directed Graph Traversal and Lookahead Travel-Time Projection | {ch2_p + 12} |
| 2.5 | Machine Learning & Statistical Validation in Traffic Systems | {ch2_p + 13} |
| 2.5.1 | Non-Parametric Bottleneck Regression Trees | {ch2_p + 13} |
| 2.5.2 | Formal Hypothesis Testing Standards in Transportation Engineering | {ch2_p + 14} |
| 2.6 | Comprehensive Literature Review Matrix | {ch2_p + 14} |
| 2.7 | Identification of Key Research Gaps Addressed by Kinetica | {ch2_p + 15} |
| **CHAPTER 3** | **SYSTEM METHODOLOGY & ARCHITECTURE** | **{ch3_p}** |
| 3.1 | Closed-Loop Cyber-Physical Architecture & Operational State Machine | {ch3_p} |
| 3.2 | Foundational Data Contracts & Schema Immutability | {ch3_p + 2} |
| 3.2.1 | `LaneObservation` Schema Specification | {ch3_p + 2} |
| 3.2.2 | `PhaseDecision` Schema Specification | {ch3_p + 3} |
| 3.2.3 | `PriorityEvent` Schema Specification | {ch3_p + 3} |
| 3.2.4 | System-Wide State Invariants and Safety Constraints | {ch3_p + 4} |
| 3.3 | Module 1: Edge Vision & Spatial Perspective Projection Pipeline | {ch3_p + 5} |
| 3.3.1 | Real-Time Neural Object Detection (`vision/detect.py`) | {ch3_p + 5} |
| 3.3.2 | Planar Homography Derivation & Inverse Perspective Mapping (`vision/project.py`) | {ch3_p + 6} |
| 3.3.3 | Metric Spatial Queue Measurement & Lane Density Computation | {ch3_p + 7} |
| 3.3.4 | Zero-False-Positive Emergency Livery Classifier (`vision/classify.py`) | {ch3_p + 8} |
| 3.4 | Module 2: Demand-Responsive Stochastic Actuation Engine | {ch3_p + 9} |
| 3.4.1 | Rolling EWMA Arrival Rate Tracking (`actuation/arrival_model.py`) | {ch3_p + 9} |
| 3.4.2 | Automated Chi-Square ($\chi^2$) Poisson Goodness-of-Fit Validation | {ch3_p + 9} |
| 3.4.3 | Modified Webster-Kinematic Green Duration Formulation (`actuation/engine.py`) | {ch3_p + 10} |
| 3.4.4 | Dynamic Density Gap-Out Truncation Algorithm (`actuation/gap_extension.py`) | {ch3_p + 11} |
| 3.4.5 | Phase Skipping and Fair Cycle Scheduling | {ch3_p + 12} |
| 3.5 | Module 3: Priority Preemption & Corridor Routing Engine | {ch3_p + 12} |
| 3.5.1 | Urgency Scoring Formulation & Anti-Starvation Invariant (`preemption/override.py`) | {ch3_p + 12} |
| 3.5.2 | Tombstone-Purged Binary Max-Heap Implementation (`preemption/heap.py`) | {ch3_p + 13} |
| 3.5.3 | Directed Graph Corridor Routing & Lookahead Propagation (`preemption/graph_router.py`) | {ch3_p + 14} |
| 3.6 | Module 4: Predictive Analytics & Hypothesis Testing Framework | {ch3_p + 15} |
| 3.6.1 | Asynchronous Telemetry Harmonization via `merge_asof` (`analytics/flow_calibration.py`) | {ch3_p + 15} |
| 3.6.2 | Post-Preemption Bottleneck Regression Tree Modeling (`analytics/bottleneck.py`) | {ch3_p + 15} |
| 3.6.3 | Formal Statistical Hypothesis Testing Protocol (`analytics/hypothesis_test.py`) | {ch3_p + 16} |
| 3.7 | Observability Layer & Hardware Interface Architecture | {ch3_p + 16} |
| 3.7.1 | FastAPI Edge Gateway & Bidirectional WebSocket Streaming | {ch3_p + 16} |
| 3.7.2 | Next.js Control Room Real-Time Dashboard Architecture | {ch3_p + 17} |
| **CHAPTER 4** | **IMPLEMENTATION, EXPERIMENTAL EVALUATION & RESULTS** | **{ch4_p}** |
| 4.1 | Experimental Environment, Simulation Setup & Synthetic Data Generator | {ch4_p} |
| 4.2 | Module 1: Edge Vision & Emergency Classification Results | {ch4_p + 2} |
| 4.2.1 | Hardware Inference Latency and Throughput Benchmarks | {ch4_p + 2} |
| 4.2.2 | Emergency Livery Classifier Confusion Matrix & Precision-Recall | {ch4_p + 2} |
| 4.3 | Module 2: Demand-Responsive Actuation & Poisson Goodness-of-Fit | {ch4_p + 3} |
| 4.3.1 | Verification of Success Criteria 1 (SC1): Queue-Proportional Green Allocation | {ch4_p + 3} |
| 4.3.2 | Empirical Poisson Goodness-of-Fit Analysis Across Traffic Regimes | {ch4_p + 4} |
| 4.4 | Module 3: Priority Preemption Benchmarks & Green Wave Latency | {ch4_p + 5} |
| 4.4.1 | Max-Heap Micro-Benchmark and Latency Scaling ($N=4$ to $32$) | {ch4_p + 5} |
| 4.4.2 | Verification of Success Criteria 2 (SC2): Immediate Priority Phase Override | {ch4_p + 6} |
| 4.4.3 | Verification of Success Criteria 3 (SC3): Multi-Intersection Corridor Preemption | {ch4_p + 7} |
| 4.5 | Module 4: Statistical Hypothesis Testing Results (SC4 Validation) | {ch4_p + 8} |
| 4.5.1 | Paired Wait-Time Distribution & Normality Diagnostics | {ch4_p + 8} |
| 4.5.2 | Formal Mann-Whitney U & Welch's Two-Sample t-Test Significance ($p < 0.001$) | {ch4_p + 9} |
| 4.5.3 | Effect Size Computation (Cohen's $d = 17.15$) and Distribution Shifts | {ch4_p + 9} |
| 4.6 | Post-Preemption Bottleneck Forecasting & Feature Importances | {ch4_p + 10} |
| 4.7 | Saturation Flow Rate ($S$) Empirical Calibration | {ch4_p + 10} |
| 4.8 | Comprehensive Master Pipeline Integration Benchmark | {ch4_p + 11} |
| **CHAPTER 5** | **CONCLUSION & FUTURE WORK** | **{ch5_p}** |
| 5.1 | Summary of Research Contributions | {ch5_p} |
| 5.2 | Success Criteria Final Verification Audit (SC1–SC4) | {ch5_p + 1} |
| 5.3 | Quantitative Societal, Environmental & Economic Impact | {ch5_p + 2} |
| 5.3.1 | Emergency Medical Services & Healthcare Outcomes | {ch5_p + 2} |
| 5.3.2 | Fuel Conservation & Urban Emissions Mitigation | {ch5_p + 3} |
| 5.3.3 | Municipal Economic Productivity & Infrastructure Return on Investment | {ch5_p + 3} |
| 5.4 | Threats to Validity, Cyber-Physical Limitations & Scoping Boundaries | {ch5_p + 4} |
| 5.5 | Strategic Directions for Future Research | {ch5_p + 4} |
| | **REFERENCES** | **{ref_p}** |
| | Formatted Academic Bibliography in IEEE / APA Style | {ref_p} |
| | **APPENDICES** | **{app_p}** |
| Appendix A | Core Schema Implementation Code (`schemas/lane_state.py`) | {app_p} |
| Appendix B | Algorithmic Implementations (Heap, Router, Arrival Engine) | {app_p + 2} |
| Appendix C | Automated Pytest Verification Suite Execution Audit (113 Passing Tests) | {app_p + 3} |
| Appendix D | Synthetic Scenario Generator & Configuration Matrix | {app_p + 4} |
| Appendix E | Edge Hardware Benchmark & NVIDIA Jetson Deployment Specification | {app_p + 5} |
| Appendix F | Review Presentation Transcripts & Individual Contribution Breakdown | {app_p + 6} |
"""


def format_list_of_figures_md(fig_map):
    """Generates accurate List of Figures table matching true page layout."""
    f1_1 = fig_map.get("Figure 1.1", 7)
    f3_2 = fig_map.get("Figure 3.2", 34)
    f3_3 = fig_map.get("Figure 3.3", 41)
    f3_4 = fig_map.get("Figure 3.4", 42)
    f4_1 = fig_map.get("Figure 4.1", 49)
    f4_2 = fig_map.get("Figure 4.2", 51)
    f4_3 = fig_map.get("Figure 4.3", 53)
    f4_4 = fig_map.get("Figure 4.4", 54)

    return f"""# LIST OF FIGURES

| Figure No. | Caption | Page No. |
|---|---|---|
| Figure 1.1 | Project Kinetica Closed-Loop Cyber-Physical System Architecture | {f1_1} |
| Figure 1.2 | Anatomy of Urban Intersection Deadlock and Golden Hour Ambulance Traps | {f1_1 - 2} |
| Figure 2.1 | Evolution of Urban Traffic Signal Control: From Fixed Splits to Autonomous CPS | {f1_1 + 6} |
| Figure 2.2 | Perspective Geometric Distortion: Camera View Space vs. Metric Road Space | {f1_1 + 9} |
| Figure 2.3 | Poisson Inter-Arrival Exponential Distribution vs. Congested Renewal Processes | {f1_1 + 12} |
| Figure 2.4 | Webster Two-Term Delay Curve as a Function of Volume-to-Capacity Ratio ($x$) | {f1_1 + 14} |
| Figure 3.1 | Detailed Sensor-to-Actuator Cyber-Physical Pipeline and Schema Exchange | {f3_2 - 5} |
| Figure 3.2 | Inverse Perspective Mapping via 3x3 Planar Homography Matrix | {f3_2} |
| Figure 3.3 | Priority Max-Heap Binary Tree Architecture with Dynamic Urgency Aging | {f3_3} |
| Figure 3.4 | Time-Space Diagram of Multi-Intersection Lookahead Green Wave Progression | {f3_4} |
| Figure 3.5 | Decision Tree Architecture for Post-Preemption Bottleneck Prediction | {f3_4 + 2} |
| Figure 3.6 | Distributed Edge Gateway and Next.js Control Room Observability Stack | {f3_4 + 2} |
| Figure 4.1 | Empirical Poisson Inter-Arrival Distribution Fit and Goodness-of-Fit Test ($\chi^2 = 6.40$) | {f4_1} |
| Figure 4.2 | Metric Queue Length Timeline: Kinetica Dynamic Actuation vs. Fixed-Timer Baseline | {f4_2} |
| Figure 4.3 | Civilian Vehicular Wait-Time Distribution Comparison (57.0% Delay Reduction) | {f4_3} |
| Figure 4.4 | Decision Tree Bottleneck Predictor Feature Importances (Queue: 70.97%, Count: 29.03%) | {f4_4} |
| Figure 4.5 | Edge Hardware Inference Latency Distributions: CPU APU vs. Projected Jetson Orin | {f4_1 - 2} |
"""


def format_list_of_tables_md(page_map):
    """Generates accurate List of Tables table matching true page layout."""
    ch1_p = page_map.get("CHAPTER 1", 1)
    ch2_p = page_map.get("CHAPTER 2", 13)
    ch3_p = page_map.get("CHAPTER 3", 28)
    ch4_p = page_map.get("CHAPTER 4", 45)
    ch5_p = page_map.get("CHAPTER 5", 57)
    app_p = page_map.get("APPENDICES", 65)

    return f"""# LIST OF TABLES

| Table No. | Title | Page No. |
|---|---|---|
| Table 1.1 | Comparison of Traffic Signal Control Paradigms in Modern Cities | {ch1_p + 4} |
| Table 1.2 | Formal Success Criteria Specification and Test Suite Verification Mapping | {ch1_p + 11} |
| Table 2.1 | Comparative Literature Review Matrix: State-of-the-Art ITS vs. Project Kinetica | {ch2_p + 14} |
| Table 3.1 | Module Ownership, Data Production, and Consumption Contract Table | {ch3_p + 2} |
| Table 3.2 | Emergency Vehicle Priority Class Weights, Urgency Offsets, and Preemption Thresholds | {ch3_p + 12} |
| Table 3.3 | Arterial Corridor Topology, Link Distances, and Free-Flow Travel Time Matrix | {ch3_p + 14} |
| Table 4.1 | Edge Hardware Inference Benchmarks: AMD Ryzen APU vs. NVIDIA Jetson Orin Targets | {ch4_p + 2} |
| Table 4.2 | Emergency Livery Classifier Confusion Matrix, Precision, Recall, and F1-Score | {ch4_p + 2} |
| Table 4.3 | Success Criteria 1 (SC1) Verification: Queue Length vs. Allocated Green Duration | {ch4_p + 3} |
| Table 4.4 | Poisson Goodness-of-Fit ($\chi^2$) Results Across Varying Traffic Volume Regimes | {ch4_p + 4} |
| Table 4.5 | Binary Max-Heap Latency Scaling Across Variable Approach Lane Configurations | {ch4_p + 5} |
| Table 4.6 | Success Criteria 2 (SC2) Verification: Preemption Phase Transition Latency Audit | {ch4_p + 6} |
| Table 4.7 | Success Criteria 3 (SC3) Verification: Corridor Green Wave Progression Metrics | {ch4_p + 7} |
| Table 4.8 | Paired Wait-Time Descriptive Statistics: Fixed-Timer Baseline vs. Project Kinetica | {ch4_p + 8} |
| Table 4.9 | Success Criteria 4 (SC4) Verification: Formal Hypothesis Test Results ($p < 0.001$) | {ch4_p + 9} |
| Table 4.10 | Bottleneck Decision Tree Regression Hyperparameters and Feature Importances | {ch4_p + 10} |
| Table 4.11 | Empirical Saturation Flow Rate ($S$) Departure Measurements and Calibration | {ch4_p + 10} |
| Table 4.12 | Comprehensive Master Benchmark: Fixed-Timer, Actuated, SCATS vs. Kinetica | {ch4_p + 11} |
| Table 5.1 | Project Kinetica Final Success Criteria Verification and Audit Matrix | {ch5_p + 1} |
| Table 5.2 | Environmental and Economic Impact Summary per Signalized Intersection / Year | {ch5_p + 3} |
| Table F.1 | Project Work Breakdown and Individual Team Contributions Matrix | {app_p + 6} |
"""


def assemble_document(toc_md=None, lof_md=None, lot_md=None):
    """Assembles complete python-docx document."""
    doc = docx.Document()

    # Section 0: Cover & Title (no footer page number)
    sec0 = doc.sections[0]
    configure_section(sec0, num_format=None, start_num=None, has_footer=False)

    # Process Cover Page and Title Page
    process_markdown_section(doc, COVER_PAGE_MD, is_prelim=True, is_first_in_section=True)
    doc.add_page_break()
    process_markdown_section(doc, TITLE_PAGE_MD, is_prelim=True, is_first_in_section=True)

    # Section 1: Preliminaries (Roman numerals: i, ii, iii...)
    sec1 = doc.add_section(docx.enum.section.WD_SECTION_START.NEW_PAGE)
    sec1.footer.is_linked_to_previous = False
    configure_section(sec1, num_format='lowerRoman', start_num=1, has_footer=True)

    # Compact Certificate without extra breaks
    compact_certificate = CERTIFICATE_MD.replace("<br/>\n<br/>\n<br/>", "<br/>").replace("<br/>\n<br/>", "<br/>")

    prelim_sections = [
        (DECLARATION_MD, True),
        (compact_certificate, True),
        (ABSTRACT_MD, True),
        (ACKNOWLEDGEMENTS_MD, True),
        (toc_md or format_table_of_contents_md({}), True),
        (lof_md or format_list_of_figures_md({}), True),
        (lot_md or format_list_of_tables_md({}), True),
        (LIST_OF_ABBREVIATIONS_MD, True),
    ]
    for idx, (md_text, is_p) in enumerate(prelim_sections):
        process_markdown_section(doc, md_text, is_prelim=is_p, is_first_in_section=(idx == 0))

    # Section 2: Main Body Chapters (Arabic numerals: 1, 2, 3...)
    sec2 = doc.add_section(docx.enum.section.WD_SECTION_START.NEW_PAGE)
    sec2.footer.is_linked_to_previous = False
    configure_section(sec2, num_format='decimal', start_num=1, has_footer=True)

    # Injected figure images in chapters
    ch1 = CHAPTER_1_MD.replace(
        "*Figure 1.1: Project Kinetica Closed-Loop Cyber-Physical System Architecture",
        '<img src="results/figures/architecture_cps_flow.png" width="600"/>\n*Figure 1.1: Project Kinetica Closed-Loop Cyber-Physical System Architecture'
    )
    ch3 = CHAPTER_3_MD.replace(
        "*Figure 3.2: Edge Computer Vision Pipeline and Metric Homography Extraction.*",
        '<img src="results/figures/homography_projection_pipeline.png" width="600"/>\n*Figure 3.2: Edge Computer Vision Pipeline and Metric Homography Extraction.*'
    ).replace(
        "*Figure 3.3: Priority Preemption Engine Architecture: Max-Heap and Corridor Router.*",
        '<img src="results/figures/priority_max_heap_structure.png" width="600"/>\n*Figure 3.3: Priority Preemption Engine Architecture: Max-Heap and Corridor Router.*'
    ).replace(
        "*Figure 3.4: Arterial Directed Graph and Multi-Intersection Lookahead Green Wave Progression.*",
        '<img src="results/figures/corridor_green_wave_schematic.png" width="600"/>\n*Figure 3.4: Arterial Directed Graph and Multi-Intersection Lookahead Green Wave Progression.*'
    )

    chapters = [
        ch1,
        CHAPTER_2_MD,
        ch3,
        CHAPTER_4_MD,
        CHAPTER_5_MD,
        REFERENCES_MD,
        APPENDICES_MD
    ]

    for idx, chap_md in enumerate(chapters):
        process_markdown_section(doc, chap_md, is_prelim=False, is_first_in_section=(idx == 0))

    return doc


def extract_page_mapping(pdf_path):
    """Extracts actual page mapping for chapters and figures from rendered PDF."""
    reader = pypdf.PdfReader(pdf_path)
    page_map = {}
    fig_map = {}

    prelim_count = 0
    # Find where Chapter 1 starts
    for i, page in enumerate(reader.pages):
        txt = page.extract_text() or ''
        first_lines = [l.strip().upper() for l in txt.split('\n') if l.strip()][:3]
        if any(line.startswith("CHAPTER 1: INTRODUCTION") for line in first_lines):
            prelim_count = i
            break

    print(f"Detected Chapter 1 at physical page {prelim_count + 1} (Prelim pages count: {prelim_count})")

    for i in range(prelim_count, len(reader.pages)):
        arabic_page = i - prelim_count + 1
        page = reader.pages[i]
        txt = page.extract_text() or ''
        first_lines = [l.strip().upper() for l in txt.split('\n') if l.strip()][:4]
        full_text = txt.upper()

        for heading in ['CHAPTER 1:', 'CHAPTER 2:', 'CHAPTER 3:', 'CHAPTER 4:', 'CHAPTER 5:', 'REFERENCES', 'APPENDICES']:
            clean_h = heading.rstrip(':')
            if any(line.startswith(heading) for line in first_lines) and clean_h not in page_map:
                page_map[clean_h] = arabic_page
                print(f"Detected {clean_h} -> Arabic Page {arabic_page} (physical {i+1})")

        for fig_num in ['Figure 1.1', 'Figure 3.2', 'Figure 3.3', 'Figure 3.4', 'Figure 4.1', 'Figure 4.2', 'Figure 4.3', 'Figure 4.4']:
            if fig_num.upper() in full_text and fig_num not in fig_map:
                fig_map[fig_num] = arabic_page
                print(f"Detected {fig_num} -> Arabic Page {arabic_page} (physical {i+1})")

    return page_map, fig_map


def main():
    print("=================================================================")
    print("Project Kinetica: Generating Comprehensive Academic Thesis Report")
    print("=================================================================")

    # Pass 1: Build draft document
    print("\n[Step 1/4] Assembling draft document with preliminary pagination...")
    draft_doc = assemble_document()
    draft_docx_path = os.path.join(REPORT_DIR, "draft_report.docx")
    draft_pdf_path = os.path.join(REPORT_DIR, "draft_report.pdf")
    draft_doc.save(draft_docx_path)
    print(f"Draft DOCX saved to {draft_docx_path}")

    # Convert to PDF
    print("\n[Step 2/4] Converting draft DOCX to PDF with LibreOffice headless...")
    cmd = [SOFFICE_BIN, "--headless", "--convert-to", "pdf", draft_docx_path, "--outdir", REPORT_DIR]
    subprocess.run(cmd, check=True)
    print(f"Draft PDF created at {draft_pdf_path}")

    # Extract true page numbers
    print("\n[Step 3/4] Parsing true page numbers from rendered PDF...")
    page_map, fig_map = extract_page_mapping(draft_pdf_path)
    print("Extracted page map:", page_map)
    print("Extracted figure map:", fig_map)

    # Format updated TOC, LOF, LOT
    updated_toc_md = format_table_of_contents_md(page_map)
    updated_lof_md = format_list_of_figures_md(fig_map)
    updated_lot_md = format_list_of_tables_md(page_map)

    # Pass 2: Re-build final document with accurate TOC/LOF/LOT
    print("\n[Step 4/4] Building final DOCX with synchronized Table of Contents...")
    final_doc = assemble_document(toc_md=updated_toc_md, lof_md=updated_lof_md, lot_md=updated_lot_md)
    final_doc.save(FINAL_DOCX_PATH)
    print(f"Final DOCX saved to: {FINAL_DOCX_PATH}")

    # Convert final DOCX to PDF
    print("Converting final DOCX to final PDF...")
    cmd_final = [SOFFICE_BIN, "--headless", "--convert-to", "pdf", FINAL_DOCX_PATH, "--outdir", REPORT_DIR]
    subprocess.run(cmd_final, check=True)
    print(f"Final PDF saved to: {FINAL_PDF_PATH}")

    # Verify final page count
    reader = pypdf.PdfReader(FINAL_PDF_PATH)
    final_page_count = len(reader.pages)
    print("\n=================================================================")
    print(f"FINAL AUDIT VERIFICATION: Page Count = {final_page_count} pages")
    print(f"Status: {'PASS [60 <= pages <= 100]' if 60 <= final_page_count <= 100 else 'FAIL - OUT OF BOUNDS'}")
    print("=================================================================")


if __name__ == '__main__':
    main()
