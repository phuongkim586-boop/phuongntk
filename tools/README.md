# Nạp dữ liệu SAP lên Supabase (Python)

```
pip install pandas requests cryptography
export SUPABASE_URL=https://zpdbodcnhhbbhuyisgjc.supabase.co
export SUPABASE_SERVICE_KEY=...      # service_role, không đưa lên GitHub
export GOOGLE_SA_JSON=sa.json        # service account chỉ quyền đọc, đã được chia sẻ Sheet
python3 sap_sync.py --dry-run        # thử, không ghi
python3 sap_sync.py                  # đồng bộ (chạy lại nhiều lần không trùng)
```
Không có service account: tải Sheet "Trang tính6" thành CSV rồi chạy `--csv tep.csv`.
