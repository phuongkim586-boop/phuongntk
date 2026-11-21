// Bộ trích xuất chứng từ kho Đại Dũng — dùng chung cho build (Node) và đồng bộ trong trình duyệt.
(function (root) {
  const TYPES = {
    PX: 'Phiếu xuất kho vật tư', NM: 'Phiếu nhập mua', NK: 'Phiếu nhập khẩu',
    NT: 'Phiếu nhập trả/thu hồi', DC: 'Phiếu xuất điều chuyển', DI: 'Phiếu nhập điều chuyển',
    GI: 'Phiếu xuất kho (SAP)', GR: 'Phiếu nhập kho (SAP)', BB: 'Biên bản/Hồ sơ kiểm tra', KH: 'Chứng từ khác'
  };
  const OWN = /ĐẠI DŨNG|DAI DUNG|DAIDUNG/i;
  function strip(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  function clean(s) { return (s || '').replace(/\\-/g, '-').replace(/\\_/g, '_').replace(/\\\*/g, '*').replace(/\s+/g, ' ').trim(); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function validDate(d, m, y) { d = +d; m = +m; y = +y; return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2015 && y <= 2030; }

  function parse(f) {
    const title = f.title || f.name || '';
    const raw = f.contentSnippet || f.text || '';
    const t = raw.replace(/\r/g, '');
    const one = clean(t);
    const r = {
      id: f.id, file: title, url: f.viewUrl || ('https://drive.google.com/file/d/' + f.id + '/view'),
      folder: f.folderName || '', size: +f.fileSize || 0, created: (f.createdTime || '').slice(0, 10),
      so: '', loai: 'KH', ngay: '', du_an_ma: '', du_an: '', wbs: '', ncc: '', bo_phan: '', dien_giai: '',
      lenh: '', tong_sl: '', ocr: raw ? 1 : 0, text: ''
    };
    // Số phiếu và loại từ tên tệp
    let m = title.match(/^([A-Z]{2})(\d{2})_(\d{2})-(\d{3,5})/);
    let yy = null, mm = null;
    if (m) {
      r.so = `${m[1]}${m[2]}/${m[3]}-${m[4]}`; r.loai = TYPES[m[1]] ? m[1] : 'KH';
      yy = 2000 + +m[2]; mm = +m[3];
    } else if ((m = title.match(/^(49\d{8}|50\d{8}|4\d{9}|5\d{9})/))) {
      r.so = m[1]; r.loai = m[1][0] === '4' ? 'GI' : 'GR';
    } else if (/KIEMTRA|BIEN|BB/i.test(title)) {
      r.loai = 'BB';
      const s = one.match(/Số phiếu:?\s*([A-Z]{2}\d{2}\/\d{2}-\d{3,5})|Số:\s*([A-Z]{2}\d{2}\/\d{2}-\d{3,5})/);
      r.so = s ? (s[1] || s[2]) : title.replace(/\.[a-z]+$/i, '');
    } else { r.so = title.replace(/\.[a-z]+$/i, ''); }
    if (!m && /PHIẾU XUẤT KHO|GOODS ISSUE/i.test(one) && r.loai === 'KH') r.loai = 'GI';

    // Ngày chứng từ
    let d = null;
    const cands = [];
    let x;
    const reLap = /Ngày lập:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
    while ((x = reLap.exec(one))) cands.push([x[1], x[2], x[3]]);
    const reVN = /Ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/gi;
    while ((x = reVN.exec(one))) cands.push([x[1], x[2], x[3]]);
    const reNote = /(?:ISSUE|RECEIPT) NOTE\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/gi;
    while ((x = reNote.exec(one))) cands.push([x[1], x[2], x[3]]);
    const reAny = /\b(\d{2})\/(\d{2})\/(20\d{2})\b/g;
    while ((x = reAny.exec(one))) cands.push([x[1], x[2], x[3]]);
    for (const c of cands) {
      let [dd, mo, y] = c.map(Number);
      if (yy && mm && mo === mm && y !== yy && Math.abs(y - yy) >= 1) y = yy; // OCR đọc 2025 thành 2015/2023
      if (yy && mm && mo !== mm) continue;
      if (validDate(dd, mo, y)) { d = `${y}-${pad(mo)}-${pad(dd)}`; break; }
    }
    // Ngày không thể sau ngày tệp được tải lên Drive: OCR đọc sai năm -> sửa theo năm tải lên
    const up = (f.createdTime || '').slice(0, 10);
    if (d && up && d > up) {
      const [Y, M, Dd] = d.split('-');
      let fix = `${up.slice(0, 4)}-${M}-${Dd}`;
      if (fix > up) fix = `${+up.slice(0, 4) - 1}-${M}-${Dd}`;
      d = fix; r.ngay_sua = 1;
    }
    if (d && +d.slice(0, 4) < 2024) { // OCR đọc 2025/2026 thành 2015/2016/2020...
      const y2 = 2020 + (+d[3]);
      let fix = (y2 >= 2024 ? y2 : +(up || '2026').slice(0, 4)) + d.slice(4);
      if (up && fix > up) fix = (+up.slice(0, 4) - 1) + d.slice(4);
      d = fix; r.ngay_sua = 1;
    }
    if (!d && yy && mm) d = `${yy}-${pad(mm)}-01`, r.ngay_uoc = 1;
    r.ngay = d || '';

    // Dự án / công trình
    m = one.match(/Mã công trình\s+Tên công trình\s+([A-Z]{3,5}\.?[A-Z0-9]{1,3}\.\d{2}\.?)\s+(.{3,120}?)\s+Hợp đồng\s+(\d{3})/);
    if (m) { r.du_an_ma = m[1].replace(/\.$/, '') + '.' + m[3]; r.du_an = m[2]; }
    if (!r.du_an) {
      m = one.match(/Tên công trình\s+(A0\d{11})\s+(CTNB[^|]{3,90}?)(?=\s+(?:Bộ phận|Stt|PHIẾU|Hạng|Tel|Mã|A0)|$)/);
      if (m) { r.du_an_ma = m[1]; r.du_an = m[2]; }
    }
    if (!r.du_an) {
      m = one.match(/\b(A0\d{11})\s+(CTNB DDC[^|]{3,90}?công trình)/i);
      if (m) { r.du_an_ma = m[1]; r.du_an = m[2]; }
    }
    if (!r.du_an) {
      m = one.match(/Mã công trình\s+Tên công trình\s+([A-Z]{3,5}\.[A-Z0-9]{1,3}\.\d{2}\.?\s*\d{0,3})/);
      if (m) r.du_an_ma = m[1].replace(/\s+/g, '');
      m = one.match(/(?:Tên CT|TEN DA|TÊN ĐẠI|Tên công trình)\s*:?\s*([A-ZÀ-Ỹ][A-ZÀ-Ỹ0-9 ,.\-()&/]{8,140}?)(?=\s+(?:[A-Z][a-zà-ỹ]|\d{1,2}\/|Hạng|Nơi|Ghi|PERDAMAN|$))/);
      if (m && !/^(Hợp đồng|Bộ phận)/.test(m[1])) r.du_an = m[1];
    }
    // Line-based (bố cục OCR của phiếu xuất cũ)
    {
      const L = t.split('\n').map(s => s.replace(/^\|\s*|\s*\|$/g, '').trim()).filter(Boolean);
      const i = L.findIndex(s => /^Mã công trình$/.test(s));
      if (i >= 0) {
        const STOP = /^(Tel:|PHIẾU|Hạng mục|Stt|Bộ phận|Bên nhận|Ngày lập|I ?CE|IF CE|CE|ID:|Lệnh|Số xe|Só xe|Don|Mặt hàng|daidung|AH\d)/i;
        let pre = '', no = '', name = [];
        for (let k = i + 1; k < Math.min(L.length, i + 12); k++) {
          const s = L[k];
          if (STOP.test(s)) { if (/^AH\d/.test(s)) continue; break; }
          if (/^(Tên công trình|Hợp đồng)$/.test(s)) continue;
          let mm2;
          if ((mm2 = s.match(/^([A-Z]{4}\.[A-Z0-9]{2,4}\.(?:\d{2}\.?)?)(\d{2,3})?$/))) { pre = mm2[1]; if (mm2[2]) no = mm2[2]; continue; }
          if ((mm2 = s.match(/^(\d{2}\.)?(\d{3})( DDC)?$/))) { no = (mm2[1] || '') + mm2[2]; if (mm2[3]) name.push('DDC'); continue; }
          if ((mm2 = s.match(/^(A0\d{11})\s*(.*)$/))) { pre = mm2[1]; if (mm2[2]) name.push(mm2[2]); continue; }
          name.push(s.replace(/^Tên công trình\s*/, ''));
        }
        if (pre) r.du_an_ma = (pre + (no && !pre.startsWith('A0') ? (pre.endsWith('.') ? '' : '.') + no : '')).replace(/D[O]\./, 'D0.');
        const nm = clean(name.join(' ')).replace(/\s*-\s*-/g, ' -').replace(/[-|.\s]+$/, '');
        if (nm.length >= 4) r.du_an = nm;
      }
    }
    // WBS SAP: 10626-05101-DGTN SÂN VẬN ĐỘNG HÙNG VƯƠNG
    m = one.match(/\b(1\d{4}-\d{3,5})(?:-([A-Z0-9]{2,6}))?\s+([A-ZÀ-Ỹ][A-ZÀ-Ỹ0-9 ,.\-]{4,80}?)(?=\s+\d{3}-|\s+[a-z]|\s+Số|\s+Stt|\s*$)/);
    if (m) { r.wbs = m[1] + (m[2] ? '-' + m[2] : ''); if (!r.du_an) r.du_an = m[3].trim(); if (!r.du_an_ma) r.du_an_ma = r.wbs; }
    m = one.match(/\b(0\d{6})-([^\d|]{3,40}?)(?=\s+\d{3}-)/);
    if (m && !r.bo_phan) r.bo_phan = m[2].trim();
    r.du_an = clean(r.du_an).replace(/\s*-\s*$/, '');
    if (/ĐẠI DŨNG|DAI DUNG|Address|PHIẾU|Lot No/i.test(r.du_an)) r.du_an = '';
    r.du_an_ma = r.du_an_ma.replace(/\.\.+/g, '.').replace(/^(TCTN|XKNN|TCNN|XKTN)D/, '$1.D').replace(/,/g, '.').replace(/\.DO\./, '.D0.').replace(/\.D(\d)(\d{2})\./, '.D$1.$2.').replace(/^TCIN/, 'TCTN').replace(/^TCTND/, 'TCTN.D');
    r.du_an = r.du_an.replace(/\s*(?:Hop Dong|Hợp đồng)?\s*\(84-028\).*$/i, '').replace(/\s*\|\s*/g, ' ').trim();
    if (/^(TCTN|XKNN|TCIN)[.\s]*D[O0][.\s]*\d{2}[.\s]*\d{0,3}$/i.test(r.du_an)) r.du_an = '';
    r.du_an = r.du_an.replace(/^\|\s*/, '').replace(new RegExp('^' + (r.du_an_ma || '§').replace(/[.]/g, '\\.') + '[.,]?\\s*'), '');

    // Nhà cung cấp / người giao
    m = one.match(/Họ tên người giao hàng:\s*(.{3,90}?)(?=\s+[-–]\s*Nhập tại|\s+-\s|\s+Nhập tại|$)/);
    if (m) r.ncc = m[1];
    if (!r.ncc && (r.loai === 'GR')) {
      m = one.match(/Số phiếu \(N\w*\):?\s*\d{10}\s+(.{3,80}?)\s+(?:CTCP CKXD|CÔNG TY CP CKXD|CTCP)/);
      if (m && !OWN.test(m[1])) r.ncc = m[1];
    }
    if (!r.ncc) {
      m = one.match(/KHO GỬI NHÀ CUNG CẤP\s*-\s*([^()]{3,60})\(?/);
      if (m) r.ncc = m[1];
    }
    r.ncc = clean(r.ncc).replace(/\s*Mẫu số.*$/i, '').replace(/\s*\(?Ban hành.*$/i, '').replace(/[.,;:\s]+$/, '');
    if (OWN.test(r.ncc) && r.loai !== 'NT') r.ncc_noi_bo = 1;

    // Bộ phận nhận (phiếu xuất)
    m = one.match(/Bên nhận\/ Xưởng\/? ?Đội\s+(AH\d[^|]{2,40}?)(?=\s+(?:IF|I CE|CE|ICE|Bộ phận|Stt|Ngày|\(SU|$))/) || one.match(/\b(AH\d\s*-\s*T[ỔỎO][^|]{2,30}?)(?=\s+(?:IF|I CE|CE|ICE|Bộ|Stt|Ngày|\d{3}|$))/);
    if (m) r.bo_phan = clean(m[1]);
    if (!r.bo_phan) { m = one.match(/Đơn vị nhận \(Receiving Party[^)]*\)?:?.{0,140}?Số phiếu \(N\w*\):?\s*\d{10}\s+(.{2,30}?)\s+(?:I CE|ICE|Website)/); if (m) r.bo_phan = clean(m[1]); }

    // Diễn giải
    m = one.match(/Nội dung:\s*(.{5,200}?)(?=\s+Mặt hàng|\s+Stt|\s+Tên, nhãn|\s+ID:|$)/) ||
        one.match(/Ghi chú:\s*\|?\s*(.{5,160}?)(?=\s+\|?\s*Note:|\s+Note|$)/) ||
        one.match(/(XUẤT VT [^|]{2,40}?|NHẬP [A-ZÀ-Ỹ ]{4,60}?)(?=\s+Stt|\s+\d{3}-|\s+Số|$)/);
    if (m) r.dien_giai = clean(m[1]);
    m = one.match(/\b(\d{3})-((?:Xuất|NK|Nhập|Xuat)[^|]{3,50}?)(?=\s+\d|\s+[A-Z]{3}|$)/);
    if (m) r.loai_gd = m[1] + '-' + clean(m[2]);
    m = one.match(/Loại xuất\s+(.{5,60}?)(?=\s+Stt|\s+Bên|\s+Bộ phận|\s+Mã|$)/);
    if (m) r.loai_gd = clean(m[1]);

    // Lệnh / PO
    const lenh = new Set();
    const reL = /DDC[A-Z]*\.? ?(?:LX|LN|LD|LT|PO)\d{3}\/\d{2}-\s?\d{3,4}|DDC\.(?:LX|LN|LD|LT|PO)\d{2}\/\d{2}-\d{3,4}/g;
    while ((x = reL.exec(one)) && lenh.size < 6) lenh.add(x[0].replace(/\s/g, '').replace(/^DDC(?=[A-Z]{2}\d)/, 'DDC.'));
    m = one.match(/\b(18\d{8})(?:\((41\d{8})\))?/); if (m) lenh.add('PO ' + m[1]);
    r.lenh = [...lenh].join(', ');

    // Tổng số lượng
    m = one.match(/Tổng cộng:?\s*(?:Tài xế\s*)?(?:[A-Za-zÀ-ỹ]+\s+)?(\d{1,3}(?:\.\d{3})*(?:,\d+)?)/);
    if (m) r.tong_sl = m[1];

    // Văn bản tìm kiếm rút gọn (nội dung chứng từ)
    r.text = one.replace(/Tel: \(84[^|]*?www\.daidung\.(?:vn|com)/g, '').slice(0, 900);
    return r;
  }
  function key(s) { return strip(s).replace(/[^a-z0-9]+/g, ' ').trim(); }
  const api = { parse, TYPES, strip, key };
  if (typeof module !== 'undefined') module.exports = api; else root.DDParser = api;
})(this);
