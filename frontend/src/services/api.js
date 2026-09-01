const API_BASE_URL = 'http://localhost:8000';

// Fallback Mock Data for instant offline demonstrations if backend is starting up
export const SAMPLE_BIDS_CATALOG = [
  {
    id: "sample-1",
    name: "Sample 1: Compliant Micro-Enterprise",
    filename: "Sample_1_Compliant_TechnoCorp.pdf",
    company: "TechnoCorp Solutions Pvt Ltd",
    tenderId: "GEM/2026/B/894721",
    score: 100,
    riskLevel: "Low Risk",
    status: "Compliant",
    parsed: {
      tender_ref_id: "GEM/2026/B/894721",
      years_of_experience: 4,
      turnover_amount: 8500000,
      has_msme_cert: true,
      gstin: "29ABCDE1234F1Z5",
      udyam_no: "UDYAM-KR-03-0028194",
      pan_no: "ABCDE1234F",
      has_affidavit: true
    },
    passedChecks: [
      "MSME / Udyam Statutory Registration Verified",
      "GSTN Portal Active Status & Tax Compliance Verified",
      "Past Experience Criterion Met (4 yrs >= 3 yrs)",
      "Financial Turnover Declared & Verified (₹85,00,000.00)",
      "Non-Blacklisting & Integrity Declaration Verified"
    ],
    failedChecks: [],
    aiSummary: "The bidder demonstrates full statutory compliance (100/100) across all mandatory GeM eligibility clauses. Valid registrations verified for Udyam Micro Enterprise and GSTN. Past technical experience and financial turnover exceed tender thresholds. Recommended for qualification.",
    officerDecision: "Approved",
    date: "2026-09-01 18:30:00"
  },
  {
    id: "sample-2",
    name: "Sample 2: Partial Compliance (1 yr Exp & No Affidavit)",
    filename: "Sample_2_Partial_ApexInfra.pdf",
    company: "Apex Infra Services",
    tenderId: "GEM/2026/B/451920",
    score: 60,
    riskLevel: "Medium Risk",
    status: "Partially Compliant - Action Required",
    parsed: {
      tender_ref_id: "GEM/2026/B/451920",
      years_of_experience: 1,
      turnover_amount: 4500000,
      has_msme_cert: true,
      gstin: "07AAAAA0000A1Z5",
      udyam_no: "UDYAM-DL-01-0091823",
      pan_no: "AAAAA0000A",
      has_affidavit: false
    },
    passedChecks: [
      "MSME / Udyam Statutory Registration Verified",
      "GSTN Portal Active Status & Tax Compliance Verified",
      "Financial Turnover Declared & Verified (₹45,00,000.00)"
    ],
    failedChecks: [
      "Non-Blacklisting Affidavit / Self-Declaration Missing"
    ],
    aiSummary: "The bid is partially compliant (60/100). MSME and GSTN credentials are valid. However, the mandatory notarized Non-Blacklisting Affidavit is missing. Under GeM GTC guidelines, a clarification notice should be issued giving 48 hours for document rectification.",
    officerDecision: "Clarification Requested",
    date: "2026-09-01 17:15:00"
  },
  {
    id: "sample-3",
    name: "Sample 3: High Risk / Non-Compliant Bidder",
    filename: "Sample_3_NonCompliant_QuickVendor.pdf",
    company: "QuickVendor Unregistered Trading Co",
    tenderId: "GEM/2026/B/110293",
    score: 0,
    riskLevel: "High Risk",
    status: "Non-Compliant",
    parsed: {
      tender_ref_id: "GEM/2026/B/110293",
      years_of_experience: 0,
      turnover_amount: 0,
      has_msme_cert: false,
      gstin: null,
      udyam_no: null,
      pan_no: null,
      has_affidavit: false
    },
    passedChecks: [],
    failedChecks: [
      "MSME Registration Missing or Invalid",
      "GSTN Not Found, Inactive or Invalid Format",
      "Insufficient Experience (0 yrs, min requirement: 3 yrs)",
      "Financial Turnover Declaration Not Found",
      "Non-Blacklisting Affidavit / Self-Declaration Missing"
    ],
    aiSummary: "The bid is non-compliant (0/100). Critical statutory prerequisites are unverified. Bidder lacks registered tax entity status, MSME certification, and track record. Immediate technical disqualification is recommended.",
    officerDecision: "Rejected",
    date: "2026-09-01 16:45:00"
  }
];

export const checkBackendHealth = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    return { status: "offline", error: err.message };
  }
};

export const uploadBidPdf = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/upload-pdf/`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed with status ${res.status}`);
  }

  return await res.json();
};

export const verifyGstn = async (gstin) => {
  const res = await fetch(`${API_BASE_URL}/mock-api/gstn/${encodeURIComponent(gstin)}`);
  return await res.json();
};

export const verifyMsme = async (udyamNo) => {
  const res = await fetch(`${API_BASE_URL}/mock-api/msme/${encodeURIComponent(udyamNo)}`);
  return await res.json();
};

export const verifyPan = async (panNo) => {
  const res = await fetch(`${API_BASE_URL}/mock-api/pan/${encodeURIComponent(panNo)}`);
  return await res.json();
};

export const checkEligibility = async (payload) => {
  const res = await fetch(`${API_BASE_URL}/check-eligibility/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return await res.json();
};

export const getAllEvaluations = async () => {
  const res = await fetch(`${API_BASE_URL}/all-evaluations`);
  if (!res.ok) throw new Error("Failed to fetch evaluations");
  return await res.json();
};

export const updateOfficerDecision = async (recordId, decision, notes) => {
  const res = await fetch(`${API_BASE_URL}/update-decision/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record_id: recordId, decision, notes })
  });
  return await res.json();
};

export const sendChatQuery = async (question, filename) => {
  const res = await fetch(`${API_BASE_URL}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, filename })
  });
  if (!res.ok) throw new Error("Chat request failed");
  return await res.json();
};
