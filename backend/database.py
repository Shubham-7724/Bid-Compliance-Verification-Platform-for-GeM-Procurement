import sqlite3
import json

DB_config = "gembid.db"

def get_db_connection():
    conn = sqlite3.connect(DB_config, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS bid_evalution (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename VARCHAR(255) NOT NULL,
        tender_id VARCHAR(255) DEFAULT 'Not specified',
        years_of_experience INT DEFAULT 0,
        turnover_amount FLOAT DEFAULT 0,
        has_msme_cert BOOLEAN DEFAULT 0,
        gstn_verification TEXT DEFAULT '{}',
        msme_verification TEXT DEFAULT '{}',
        pan_verification TEXT DEFAULT '{}',
        score INT DEFAULT 0,
        passed_checks TEXT DEFAULT '[]',
        failed_checks TEXT DEFAULT '[]',
        compliance_status VARCHAR(50) DEFAULT 'Unknown',
        officer_decision VARCHAR(50) DEFAULT 'Pending Review',
        officer_notes TEXT DEFAULT '',
        ai_summary TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()

def get_all_evaluations():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM bid_evalution ORDER BY created_at DESC;")
    rows = cur.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        item = dict(row)
        try:
            item['gstn_verification'] = json.loads(item['gstn_verification']) if isinstance(item['gstn_verification'], str) else item['gstn_verification']
            item['msme_verification'] = json.loads(item['msme_verification']) if isinstance(item['msme_verification'], str) else item['msme_verification']
            item['pan_verification'] = json.loads(item['pan_verification']) if isinstance(item['pan_verification'], str) else item['pan_verification']
            item['passed_checks'] = json.loads(item['passed_checks']) if isinstance(item['passed_checks'], str) else item['passed_checks']
            item['failed_checks'] = json.loads(item['failed_checks']) if isinstance(item['failed_checks'], str) else item['failed_checks']
        except Exception:
            pass
        results.append(item)
    return results

def update_bid_decision(record_id: int, decision: str, notes: str = ""):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE bid_evalution SET officer_decision = ?, officer_notes = ? WHERE id = ?",
        (decision, notes, record_id)
    )
    conn.commit()
    conn.close()
    return True

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
