"""
Master Report Builder for Project Kinetica.
Generates full_project_report.md and Kinetica_Project_Report_Final.docx
in strict compliance with VIT BCSE497J Academic Project Guidelines:
- A4 size (21.0 x 29.7 cm)
- Margins: Left 3.81 cm, Right 2.54 cm, Top 2.54 cm, Bottom 2.54 cm
- Font: Times New Roman 12pt consistently throughout body
- 1.5 line spacing (tables, captions, listings single spaced)
- Headings: Chapter 16pt Bold, Section 14pt CAPS Bold, Subsection 12pt CAPS Bold
- Arabic page numbers at bottom center
- Target: 60 - 100 pages
"""

import os
import re
import docx
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

# Import all section content modules
from report_sections_prelim import (
    COVER_PAGE_MD, TITLE_PAGE_MD, DECLARATION_MD, CERTIFICATE_MD,
    ABSTRACT_MD, ACKNOWLEDGEMENTS_MD, TABLE_OF_CONTENTS_MD,
    LIST_OF_FIGURES_MD, LIST_OF_TABLES_MD, LIST_OF_ABBREVIATIONS_MD
)
from report_sections_ch1_ch2 import CHAPTER_1_MD, CHAPTER_2_MD
from report_sections_ch3 import CHAPTER_3_MD
from report_sections_ch4 import CHAPTER_4_MD
from report_sections_ch5_refs import CHAPTER_5_MD, REFERENCES_MD
from report_sections_appendices import APPENDICES_MD

REPORT_DIR = "/Users/admin/Kinetica/report"
MD_OUTPUT_PATH = os.path.join(REPORT_DIR, "full_project_report.md")
DOCX_OUTPUT_PATH = os.path.join(REPORT_DIR, "Kinetica_Project_Report_Final.docx")
FIGURES_DIR = "/Users/admin/Kinetica/results/figures"


def clean_xml_string(text):
    """Sanitizes text to prevent XML control character errors."""
    if not text:
        return ""
    return "".join(c for c in str(text) if ord(c) >= 32 or c in ("\t", "\n", "\r"))


def add_bottom_page_number(run):
    """Inserts a dynamic PAGE number field in Word XML."""
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


