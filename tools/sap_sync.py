#!/usr/bin/env python3
"""Đồng bộ Google Sheet -> Supabase: tab "Trang tính6" (SAP) -> public.sap_dong,
tab "INDEX_PDF" (Số phiếu -> tệp PDF) -> public.chi_muc_pdf.

Chạy lại nhiều lần không tạo bản ghi trùng: upsert theo khoá nghiệp vụ `khoa`
(cùng công thức với nút "Đồng bộ SAP" trên trang, nên hai cách chạy dùng chung dữ liệu).

Biến môi trường:
  SUPABASE_URL           https://zpdbodcnhhbbhuyisgjc.supabase.co
  SUPABASE_SERVICE_KEY   service_role key (chỉ để trên máy chủ/CI, KHÔNG đưa lên GitHub)
  GOOGLE_SA_JSON         đường dẫn tệp JSON của service account (chỉ quyền đọc Sheet)
  SHEET_ID, SHEET_NAME   mặc định: tệp "06. SCRIP CẢNH BÁO PR CHƯA NHẬP KHO" / "Trang tính6"
Tuỳ chọn: --dry-run (chỉ đọc và đếm, không ghi), --csv tep.csv (đọc từ tệp xuất CSV thay vì API).
"""
import argparse, base64, csv, json, os, re, sys, time, unicodedata
from datetime import datetime, timezone
import requests

SHEET_ID = os.getenv("SHEET_ID", "1tM4F7DFTLjPtyh0hoRw92lRZSiQ1IkXXvmPwI7zjp_U")
SHEET_NAME = os.getenv("SHEET_NAME", "Trang tính6")
BATCH = 1000

def b64(b): return base64.urlsafe_b64encode(b).rstrip(b"=")

def google_token(sa_path):
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    sa = json.load(open(sa_path, encoding="utf-8")); now = int(time.time())
    head = b64(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    body = b64(json.dumps({"iss": sa["client_email"], "scope": "https://www.googleapis.com/auth/spreadsheets.readonly",
                           "aud": "https://oauth2.googleapis.com/token", "iat": now, "exp": now + 3600}).encode())
    key = serialization.load_pem_private_key(sa["private_key"].encode(), None)
    sig = b64(key.sign(head + b"." + body, padding.PKCS1v15(), hashes.SHA256()))
    r = requests.post("https://oauth2.googleapis.com/token", data={
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": (head + b"." + body + b"." + sig).decode()}, timeout=60)
    r.raise_for_status(); return r.json()["access_token"]

def read_range(tk, rng):
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/{requests.utils.quote(rng)}"
    r = requests.get(url, params={"valueRenderOption": "FORMATTED_VALUE"}, headers={"Authorization": "Bearer " + tk}, timeout=300)
    if not r.ok: sys.exit(f"Lỗi đọc Google Sheet {r.status_code}: {r.text[:300]} (đã chia sẻ Sheet cho email service account chưa?)")
    return r.json().get("values", [])

def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f)); return rows[1:]

def fold(s):
    s = unicodedata.normalize("NFD", (s or "").lower().replace("đ", "d"))
    return re.sub(r"[̀-ͯ]", "", s)

def pdate(s):
    m = re.search(r"(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(\d{4})", s or "")
    return f"{m[3]}-{int(m[2]):02d}-{int(m[1]):02d}" if m else None

def num(x):
    x = re.sub(r"\s", "", str(x or ""))
    if not x: return None
    try:
        if "," in x or re.fullmatch(r"-?\d{1,3}(\.\d{3})+", x): return float(x.replace(".", "").replace(",", "."))
        return float(x)
    except ValueError: return None

def classify(t, dc):
    t = fold(t)
    if "chuyen" in t: return "Chuyển kho"
    if re.search(r"\bnk\b|nhap", t): return "Nhập"
    if "xuat" in t: return "Xuất"
    return "Nhập" if dc == "S" else "Xuất" if dc == "H" else "Khác"

def build(values):
    seen, out, now = {}, [], datetime.now(timezone.utc).isoformat()
    for c in values:
        g = lambda i: str(c[i]).strip() if i < len(c) and c[i] is not None else ""
        so = g(2)
        if not so: continue
        base = "|".join([so, g(5), g(7), g(9), g(10), g(13), g(15), g(21), g(25), g(23)])
        seen[base] = k = seen.get(base, 0) + 1
        out.append(dict(khoa=f"{base}#{k}", so_ct=so, ngay=pdate(g(3)), nguoi_nhap=g(0), tao_boi=g(1), nhom_vt=g(4), ma_vt=g(5),
            ten_vt=g(6), batch=g(7), dvt=g(8), so_luong=num(g(9)), ma_da=g(10), ten_da=g(11), kho=g(12), mvt=g(13), mvt_text=g(14),
            dc=g(15), plant=g(16), ncc=g(17), truck=g(20), so_yc=g(21), reversal=g(23), delivery=g(24), so_po=g(25),
            mo_ta_pr=g(26), so_tk=g(27), link_drive=g(30) or None,
            loai=classify(g(14), g(15).upper()), dong_bo_luc=now))
    return out

def build_index(values):
    seen, out, now = set(), [], datetime.now(timezone.utc).isoformat()
    for c in values:
        g = lambda i: str(c[i]).strip() if i < len(c) and c[i] is not None else ""
        so = re.sub(r"\s", "", g(0))
        if not so or so in seen: continue
        seen.add(so)
        out.append(dict(so_phieu=so, ten_tep=g(1) or None, thu_muc=g(2) or None, link=g(3) or None,
                        file_id=g(4) or None, dong_bo_luc=now))
    return out

def upsert(rows, url, key, table="sap_dong", conflict="khoa"):
    h = {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json",
         "Prefer": "resolution=merge-duplicates,return=minimal"}
    for i in range(0, len(rows), BATCH):
        for t in range(3):
            r = requests.post(f"{url}/rest/v1/{table}?on_conflict={conflict}", headers=h, data=json.dumps(rows[i:i+BATCH]), timeout=120)
            if r.ok: break
            time.sleep(2 ** t)
        else: sys.exit(f"Ghi Supabase lỗi {r.status_code}: {r.text[:300]}")
        print(f"  {table}: đã ghi {min(i+BATCH, len(rows))}/{len(rows)} dòng", flush=True)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--dry-run", action="store_true"); ap.add_argument("--csv")
    a = ap.parse_args()
    tk = None if a.csv else google_token(os.environ["GOOGLE_SA_JSON"])
    values = read_csv(a.csv) if a.csv else read_range(tk, f"'{SHEET_NAME}'!A2:AE")
    rows = build(values)
    print(f"Trang tính6: đọc {len(values)} dòng, hợp lệ {len(rows)} dòng ({len({r['so_ct'] for r in rows})} chứng từ).")
    idx = []
    if tk:
        idx = build_index(read_range(tk, "'INDEX_PDF'!A2:E"))
        print(f"INDEX_PDF: {len(idx)} chứng từ có tệp PDF.")
    if a.dry_run: return
    url, key = os.environ["SUPABASE_URL"].rstrip("/"), os.environ["SUPABASE_SERVICE_KEY"]
    upsert(rows, url, key, "sap_dong", "khoa")
    if idx: upsert(idx, url, key, "chi_muc_pdf", "so_phieu")
    print("Xong. Chạy lại bao nhiêu lần cũng không tạo dòng trùng.")

if __name__ == "__main__": main()
