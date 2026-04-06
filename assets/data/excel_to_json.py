import pandas as pd
import json
from pathlib import Path

# ==============================
# PATH SETUP
# ==============================
SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_JSON = SCRIPT_DIR / "resources.json"

GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1uNRJs05HKs0zt11cCPilnJ4Q6Dcd7pWI8P-MV7i34Lg/export?format=csv&gid=925889505"

# Load data
df = pd.read_csv(GOOGLE_SHEET_CSV_URL)

# Clean column names (VERY important)
df.columns = df.columns.str.strip()

# Columns that should become arrays
ARRAY_COLUMNS = {"category", "topics", "users", "language"}

# ==============================
# NORMALIZATION MAPS
# ==============================

# User shorthand normalization
USER_MAP = {
    "pts": "patients",
    "cps": "carepartners",
    "hcps": "clinicians"
}

# Topic expansion map (screen-facing)
TOPIC_MAP = {
    # Advance Care Planning
    "advance directives": "Advance Directives",
    "feeding": "Feeding Assistance Decisions",
    "breathing": "Breathing Assistance Decisions",

    # End of Life Care
    "bereavement": "Bereavement Support",
    "legacy work": "Legacy Work",
    "financial planning": "Financial Planning",

    # Palliative / Hospice (shared concepts)
    "definitions": "Definitions",
    "differences": "How Palliative Care and Hospice are Different",
    "benefits/timing/who provides": "Benefits, Timing, and Who Provides It",

}
# HELPERS
# ==============================

def split_to_array(value):
    """
    Convert a comma-separated cell into a clean list.
    """
    if pd.isna(value):
        return []
    if isinstance(value, list):
        return value
    return [v.strip() for v in str(value).split(",") if v.strip()]


def normalize_users(values):
    """
    Normalize user shorthands:
    pts  -> patients
    cps  -> carepartners
    hcps -> clinicians
    """
    normalized = []
    for v in values:
        key = v.lower()
        normalized.append(USER_MAP.get(key, v))
    return normalized


def normalize_topics(values):
    """
    Expand shorthand topic labels into full, user-facing descriptions.
    """
    expanded = []

    for v in values:
        key = v.strip().lower()
        expanded.append(TOPIC_MAP.get(key, v))

    # Remove duplicates while preserving order
    seen = set()
    result = []
    for item in expanded:
        if item not in seen:
            seen.add(item)
            result.append(item)

    return result

# ==============================
# BUILD PIPELINE
# ==============================

cards = []

for _, row in df.iterrows():
    card = {}

    for col in df.columns:
        if col in ARRAY_COLUMNS:
            values = split_to_array(row[col])

            if col == "users":
                values = normalize_users(values)

            if col == "topics":
                values = normalize_topics(values)

            card[col] = values
        else:
            card[col] = "" if pd.isna(row[col]) else row[col]

    cards.append(card)

# ==============================
# WRITE JSON
# ==============================

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(cards, f, indent=2, ensure_ascii=False)

print(f"Sucessfully Updated resources.json. Wrote {len(cards)} cards to resources.json")