def set_cell_margins_and_border(cell, top=100, bottom=100, left=150, right=150):
    """Sets cell padding and clean border in Word XML."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)


def set_cell_background(cell, hex_color):
    """Sets background shading color for table cells."""
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))


def configure_document_styles(doc):
    """Configures default styles matching VIT formatting rules."""
    section = doc.sections[0]
    section.page_width = Cm(21.0)    # A4 Width
    section.page_height = Cm(29.7)   # A4 Height
    section.left_margin = Cm(3.81)   # 3.81 cm (1.5 in)
    section.right_margin = Cm(2.54)  # 2.54 cm (1.0 in)
    section.top_margin = Cm(2.54)    # 2.54 cm
    section.bottom_margin = Cm(2.54) # 2.54 cm

    # Footer page number setup
    footer = section.footer
    p_foot = footer.paragraphs[0]
    p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_foot = p_foot.add_run()
    run_foot.font.name = 'Times New Roman'
    run_foot.font.size = Pt(12)
    run_foot.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
    add_bottom_page_number(run_foot)

    # Base Normal Style
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(12)
    normal_style.font.color.rgb = RGBColor(0x11, 0x18, 0x27)
    normal_style.paragraph_format.line_spacing = 1.5
    normal_style.paragraph_format.space_after = Pt(6)
    normal_style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY


def build_markdown_report():
    """Concatenates all modules into the full master Markdown file."""
    all_sections = [
        COVER_PAGE_MD,
        "\n\n---\n\n",
        TITLE_PAGE_MD,
        "\n\n---\n\n",
        DECLARATION_MD,
        "\n\n---\n\n",
        CERTIFICATE_MD,
        "\n\n---\n\n",
        ABSTRACT_MD,
        "\n\n---\n\n",
        ACKNOWLEDGEMENTS_MD,
        "\n\n---\n\n",
        TABLE_OF_CONTENTS_MD,
        "\n\n---\n\n",
        LIST_OF_FIGURES_MD,
        "\n\n---\n\n",
        LIST_OF_TABLES_MD,
        "\n\n---\n\n",
        LIST_OF_ABBREVIATIONS_MD,
        "\n\n---\n\n",
        CHAPTER_1_MD,
        "\n\n---\n\n",
        CHAPTER_2_MD,
        "\n\n---\n\n",
        CHAPTER_3_MD,
        "\n\n---\n\n",
        CHAPTER_4_MD,
        "\n\n---\n\n",
        CHAPTER_5_MD,
        "\n\n---\n\n",
        REFERENCES_MD,
        "\n\n---\n\n",
        APPENDICES_MD
    ]
    master_md = "".join(all_sections)
    with open(MD_OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(master_md)
    print(f"Master markdown written to {MD_OUTPUT_PATH} ({len(master_md)} bytes, {len(master_md.split())} words)")
    return master_md


def add_formatted_paragraph(doc, text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=6, italic=False, bold=False):
    """Adds a body paragraph with proper font, line spacing, and inline bold/italic parsing."""
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.line_spacing = 1.5
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
            run.font.size = Pt(10.5)
            run.font.color.rgb = RGBColor(0x99, 0x1B, 0x1B)
        else:
            run = p.add_run(cleaned_tok)
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.bold = bold
            run.italic = italic
    return p


def add_code_block(doc, code_lines):
    """Adds a formatted code block in Consolas 9pt with shaded background."""
    text_content = clean_xml_string("\n".join(code_lines))
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins_and_border(cell, top=140, bottom=140, left=180, right=180)

    p = cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.0
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(text_content)
    run.font.name = 'Consolas'
    run.font.size = Pt(9.0)
    run.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(0)
    p_spacer.paragraph_format.space_after = Pt(6)


def add_markdown_table(doc, table_lines):
    """Parses a markdown table and renders it as a styled Word table."""
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
            set_cell_margins_and_border(cell, top=80, bottom=80, left=100, right=100)
            if is_header:
                set_cell_background(cell, "E2E8F0")

            p = cell.paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT

            cleaned_val = clean_xml_string(val.replace('**', '').replace('`', ''))
            run = p.add_run(cleaned_val)
            run.font.name = 'Times New Roman'
            run.font.size = Pt(9.5 if is_header else 9.0)
            run.bold = is_header or ('**' in val)
            if is_header:
                run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(0)
    p_spacer.paragraph_format.space_after = Pt(6)


def add_ascii_table(doc, ascii_lines):
    """Renders ASCII box tables into a code box."""
    add_code_block(doc, ascii_lines)


def process_section_to_docx(doc, md_text, is_prelim=False):
    """Processes markdown text and adds structured Word elements."""
    lines = md_text.splitlines()
    i = 0
    n = len(lines)

    in_code = False
    code_buffer = []

    in_md_table = False
    table_buffer = []

    in_ascii_table = False
    ascii_buffer = []

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

        # Handle ASCII tables (+--- or |)
        if line_s.startswith("+---") or (line_s.startswith("|") and "+" in line_s):
            in_ascii_table = True
            ascii_buffer.append(line)
            i += 1
            continue
        elif in_ascii_table:
            if line_s.startswith("+---") or line_s.startswith("|"):
                ascii_buffer.append(line)
                i += 1
                continue
            else:
                in_ascii_table = False
                add_ascii_table(doc, ascii_buffer)
                ascii_buffer = []

        # Check for image insertions <img src="results/figures/..." />
        img_match = re.search(r'<img\s+src=["\']([^"\']+)["\']', line_s)
        if img_match:
            img_rel_path = img_match.group(1)
            if img_rel_path.startswith("results/figures/"):
                img_path = os.path.join("/Users/admin/Kinetica", img_rel_path)
            elif "figures/" in img_rel_path:
                img_path = os.path.join(FIGURES_DIR, os.path.basename(img_rel_path))
            else:
                img_path = os.path.join(REPORT_DIR, img_rel_path)

            if os.path.exists(img_path):
                p_img = doc.add_paragraph()
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_img.paragraph_format.space_before = Pt(8)
                p_img.paragraph_format.space_after = Pt(4)
                run_img = p_img.add_run()
                run_img.add_picture(img_path, width=Inches(5.5))
            i += 1
            continue

        # Page breaks for major chapters
        if line_s.startswith("# CHAPTER") or line_s.startswith("# REFERENCES") or line_s.startswith("# APPENDICES"):
            doc.add_page_break()
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_head.paragraph_format.space_before = Pt(16)
            p_head.paragraph_format.space_after = Pt(14)
            run = p_head.add_run(clean_xml_string(line_s.lstrip('#').strip()))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(16)
            run.bold = True
            run.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
            i += 1
            continue

        # Level 1 Heading (Preliminary page titles or major headings)
        if line_s.startswith("# "):
            title_text = line_s[2:].strip()
            if title_text in ["DECLARATION OF AUTHORSHIP", "BONAFIDE CERTIFICATE", "EXECUTIVE ABSTRACT",
                              "ACKNOWLEDGMENTS", "TABLE OF CONTENTS", "LIST OF FIGURES", "LIST OF TABLES",
                              "LIST OF ABBREVIATIONS & SYMBOLS"]:
                doc.add_page_break()
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER if is_prelim else WD_ALIGN_PARAGRAPH.LEFT
            p_head.paragraph_format.space_before = Pt(14)
            p_head.paragraph_format.space_after = Pt(10)
            run = p_head.add_run(clean_xml_string(title_text))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(16)
            run.bold = True
            run.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
            i += 1
            continue

        # Level 2 Heading (Sections: 1.1, 2.1, etc. - 14pt CAPS Bold)
        if line_s.startswith("## "):
            sec_text = line_s[3:].strip()
            if sec_text.startswith("Appendix"):
                doc.add_page_break()
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p_head.paragraph_format.space_before = Pt(12)
            p_head.paragraph_format.space_after = Pt(6)
            p_head.paragraph_format.keep_with_next = True
            run = p_head.add_run(clean_xml_string(sec_text.upper()))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(14)
            run.bold = True
            run.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
            i += 1
            continue

        # Level 3 Heading (Subsections: 1.1.1 - 12pt CAPS Bold)
        if line_s.startswith("### "):
            subsec_text = line_s[4:].strip()
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p_head.paragraph_format.space_before = Pt(8)
            p_head.paragraph_format.space_after = Pt(4)
            p_head.paragraph_format.keep_with_next = True
            run = p_head.add_run(clean_xml_string(subsec_text.upper()))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.bold = True
            run.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
            i += 1
            continue

        # Level 4 Heading (Sub-subsections - 12pt Italic)
        if line_s.startswith("#### "):
            sub3_text = line_s[5:].strip()
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p_head.paragraph_format.space_before = Pt(6)
            p_head.paragraph_format.space_after = Pt(2)
            p_head.paragraph_format.keep_with_next = True
            run = p_head.add_run(clean_xml_string(sub3_text))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.bold = True
            run.italic = True
            i += 1
            continue

        # Horizontal rules
        if line_s in ["---", "***", "___"]:
            i += 1
            continue

        # HTML divs / tags / empty lines
        if line_s in ["<div align=\"center\">", "</div>", "<br/>", "<br>"]:
            i += 1
            continue

        # Figure / Table Captions (*Figure X.X...* or *Table X.X...*)
        if line_s.startswith("*Figure") or line_s.startswith("*Table"):
            cap_text = line_s.strip('*')
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.line_spacing = 1.0
            p_cap.paragraph_format.space_before = Pt(3)
            p_cap.paragraph_format.space_after = Pt(8)
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
            p_m.paragraph_format.space_before = Pt(6)
            p_m.paragraph_format.space_after = Pt(6)
            run = p_m.add_run(clean_xml_string(math_text))
            run.font.name = 'Cambria Math'
            run.font.size = Pt(11.5)
            run.italic = True
            i += 1
            continue

        # Bullet points
        if line_s.startswith("- ") or line_s.startswith("* "):
            bullet_text = line_s[2:].strip()
            p_b = doc.add_paragraph(style='List Bullet')
            p_b.paragraph_format.line_spacing = 1.5
            p_b.paragraph_format.space_before = Pt(1)
            p_b.paragraph_format.space_after = Pt(3)
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
                    run.font.size = Pt(10)
                else:
                    run = p_b.add_run(clean_xml_string(tok))
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
            i += 1
            continue

        # Numbered list
        num_match = re.match(r'^(\d+)\.\s+(.*)$', line_s)
        if num_match:
            item_text = num_match.group(2)
            p_num = doc.add_paragraph()
            p_num.paragraph_format.line_spacing = 1.5
            p_num.paragraph_format.space_before = Pt(1)
            p_num.paragraph_format.space_after = Pt(3)
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
                    run.font.size = Pt(10)
                else:
                    run = p_num.add_run(clean_xml_string(tok))
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
            i += 1
            continue

        # Standard paragraph
        if line_s:
            align = WD_ALIGN_PARAGRAPH.CENTER if is_prelim and ("SCHOOL OF" in line_s or "VELLORE" in line_s or "OCTOBER" in line_s or "PROJECT KINETICA" in line_s) else WD_ALIGN_PARAGRAPH.JUSTIFY
            add_formatted_paragraph(doc, line_s, align=align)

        i += 1


def build_docx_report():
    """Generates the full styled DOCX report."""
    print("Initializing python-docx report document...")
    doc = docx.Document()
    configure_document_styles(doc)

    sections_list = [
        (COVER_PAGE_MD, True),
        (TITLE_PAGE_MD, True),
        (DECLARATION_MD, True),
        (CERTIFICATE_MD, True),
        (ABSTRACT_MD, True),
        (ACKNOWLEDGEMENTS_MD, True),
        (TABLE_OF_CONTENTS_MD, False),
        (LIST_OF_FIGURES_MD, False),
        (LIST_OF_TABLES_MD, False),
        (LIST_OF_ABBREVIATIONS_MD, False),
        (CHAPTER_1_MD, False),
        (CHAPTER_2_MD, False),
        (CHAPTER_3_MD, False),
        (CHAPTER_4_MD, False),
        (CHAPTER_5_MD, False),
        (REFERENCES_MD, False),
        (APPENDICES_MD, False),
    ]

    for idx, (sec_md, is_prelim) in enumerate(sections_list):
        print(f"Processing section {idx+1}/{len(sections_list)} into Word DOCX...")
        process_section_to_docx(doc, sec_md, is_prelim=is_prelim)

    doc.save(DOCX_OUTPUT_PATH)
    print(f"Successfully generated DOCX report at: {DOCX_OUTPUT_PATH}")

    doc_res = docx.Document(DOCX_OUTPUT_PATH)
    num_paras = len(doc_res.paragraphs)
    num_tables = len(doc_res.tables)
    total_words = sum(len(p.text.split()) for p in doc_res.paragraphs)
    print(f"Docx Statistics: {num_paras} paragraphs, {num_tables} tables, ~{total_words} words.")


if __name__ == "__main__":
    print("=== Starting Project Kinetica Academic Report Generation ===")
    build_markdown_report()
    build_docx_report()
    print("=== Generation Complete! ===")
