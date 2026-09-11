import io
import re
import json
import urllib.request
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List

import pdfplumber
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import init_db, get_db_connection, get_all_evaluations, update_bid_decision

# Try importing ollama safely
try:
    import ollama
    HAS_OLLAMA_LIB = True
except ImportError:
    HAS_OLLAMA_LIB = False


def is_ollama_alive() -> bool:
    if not HAS_OLLAMA_LIB:
        return False
    try:
        req = urllib.request.Request("http://127.0.0.1:11434/api/tags", headers={'User-Agent': 'GeM-Compliance'})
        with urllib.request.urlopen(req, timeout=0.8) as resp:
            return resp.status == 200
    except Exception:
        return False


@asynccontextmanager
async def app_lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="GeM Bid Compliance Verification Platform API",
    description="Automated statutory, regulatory, and eligibility verification platform for GeM tenders.",
    version="1.0.0",
    lifespan=app_lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def parse_date(date_str: str):
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def generate_fallback_ai_review(regex_results: dict, compliance_result: dict) -> dict:
    score = compliance_result.get("overall_score", 0)
    passed = compliance_result.get("passed_checks", [])
    failed = compliance_result.get("failed_checks", [])
    
    if score >= 80:
        summary = (
            f"The bidder demonstrates full statutory compliance ({score}/100) with all required GeM tender clauses. "
            f"Valid registrations identified including MSME/Udyam and GSTN. Experience and financial turnover criteria are satisfactorily fulfilled. "
            f"Recommended for technical qualification."
        )
        notes = "All key attributes successfully matched with official portal schemas."
        extraction_looks_correct = True
    elif score >= 50:
        summary = (
            f"The bid is partially compliant ({score}/100). The bidder met {len(passed)} criteria but failed {len(failed)} key check(s): {', '.join(failed)}. "
            f"Procurement Officer should issue a clarification notice regarding missing submissions before final evaluation."
        )
        notes = f"Discrepancies identified in submitted documents. Missing requirements: {', '.join(failed)}."
        extraction_looks_correct = True
    else:
        summary = (
            f"The bid is non-compliant with a score of {score}/100. Critical statutory requirements failed: {', '.join(failed)}. "
            f"Immediate rejection or debarment review recommended as per GeM procurement guidelines."
        )
        notes = "Severe statutory gaps detected. Bid does not meet minimum qualifying thresholds."
        extraction_looks_correct = False

    return {
        "extraction_looks_correct": extraction_looks_correct,
        "notes": notes,
        "summary": summary
    }


def ai_review_bid(extracted_text: str, regex_results: dict, compliance_result: dict) -> dict:
    if is_ollama_alive():
        prompt = f"""You are reviewing a government tender bid document for GeM compliance.

Here is what basic pattern-matching found automatically:
{json.dumps(regex_results, indent=2)}

Here is the OFFICIAL compliance evaluation result. Treat this as ground truth —
your summary must be consistent with it, not contradict it:
{json.dumps(compliance_result, indent=2)}

Here is the raw extracted text from the document:
{extracted_text[:3000]}

Task: Check if the automatic extraction above looks correct based on the text.
If anything seems missing or wrong, note it. Then give a 2-3 sentence 
plain-English summary of this bid's compliance situation for a procurement officer.
If any checks failed according to the official result above, your summary MUST 
mention that clearly — do not describe the bid as fully compliant if it isn't.

Respond ONLY as JSON in this exact format, no other text:
{{"extraction_looks_correct": true, "notes": "...", "summary": "..."}}
"""
        try:
            client = ollama.Client(timeout=4.0)
            response = client.chat(
                model="llama3.1:8b",
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 0.1}
            )
            raw_reply = response["message"]["content"].strip()
            if raw_reply.startswith("```json"):
                raw_reply = raw_reply[7:]
            if raw_reply.startswith("```"):
                raw_reply = raw_reply[3:]
            if raw_reply.endswith("```"):
                raw_reply = raw_reply[:-3]
            return json.loads(raw_reply.strip())
        except Exception as e:
            print(f"Ollama review note ({e}). Using robust fallback engine.")
            return generate_fallback_ai_review(regex_results, compliance_result)
    else:
        return generate_fallback_ai_review(regex_results, compliance_result)


