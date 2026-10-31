from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(r"C:\Users\Admin\Desktop\Haven")
OUTPUT = ROOT / "output" / "Haven_Project_Overview.docx"
LOGO = ROOT / "apps" / "citizen" / "public" / "brand" / "haven-logo-rounded.png"

FOREST = "123B2E"
PINE = "0C2A21"
LEAF = "B8E05A"
SAGE = "E8F0E9"
PALE = "F6F3EC"
INK = "17211C"
MUTED = "5F6E66"
LINE = "D9D9D9"
WHITE = "FFFFFF"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=120, start=140, bottom=120, end=140):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table, color=LINE, size="6"):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:color"), color)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_keep_with_next(paragraph):
    p_pr = paragraph._p.get_or_add_pPr()
    keep = OxmlElement("w:keepNext")
    p_pr.append(keep)


def remove_paragraph_borders(paragraph):
    p_pr = paragraph._p.get_or_add_pPr()
    borders = p_pr.find(qn("w:pBdr"))
    if borders is not None:
        p_pr.remove(borders)
    borders = OxmlElement("w:pBdr")
    for edge in ("top", "left", "bottom", "right", "between", "bar"):
        element = OxmlElement(f"w:{edge}")
        element.set(qn("w:val"), "nil")
        borders.append(element)
    p_pr.append(borders)


def add_page_number(paragraph):
    run = paragraph.add_run()
    run.font.name = "Arial"
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(MUTED)
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instruction = OxmlElement("w:instrText")
    instruction.set(qn("xml:space"), "preserve")
    instruction.text = " PAGE "
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([begin, instruction, end])


def add_heading(doc, text, level=1):
    paragraph = doc.add_paragraph(text, style=f"Heading {level}")
    set_keep_with_next(paragraph)
    return paragraph


def add_body(doc, text, bold_lead=None):
    paragraph = doc.add_paragraph()
    if bold_lead:
        lead = paragraph.add_run(bold_lead)
        lead.bold = True
    paragraph.add_run(text)
    return paragraph


def add_bullets(doc, items):
    for item in items:
        paragraph = doc.add_paragraph(style="List Bullet")
        paragraph.add_run(item)


def add_table(doc, headers, rows, widths):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table)
    header = table.rows[0]
    set_repeat_table_header(header)
    for index, text in enumerate(headers):
        cell = header.cells[index]
        cell.width = Inches(widths[index])
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        set_cell_shading(cell, FOREST)
        set_cell_margins(cell)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(text)
        r.bold = True
        r.font.color.rgb = RGBColor.from_string(WHITE)
        r.font.size = Pt(9.5)
    for row_index, row_values in enumerate(rows):
        cells = table.add_row().cells
        for index, text in enumerate(row_values):
            cell = cells[index]
            cell.width = Inches(widths[index])
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_margins(cell)
            if row_index % 2:
                set_cell_shading(cell, "F3F7F3")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(text)
            r.font.size = Pt(9.25)
            r.font.color.rgb = RGBColor.from_string(INK)
    return table


def add_page_break(doc):
    doc.add_page_break()


def configure_document(doc):
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.72)
    section.bottom_margin = Inches(0.68)
    section.left_margin = Inches(0.78)
    section.right_margin = Inches(0.78)

    normal = doc.styles["Normal"]
    normal.font.name = "Arial"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor.from_string(INK)
    normal.paragraph_format.space_after = Pt(7)
    normal.paragraph_format.line_spacing = 1.12

    title = doc.styles["Title"]
    title.font.name = "Arial"
    title.font.size = Pt(30)
    title.font.bold = True
    title.font.color.rgb = RGBColor(0, 0, 0)
    title.paragraph_format.space_after = Pt(10)

    for name, size, before, after in (
        ("Heading 1", 19, 15, 8),
        ("Heading 2", 13, 11, 5),
    ):
        style = doc.styles[name]
        style.font.name = "Arial"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True

    bullet = doc.styles["List Bullet"]
    bullet.font.name = "Arial"
    bullet.font.size = Pt(10.25)
    bullet.font.color.rgb = RGBColor.from_string(INK)
    bullet.paragraph_format.left_indent = Inches(0.22)
    bullet.paragraph_format.first_line_indent = Inches(-0.16)
    bullet.paragraph_format.space_after = Pt(4)

    footer = section.footer
    footer.is_linked_to_previous = False
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_before = Pt(4)
    add_page_number(p)


