import os
import json
import urllib.request
import urllib.parse
import time

FASTAPI_URL = "http://localhost:8000/api/screen"

TEST_CASES = [
    {
        "name": "Case 1: 002c21358ce6.png (Normal)",
        "filename": "002c21358ce6.png",
        "expected_decision": "SCREEN",
        "expected_grade": 0,
        "expected_calibrated_p": 0.015015,
        "p_tolerance": 1e-5,
        "is_reject": False
    },
    {
        "name": "Case 2: 001639a390f0.png (Proliferative DR)",
        "filename": "001639a390f0.png",
        "expected_decision": "REFER",
        "expected_grade": 4,
        "expected_calibrated_p": 0.997384,
        "p_tolerance": 1e-5,
        "is_reject": False
    },
    {
        "name": "Case 3: 10_left.jpeg (Quality Defect)",
        "filename": "10_left.jpeg",
        "expected_decision": "RECAPTURE",
        "is_reject": True
    }
]

print("================================================================================")
print("             NETRAAI FINAL HARDENING AUTOMATED REGRESSION GATE                 ")
print("================================================================================")

all_passed = True
uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "DR", "backend", "uploads"))

for tc in TEST_CASES:
    img_path = os.path.join(uploads_dir, tc["filename"])
    if not os.path.exists(img_path):
        print(f"[FAIL] Missing test image: {img_path}")
        all_passed = False
        continue

    print(f"\n--- Testing {tc['name']} ---")
    req_body = json.dumps({"imagePath": img_path}).encode("utf-8")
    req = urllib.request.Request(
        FASTAPI_URL,
        data=req_body,
        headers={"Content-Type": "application/json"}
    )

    t0 = time.time()
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        elapsed = time.time() - t0
        print(f"Latency: {elapsed:.2f}s")
        
        status = data.get("status")
        q = data.get("quality", {})
        g = data.get("classification", {})
        final_dec = data.get("finalDecision") or data.get("decision")
        
        if tc["is_reject"]:
            passed = (status == "REJECTED_BY_QUALITY_GATE") or (final_dec == "RECAPTURE") or (q.get("acceptable") is False)
            print(f"Quality Assessment: Acceptable={q.get('acceptable')}, Score={q.get('score')}")
            print(f"Status: {status} | Final Decision: {final_dec}")
            print(f"Result: {'PASS' if passed else 'FAIL'}")
            if not passed:
                all_passed = False
        else:
            p_cal = float(g.get("g2plus_probability_calibrated", 0.0))
            pred_grade = g.get("predicted_grade")
            p_diff = abs(p_cal - tc["expected_calibrated_p"])
            
            p_match = p_diff <= tc["p_tolerance"]
            grade_match = (pred_grade == tc["expected_grade"])
            dec_match = (final_dec == tc["expected_decision"])
            
            print(f"Grade: Expected {tc['expected_grade']}, Got {pred_grade} ({'MATCH' if grade_match else 'MISMATCH'})")
            print(f"Decision: Expected {tc['expected_decision']}, Got {final_dec} ({'MATCH' if dec_match else 'MISMATCH'})")
            print(f"Calibrated P: Expected {tc['expected_calibrated_p']:.6f}, Got {p_cal:.6f} (Diff: {p_diff:.2e}, Tolerance: {tc['p_tolerance']})")
            
            passed = p_match and grade_match and dec_match
            print(f"Result: {'PASS' if passed else 'FAIL'}")
            if not passed:
                all_passed = False
    except Exception as e:
        print(f"[ERROR] Request failed: {e}")
        all_passed = False

print("\n================================================================================")
if all_passed:
    print(" >>> ALL REGRESSION GATE TESTS PASSED (100% REGRESSION INTEGRITY) <<<")
else:
    print(" >>> SOME REGRESSION TESTS FAILED <<<")
print("================================================================================")
exit(0 if all_passed else 1)
