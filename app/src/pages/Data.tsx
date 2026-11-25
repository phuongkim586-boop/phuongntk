import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Làm mới bảng tổng hợp SAP trên máy chủ (quản trị viên).
// Đồng bộ Google Sheet nặng nên thực hiện bằng script Python: tools/sap_sync.py
export default function Data() {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function lamMoi() {
    setBusy(true); setMsg('');
    const { error } = await supabase.rpc('lam_moi_sap');
    setBusy(false);
    setMsg(error ? 'Lỗi: ' + error.message : 'Đã làm mới bảng tổng hợp SAP.');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold text-[#6e0909]">Dữ liệu & đồng bộ</h1>
      <div className="rounded bg-white p-4 shadow-sm">
        <p className="mb-3">Sau khi nạp dữ liệu SAP bằng script Python, bấm để làm mới bảng tra cứu theo PO, số yêu cầu và lệnh xuất.</p>
        <button disabled={busy} onClick={lamMoi} className="rounded bg-[#6e0909] px-4 py-2 font-bold text-white disabled:opacity-50">
          {busy ? 'Đang làm mới…' : 'Làm mới bảng tổng hợp'}
        </button>
        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </div>
    </div>
  );
}