def build_document():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = Document()
    configure_document(doc)

    # Page 1
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(25)
    logo_run = p.add_run()
    inline = logo_run.add_picture(str(LOGO), width=Inches(1.25))
    inline._inline.docPr.set("descr", "Haven logo")

    title = doc.add_paragraph("Haven Project Overview", style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    remove_paragraph_borders(title)
    subtitle = doc.add_paragraph("Citizen Safety and Complaint Rescue Platform")
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.paragraph_format.space_after = Pt(22)
    subtitle_run = subtitle.runs[0]
    subtitle_run.font.name = "Arial"
    subtitle_run.font.size = Pt(15)
    subtitle_run.font.color.rgb = RGBColor.from_string(FOREST)
    subtitle_run.font.bold = True

    intro = doc.add_paragraph()
    intro.alignment = WD_ALIGN_PARAGRAPH.CENTER
    intro.paragraph_format.left_indent = Inches(0.5)
    intro.paragraph_format.right_indent = Inches(0.5)
    intro.paragraph_format.space_after = Pt(13)
    intro_run = intro.add_run(
        "Haven is a university project for Pakistan that gives citizens one clear place to report "
        "personal safety and civic problems. A person can type a complaint or speak naturally in Urdu "
        "or English. Haven prepares a clear English report for confirmation, gives short next-step "
        "guidance, and shows case progress while authorized people review and act on it."
    )
    intro_run.font.size = Pt(12)

    principle = doc.add_paragraph()
    principle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    principle.paragraph_format.space_before = Pt(12)
    principle.paragraph_format.space_after = Pt(18)
    r = principle.add_run("Core principle   AI suggests and humans decide")
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor.from_string(PINE)

    add_heading(doc, "Project in brief", 1)
    add_body(
        doc,
        "Haven covers two tracks. The Safety and Justice track gives higher attention to harassment, "
        "stalking, threats, domestic violence, theft, blackmail, fraud, missing-person concerns, and "
        "other personal safety cases. The Civic track handles issues such as damaged roads, drainage, "
        "garbage, unsafe electricity, water problems, and street lights."
    )
    add_body(
        doc,
        "The platform does not guarantee police or rescue attendance. Its purpose is to reduce confusion "
        "before and after a report: guide the person toward safer immediate actions, organise the complaint, "
        "send it to the correct human reviewer, and make progress visible."
    )

    # Page 2
    add_page_break(doc)
    add_heading(doc, "Why Haven is needed", 1)
    add_body(
        doc,
        "People may delay asking for help because they are frightened, unsure which department to contact, "
        "uncomfortable using formal language, or worried that nobody will take the complaint seriously. "
        "Haven lowers that first barrier. A person can begin in familiar words or use the voice assistant, "
        "then review and correct the prepared complaint before submitting it."
    )

    add_heading(doc, "Feminist design focus", 1)
    add_body(
        doc,
        "Haven gives particular attention to women and girls who may face street harassment, stalking, "
        "domestic violence, workplace harassment, online abuse, threats, or blackmail. These situations "
        "often involve fear, social pressure, financial dependence, or an imbalance of power. A useful "
        "system must therefore protect agency and privacy rather than forcing a survivor through a confusing process."
    )
    add_bullets(doc, [
        "A woman can type in familiar words or speak in Urdu or English without knowing legal terminology.",
        "Urdu voice is detected automatically and translated into a clear English complaint for review.",
        "She can review or correct every prepared field so the system does not take control of her story.",
        "Public anonymity and restricted staff access reduce unnecessary exposure of identity.",
        "Danger signals such as threats, stalking, weapons, or an attack raise urgency and require human review.",
        "Safety guidance prioritizes moving to safety and contacting trusted people or emergency services when needed.",
        "An evidence checklist helps preserve messages, dates, locations, photos, or recordings only when collection is safe.",
        "Status updates reduce the need to repeatedly retell a distressing experience to different offices.",
    ])
    add_body(
        doc,
        "This approach reflects a feminist concern with access, voice, consent, privacy, and accountability. "
        "Haven supports the person's choices while keeping final operational decisions with authorized human reviewers."
    )

    add_heading(doc, "Who benefits", 1)
    add_body(
        doc,
        "The main users are women and other citizens facing safety problems, people reporting local civic hazards, "
        "families helping a relative, and people who communicate more comfortably by speaking Urdu. Staff also "
        "benefit because complaints arrive in a consistent format with urgency signals, evidence, location details, "
        "and a recorded history of every decision."
    )

    # Page 3
    add_page_break(doc)
    add_heading(doc, "Main features", 1)
    features = [
        ("Automatic voice complaint", "The citizen speaks in Urdu or English. Gemini detects the language, keeps the original transcript, translates Urdu into English, selects a category, and fills the complaint fields. Nothing is submitted until the citizen confirms."),
        ("Accessible reporting", "The interface stays in clear English. A citizen can type a complaint, add location and time, choose privacy, and attach image, audio, or video evidence."),
        ("Safety first analysis", "Transparent keyword rules check for immediate danger before AI runs. Weapons, attacks, severe medical danger, fire, stalking, threats, and serious civic hazards can raise urgency."),
        ("Gemini assistance", "Gemini supports voice intake, summary, translation, category, urgency suggestions, and practical next steps. Complaint content is treated as untrusted data and the API key remains server-side."),
        ("Safe AI fallback", "If Gemini is unavailable or produces invalid output, Haven keeps working, raises the case to at least High, creates local guidance, and requires human review."),
        ("Human control room", "Authorized staff review the original statement, AI summary, rule matches, evidence, location, and timeline before accepting, requesting information, rejecting, or assigning a team."),
        ("Live case tracking", "Citizens see a case number, timeline, assignment, estimated arrival when provided, and response updates such as On the way, Arrived, and Closed."),
        ("Private evidence and documents", "Evidence stays in private storage and opens through short-lived links. The API can create complaint applications, evidence checklists, civic applications, and factual FIR drafts."),
        ("Appeal and reopen options", "A citizen can appeal a decision or reopen an eligible rejected or closed case with a reason. These actions remain part of the audit history."),
        ("Security and accountability", "Role-based access, Row Level Security, rate limits, validation, duplicate checks, and audit logs protect the demo and record sensitive actions."),
        ("Installable web apps", "Separate citizen and staff applications work on desktop and mobile and can be installed as progressive web apps."),
    ]
    add_table(doc, ["Feature", "How it helps"], features, [1.75, 5.05])

    # Page 4
    add_page_break(doc)
    add_heading(doc, "How a case moves through Haven", 1)
    add_body(
        doc,
        "The workflow separates automated assistance from human authority. Each step gives the citizen a clear result and creates a record for the next responsible person."
    )
    flow = [
        ("1", "Start the report", "The citizen signs in and chooses voice or typed reporting."),
        ("2", "Prepare from voice", "For voice input, Haven detects Urdu or English, creates an English complaint, selects the category, and fills any stated location, time, and privacy preference."),
        ("3", "Review and confirm", "The citizen sees the prepared fields and original transcript, makes any correction, and presses Confirm and submit. Voice input is not submitted automatically."),
        ("4", "Add safe evidence", "The citizen may add location and private image, audio, or video evidence only when it is safe to do so."),
        ("5", "Run safety rules", "English, Urdu, and Sindhi danger phrases are checked first. A matched danger signal can only raise urgency."),
        ("6", "Prepare the case", "Gemini may summarize, translate, suggest a category, and suggest urgency. The citizen's confirmed complaint is preserved."),
        ("7", "Give immediate guidance", "The citizen receives short safety steps, practical next actions, useful information, and an evidence checklist."),
        ("8", "Human review", "A control-room admin or department officer accepts, requests more information, rejects with a reason, or assigns an appropriate team."),
        ("9", "Response and tracking", "An assigned response team records On the way, Arrived, and Closed. Citizens receive in-app updates and follow the timeline."),
        ("10", "Follow-up", "The citizen can download prepared documents, file an appeal, or reopen an eligible case. Important actions remain audit-logged."),
    ]
    add_table(doc, ["Step", "Action", "Result"], flow, [0.55, 1.65, 4.6])

    # Page 5
    add_page_break(doc)
    add_heading(doc, "Users and responsibilities", 1)
    roles = [
        ("Citizen", "Creates typed or voice-assisted complaints, checks every field before submission, tracks personal cases, receives guidance and notifications, accesses private files, and may appeal or reopen eligible cases."),
        ("Control Room Admin", "Reviews Safety and Justice cases, confirms urgency, records decisions, and assigns a suitable response or referral team."),
        ("Department Officer", "Reviews Civic cases and routes accepted complaints to the correct department or civic team."),
        ("Response Team", "Sees only actively assigned cases and records operational progress from assignment to closure."),
        ("Super Admin", "Has cross-track oversight, can perform authorized case decisions, and can review users, audit information, safety playbooks, and legal-content verification states."),
    ]
    add_table(doc, ["Role", "Responsibility"], roles, [1.65, 5.15])

    add_heading(doc, "Support alongside existing services", 1)
    add_body(
        doc,
        "Haven is designed to work alongside police, rescue services, legal aid, women's rights organisations, "
        "community groups, and local government departments. It does not replace them. A report can make the "
        "next step clearer, but it cannot guarantee that police or a team will arrive, and it must not show an "
        "arrival promise that was not provided by the responsible dispatcher."
    )
    add_bullets(doc, [
        "Immediate danger still requires direct contact with the appropriate emergency service.",
        "AI does not dispatch teams, decide guilt, give a legal verdict, or reject a complaint.",
        "Legal information is general guidance and must be verified by qualified people before real-world publication.",
        "Generated FIR material is a factual draft for officer confirmation, not an official FIR.",
        "The current university version uses demo teams and in-app updates rather than live authority integration.",
    ])

    add_heading(doc, "Technology and privacy", 1)
    add_body(
        doc,
        "The system uses React and TypeScript for the citizen and staff applications, Node.js and Express for the protected API, "
        "Supabase for authentication, PostgreSQL data, private storage, and real-time updates, and Google Gemini 3.5 Flash Lite for AI assistance. "
        "Citizens see only their own cases. Staff access is limited by role and track, while response teams see only assigned cases. "
        "The Gemini key never enters the browser, voice recordings used to prepare a form are not stored as evidence, signed links protect private files, "
        "and audit records show who performed each sensitive action."
    )

    add_heading(doc, "Overall project value", 1)
    add_body(
        doc,
        "Haven demonstrates how technology can make complaint reporting more accessible without handing authority to AI. "
        "Its strongest contribution is the combination of survivor-centred reporting, multilingual access, transparent safety rules, "
        "human accountability, and visible follow-up. For women facing harassment or violence, this can provide a clearer and more private "
        "first step. For other citizens, it provides the same structured path for safety and civic concerns."
    )

    # Page 6
    add_heading(doc, "University demonstration example", 1)
    add_body(
        doc,
        "A concise demonstration can show the complete value of Haven without presenting it as a live emergency service. "
        "Use separate citizen, officer, and response-team accounts so the audience can see how one report moves across roles."
    )
    demo = [
        ("1", "Citizen voice report", "Say in Urdu that a person is following and threatening you near the university gate and ask to keep your identity private."),
        ("2", "Automatic preparation", "Show that Haven detects Urdu, produces an English complaint, selects Street harassment, fills the stated location and privacy choice, and waits for confirmation."),
        ("3", "Citizen confirmation", "Review the original transcript and prepared fields, then press Confirm and submit to receive a Haven case number."),
        ("4", "Safety result", "Show the short safety guidance, evidence checklist, urgency, and live case timeline. Explain that this supports action even if an external service is delayed."),
        ("5", "Human review", "Open the control room as a Control Room Admin, inspect the original report and safety signals, accept the case, and assign the demo safety team with an estimate."),
        ("6", "Response progress", "Sign in as the assigned Response Team and record On the way, Arrived, and Closed. Show each update appearing in the citizen timeline."),
        ("7", "Accountability", "Show the audit history, private evidence access, generated documents, and appeal or reopen options."),
    ]
    add_table(doc, ["Step", "Demonstration", "What to show"], demo, [0.55, 1.65, 4.6])

    add_heading(doc, "Current implementation status", 1)
    add_body(
        doc,
        "The university demonstration is implemented across the Supabase database, citizen frontend, staff control room, and protected backend API. "
        "The final codebase passes 17 automated backend tests, all TypeScript checks, and production builds for the API, citizen application, and admin application. "
        "The Urdu and English voice intake was also tested directly with Gemini and successfully produced an English complaint draft."
    )
    add_body(
        doc,
        "The remaining boundaries are operational rather than coding errors: Haven is not connected to live police, rescue, SMS, or government systems, "
        "and demo teams, emergency information, legal material, and safety content require qualified verification before any real-world deployment."
    )

    doc.core_properties.title = "Haven Project Overview"
    doc.core_properties.subject = "Citizen Safety and Complaint Rescue Platform"
    doc.core_properties.keywords = "Haven, citizen safety, complaints, women safety, feminism, AI, Supabase"
    doc.core_properties.author = "Haven Project Team"
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    build_document()
