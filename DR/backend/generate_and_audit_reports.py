import os
import sys
import json
import urllib.request
import urllib.error

PROHIBITED_STRINGS = [
    "REG-2026-0101",
    "REG-2026",
    "Patient Record",
    "PHC-North",
    "Sector 01",
    "Sector 02",
    "Sector 03",
    "Sector 04",
    "Rameshwar",
    "Tukaram",
    "Jadhav",
    "Nanded",
    "Wadgaon",
    "54 Yrs",
    "58 Yrs",
    "6 Years",
    "8 Years",
    "CAM-RENOVA",
    "Platt-Calibrated",
    "No Referral",
    "Routine rescreening",
    "glycemic control"
]

def login():
    login_data = json.dumps({"email": "asha.worker@netra-ai.org", "password": "demo1234"}).encode('utf-8')
    req = urllib.request.Request("http://localhost:5000/api/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))["token"]

def screen_and_get_report(image_name, token):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    # Direct Screening API
    body = json.dumps({
        "imageUrl": f"/uploads/{image_name}",
        "imagePath": f"/uploads/{image_name}",
        "originalFilename": image_name
    }).encode('utf-8')
    
    req_screen = urllib.request.Request("http://localhost:5000/api/screen", data=body, headers=headers)
    screening_id = ""
    with urllib.request.urlopen(req_screen) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        screening_id = res["screening_id"]

    # Fetch HTML Report
    req_report = urllib.request.Request(f"http://localhost:5000/api/reports/{screening_id}/html", headers=headers)
    with urllib.request.urlopen(req_report) as resp:
        html_content = resp.read().decode('utf-8')

    return screening_id, res, html_content

def audit_html(html_str, report_label):
    print(f"\n--- AUDITING {report_label} ---")
    violations = []
    for s in PROHIBITED_STRINGS:
        if s in html_str:
            violations.append(s)
            
    if violations:
        print(f"FAILED: Found prohibited strings in {report_label}: {violations}")
    else:
        print(f"PASSED: 0 prohibited strings found in {report_label}.")
    return violations

def main():
    print("="*80)
    print("FINAL REPORT GENERATION & DATA INTEGRITY AUDIT")
    print("="*80)

    token = login()
    print("Authenticated successfully.")

    # REPORT A: 002c21358ce6.png
    print("\nGenerating REPORT A (002c21358ce6.png)...")
    id_a, data_a, html_a = screen_and_get_report("002c21358ce6.png", token)
    with open("report_002c_live.html", "w", encoding="utf-8") as f:
        f.write(html_a)
    print(f"Saved report_002c_live.html (Screening ID: {id_a})")

    # REPORT B: 10_left.jpeg
    print("\nGenerating REPORT B (10_left.jpeg)...")
    id_b, data_b, html_b = screen_and_get_report("10_left.jpeg", token)
    with open("report_10_left_live.html", "w", encoding="utf-8") as f:
        f.write(html_b)
    print(f"Saved report_10_left_live.html (Screening ID: {id_b})")

    # Audits
    v_a = audit_html(html_a, "REPORT A (002c21358ce6.png)")
    v_b = audit_html(html_b, "REPORT B (10_left.jpeg)")

    # Inspect Report A features
    print("\n--- REPORT A CONTENT VERIFICATION ---")
    assert "Grade 0 — No Diabetic Retinopathy" in html_a or "Grade 0" in html_a
    assert "99.0%" in html_a or "99.01%" in html_a
    assert "Candidate Lesion Evidence" in html_a
    assert "Not provided" in html_a
    assert "SCREEN" in html_a
    print("Report A verified: Real Grade 0 (99.0%), Real Evidence, Demographics = Not provided, Decision = SCREEN")

    # Inspect Report B features
    print("\n--- REPORT B CONTENT VERIFICATION ---")
    assert "RECAPTURE RECOMMENDED" in html_b
    assert "Reject" in html_b
    assert "53.9%" in html_b or "53.88%" in html_b
    assert "AI Screening Result" not in html_b  # Strict reject: no downstream grade
    assert "Candidate Lesion Evidence" not in html_b  # Strict reject: no downstream lesions
    assert "Grad-CAM" not in html_b or "halted at the quality gate" in html_b
    print("Report B verified: Strict Quality Gate RECAPTURE, Zero Downstream Fabrication")

    if not v_a and not v_b:
        print("\n" + "="*80)
        print("ALL REPORT ACCEPTANCE CRITERIA 100% SATISFIED!")
        print("="*80)

if __name__ == "__main__":
    main()