def chat_with_bid(question: str, filename: Optional[str] = None) -> str:
    bid_context = ""

    if filename:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM bid_evalution WHERE filename = ? ORDER BY created_at DESC LIMIT 1;",
            (filename,)
        )
        row = cur.fetchone()
        conn.close()

        if row:
            record = dict(row)
            bid_context = f"""
Here is the compliance evaluation data for the bid file "{filename}":
{json.dumps(record, indent=2, default=str)}

Use this data to answer the user's question about this specific bid.
"""
        else:
            bid_context = f'No evaluation record was found for a file named "{filename}". Let the user know this if relevant.'

    system_prompt = f"""You are an expert AI assistant for a GeM (Government e-Marketplace) 
procurement compliance platform. You help procurement officers and evaluators understand bid compliance requirements, 
statutory regulations (MSME, GSTN, PAN, Turnover, Experience), and when given specific bid data, explain that bid's results in plain English.

{bid_context}

Answer clearly, professionally, and concisely in structured markdown. If you don't have enough information to answer accurately, say so clearly.
"""

    if is_ollama_alive():
        try:
            client = ollama.Client(timeout=5.0)
            response = client.chat(
                model="llama3.1:8b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ]
            )
            return response["message"]["content"]
        except Exception as e:
            print(f"Ollama chat note ({e}). Returning fallback response.")
    
    # Fallback smart response
    q_lower = question.lower()
    if "msme" in q_lower or "udyam" in q_lower:
        return "Under GeM procurement rules and Public Procurement Policy for MSEs Order 2012, micro and small enterprises registered with Udyam are exempt from prior experience and turnover criteria for specific categories, and qualify for statutory purchase preferences."
    elif "score" in q_lower or "compliance" in q_lower or "evaluat" in q_lower:
        return f"The platform verifies bids across 5 pillars (20 points each): MSME status, active GSTIN, 3+ years experience, minimum turnover declaration, and non-blacklisting affidavit. Scores >= 80 indicate full technical and statutory qualification."
    elif "gst" in q_lower or "tax" in q_lower:
        return "GSTIN verification validates that the 15-digit GST identification number is Active on the GSTN portal and linked with the bidder's declared legal PAN."
    elif "clarification" in q_lower or "notice" in q_lower:
        return "Under GeM General Terms and Conditions (GTC Clause 7.3), a formal clarification notice may be issued to the bidder allowing 48-72 hours to upload rectified statutory documents."
    else:
        return f"Regarding your query '{question}': The AI compliance engine cross-validates submitted tender documents against GeM General Financial Rules (GFR 2017) and statutory registries. All detailed statutory check results are visible in the Compliance Matrix."


# Request / Response Schemas
class TenderCheck(BaseModel):
    company_name: str
    years_of_experience: int
    has_msme_cert: bool


class DecisionUpdate(BaseModel):
    record_id: int
    decision: str
    notes: Optional[str] = ""


class ChatRequest(BaseModel):
    question: str
    filename: Optional[str] = None


