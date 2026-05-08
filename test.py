import os, json, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

def read_env(name):
    if os.path.exists(".env.local"):
        for line in open(".env.local", encoding="utf-8"):
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get(name, "")

KEY = read_env("GEMINI_API_KEY")
now = datetime.now(timezone.utc)
expire_time = (now + timedelta(minutes=30)).isoformat().replace("+00:00", "Z")
new_session_expire_time = (now + timedelta(minutes=2)).isoformat().replace("+00:00", "Z")
URL = "https://generativelanguage.googleapis.com/v1alpha/auth_tokens"


def post(body, label):
    print(f"\n--- {label} ---")
    req = urllib.request.Request(
        URL,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": KEY},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            print(f"status: {r.status}")
            print(r.read().decode("utf-8")[:500])
            return True
    except urllib.error.HTTPError as e:
        print(f"status: {e.code}")
        print(e.read().decode("utf-8")[:500])
        return False


# Try the most likely actual protobuf field names

# A: bidi_generate_content_setup snake_case
post({
    "uses": 1,
    "expire_time": expire_time,
    "new_session_expire_time": new_session_expire_time,
    "bidi_generate_content_setup": {
        "model": "models/gemini-3.1-flash-live-preview",
        "generation_config": {"response_modalities": ["AUDIO"]},
    },
}, "A: bidi_generate_content_setup snake_case")

# B: bidiGenerateContentSetup camelCase
post({
    "uses": 1,
    "expire_time": expire_time,
    "new_session_expire_time": new_session_expire_time,
    "bidiGenerateContentSetup": {
        "model": "models/gemini-3.1-flash-live-preview",
        "generationConfig": {"responseModalities": ["AUDIO"]},
    },
}, "B: bidiGenerateContentSetup camelCase")

# C: just minimal — no constraints, see if a token mints at all
post({
    "uses": 1,
    "expire_time": expire_time,
    "new_session_expire_time": new_session_expire_time,
}, "C: minimal, no constraints")

# D: try field name "config" 
post({
    "uses": 1,
    "expire_time": expire_time,
    "new_session_expire_time": new_session_expire_time,
    "config": {
        "model": "models/gemini-3.1-flash-live-preview",
        "response_modalities": ["AUDIO"],
    },
}, "D: 'config' as field name")

# E: try "bidi_generate_content_constraints"
post({
    "uses": 1,
    "expire_time": expire_time,
    "new_session_expire_time": new_session_expire_time,
    "bidi_generate_content_constraints": {
        "model": "models/gemini-3.1-flash-live-preview",
    },
}, "E: bidi_generate_content_constraints")