import urllib.request
import urllib.error
import json

endpoints = [
  'http://localhost:5000/api/auth/demo-users',
  'http://localhost:5000/api/facilities',
  'http://localhost:5000/api/patients',
  'http://localhost:5000/api/screenings',
  'http://localhost:5000/api/simulations/results',
  'http://localhost:8000/health',
  'http://localhost:8000/model-status'
]

for ep in endpoints:
    try:
        req = urllib.request.Request(ep)
        with urllib.request.urlopen(req, timeout=5) as res:
            print(f'SUCCESS: {ep} -> {res.status}')
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        print(f'HTTP ERROR: {ep} -> {e.code}: {body}')
    except Exception as e:
        print(f'FAIL: {ep} -> {e}')