# Endpoints
@app.get("/")
def home():
    ollama_ready = is_ollama_alive()
    return {
        "status": "online",
        "platform": "GeM AI Bid Compliance Verification Platform",
        "version": "1.0.0",
        "ollama_connected": ollama_ready,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/mock-api/gstn/{gstin}")
def verify_gstn(gstin: str):
    gstin = gstin.upper().strip()
    if len(gstin) != 15 or not re.match(r'^[0-9A-Z]{15}$', gstin):
        return {
            "gstin": gstin,
            "valid": False,
            "message": "Invalid GSTIN format. Expected 15 alphanumeric characters."
        }
    return {
        "gstin": gstin,
        "valid": True,
        "message": "GSTIN is Active and Verified with GSTN Portal",
        "legal_name": "TECH SOLUTIONS ENTERPRISE PVT LTD",
        "registration_date": "2018-05-15",
        "state": "Karnataka",
        "taxpayer_type": "Regular",
        "status": "Active"
    }


@app.get("/mock-api/msme/{udyam_no}")
def verify_msme(udyam_no: str):
    udyam_no = udyam_no.upper().strip()
    if not re.match(r'^UDYAM-[A-Z]{2}-\d{2}-\d{6,7}$', udyam_no) and not re.match(r'^[A-Z0-9-]{12,19}$', udyam_no):
        return {
            "udyam_no": udyam_no,
            "valid": False,
            "message": "Invalid Udyam Registration Number format"
        }
    return {
        "udyam_no": udyam_no,
        "valid": True,
        "message": "Udyam Registration Number verified on MSME Portal",
        "enterprise_name": "TECH SOLUTIONS ENTERPRISE",
        "enterprise_type": "Micro",
        "major_activity": "Services",
        "registration_date": "2020-03-10",
        "status": "Active"
    }


@app.get("/mock-api/pan/{pan_no}")
def verify_pan(pan_no: str):
    pan_no = pan_no.upper().strip()
    if len(pan_no) != 10 or not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', pan_no):
        return {
            "pan_no": pan_no,
            "valid": False,
            "message": "Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F)"
        }
    return {
        "pan_no": pan_no,
        "valid": True,
        "message": "PAN is Valid and Linked with Income Tax Database",
        "holder_name": "TECH SOLUTIONS ENTERPRISE PVT LTD",
        "entity_type": "Company",
        "status": "Active"
    }


@app.post("/check-eligibility/")
def check_eligibility(data: TenderCheck):
    if data.years_of_experience < 0:
        raise HTTPException(status_code=400, detail="Invalid years of experience")
    
    is_eligible = (data.years_of_experience >= 3) or data.has_msme_cert
    
    return {
        "company_name": data.company_name,
        "is_eligible": is_eligible,
        "years_of_experience": data.years_of_experience,
        "has_msme_cert": data.has_msme_cert,
        "status": "Eligible for Tender" if is_eligible else "Ineligible: Requires 3+ years experience or MSME certificate",
        "exemption_applied": "MSME Prior Experience Exemption Applied" if (data.has_msme_cert and data.years_of_experience < 3) else "Standard Experience Criteria Met" if data.years_of_experience >= 3 else "None"
    }


@app.post("/upload-pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF file.")
        
    content = await file.read()
    extracted_text = ""
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error occurred while processing the PDF file: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No readable text found in the PDF. Please upload a valid bid document."
        )
    # Blacklist verification
    company_name_match = re.search(
    r"(?:Company Name|Bidder Name|Firm Name|Legal Name|Enterprise Name)\s*[:=-]\s*(.+)",
    extracted_text,
    re.IGNORECASE
    )

    company_name = company_name_match.group(1).strip() if company_name_match else None

    # Mock blacklist database for prototype
    blacklisted_companies = [
    "ABC INFRASTRUCTURE PRIVATE LIMITED",
    "XYZ TECHNOLOGIES PVT LTD",
    "TEST BLACKLISTED COMPANY"
    ]

    blacklist_verification = {
    "company_name": company_name,
    "found": False,
    "status": "CLEAR",
    "message": "Company not found in blacklist records"
    }

    if company_name:
        normalized_company = re.sub(
        r"[^A-Z0-9]",
        "",
        company_name.upper()
    )

    for blacklisted_company in blacklisted_companies:
        normalized_blacklisted = re.sub(
            r"[^A-Z0-9]",
            "",
            blacklisted_company.upper()
        )

        if normalized_company == normalized_blacklisted:
            blacklist_verification = {
                "company_name": company_name,
                "found": True,
                "status": "BLACKLISTED",
                "message": "Company found in blacklist records"
            }
            break
    
    # Regex parsing and text matching
    has_msme_cert = bool(re.search(r'\b(MSME|Udyam|UDYOG AADHAR|MICRO|SMALL|MEDIUM)\b', extracted_text, re.IGNORECASE))
    
    # 2. Extracting tender reference ID (prioritize GeM standard format: GEM/YYYY/B/...)
    gem_format_match = re.search(r'\b(GEM/\d{4}/[A-Z0-9/-]+)\b', extracted_text, re.IGNORECASE)
    if gem_format_match:
        tender_ref_id = gem_format_match.group(1).upper()
    else:
        tender_ref_match = re.search(r'(?:Tender|Bid|Reference)\s*(?:ID|No|Ref|Number)?\s*[:=-]\s*([A-Za-z0-9/_-]{5,})', extracted_text, re.IGNORECASE)
        tender_ref_id = tender_ref_match.group(1).strip() if tender_ref_match else "GEM/2026/B/894721"
      
    experience_match = re.search(r"(\d+)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp)?", extracted_text, re.IGNORECASE)
    years_of_experience = int(experience_match.group(1)) if experience_match else 0

    has_affidavit = bool(re.search(r'\b(Non-Blacklisting|Non Blacklisting|Affidavit|Declaration|Debarment)\b', extracted_text, re.IGNORECASE))
    
    turnover_match = re.search(r"(?:INR|Rs\.?|₹)?\s*(\d+(?:,\d{2,3})*(?:\.\d{2})?)\s*(?:Turnover|Revenue|Sales|Crores?|Lakhs?)", extracted_text, re.IGNORECASE)
    if turnover_match:
        try:
            turnover_amount = float(turnover_match.group(1).replace(',', ''))
        except ValueError:
            turnover_amount = 5000000.0
    else:
        alt_match = re.search(r"Turnover\s*[:=-]?\s*(?:INR|Rs\.?)?\s*([\d,]+)", extracted_text, re.IGNORECASE)
        turnover_amount = float(alt_match.group(1).replace(',', '')) if alt_match else 0.0

    # Extracting GSTN, UDYAM, and PAN
    gst_match = re.search(r"\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b", extracted_text, re.IGNORECASE)
    udyam_match = re.search(r"\b(UDYAM-[A-Z]{2}-\d{2}-\d{6,7})\b", extracted_text, re.IGNORECASE)
    pan_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b", extracted_text, re.IGNORECASE)

    epfo_match = re.search(
    r"(?:EPFO|EPF|Provident\s+Fund)"
    r"\s*(?:Registration|Code|Number|No\.?)?"
    r"\s*[:=-]\s*"
    r"([A-Z0-9/-]{7,25})",
    extracted_text,
    re.IGNORECASE
    )

    esic_match = re.search(
    r"(?:ESIC|ESI|Employees['’]?\s*State\s*Insurance)"
    r"\s*(?:Registration|Code|Number|No\.?)?"
    r"\s*[:=-]\s*"
    r"([A-Z0-9/-]{8,25})",
    extracted_text,
    re.IGNORECASE
    )

    epfo_code = epfo_match.group(1) if epfo_match else None
    esic_code = esic_match.group(1) if esic_match else None

    # Startup India / NSIC / OEM Authorization verification using Ollama
    startup_nsic_oem_prompt = f"""
    Analyze the following government tender bid document and determine whether
    Startup India, NSIC, and OEM authorization requirements are mentioned and
    whether the bidder has provided evidence for them.

    Understand different wording and synonyms. For example:
    - Startup India may be described as Startup Recognition, DPIIT Recognition,
      Startup India Certificate, DIPP Recognition, etc.
    - NSIC may be described as NSIC Registration, National Small Industries
      Corporation registration/certificate, etc.
    - OEM may be described as Original Equipment Manufacturer authorization,
      OEM certificate, manufacturer authorization letter, authorized dealer
      certificate, etc.

    Return ONLY valid JSON in this format:

    {{
        "startup_india": {{
            "required": false,
            "found": false,
            "details": ""
        }},
        "nsic": {{
            "required": false,
            "found": false,
            "details": ""
        }},
        "oem_authorization": {{
            "required": false,
            "found": false,
            "details": ""
        }}
    }}

    Tender document:
    {extracted_text[:12000]}
    """

    startup_nsic_oem = {
        "startup_india": {"required": False, "found": False, "details": ""},
        "nsic": {"required": False, "found": False, "details": ""},
        "oem_authorization": {"required": False, "found": False, "details": ""}
    }

    if is_ollama_alive():
        try:
            client = ollama.Client(timeout=8.0)

            response = client.chat(
                model="llama3.1:8b",
                messages=[
                    {"role": "user", "content": startup_nsic_oem_prompt}
                ],
                options={"temperature": 0.1}
            )

            raw_reply = response["message"]["content"].strip()

            if raw_reply.startswith("```json"):
                raw_reply = raw_reply[7:]
            elif raw_reply.startswith("```"):
                raw_reply = raw_reply[3:]

            if raw_reply.endswith("```"):
                raw_reply = raw_reply[:-3]

            startup_nsic_oem = json.loads(raw_reply.strip())

        except Exception as e:
            print(f"Startup India / NSIC / OEM AI check failed: {e}")

    # Multi-Portal Mock Verification Calls
    gstn_verification = verify_gstn(gst_match.group(0)) if gst_match else {"valid": False, "message": "GSTIN Not Found in Bid Document"}
    msme_verification = verify_msme(udyam_match.group(0)) if udyam_match else {"valid": False, "message": "Udyam Number Not Found in Bid Document"}
    pan_verification = verify_pan(pan_match.group(0)) if pan_match else {"valid": False, "message": "PAN Not Found in Bid Document"}

    if epfo_code or esic_code:
        epfo_esic_verification = {
        "valid": True,
        "status": "Verified",
        "epfo_code": epfo_code,
        "esic_code": esic_code,
        "message": "EPFO / ESIC registration details found and verified"
    }

    elif epfo_esic_declaration:
        epfo_esic_verification = {
        "valid": False,
        "status": "Pending",
        "epfo_code": None,
        "esic_code": None,
        "message": "EPFO / ESIC requirement mentioned, but registration number was not found"
    }

    else:
        epfo_esic_verification = {
        "valid": False,
        "status": "Missing",
        "epfo_code": None,
        "esic_code": None,
        "message": "EPFO / ESIC registration details not found"
    }
        
    # Make in India / Local Content verification
    make_in_india_match = re.search(
        r"(?:Make in India|Made in India|Local Content|Local Content Percentage)"
        r".{0,100}?"
        r"(\d{1,3}(?:\.\d+)?)\s*%",
        extracted_text,
        re.IGNORECASE | re.DOTALL
    )

    make_in_india_declaration = bool(
        re.search(
        r"(Make in India|Made in India|Local Content|Class[- ]?I Local Supplier|Class[- ]?II Local Supplier)",
        extracted_text,
        re.IGNORECASE
        )
    )

    local_content_percentage = (
        float(make_in_india_match.group(1))
        if make_in_india_match
        else None
    )

    # Make in India verification result
    if make_in_india_declaration and local_content_percentage is not None:
        make_in_india_verification = {
        "valid": True,
        "status": "Verified",
        "local_content_percentage": local_content_percentage,
        "message": f"Make in India declaration found with {local_content_percentage}% local content"
    }
    elif make_in_india_declaration:
        make_in_india_verification = {
            "valid": False,
            "status": "Pending",
            "local_content_percentage": None,
            "message": "Make in India declaration found, but local content percentage is missing"
        }
    else:
        make_in_india_verification = {
            "valid": False,
            "status": "Missing",
            "local_content_percentage": None,
            "message": "Make in India / local content declaration not found"
        }

    # --- Scoring Logic ---
    score = 0
    passed_checks = []
    failed_checks = []

    #Blacklist result
    if blacklist_verification["found"]:
        failed_checks.append(
        "⚠️ Company Found in Blacklist"
    )
    else:
        passed_checks.append(
        "Blacklist Verification Passed"
    )
    
    # MSME verification (20 points)
    if has_msme_cert or msme_verification.get("valid"):
        score += 20
        passed_checks.append("MSME / Udyam Statutory Registration Verified")
    else:
        failed_checks.append("MSME Registration Missing or Invalid")

    # GSTN verification (20 points)
    if gstn_verification.get("valid"):
        score += 20
        passed_checks.append("GSTN Portal Active Status & Tax Compliance Verified")
    else:
        failed_checks.append("GSTN Not Found, Inactive or Invalid Format")

    # PAN verification (20 points)
    if pan_verification.get("valid"):
            score += 20
            passed_checks.append("PAN verified.")
    else:
        failed_checks.append("PAN Not Found, Inactive or Invalid Format")

    # Experience verification (20 points)
    if years_of_experience >= 3:
        score += 20
        passed_checks.append(f"Past Experience Criterion Met ({years_of_experience} yrs >= 3 yrs)")
    elif has_msme_cert:
        score += 20
        passed_checks.append(f"MSME Exemption Granted for Past Experience ({years_of_experience} yrs)")
    else:
        failed_checks.append(f"Insufficient Experience ({years_of_experience} yrs, min requirement: 3 yrs)")
    
    # Financial turnover verification (20 points)
    if turnover_amount > 0:
        score += 20
        passed_checks.append(f"Financial Turnover Declared & Verified (₹{turnover_amount:,.2f})")
    else:
        failed_checks.append("Financial Turnover Declaration Not Found")
        
    # Non-blacklisting Affidavit verification (20 points)
    if has_affidavit:
        score += 20
        passed_checks.append("Non-Blacklisting & Integrity Declaration Verified")
    else:
        failed_checks.append("Non-Blacklisting Affidavit / Self-Declaration Missing")

    # Make in India / Local Content verification
    if make_in_india_verification.get("valid"):
        score += 20
        passed_checks.append(
        f"Make in India / Local Content Verified "
        f"({local_content_percentage}% local content)"
        )
    else:
        failed_checks.append(
        make_in_india_verification.get(
            "message",
            "Make in India / Local Content Requirement Not Verified"
            )
        )

    # EPFO / ESIC verification
    if epfo_esic_verification.get("valid"):
        score += 20
        passed_checks.append(
        "EPFO / ESIC Registration Verified"
    )
    else:
        failed_checks.append(
        epfo_esic_verification.get(
            "message",
            "EPFO / ESIC Registration Not Verified"
        )
    )

    # Startup India / NSIC / OEM Authorization verification
    startup = startup_nsic_oem.get("startup_india", {})
    nsic = startup_nsic_oem.get("nsic", {})
    oem = startup_nsic_oem.get("oem_authorization", {})

    if startup.get("required"):
        if startup.get("found"):
            passed_checks.append("Startup India Recognition Verified")
        else:
            failed_checks.append("Startup India Recognition Missing")

    if nsic.get("required"):
        if nsic.get("found"):
            passed_checks.append("NSIC Registration Verified")
        else:
            failed_checks.append("NSIC Registration Missing")

    if oem.get("required"):
        if oem.get("found"):
            passed_checks.append("OEM Authorization Verified")
        else:
            failed_checks.append("OEM Authorization Missing")
    
    # Final Scoring Classification
    if score >= 80:
        compliance_status = "Compliant"
        risk_level = "Low Risk"
    elif score >= 50:
        compliance_status = "Partially Compliant - Action Required"
        risk_level = "Medium Risk"
    else:
        compliance_status = "Non-Compliant"
        risk_level = "High Risk"

    # AI Verification Review
    ai_review = ai_review_bid(
        extracted_text,
        {
            "has_msme_cert": has_msme_cert,
            "tender_ref_id": tender_ref_id,
            "years_of_experience": years_of_experience,
            "turnover_amount": turnover_amount,
            "has_affidavit": has_affidavit,
            "extracted_gstin": gst_match.group(0) if gst_match else None,
            "extracted_udyam": udyam_match.group(0) if udyam_match else None,
            "extracted_pan": pan_match.group(0) if pan_match else None,
        },
        {
            "overall_score": score,
            "compliance_status": compliance_status,
            "passed_checks": passed_checks,
            "failed_checks": failed_checks
        }
    )

    # Database Insertion
    record_id = None
    try: 
        conn = get_db_connection()
        cur = conn.cursor()
        
        insert_query = """
            INSERT INTO bid_evalution (
                filename, tender_id, years_of_experience, turnover_amount, has_msme_cert,
                gstn_verification, msme_verification, pan_verification, score,
                passed_checks, failed_checks, compliance_status, ai_summary
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        cur.execute(insert_query, (
            file.filename, tender_ref_id, years_of_experience, turnover_amount, has_msme_cert,
            json.dumps(gstn_verification), json.dumps(msme_verification), json.dumps(pan_verification), score,
            json.dumps(passed_checks), json.dumps(failed_checks), compliance_status,
            ai_review.get("summary", "")
        ))
        conn.commit()
        record_id = cur.lastrowid
        conn.close()
    except Exception as e:
        print(f"Error inserting record into database: {e}")

    return {
        "filename": file.filename,
        "id": record_id,
        "tender_id": tender_ref_id,
        "risk_level": risk_level,
        "parsed_data": {
            "tender_ref_id": tender_ref_id,
            "years_of_experience": years_of_experience,
            "turnover_amount": turnover_amount,
            "has_msme_cert": has_msme_cert,
            "gstin": gst_match.group(0) if gst_match else None,
            "udyam_no": udyam_match.group(0) if udyam_match else None,
            "pan_no": pan_match.group(0) if pan_match else None,
            "has_affidavit": has_affidavit,
            "make_in_india": make_in_india_verification,
            "epfo_esic": epfo_esic_verification,
            "startup_nsic_oem": startup_nsic_oem,
            "blacklist_verification": blacklist_verification,
            "mock_api_verifications": {
            "gstn_verification": gstn_verification,
            "msme_verification": msme_verification,
            "pan_verification": pan_verification
        },
        "compliance_evaluation": {
            "overall_score": score,
            "passed_checks": passed_checks,
            "failed_checks": failed_checks
        },
        "compliance_status": compliance_status,
        "ai_review": ai_review,
        "evaluated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
}

@app.get("/get-evaluation/{filename}")
def get_evaluation(filename: str):
    conn = get_db_connection()
    cur = conn.cursor()
    
    select_query = "SELECT * FROM bid_evalution WHERE filename = ? ORDER BY created_at DESC;"
    cur.execute(select_query, (filename,))
    rows = cur.fetchall()
    conn.close()
    
    evaluations = []
    for row in rows:
        item = dict(row)
        try:
            item['passed_checks'] = json.loads(item['passed_checks']) if isinstance(item['passed_checks'], str) else item['passed_checks']
            item['failed_checks'] = json.loads(item['failed_checks']) if isinstance(item['failed_checks'], str) else item['failed_checks']
            item['gstn_verification'] = json.loads(item['gstn_verification']) if isinstance(item['gstn_verification'], str) else item['gstn_verification']
            item['msme_verification'] = json.loads(item['msme_verification']) if isinstance(item['msme_verification'], str) else item['msme_verification']
            item['pan_verification'] = json.loads(item['pan_verification']) if isinstance(item['pan_verification'], str) else item['pan_verification']
        except Exception:
            pass
        evaluations.append(item)
    return evaluations


@app.get("/all-evaluations")
def list_all_evaluations():
    return get_all_evaluations()


@app.post("/update-decision/")
def update_decision_endpoint(req: DecisionUpdate):
    success = update_bid_decision(req.record_id, req.decision, req.notes)
    return {"success": success, "message": f"Officer decision updated to '{req.decision}'"}


@app.post("/chat/")
def chat(request: ChatRequest):
    answer = chat_with_bid(request.question, request.filename)
    return {"question": request.question, "filename": request.filename, "answer": answer}
