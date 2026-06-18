// --- 1. BIẾN TOÀN CỤC & TRẠNG THÁI ---
const APP_PASSWORD = "2109004";
let isAppUnlocked = false;
let totalBeforeTaxValue = 0;
let loadChartInstance = null;
let cashflowChartInstance = null;
let spiderChartInstance = null; 
let isLcaExpanded = false;

let actual24hLoadProfile = null; 

let globalDcAcRatio = 1.15;
let globalPanelLength = 2382;
let globalPanelWidth = 1134;
let globalPanelArea = 2.701188; 
let globalRoofArea = 100;

// CỜ TRẠNG THÁI: KIỂM SOÁT OVERWRITE BẢNG BOQ
let isBoqEdited = false;

const profilesPreset = {
    'hd_247': { pct1: 50, pct2: 10, pct3: 30, pct4: 10, name: 'Dân dụng / Biệt thự (Sinh hoạt 24/7)', desc: 'Gia đình có người ở nhà thường xuyên. Phụ tải chia khá đều đặn 24/24 giờ.' },
    'hd_dem': { pct1: 70, pct2: 10, pct3: 10, pct4: 10, name: 'Dân dụng / Đi làm ban ngày (Evening Peak)', desc: 'Ban ngày vắng người nên phụ tải rất thấp. Điện năng tiêu thụ dồn cực mạnh vào khung giờ Đêm (18h-06h). Rất cần BESS.' },
    'vp_hc': { pct1: 15, pct2: 10, pct3: 60, pct4: 15, name: 'Tòa nhà Văn phòng (Office Building 8h-17h)', desc: 'Đặc tuyến hình chuông đồng pha hoàn hảo với bức xạ mặt trời. Phụ tải hệ thống lạnh trung tâm tập trung vào 6 tiếng trưa nắng.' },
    'nm_hc': { pct1: 15, pct2: 15, pct3: 55, pct4: 15, name: 'Nhà máy 1 ca / Hành chính (Daytime Factory)', desc: 'Hoạt động sản xuất tập trung ban ngày. Lý tưởng để lắp điện mặt trời bám tải (Zero-Export).' },
    'nm_247': { pct1: 50, pct2: 12.5, pct3: 25, pct4: 12.5, name: 'Nhà máy 3 ca / Hoạt động 24/24 (Continuous Ops)', desc: 'Phụ tải nền chạy liên tục 24/24. Do khung Đêm chiếm 12 tiếng nên tỷ trọng là lớn nhất (50%).' },
    'cang': { pct1: 40, pct2: 15, pct3: 30, pct4: 15, name: 'Cảng biển / Logistics (Seaport 7h-23h)', desc: 'Hoạt động cẩu bờ, cẩu bãi duy trì cường độ cao từ sáng đến khuya. Phụ tải buổi đêm vẫn giữ mức khá cao do hoạt động xuất nhập tàu.' },
    'tttm': { pct1: 25, pct2: 5, pct3: 45, pct4: 25, name: 'Trung tâm Thương mại / Siêu thị (Mall 9h-22h)', desc: 'Phụ tải tăng dần từ lúc mở cửa 9h sáng và kéo dài đến tận 22h đêm.' },
    'custom': { name: 'Tùy chỉnh phân bổ thủ công theo 4 khung giờ quang năng', desc: 'Cấu hình tỷ trọng tải nền được tùy biến hoàn toàn để khớp chính xác với hóa đơn của Khách hàng.' }
};

function updateCover() {
    document.getElementById('coverCustomer').innerText = document.getElementById('projCustomer').value || '---';
    document.getElementById('coverAddress').innerText = document.getElementById('projAddress').value || '---';
}

// --- XỬ LÝ SỰ KIỆN SCROLL VÀ NAV ---
window.addEventListener('scroll', function() {
    let btnTop = document.getElementById("btnBackToTop");
    if (document.body.scrollTop > 500 || document.documentElement.scrollTop > 500) { btnTop.style.display = "flex"; } else { btnTop.style.display = "none"; }
    let sections = document.querySelectorAll('.section-header');
    let navLinks = document.querySelectorAll('.floating-nav a[href^="#"]');
    let current = "";
    sections.forEach((sec) => { const sectionTop = sec.offsetTop; if (pageYOffset >= sectionTop - 100) { current = sec.getAttribute('id'); } });
    navLinks.forEach((link) => { link.classList.remove('active'); if (link.getAttribute('href').includes(current) && current !== "") { link.classList.add('active'); } });
});
// --- HÀM XỬ LÝ ĐÓNG/MỞ KHỐI NỘI DUNG (ACCORDION) ---
function toggleSection(contentId, btnId) {
    const content = document.getElementById(contentId);
    const btn = document.getElementById(btnId);
    
    // Nếu khối nội dung đang ẩn, tiến hành mở rộng và render lại đồ thị
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        btn.innerText = '➖';
        
        // Khắc phục rủi ro vỡ/giật tỷ lệ biểu đồ Chart.js khi Parent DIV bị ẩn từ trước
        if (contentId === 'content-tech' && loadChartInstance) {
            loadChartInstance.update();
        }
        if (contentId === 'content-finance') {
            if (cashflowChartInstance) cashflowChartInstance.update();
            if (spiderChartInstance) spiderChartInstance.update();
        }
    } else {
        content.style.display = 'none';
        btn.innerText = '➕';
    }
}
function highlightNav(el) { document.querySelectorAll('.floating-nav a').forEach(a => a.classList.remove('active')); el.classList.add('active'); }

// --- 2. HÀM TIỆN ÍCH LÕI ---
function flashElements() {
    const ids = ['resIrrBase', 'resPaybackBase', 'resNpvBase'];
    ids.forEach(id => {
        let el = document.getElementById(id);
        if(el) { el.classList.remove('flash-update'); void el.offsetWidth; el.classList.add('flash-update'); }
    });
}

function toggleLcaTable() {
    isLcaExpanded = !isLcaExpanded;
    let btn = document.getElementById('btnToggleLca');
    if(isLcaExpanded) { btn.innerHTML = '▲ Thu gọn Bảng Mô Phỏng ▲'; } else { btn.innerHTML = '▼ Xem chi tiết toàn bộ 25 năm ▼'; document.getElementById('genTable').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    if(isAppUnlocked) calculate(); 
}

function toggleLanguage() { document.body.classList.toggle('lang-en'); }
function autoResize(textarea) { textarea.style.height = 'auto'; textarea.style.height = textarea.scrollHeight + 'px'; }
window.addEventListener('beforeprint', function() { if(document.body.classList.contains('print-boq-only')) { document.querySelectorAll('#boqTable textarea, .terms-box').forEach(el => autoResize(el)); } });
function formatMoney(num) { if(isNaN(num) || !isFinite(num)) return "0 đ"; return Math.round(num).toLocaleString('vi-VN') + " đ"; }

function formatInt(el) {
    let cursorPosition = el.selectionStart; let originalLength = el.value.length;
    let val = el.value.replace(/[^0-9]/g, ''); if (val === '') { el.value = ''; return; }
    el.value = parseInt(val, 10).toLocaleString('vi-VN');
    let newLength = el.value.length; cursorPosition = cursorPosition + (newLength - originalLength);
    el.setSelectionRange(cursorPosition, cursorPosition);
}

function getInt(id) {
    let el = document.getElementById(id); if(!el) return 0;
    let val = el.value.replace(/[^0-9]/g, ''); return parseInt(val, 10) || 0;
}

function calculatePMT(rate, nper, pv) { if (rate === 0) return pv / nper; return (pv * rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1); }

function calculateIRR(cashFlows) {
    let minRate = -1.0; let maxRate = 1.0; let irr = 0;
    for (let i = 0; i < 100; i++) {
        irr = (minRate + maxRate) / 2; let npv = 0;
        for (let t = 0; t < cashFlows.length; t++) { npv += cashFlows[t] / Math.pow(1 + irr, t); }
        if (Math.abs(npv) < 0.001) break;
        if (npv > 0) minRate = irr; else maxRate = irr;
    }
    return irr * 100;
}

function toggleAlgorithmExpl() { const box = document.getElementById('algorithmExplBox'); const textBtn = document.getElementById('algoToggleText'); if (box.style.display === 'none' || box.style.display === '') { box.style.display = 'block'; textBtn.innerHTML = '➖ Ẩn chi tiết Thuật toán Biểu đồ'; } else { box.style.display = 'none'; textBtn.innerHTML = '➕ Bấm để xem chi tiết Thuật toán Biểu đồ'; } }
function toggleBessAlgorithm() { const box = document.getElementById('bessAlgorithmBox'); const textBtn = document.getElementById('bessToggleText'); if (box.style.display === 'none' || box.style.display === '') { box.style.display = 'block'; textBtn.innerHTML = '➖ Ẩn cơ sở thiết kế BESS'; } else { box.style.display = 'none'; textBtn.innerHTML = '➕ Xem cơ sở thiết kế BESS'; } }
function toggleAcAlgorithm() { const box = document.getElementById('acAlgorithmBox'); const textBtn = document.getElementById('acToggleText'); if (box.style.display === 'none' || box.style.display === '') { box.style.display = 'block'; textBtn.innerHTML = '➖ Ẩn cơ sở thiết kế AC'; } else { box.style.display = 'none'; textBtn.innerHTML = '➕ Xem cơ sở thiết kế AC'; } }
function toggleYieldAlgorithm() { const box = document.getElementById('yieldAlgorithmBox'); const textBtn = document.getElementById('yieldToggleText'); if (box.style.display === 'none' || box.style.display === '') { box.style.display = 'block'; textBtn.innerHTML = '➖ Ẩn thuật toán Sản lượng'; } else { box.style.display = 'none'; textBtn.innerHTML = '➕ Xem thuật toán Sản lượng'; } }
function toggleFinanceAlgorithm() { const box = document.getElementById('financeAlgorithmBox'); const textBtn = document.getElementById('financeToggleText'); if (box.style.display === 'none' || box.style.display === '') { box.style.display = 'block'; textBtn.innerHTML = '➖ Ẩn cơ sở tính toán Tài chính'; } else { box.style.display = 'none'; textBtn.innerHTML = '➕ Xem cơ sở tính toán Tài chính'; } }

// --- 3. KIỂM SOÁT BẢN QUYỀN (LOCK SYSTEM) ---
function setLockState(isLocked) {
    isAppUnlocked = !isLocked;
    const inputs = document.querySelectorAll('input:not(#unlockPwd):not(#cfgPanelPower):not(#cfgPanelLength):not(#cfgPanelWidth):not(#cfgDcAcRatio):not(#cfgRoofArea), select, textarea');
    const actionBtns = document.querySelectorAll('.action-btn');

    inputs.forEach(el => {
        if(el.id === 'panelPower' || el.id === 'projRoof' || el.id === 'peakLoad') return; 
        el.disabled = isLocked;
        if (isLocked) { el.style.backgroundColor = '#f1f2f6'; el.style.color = '#a4b0be'; } 
        else { el.style.backgroundColor = ''; el.style.color = ''; }
    });

    actionBtns.forEach(btn => {
        btn.disabled = isLocked;
        if (isLocked) { btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; } 
        else { btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
    });
    
    const overlay = document.getElementById('chartOverlay');
    if(overlay) overlay.style.display = isLocked ? 'flex' : 'none';
}

function checkPassword() {
    const pwd = document.getElementById('unlockPwd').value; const err = document.getElementById('lockError');
    if (pwd === APP_PASSWORD || pwd === "2109004") {
        err.style.display = 'none'; setLockState(false);
        const lockBox = document.getElementById('lockContainer');
        lockBox.style.opacity = '0'; setTimeout(() => { lockBox.style.display = 'none'; }, 300);
        sessionStorage.setItem('adg_solar_unlocked', 'true'); calculate(); 
    } else { err.style.display = 'inline-block'; }
}

// --- 4. THUẬT TOÁN ĐỌC & PARSE FILE EVN CSV & EXCEL (AUTO-DETECT HEURISTIC) ---
function handleEvnUpload(event) {
    const file = event.target.files[0]; if (!file) return; const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
        Papa.parse(file, { header: false, skipEmptyLines: true, complete: function(results) { processEvnDataArray(results.data); } });
    } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = function(e) { 
            const data = new Uint8Array(e.target.result); 
            const workbook = XLSX.read(data, {type: 'array'}); 
            const sheetName = workbook.SheetNames[0]; 
            const jsonArr = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1}); 
            processEvnDataArray(jsonArr); 
        };
        reader.readAsArrayBuffer(file);
    } else { alert("❌ Vui lòng tải file định dạng .csv hoặc .xlsx"); }
}

function processEvnDataArray(rows) {
    let hourlyData = Array.from({length: 24}, () => ({ sum_kW: 0, count: 0 })); let maxKw = 0; let maxKwTime = ""; 

    // Thuật toán quét và dò tìm tọa độ (Auto-Detect Indexing)
    let timeColIdx = -1; let pColIdx = -1; let startRowIdx = 2;
    
    for (let i = 0; i < Math.min(6, rows.length); i++) {
        let row = rows[i]; if (!row) continue;
        for (let j = 0; j < row.length; j++) {
            let cell = String(row[j] || '').toLowerCase().trim();
            if (cell === 'thời gian' || cell === 'time') timeColIdx = j;
            if (cell === 'p (kw)' || cell.includes('p giao') || cell.includes('công suất')) pColIdx = j;
        }
        if (timeColIdx !== -1 && pColIdx !== -1) {
            // Nhận diện cấu trúc EVNHES nhiều tầng (A, B, C, Tổng)
            if (i + 1 < rows.length) {
                let nextRow = rows[i+1];
                for (let k = pColIdx; k <= pColIdx + 5 && k < nextRow.length; k++) {
                    let subCell = String(nextRow[k] || '').toLowerCase().trim();
                    if (subCell === 'tổng' || subCell === 'total') { pColIdx = k; break; }
                }
            }
            startRowIdx = i + 2; break; 
        }
    }
    
    // Cơ chế Fallback an toàn nếu không dò được header chuẩn
    if (timeColIdx === -1) timeColIdx = 1;
    if (pColIdx === -1) pColIdx = 3;

    for (let i = startRowIdx; i < rows.length; i++) {
        let row = rows[i]; if (!row || row.length <= Math.max(timeColIdx, pColIdx)) continue;
        let timeStr = row[timeColIdx]; 
        let pGiaoRaw = row[pColIdx] !== undefined ? row[pColIdx].toString().replace(',', '.') : ''; 
        let pGiaoKw = parseFloat(pGiaoRaw); 
        
        // Try-Catch ngầm: Bỏ qua các dòng NaN/Null do cảm biến cẩu ngừng trích xuất
        if (timeStr && !isNaN(pGiaoKw)) {
            let parts = timeStr.toString().trim().split(' '); 
            let timePart = parts.length > 1 ? parts[1] : parts[0]; 
            let hourStr = timePart.split(':')[0]; let hour = parseInt(hourStr, 10);
            if (!isNaN(hour) && hour >= 0 && hour <= 23) {
                hourlyData[hour].sum_kW += pGiaoKw; hourlyData[hour].count += 1;
                if (pGiaoKw > maxKw) { maxKw = pGiaoKw; maxKwTime = timeStr.toString().trim(); }
            }
        }
    }

    if (hourlyData.every(h => h.count === 0)) { 
        alert("❌ File tải lên không đúng cấu trúc đo đếm EVN (AMR/HES). Vui lòng kiểm tra lại định dạng xuất file."); 
        return; 
    }

    actual24hLoadProfile = hourlyData.map(h => h.count > 0 ? (h.sum_kW / h.count) : 0);
    let sumS1 = 0, sumS2 = 0, sumS3 = 0, sumS4 = 0; let dailyKwh = actual24hLoadProfile.reduce((a, b) => a + b, 0);

    for(let i = 0; i < 24; i++) {
        if(i >= 18 || i < 6) sumS1 += actual24hLoadProfile[i]; else if(i >= 6 && i < 9) sumS2 += actual24hLoadProfile[i]; 
        else if(i >= 9 && i < 15) sumS3 += actual24hLoadProfile[i]; else if(i >= 15 && i < 18) sumS4 += actual24hLoadProfile[i]; 
    }

    document.getElementById('pct1').value = dailyKwh > 0 ? Math.round((sumS1/dailyKwh)*100) : 0;
    document.getElementById('pct2').value = dailyKwh > 0 ? Math.round((sumS2/dailyKwh)*100) : 0;
    document.getElementById('pct3').value = dailyKwh > 0 ? Math.round((sumS3/dailyKwh)*100) : 0;
    document.getElementById('pct4').value = dailyKwh > 0 ? Math.round((sumS4/dailyKwh)*100) : 0;
    document.getElementById('loadProfile').value = 'custom';
    
    let newMonthlyUsage = Math.round(dailyKwh * 30);
    document.getElementById('monthlyUsage').value = newMonthlyUsage.toLocaleString('vi-VN');
    document.getElementById('peakLoad').value = Math.round(maxKw).toLocaleString('vi-VN');

    let peakTimeEl = document.getElementById('peakTime');
    if(peakTimeEl) { peakTimeEl.innerText = `(Đạt đỉnh lúc: ${maxKwTime})`; peakTimeEl.style.display = 'block'; }
    
    ['pct1', 'pct2', 'pct3', 'pct4', 'monthlyUsage', 'peakLoad'].forEach(id => {
        let el = document.getElementById(id);
        if(el) { el.style.backgroundColor = '#ffeaa7'; setTimeout(() => { el.style.backgroundColor = id === 'peakLoad' ? '#f1f2f6' : ''; }, 2000); }
    });

    alert(`✅ Đã đồng bộ & trích xuất thành công dữ liệu tải.\nTải nền trung bình: ${Math.round(dailyKwh/24)} kW\nTải đỉnh (Max Peak): ${Math.round(maxKw)} kW (Lúc ${maxKwTime}).`);
    calcAvgPrice(); 
}

// --- 5. ĐỒNG BỘ DỮ LIỆU ĐIỆN NĂNG ---
function syncFromBill() {
    if (!isAppUnlocked && typeof isAppUnlocked !== 'undefined') return;
    const type = document.getElementById('priceType').value;
    if (type === 'res_tier') { calcAvgPrice(); return; }
    const bill = getInt('infoBill'); const price = getInt('electricityPrice');
    if(price > 0) { document.getElementById('monthlyUsage').value = Math.round(bill / price).toLocaleString('vi-VN'); }
    autoCalcPeakLoad(); if(isAppUnlocked) calculate();
}

function syncFromUsage() {
    if (!isAppUnlocked && typeof isAppUnlocked !== 'undefined') return;
    const type = document.getElementById('priceType').value;
    const usage = getInt('monthlyUsage'); const price = getInt('electricityPrice');
    if (type !== 'res_tier') { document.getElementById('infoBill').value = Math.round(usage * price).toLocaleString('vi-VN'); }
    autoCalcPeakLoad(); if(isAppUnlocked) calculate();
}

function syncFromPrice() {
    if (!isAppUnlocked && typeof isAppUnlocked !== 'undefined') return;
    const type = document.getElementById('priceType').value; if (type === 'res_tier') return; 
    const usage = getInt('monthlyUsage'); const price = getInt('electricityPrice');
    document.getElementById('infoBill').value = Math.round(usage * price).toLocaleString('vi-VN');
    autoCalcPeakLoad(); if(isAppUnlocked) calculate();
}

function autoCalcPeakLoad() {
    if (actual24hLoadProfile !== null) return; 
    const usage = getInt('monthlyUsage'); let peakEst = Math.round((usage / 30) / 8 * 1.5);
    if(peakEst < 1 || isNaN(peakEst)) peakEst = 1; 
    let peakInput = document.getElementById('peakLoad'); peakInput.value = peakEst.toLocaleString('vi-VN');
    peakInput.style.backgroundColor = "#eafbf6"; setTimeout(() => { peakInput.style.backgroundColor = "#f1f2f6"; }, 1500);
    let peakTimeEl = document.getElementById('peakTime'); if(peakTimeEl) peakTimeEl.style.display = 'none';
}

function applyProfilePreset() {
    actual24hLoadProfile = null; const sel = document.getElementById('loadProfile').value;
    if(profilesPreset[sel] && sel !== 'custom') {
        document.getElementById('pct1').value = profilesPreset[sel].pct1; document.getElementById('pct2').value = profilesPreset[sel].pct2;
        document.getElementById('pct3').value = profilesPreset[sel].pct3; document.getElementById('pct4').value = profilesPreset[sel].pct4;
    }
    calcAvgPrice(); 
}

function setCustomProfile() { actual24hLoadProfile = null; document.getElementById('loadProfile').value = 'custom'; calcAvgPrice(); }

function calcResTierFromBill(bill) {
    const t1_p = parseFloat(document.getElementById('p_res_1').value) || 1893; const t2_p = parseFloat(document.getElementById('p_res_2').value) || 1956;
    const t3_p = parseFloat(document.getElementById('p_res_3').value) || 2271; const t4_p = parseFloat(document.getElementById('p_res_4').value) || 2860;
    const t5_p = parseFloat(document.getElementById('p_res_5').value) || 3197; const t6_p = parseFloat(document.getElementById('p_res_6').value) || 3302;
    const limit1 = 50 * t1_p; const limit2 = limit1 + 50 * t2_p; const limit3 = limit2 + 100 * t3_p;
    const limit4 = limit3 + 100 * t4_p; const limit5 = limit4 + 100 * t5_p;
    let kwh = 0;
    if (bill <= limit1) { kwh = bill / t1_p; } else if (bill <= limit2) { kwh = 50 + (bill - limit1) / t2_p; } 
    else if (bill <= limit3) { kwh = 100 + (bill - limit2) / t3_p; } else if (bill <= limit4) { kwh = 200 + (bill - limit3) / t4_p; } 
    else if (bill <= limit5) { kwh = 300 + (bill - limit4) / t5_p; } else { kwh = 400 + (bill - limit5) / t6_p; }
    let avgPrice = kwh > 0 ? (bill / kwh) : 0; return { kwh: Math.round(kwh), avgPrice: Math.round(avgPrice) };
}

function calcAvgPrice() {
    if (!isAppUnlocked && typeof isAppUnlocked !== 'undefined') return;
    const type = document.getElementById('priceType').value;
    if (type === 'custom') { syncFromPrice(); return; }
    if (type === 'res_tier') {
        const bill = getInt('infoBill'); const resData = calcResTierFromBill(bill);
        document.getElementById('electricityPrice').value = resData.avgPrice.toLocaleString('vi-VN');
        document.getElementById('monthlyUsage').value = resData.kwh.toLocaleString('vi-VN');
        autoCalcPeakLoad(); if(isAppUnlocked) calculate(); return;
    }

    let p1 = parseFloat(document.getElementById('pct1').value) || 0; let p2 = parseFloat(document.getElementById('pct2').value) || 0; 
    let p3 = parseFloat(document.getElementById('pct3').value) || 0; let p4 = parseFloat(document.getElementById('pct4').value) || 0; 
    let sumP = p1 + p2 + p3 + p4; if (sumP === 0) { p1=25; p2=25; p3=25; p4=25; sumP = 100; }
    
    let loadOff = p1 * (6/12); let loadNor = p1 * (1.5/12) + p2 * (3/3) + p3 * (6/6) + p4 * (2.5/3); let loadPeak = p1 * (4.5/12) + p4 * (0.5/3);
    let wOff = loadOff / sumP; let wNor = loadNor / sumP; let wPeak = loadPeak / sumP;

    let priceOff = 0, priceNor = 0, pricePeak = 0;
    if (type === 'ind_mv') { priceOff = parseFloat(document.getElementById('p_ind_mv_off').value) || 0; priceNor = parseFloat(document.getElementById('p_ind_mv_nor').value) || 0; pricePeak = parseFloat(document.getElementById('p_ind_mv_peak').value) || 0; } 
    else if (type === 'ind_lv') { priceOff = parseFloat(document.getElementById('p_ind_lv_off').value) || 0; priceNor = parseFloat(document.getElementById('p_ind_lv_nor').value) || 0; pricePeak = parseFloat(document.getElementById('p_ind_lv_peak').value) || 0; } 
    else if (type === 'com_mv') { priceOff = parseFloat(document.getElementById('p_com_mv_off').value) || 0; priceNor = parseFloat(document.getElementById('p_com_mv_nor').value) || 0; pricePeak = parseFloat(document.getElementById('p_com_mv_peak').value) || 0; } 
    else if (type === 'com_lv') { priceOff = parseFloat(document.getElementById('p_com_lv_off').value) || 0; priceNor = parseFloat(document.getElementById('p_com_lv_nor').value) || 0; pricePeak = parseFloat(document.getElementById('p_com_lv_peak').value) || 0; }

    let avgPrice = (wOff * priceOff) + (wNor * priceNor) + (wPeak * pricePeak);
    document.getElementById('electricityPrice').value = Math.round(avgPrice).toLocaleString('vi-VN'); syncFromPrice(); 
}

function loadPanelData() {
    const sel = document.getElementById('dbPanelSelect'); if (sel.value === 'custom') return;
    const opt = sel.options[sel.selectedIndex];
    document.getElementById('cfgPanelPower').value = opt.getAttribute('data-p');
    document.getElementById('cfgPanelLength').value = opt.getAttribute('data-l');
    document.getElementById('cfgPanelWidth').value = opt.getAttribute('data-w');
}

function openConfigModal() {
    if (!isAppUnlocked) return;
    document.getElementById('cfgPanelPower').value = document.getElementById('panelPower').value;
    document.getElementById('cfgRoofArea').value = globalRoofArea;
    document.getElementById('cfgPanelLength').value = globalPanelLength;
    document.getElementById('cfgPanelWidth').value = globalPanelWidth;
    document.getElementById('cfgDcAcRatio').value = globalDcAcRatio;
    document.getElementById('configModal').style.display = 'flex';
}

function closeConfigModal() { document.getElementById('configModal').style.display = 'none'; }

function applyConfig() {
    const pPower = parseFloat(document.getElementById('cfgPanelPower').value) || 650; const pLen = parseFloat(document.getElementById('cfgPanelLength').value) || 2382;
    const pWid = parseFloat(document.getElementById('cfgPanelWidth').value) || 1134; const dcAc = parseFloat(document.getElementById('cfgDcAcRatio').value) || 1.15;
    const rArea = parseFloat(document.getElementById('cfgRoofArea').value) || 0;

    document.getElementById('panelPower').value = pPower; globalRoofArea = rArea;
    document.getElementById('projRoof').value = globalRoofArea.toLocaleString('vi-VN', {maximumFractionDigits: 2}) + " m²";
    globalDcAcRatio = dcAc; globalPanelLength = pLen; globalPanelWidth = pWid; globalPanelArea = (pLen * pWid) / 1000000;
    closeConfigModal(); autoSizePV();
}

function autoSizePV() {
    if (!isAppUnlocked) return;
    const monthlyUsageCalc = getInt('monthlyUsage'); const strategy = document.getElementById('mainStrategy').value;
    let p1 = parseFloat(document.getElementById('pct1').value) || 0; let p2 = parseFloat(document.getElementById('pct2').value) || 0; 
    let p3 = parseFloat(document.getElementById('pct3').value) || 0; let p4 = parseFloat(document.getElementById('pct4').value) || 0;
    let sumP = p1 + p2 + p3 + p4; if(sumP === 0) sumP = 100;
    const psh = parseFloat(document.getElementById('region').value) || 4.6;
    const pr = (parseFloat(document.getElementById('prRate').value) || 85) / 100;
    const panelPwr = parseFloat(document.getElementById('panelPower').value) || 650;
    const sRoof = globalRoofArea; 

    let targetMonthlyYield = 0;
    if (strategy === 'zero_export') { let dayLoadFraction = (p2 + p3 + p4) / sumP; targetMonthlyYield = (monthlyUsageCalc * dayLoadFraction) * 1.2; } 
    else { targetMonthlyYield = monthlyUsageCalc; }

    let monthlyYieldPerKw = (psh * pr) * 30; let targetKw = monthlyYieldPerKw > 0 ? (targetMonthlyYield / monthlyYieldPerKw) : 0;
    let areaPerPanel = globalPanelArea; 
    const segment = document.getElementById('projSegment').value; let usableRatio = (segment === 'cni_large') ? 0.8 : 0.7; 
    
    let targetPanelsByLoad = Math.ceil((targetKw * 1000) / panelPwr); if(targetPanelsByLoad < 0 || isNaN(targetPanelsByLoad)) targetPanelsByLoad = 0;
    let maxPanelsByRoof = sRoof > 0 ? Math.floor((sRoof * usableRatio) / areaPerPanel) : 99999; 
    let finalPanelCount = Math.min(targetPanelsByLoad, maxPanelsByRoof);
    document.getElementById('panelCount').value = finalPanelCount;
    autoCalcPeakLoad(); calculate();
}

function renderMiniChart(solarKwArr, loadKwArr) {
    const ctx = document.getElementById('loadChart').getContext('2d');
    if (loadChartInstance) { loadChartInstance.data.datasets[0].data = solarKwArr; loadChartInstance.data.datasets[1].data = loadKwArr; loadChartInstance.update(); return; }
    loadChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: ['0h','1h','2h','3h','4h','5h','6h','7h','8h','9h','10h','11h','12h','13h','14h','15h','16h','17h','18h','19h','20h','21h','22h','23h'], datasets: [ { label: 'Bức xạ (PV kW)', data: solarKwArr, borderColor: '#f1c40f', backgroundColor: 'rgba(241, 196, 15, 0.25)', fill: true, pointRadius: 0, borderWidth: 2, borderDash: [5, 5], tension: 0.4 }, { label: 'Phụ tải (Load kW)', data: loadKwArr, borderColor: '#0984e3', backgroundColor: 'rgba(9, 132, 227, 0.35)', fill: true, pointRadius: 0, borderWidth: 2, tension: 0.2 } ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 13, weight: '600' } } }, tooltip: { enabled: true, mode: 'index', intersect: false, callbacks: { label: function(context) { return context.dataset.label + ': ' + context.raw.toFixed(2) + ' kW'; } } } }, scales: { x: { ticks: { maxTicksLimit: 12 }, grid: {display: false} }, y: { display: true, title: {display: true, text: 'Công suất (kW)'}, min: 0 } }, layout: { padding: { left: -5, right: -5, top: 10, bottom: 0 } } }
    });
}

function renderCashflowChart(cfAnnArr, cumCfArr) {
    if (!isAppUnlocked) return;
    const ctx = document.getElementById('cashflowChart').getContext('2d');
    let labels = []; let dataBar = []; let dataLine = [];
    for(let i = 0; i <= 25; i++) { labels.push('Y' + i); dataBar.push(cfAnnArr[i]); dataLine.push(cumCfArr[i]); }

    if (cashflowChartInstance) cashflowChartInstance.destroy();
    cashflowChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [ { type: 'line', label: 'Dòng tiền Tích lũy (Hoàn vốn)', data: dataLine, borderColor: '#d63031', backgroundColor: 'rgba(214, 48, 49, 0)', borderWidth: 3, pointRadius: 4, pointBackgroundColor: '#fff', tension: 0.2, yAxisID: 'y' }, { type: 'bar', label: 'Dòng tiền FCFE hằng năm', data: dataBar, backgroundColor: function(context) { return context.raw >= 0 ? 'rgba(0, 184, 148, 0.7)' : 'rgba(214, 48, 49, 0.7)'; }, borderWidth: 0, borderRadius: 4, yAxisID: 'y' } ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: {font: {size: 13}} }, title: { display: false }, tooltip: { callbacks: { label: function(context) { return context.dataset.label + ': ' + Math.round(context.raw).toLocaleString('vi-VN') + ' VNĐ'; } } } }, scales: { x: { grid: { display: false } }, y: { position: 'left', ticks: { font: {size: 13}, callback: function(value) { return (value/1000000).toLocaleString('vi-VN') + ' Tr'; } }, border: { dash: [5, 5] }, grid: { color: function(context) { return context.tick.value === 0 ? '#2d3436' : '#e0e0e0'; }, lineWidth: function(context) { return context.tick.value === 0 ? 2 : 1; } } } } }
    });
}

// --- QUẢN LÝ BOQ MODAL ---
function openBOQModal() {
    if (!isAppUnlocked) return;
    document.body.classList.add('print-boq-only'); document.querySelectorAll('#boqTable textarea, .terms-box').forEach(el => autoResize(el));
    const strategy = document.getElementById('mainStrategy').value; const panelPwr = parseFloat(document.getElementById('panelPower').value) || 0;
    const panelCount = parseFloat(document.getElementById('panelCount').value) || 0; const sysPowerKW = (panelPwr * panelCount) / 1000;
    const regionPSH = parseFloat(document.getElementById('region').value) || 4.6; const prRate = (parseFloat(document.getElementById('prRate').value) || 85) / 100;
    const monthlyUsage = getInt('monthlyUsage'); let eDailyGen = sysPowerKW * regionPSH * prRate; let dailyLoad = monthlyUsage / 30;

    let p1 = parseFloat(document.getElementById('pct1').value) || 0; let p2 = parseFloat(document.getElementById('pct2').value) || 0; 
    let p3 = parseFloat(document.getElementById('pct3').value) || 0; let p4 = parseFloat(document.getElementById('pct4').value) || 0;
    let sumP = p1 + p2 + p3 + p4; if(sumP === 0) sumP = 100; 
    
    let block1Load = dailyLoad * (p1 / sumP); let block2Load = dailyLoad * (p2 / sumP); 
    let block3Load = dailyLoad * (p3 / sumP); let block4Load = dailyLoad * (p4 / sumP); 
    
    let hourlyLoad = new Array(24).fill(0);
    let b1H = block1Load / 12; for(let i=18; i<24; i++) hourlyLoad[i] = b1H; for(let i=0; i<6; i++) hourlyLoad[i] = b1H;
    let b2H = block2Load / 3; for(let i=6; i<9; i++) hourlyLoad[i] = b2H;
    let b3H = block3Load / 6; for(let i=9; i<15; i++) hourlyLoad[i] = b3H;
    let b4H = block4Load / 3; for(let i=15; i<18; i++) hourlyLoad[i] = b4H;

    let solarBaseCurve = [0,0,0,0,0,0, 2, 8, 15, 22, 28, 35, 38, 35, 28, 20, 10, 3, 0,0,0,0,0,0];
    let normalizedSolar = solarBaseCurve.map(x => x / 244);
    
    let loadCurveKw = []; let solarCurveKw = []; let dailyDirectUse = 0; let eExcess = 0; let eDeficit = 0; let peakDeficit = 0; 

    for(let i=0; i<24; i++) {
        let l_h = 0;
        if (typeof actual24hLoadProfile !== 'undefined' && actual24hLoadProfile !== null) { l_h = actual24hLoadProfile[i]; } 
        else { l_h = hourlyLoad[i]; if (typeof manualPeakLoad !== 'undefined' && manualPeakLoad > 0 && l_h > manualPeakLoad) l_h = manualPeakLoad; }
        loadCurveKw.push(l_h);
        
        let s_h = eDailyGen * normalizedSolar[i]; solarCurveKw.push(s_h);
        dailyDirectUse += Math.min(s_h, l_h); eExcess += Math.max(0, s_h - l_h);
        
        let deficit = Math.max(0, l_h - s_h); eDeficit += deficit;
        if (deficit > peakDeficit) peakDeficit = deficit;
    }

    if (typeof loadChartInstance !== 'undefined') renderMiniChart(solarCurveKw, loadCurveKw);

    let selfConsRate = eDailyGen > 0 ? (dailyDirectUse / eDailyGen) : 0;
    const dod = 0.95; const roundTripEff = 0.97; const standardCRate = 0.5; 
    let bessStrategyVal = document.getElementById('bessStrategy') ? document.getElementById('bessStrategy').value : 'solar_only';
    let batterySuggest = 0; let requiredPCS = 0; 

    if (bessStrategyVal === 'solar_only') {
        let usableExcess = Math.min(eExcess, eDeficit);
        let batteryByEnergy = usableExcess > 0 ? (usableExcess / (dod * roundTripEff)) : 0;
        batterySuggest = batteryByEnergy; requiredPCS = Math.min(peakDeficit, batterySuggest * standardCRate);
    } else if (bessStrategyVal === 'grid_arbitrage') {
        let batteryByEnergy = eDeficit > 0 ? (eDeficit / (dod * roundTripEff)) : 0;
        batterySuggest = batteryByEnergy; requiredPCS = peakDeficit;
        let actualCRate = batterySuggest > 0 ? (requiredPCS / batterySuggest) : 0;
        if (actualCRate > standardCRate) { batterySuggest = requiredPCS / standardCRate; }
    }

    let activeBessCapacity = (strategy === 'hybrid_bess') ? batterySuggest : 0;
    document.getElementById('lblBoqSysPower').innerText = `${sysPowerKW.toLocaleString('vi-VN', {maximumFractionDigits: 2})} kWp`;
    document.getElementById('lblBoqStrategy').innerText = `Áp dụng Kịch bản: ${strategy === 'hybrid_bess' ? "HỆ HYBRID BESS (LƯU TRỮ)" : "BÁM TẢI THUẦN (ZERO-EXPORT)"}`;
    
    if (!isBoqEdited) {
        if(document.getElementById('boqQty_panel')) document.getElementById('boqQty_panel').value = panelCount;
        if(document.getElementById('boqPrice_inv')) document.getElementById('boqPrice_inv').value = Math.round(sysPowerKW * 1000000).toLocaleString('vi-VN');
        if(document.getElementById('boqPrice_frame')) document.getElementById('boqPrice_frame').value = Math.round(sysPowerKW * 100000).toLocaleString('vi-VN');
        if(document.getElementById('boqPrice_box')) document.getElementById('boqPrice_box').value = Math.round(sysPowerKW * 100000).toLocaleString('vi-VN');
        if(document.getElementById('boqPrice_cable')) document.getElementById('boqPrice_cable').value = Math.round(sysPowerKW * 100000).toLocaleString('vi-VN');
        if(document.getElementById('boqPrice_labor')) document.getElementById('boqPrice_labor').value = Math.round(sysPowerKW * 100000).toLocaleString('vi-VN');
    }

    let bessRow = document.getElementById('row_boq_bess');
    if (strategy === 'zero_export') {
        if (bessRow) bessRow.style.display = 'none';
        if (document.getElementById('boqQty_bess')) document.getElementById('boqQty_bess').value = 0;
    } else {
        if (bessRow) bessRow.style.display = 'table-row';
        if (!isBoqEdited) {
            if (document.getElementById('boqQty_bess')) document.getElementById('boqQty_bess').value = Math.round(activeBessCapacity);
            if (document.getElementById('boqPrice_bess')) document.getElementById('boqPrice_bess').value = getInt('capexPerKwh').toLocaleString('vi-VN');
        }
    }

    document.querySelectorAll('.boq-item-row').forEach(row => { 
        if(row.style.display !== 'none') {
            let qtyInput = row.querySelector('.qty-input');
            if (qtyInput) _calcBOQRowSilent(qtyInput);
        }
    });
    document.getElementById('boqModal').style.display = 'flex';
}

function closeBOQModal() { document.body.classList.remove('print-boq-only'); document.getElementById('boqModal').style.display = 'none'; }

function _calcBOQRowSilent(el) {
    let row = el.closest('tr'); if(row.style.display === 'none') return;
    let qty = parseFloat(row.querySelector('.qty-input').value) || 0; let price = parseFloat(row.querySelector('.price-input').value.replace(/[^0-9]/g, '')) || 0;
    row.querySelector('.row-total').innerText = Math.round(qty * price).toLocaleString('vi-VN'); calcGrandTotal();
}

function calcBOQRow(el) {
    isBoqEdited = true;
    _calcBOQRowSilent(el);
}

function calcGrandTotal() {
    let sumBeforeTax = 0;
    document.querySelectorAll('.boq-item-row').forEach(row => {
        if(row.style.display !== 'none') {
            let qty = parseFloat(row.querySelector('.qty-input').value) || 0; let price = parseFloat(row.querySelector('.price-input').value.replace(/[^0-9]/g, '')) || 0;
            sumBeforeTax += (qty * price);
        }
    });
    totalBeforeTaxValue = sumBeforeTax;
    let vatRate = parseFloat(document.getElementById('boqVatRate').value) || 0;
    let vatAmount = sumBeforeTax * (vatRate / 100); let grandTotal = sumBeforeTax + vatAmount;
    document.getElementById('boqTotalBeforeTax').innerText = Math.round(sumBeforeTax).toLocaleString('vi-VN');
    document.getElementById('boqVatAmount').innerText = Math.round(vatAmount).toLocaleString('vi-VN');
    document.getElementById('boqGrandTotal').innerText = Math.round(grandTotal).toLocaleString('vi-VN');
}

function addBOQRow() {
    let tbody = document.querySelector('#boqTable tbody'); let tr = document.createElement('tr'); tr.className = 'boq-item-row';
    tr.innerHTML = `<td class="text-center row-num valign-middle"></td><td><textarea class="item-name" rows="2" placeholder="Tên hạng mục..." oninput="autoResize(this)"></textarea></td><td><textarea class="item-spec" rows="2" placeholder="Nhập thông số kỹ thuật..." oninput="autoResize(this)"></textarea></td><td class="text-center valign-middle"><input type="text" value="Gói" class="text-center"></td><td class="valign-middle"><input type="number" class="qty-input" value="1" oninput="calcBOQRow(this)"></td><td class="valign-middle"><input type="text" class="price-input" value="0" oninput="formatInt(this); calcBOQRow(this)"></td><td class="text-right font-bold valign-middle row-total">0</td><td class="no-print text-center valign-middle"><button class="btn-remove action-btn" onclick="removeBOQRow(this)">✖</button></td>`;
    tbody.appendChild(tr); updateRowNumbers(); calcGrandTotal();
}

function removeBOQRow(btn) { btn.closest('tr').remove(); updateRowNumbers(); calcGrandTotal(); }

function updateRowNumbers() {
    let rows = document.querySelectorAll('#boqTable tbody tr.boq-item-row'); let count = 1;
    rows.forEach((row) => { if(row.style.display !== 'none') row.querySelector('.row-num').innerText = count++; });
}

function applyBOQ() {
    const strategy = document.getElementById('mainStrategy').value; const panelPwr = parseFloat(document.getElementById('panelPower').value) || 0;
    const panelCount = parseFloat(document.getElementById('panelCount').value) || 0; const sysPowerKW = (panelPwr * panelCount) / 1000;
    
    let actualSumBeforeTax = 0;
    let bessTotal = 0;

    document.querySelectorAll('.boq-item-row').forEach(row => {
        if(row.style.display !== 'none') {
            let qty = parseFloat(row.querySelector('.qty-input').value) || 0; 
            let price = parseFloat(row.querySelector('.price-input').value.replace(/[^0-9]/g, '')) || 0;
            actualSumBeforeTax += (qty * price);

            if (row.id === 'row_boq_bess' && strategy === 'hybrid_bess') {
                bessTotal = (qty * price);
                document.getElementById('capexPerKwh').value = price.toLocaleString('vi-VN');
            }
        }
    });

    let solarTotalBeforeTax = actualSumBeforeTax - bessTotal;
    if (sysPowerKW > 0) { document.getElementById('capexPerKw').value = Math.round(solarTotalBeforeTax / sysPowerKW).toLocaleString('vi-VN'); }
    closeBOQModal(); calculate(); 
}

function renderAnalysis() {
    if (!isAppUnlocked) return;
    const strategy = document.getElementById('mainStrategy').value; const bessVal = document.getElementById('bessStrategy') ? document.getElementById('bessStrategy').value : '';
    const sysPower = document.getElementById('resPower').innerText; const capex = document.getElementById('resCapexBase').innerText;
    const irrText = document.getElementById('resIrrBase').innerText; const npvText = document.getElementById('resNpvBase').innerText;
    const paybackText = document.getElementById('resPaybackBase').innerText; const lcoeText = document.getElementById('resLcoeBase').innerText;
    const gridPrice = document.getElementById('electricityPrice').value; const ke = parseFloat(document.getElementById('discountRate').value) || 10;
    
    let irrVal = parseFloat(irrText.replace(',', '.')); let lcoeVal = parseFloat(lcoeText.replace(/\./g, '').replace(',', '.'));
    let gridPriceVal = parseFloat(gridPrice.replace(/\./g, '').replace(',', '.')); let savingsPercent = 0;
    if (gridPriceVal > 0) { savingsPercent = Math.round(((gridPriceVal - lcoeVal) / gridPriceVal) * 100); }

    let feasibility = "RẤT KHẢ THI (ĐÁNG ĐẦU TƯ)"; let feasibilityColor = "var(--success)";
    if (irrVal < ke) { feasibility = "CÓ RỦI RO LỖ VỐN (CẦN CÂN NHẮC KỸ)"; feasibilityColor = "var(--accent)"; } 
    else if (irrVal < ke + 4) { feasibility = "KHẢ THI MỨC TRUNG BÌNH (BIÊN AN TOÀN MỎNG)"; feasibilityColor = "var(--primary)"; }

    let scenarioHtml = `<h4 style="color: var(--secondary); border-bottom: 2px solid var(--highlight); padding-bottom: 8px; margin-top: 0;">1. Phân Tích Kịch Bản & Khả Năng Sinh Lời</h4>`;
    if (strategy === 'zero_export') {
        scenarioHtml += `<p class="text-justify">• <strong>Chi phí điện quy dẫn (LCOE):</strong> LCOE bình quân của hệ thống <strong>${sysPower}</strong> trong 25 năm vòng đời đạt mức <strong>${lcoeText}</strong>/kWh. So sánh với đơn giá điện trung bình hiện tại của EVN là <strong>${gridPrice} VNĐ/kWh</strong>, hệ thống đang giúp Cảng tiết kiệm biên tới <strong>${savingsPercent}%</strong> chi phí phát điện mỗi kWh.</p>`;
        scenarioHtml += `<p class="text-justify">• <strong>Phân tích Đặc tuyến (Zero-Export):</strong> Hệ thống không phát ngược lưới. Do đó, rủi ro hao hụt tài chính duy nhất nằm ở hiện tượng cắt xén công suất (Curtailment) vào các ngày cuối tuần/nghỉ lễ khi cường độ bức xạ đạt đỉnh nhưng bãi cẩu không bốc xếp. Chỉ số lợi nhuận phụ thuộc 100% vào năng lực tiêu thụ điện tại chỗ của Cảng vào khung giờ sáng và trưa.</p>`;
    } else {
         if (bessVal === 'grid_arbitrage') {
            scenarioHtml += `<p class="text-justify">• <strong>Kinh doanh chênh lệch giá (Arbitrage) & Peak Shaving:</strong> Kịch bản thiết lập BESS như một "Trạm phát điện ảo". BESS tích trữ điện vào giờ Thấp điểm (hoặc lúc PV phát dư) và xả dốc toàn lực vào giờ Cao điểm. Mức LCOE hiện tại là <strong>${lcoeText}</strong>/kWh.</p>`;
            scenarioHtml += `<p class="text-justify">• <strong>Phòng vệ biểu giá 2 thành phần (EVN):</strong> Căn cứ vào dữ liệu đo đếm, BESS sẽ đóng vai trò làm bộ đệm (Buffer) gọt bỏ các đỉnh phụ tải đột biến ($P_{max}$) khi các cẩu STS khởi động cùng lúc, giúp nhà máy tránh bị áp phí công suất phạt cực kỳ hiệu quả.</p>`;
         } else {
            scenarioHtml += `<p class="text-justify">• <strong>Phủ tải ban đêm (Solar + BESS):</strong> Lượng điện mặt trời dư thừa được nạp hoàn toàn vào Pin lưu trữ và xả ra bù tải vào ca đêm. Giúp Cảng chủ động nguồn năng lượng 24/7. Mức LCOE bình quân là <strong>${lcoeText}</strong>/kWh.</p>`;
            scenarioHtml += `<p class="text-justify">• <strong>Tối ưu hóa Vòng đời (Cycle Life):</strong> Thuật toán ưu tiên xả giới hạn 1 chu kỳ/ngày giúp bảo vệ dung lượng (SoH) của cell pin Lithium LFP, duy trì độ suy hao tuyến tính chậm để vòng đời dự án đạt trên 15 năm.</p>`;
         }
    }

    let conclusionHtml = `<h4 style="color: var(--secondary); border-bottom: 2px solid var(--success); padding-bottom: 8px; margin-top: 25px;">2. Kết Luận Tài Chính & Khuyến Nghị Đầu Tư</h4>`;
    conclusionHtml += `<ul style="line-height: 1.8; text-align: justify; padding-left: 20px;">
        <li><strong>Xếp hạng Dự án:</strong> Căn cứ trên mô hình FCFE, dự án này được đánh giá <strong><span style="color: ${feasibilityColor}; font-weight: 800;">${feasibility}</span></strong>.</li>
        <li><strong>Quy mô vốn (CAPEX):</strong> Dự án yêu cầu tổng mức đầu tư ban đầu trọn gói là <strong>${capex}</strong>.</li>
        <li><strong>Thặng dư Tài sản (NPV):</strong> Hiện giá thuần đạt mức <strong>${npvText}</strong>. Mức NPV dương khẳng định dự án tạo ra giá trị gia tăng thực tế cho Cảng sau khi đã chiết khấu toàn bộ rủi ro lạm phát và chi phí cơ hội.</li>
        <li><strong>Tỷ suất sinh lời (IRR):</strong> Đạt <strong>${irrText}</strong>. Chỉ số này vượt mốc Chi phí vốn kỳ vọng (Ke = ${ke}%), chứng minh việc rót vốn vào Solar mang lại tỷ suất lợi nhuận cao hơn việc gửi tiết kiệm ngân hàng.</li>
        <li><strong>Thời gian hoàn vốn thuần:</strong> Điểm hòa vốn dòng tiền rơi vào khoảng <strong>${paybackText}</strong>. Khung thời gian này nằm trong ngưỡng an toàn, giảm thiểu tối đa rủi ro về hao mòn thiết bị.</li>
    </ul>`;

    let recommendHtml = `<h4 style="color: var(--secondary); border-bottom: 2px solid var(--accent); padding-bottom: 8px; margin-top: 0;">3. Đề Xuất Biện Pháp Quản Lý Kỹ Thuật (SOP)</h4>`;
    if (strategy === 'zero_export') {
        recommendHtml += `<ul style="line-height: 1.8; margin-bottom: 0; text-align: justify; padding-left: 20px;">
            <li><strong>Kiểm soát Khởi động & Dịch chuyển Phụ tải (Load Shifting):</strong> Để tối ưu hóa lượng vốn <strong>${capex}</strong> đã giải ngân, Phòng Cơ Điện cần tham mưu Ban giám đốc điều phối kế hoạch bốc xếp. Nếu có thể, hãy dồn lịch vận hành các thiết bị hạng nặng (cẩu STS, cấp điện container lạnh) vào dải giờ vàng từ <strong>09h00 - 14h30</strong>.</li>
            <li><strong>Giám sát Lãng phí Điện năng (Curtailment):</strong> Định kỳ kiểm tra tỷ lệ điện năng bị cắt bỏ trên phần mềm SCADA/FusionSolar. Phân tích nguyên nhân gốc rễ (Root Cause): Nếu điện lãng phí > 15-20% tổng sản lượng kéo dài, cần đệ trình hồ sơ dự toán Lắp đặt bổ sung BESS (Giai đoạn 2).</li>
            <li><strong>Bảo trì dự phòng (O&M):</strong> Lên phương án làm sạch mảng pin 3-4 tháng/lần tùy lượng bụi thực tế tại cầu cảng. Việc bỏ lỡ lịch vệ sinh có thể kéo tụt Hệ số PR xuống dưới ngưỡng 80%, làm sai lệch hoàn toàn bài toán hoàn vốn.</li>
        </ul>`;
    } else {
         recommendHtml += `<ul style="line-height: 1.8; margin-bottom: 0; text-align: justify; padding-left: 20px;">
            <li><strong>Kiểm soát Độ xả sâu (DoD) trên BMS:</strong> Kỹ sư vận hành phải thiết lập hệ thống Quản lý năng lượng (EMS) khóa cứng mức xả sâu tối đa ở ngưỡng 90-95%. Việc xả cạn pin xuống 0% (Deep Discharge) sẽ gây lão hóa nhanh và làm mất hiệu lực bảo hành của nhà sản xuất.</li>
            <li><strong>Kiểm soát Rủi ro Cháy nổ (Thermal Runaway):</strong> Pin Lithium công nghiệp sinh nhiệt rất lớn khi xả dòng cao (cấp cho cẩu bờ). Bắt buộc duy trì phòng chứa BESS ở ngưỡng nhiệt độ chuẩn <strong>24°C - 26°C</strong> bằng hệ thống HVAC dự phòng kép, đồng thời lắp đặt hệ thống chữa cháy tự động.</li>
            <li><strong>Khai thác Chức năng Peak-Shaving:</strong> Chủ động giám sát đồng hồ EVN. Cài đặt thuật toán xả đáp ứng nhanh trên Biến tần Hybrid để "đỡ tải" ngay tức khắc khi phát hiện dòng điện khởi động của cẩu lớn vọt lên đột biến, đảm bảo làm phẳng biểu đồ phụ tải.</li>
        </ul>`;
    }

    let scenarioBox = document.getElementById('scenarioAnalysisBox'); let summaryBox = document.getElementById('part3Summary');
    if(scenarioBox) { scenarioBox.style.background = "#fff"; scenarioBox.style.border = "1px solid var(--border)"; scenarioBox.style.borderLeft = "6px solid var(--highlight)"; scenarioBox.style.padding = "35px"; scenarioBox.innerHTML = scenarioHtml + conclusionHtml; }
    if(summaryBox) { summaryBox.style.background = "#fffaf0"; summaryBox.style.border = "1px solid #ffeaa7"; summaryBox.style.borderLeft = "6px solid var(--accent)"; summaryBox.style.padding = "35px"; summaryBox.innerHTML = recommendHtml; }
}

function renderSpiderChart(baseIrr) {
    if (!isAppUnlocked || typeof Chart === 'undefined') return;
    const ctx = document.getElementById('spiderChart').getContext('2d');
    if (spiderChartInstance) spiderChartInstance.destroy();

    const labels = ['-20%', '-10%', 'Tiêu chuẩn', '+10%', '+20%'];
    const dataCapex = [(baseIrr * 1.25).toFixed(1), (baseIrr * 1.11).toFixed(1), baseIrr.toFixed(1), (baseIrr * 0.90).toFixed(1), (baseIrr * 0.82).toFixed(1)];
    const dataYield = [(baseIrr * 0.75).toFixed(1), (baseIrr * 0.88).toFixed(1), baseIrr.toFixed(1), (baseIrr * 1.12).toFixed(1), (baseIrr * 1.25).toFixed(1)];
    const dataOpex = [(baseIrr * 1.02).toFixed(1), (baseIrr * 1.01).toFixed(1), baseIrr.toFixed(1), (baseIrr * 0.99).toFixed(1), (baseIrr * 0.98).toFixed(1)];

    spiderChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Thay đổi CAPEX (Vốn đầu tư)', data: dataCapex, borderColor: '#e74c3c', backgroundColor: '#e74c3c', borderWidth: 3, pointRadius: 5, pointHoverRadius: 7, tension: 0.1 },
                { label: 'Thay đổi Sản lượng (Yield)', data: dataYield, borderColor: '#00b894', backgroundColor: '#00b894', borderWidth: 3, pointRadius: 5, pointHoverRadius: 7, tension: 0.1 },
                { label: 'Thay đổi OPEX (Vận hành)', data: dataOpex, borderColor: '#0984e3', backgroundColor: '#0984e3', borderWidth: 3, borderDash: [6, 6], pointRadius: 5, pointHoverRadius: 7, tension: 0.1 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false, },
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: false, boxWidth: 20, padding: 20, font: { size: 13, weight: '600', family: "inherit" }, color: '#2d3436' } }, tooltip: { backgroundColor: 'rgba(45, 52, 54, 0.9)', titleFont: { size: 14 }, bodyFont: { size: 13 }, padding: 12, callbacks: { label: function(context) { return context.dataset.label + ': ' + context.parsed.y + '%'; } } } },
            scales: { x: { grid: { drawOnChartArea: true, color: '#f1f2f6' }, ticks: { font: { size: 13, weight: '600' }, color: '#636e72' } }, y: { title: { display: true, text: 'Tỷ suất sinh lời IRR (%)', font: { size: 14, weight: '700' }, color: '#636e72', padding: {bottom: 10} }, grid: { color: '#f1f2f6' }, ticks: { font: { size: 13, weight: '600' }, color: '#636e72' } } }
        }
    });
}

// --- 10. LÕI TÍNH TOÁN (CORE ENGINE) ---
function calculate() {
    if (!isAppUnlocked) return;

    const strategy = document.getElementById('mainStrategy').value;
    const bessCapexGroup = document.getElementById('bessCapexGroup');
    const bessCapexInput = document.getElementById('capexPerKwh');
    const bessStrategyGroup = document.getElementById('bessStrategyGroup');

    if(strategy === 'zero_export') { 
        bessCapexGroup.style.opacity = '0.3'; bessCapexGroup.style.pointerEvents = 'none'; bessCapexInput.disabled = true; 
        if(bessStrategyGroup) bessStrategyGroup.style.display = 'none';
    } else { 
        bessCapexGroup.style.opacity = '1'; bessCapexGroup.style.pointerEvents = 'auto'; bessCapexInput.disabled = false; 
        if(bessStrategyGroup) bessStrategyGroup.style.display = 'block';
    }

    let pType = document.getElementById('priceType').value;
    let offPeakP = 0, peakP = 0;
    if (pType === 'ind_mv') { offPeakP = parseFloat(document.getElementById('p_ind_mv_off').value)||0; peakP = parseFloat(document.getElementById('p_ind_mv_peak').value)||0; }
    else if (pType === 'ind_lv') { offPeakP = parseFloat(document.getElementById('p_ind_lv_off').value)||0; peakP = parseFloat(document.getElementById('p_ind_lv_peak').value)||0; }
    else if (pType === 'com_mv') { offPeakP = parseFloat(document.getElementById('p_com_mv_off').value)||0; peakP = parseFloat(document.getElementById('p_com_mv_peak').value)||0; }
    else if (pType === 'com_lv') { offPeakP = parseFloat(document.getElementById('p_com_lv_off').value)||0; peakP = parseFloat(document.getElementById('p_com_lv_peak').value)||0; }
    
    let bessStrategyVal = document.getElementById('bessStrategy') ? document.getElementById('bessStrategy').value : 'solar_only';

    const monthlyUsage = getInt('monthlyUsage'); const elecPrice = getInt('electricityPrice');
    const elecEscalation = (parseFloat(document.getElementById('elecEscalation').value) || 0) / 100;
    const panelPwr = parseFloat(document.getElementById('panelPower').value) || 0;
    const panelCount = parseFloat(document.getElementById('panelCount').value) || 0;
    const regionPSH = parseFloat(document.getElementById('region').value) || 4.6;
    const prRate = (parseFloat(document.getElementById('prRate').value) || 85) / 100;
    const degY1 = (parseFloat(document.getElementById('degY1').value) || 0) / 100;
    const degAnn = (parseFloat(document.getElementById('degAnn').value) || 0) / 100;
    const manualPeakLoad = getInt('peakLoad'); const exportPrice = getInt('exportPrice');

    const sysPowerKW = (panelPwr * panelCount) / 1000;
    const standardInverters = [5, 10, 15, 20, 30, 40, 50, 60, 100, 110, 150, 200, 250];
    let requiredInverter = sysPowerKW / globalDcAcRatio;
    let inverterCap = standardInverters.find(cap => cap >= requiredInverter);
    if(!inverterCap) inverterCap = Math.ceil(requiredInverter / 50) * 50;

    let eDailyGen = sysPowerKW * regionPSH * prRate; let dailyLoad = monthlyUsage / 30;

    let p1 = parseFloat(document.getElementById('pct1').value) || 0; let p2 = parseFloat(document.getElementById('pct2').value) || 0;
    let p3 = parseFloat(document.getElementById('pct3').value) || 0; let p4 = parseFloat(document.getElementById('pct4').value) || 0;
    let sumP = p1 + p2 + p3 + p4; if(sumP === 0) { p1=25; p2=25; p3=25; p4=25; sumP = 100; } 

    let block1Load = dailyLoad * (p1 / sumP); let block2Load = dailyLoad * (p2 / sumP); 
    let block3Load = dailyLoad * (p3 / sumP); let block4Load = dailyLoad * (p4 / sumP); 
    
    let hourlyLoad = new Array(24).fill(0);
    let b1H = block1Load / 12; for(let i=18; i<24; i++) hourlyLoad[i] = b1H; for(let i=0; i<6; i++) hourlyLoad[i] = b1H;
    let b2H = block2Load / 3; for(let i=6; i<9; i++) hourlyLoad[i] = b2H;
    let b3H = block3Load / 6; for(let i=9; i<15; i++) hourlyLoad[i] = b3H;
    let b4H = block4Load / 3; for(let i=15; i<18; i++) hourlyLoad[i] = b4H;

    let solarBaseCurve = [0,0,0,0,0,0, 2, 8, 15, 22, 28, 35, 38, 35, 28, 20, 10, 3, 0,0,0,0,0,0];
    let normalizedSolar = solarBaseCurve.map(x => x / 244);
    
    let loadCurveKw = []; let solarCurveKw = []; let dailyDirectUse = 0; let eExcess = 0; let eDeficit = 0; let peakDeficit = 0; 

    for(let i=0; i<24; i++) {
        let l_h = 0;
        if (typeof actual24hLoadProfile !== 'undefined' && actual24hLoadProfile !== null) { l_h = actual24hLoadProfile[i]; } 
        else { l_h = hourlyLoad[i]; if (typeof manualPeakLoad !== 'undefined' && manualPeakLoad > 0 && l_h > manualPeakLoad) l_h = manualPeakLoad; }
        loadCurveKw.push(l_h);
        
        let s_h = eDailyGen * normalizedSolar[i]; solarCurveKw.push(s_h);
        dailyDirectUse += Math.min(s_h, l_h); eExcess += Math.max(0, s_h - l_h);
        
        let deficit = Math.max(0, l_h - s_h); eDeficit += deficit;
        if (deficit > peakDeficit) peakDeficit = deficit;
    }

    if (typeof loadChartInstance !== 'undefined') renderMiniChart(solarCurveKw, loadCurveKw);

    let selfConsRate = eDailyGen > 0 ? (dailyDirectUse / eDailyGen) : 0;
    let usableExcess = Math.min(eExcess, eDeficit); let batteryByEnergy = usableExcess > 0 ? (usableExcess / (0.95 * 0.97)) : 0;
    const maxCRate = 0.5; let batteryByPower = peakDeficit / maxCRate;
    let batterySuggest = eExcess > 0 ? Math.max(batteryByEnergy, batteryByPower) : 0;
    let activeBessCapacity = (strategy === 'hybrid_bess') ? batterySuggest : 0;

    let bessBox = document.getElementById('bessResultBox');
    if(strategy === 'zero_export') { bessBox.style.background = '#f1f2f6'; bessBox.style.opacity = '0.6'; } 
    else { bessBox.style.background = '#f0fdf4'; bessBox.style.opacity = '1'; }

    let baseYearlyGen = eDailyGen * 365; let genY1Calc = baseYearlyGen * (1 - degY1);
    
    document.getElementById('resPower').innerText = sysPowerKW.toLocaleString('vi-VN', {maximumFractionDigits: 2}) + " kWp";
    document.getElementById('resInverter').innerText = "~ " + inverterCap.toLocaleString('vi-VN') + " kW";
    document.getElementById('resBattery').innerText = activeBessCapacity > 0 ? "~ " + activeBessCapacity.toLocaleString('vi-VN', {maximumFractionDigits: 1}) + " kWh" : "0 kWh (Zero-Export)";
    document.getElementById('resGenY1').innerText = Math.round(genY1Calc).toLocaleString('vi-VN') + " kWh";
    document.getElementById('resGenMonth').innerText = Math.round(genY1Calc / 12).toLocaleString('vi-VN') + " kWh/tháng";
    
    let directY1 = genY1Calc * selfConsRate; let excessY1 = genY1Calc - directY1;
    let deficitY1 = Math.max(0, (monthlyUsage * 12) - directY1);
    let bessDischargeY1 = (activeBessCapacity > 0) ? Math.min(excessY1 * 0.97, deficitY1, activeBessCapacity * 0.95 * 0.97 * 365) : 0;
    let usableY1 = directY1 + bessDischargeY1; let finalExportY1 = Math.max(0, excessY1 - (bessDischargeY1 / 0.97));
    
    document.getElementById('resOffset').innerText = Math.round(usableY1).toLocaleString('vi-VN') + " kWh";
    document.getElementById('resExcess').innerText = Math.round(finalExportY1).toLocaleString('vi-VN') + " kWh";

    const pctCovered = monthlyUsage > 0 ? ((usableY1 / (monthlyUsage * 12)) * 100).toFixed(1) : 0;
    let strategyLabel = strategy === 'hybrid_bess' ? 'HỆ HYBRID BESS (LƯU TRỮ)' : 'BÁM TẢI THUẦN (ZERO-EXPORT)';
    document.getElementById('lblLcaStrategy').innerText = strategyLabel; document.getElementById('lblFinStrategy').innerText = strategyLabel;
    document.getElementById('part1Summary').innerHTML = `<strong>📝 TỔNG KẾT:</strong> Hệ điện năng lượng mặt trời <strong>${sysPowerKW.toLocaleString('vi-VN', {maximumFractionDigits: 2})} kWp</strong> sản xuất <strong>${Math.round(genY1Calc).toLocaleString('vi-VN')} kWh</strong> năng lượng (Năm 1). Bằng việc mô phỏng Kịch bản <strong>${strategyLabel}</strong>, hệ thống dự báo khả năng đáp ứng <strong>${pctCovered}%</strong> tổng hóa đơn tiêu thụ của doanh nghiệp. Lượng điện dư thừa không thể hấp thụ là <strong>${Math.round(finalExportY1).toLocaleString('vi-VN')} kWh</strong>/năm.`;

    let capexBase = sysPowerKW * getInt('capexPerKw'); const capexPerKwhInput = getInt('capexPerKwh');
    let totalCapex = capexBase + (activeBessCapacity * capexPerKwhInput);

    const deprYears = parseInt(document.getElementById('deprYears').value) || 20;
    const taxRate = (parseFloat(document.getElementById('taxRate').value) || 0) / 100;
    const omRate = (parseFloat(document.getElementById('omRate').value) || 0) / 100;
    const omEscalation = (parseFloat(document.getElementById('omEscalation').value) || 0) / 100;
    const discountRate = (parseFloat(document.getElementById('discountRate').value) || 0) / 100;
    const debtRatio = (parseFloat(document.getElementById('debtRatio').value) || 0) / 100;
    const interestRate = (parseFloat(document.getElementById('interestRate').value) || 0) / 100;
    const loanTerm = parseInt(document.getElementById('loanTerm').value) || 0;

    let debt = totalCapex * debtRatio; let equity = totalCapex - debt;
    if(document.getElementById('resCapexDescVi')) document.getElementById('resCapexDescVi').innerText = `Vốn tự có: ${formatMoney(equity)} | Vốn vay: ${formatMoney(debt)}`;
    
    let pmt = (loanTerm > 0 && debt > 0) ? calculatePMT(interestRate, loanTerm, debt) : 0;
    let cfAnnArr = [0]; let cumCfArr = [-equity]; let npv = -equity; let payback = -1; let cumCf = -equity;
    let lcoeNum = totalCapex; let lcoeDen = 0; let sumNetIncome = 0, sumFcfe = 0, sumOpex = 0, remainDebt = debt; let paybackYearIndex = -1;

    let totalTaxShield = totalCapex * taxRate; document.getElementById('resTaxShieldBase').innerText = formatMoney(totalTaxShield);

    let tempCumCf = -equity;
    for (let i = 1; i <= 25; i++) {
        let curOmCost = totalCapex * omRate * Math.pow(1 + omEscalation, i - 1);
        let invReplace = (i === 12) ? capexBase * 0.1 : 0; let bessReplace = (activeBessCapacity > 0 && i === 15) ? (activeBessCapacity * capexPerKwhInput * 0.6) : 0;
        let totalCost = curOmCost + invReplace + bessReplace;
        
        let efficiency = (i === 1) ? (1 - degY1) : (1 - degY1 - degAnn * (i - 1)); let genYear = Math.max(baseYearlyGen * efficiency, 0);
        let directY = genYear * selfConsRate; let excessY = genYear - directY; let deficitY = Math.max(0, (monthlyUsage * 12) - directY);
        let bessDischargeY = (activeBessCapacity > 0) ? Math.min(excessY * 0.97, deficitY, activeBessCapacity * 0.95 * 0.97 * 365) : 0;
        let exportY = Math.max(0, excessY - (bessDischargeY / 0.97)); let usableY = directY + bessDischargeY;
        
        let currentElecPrice = elecPrice * Math.pow(1 + elecEscalation, i - 1); let revenue = (usableY * currentElecPrice) + (exportY * exportPrice);

        let arbitrageNetY = 0;
        if (strategy === 'hybrid_bess' && bessStrategyVal === 'grid_arbitrage' && offPeakP > 0 && peakP > 0) {
            let currentOffPeakP = offPeakP * Math.pow(1 + elecEscalation, i - 1); let currentPeakP = peakP * Math.pow(1 + elecEscalation, i - 1);
            let dailyArbKwh = activeBessCapacity * 0.85; 
            let costArb = dailyArbKwh * 365 * (currentOffPeakP / 0.95); let revArb = dailyArbKwh * 365 * (currentPeakP * 0.95);
            if (revArb > costArb) { arbitrageNetY = revArb - costArb; }
        }
        revenue += arbitrageNetY;

        let interest = 0, principal = 0;
        if (i <= loanTerm && remainDebt > 0) { interest = remainDebt * interestRate; principal = pmt - interest; remainDebt -= principal; }
        
        let depr = (i <= deprYears) ? (totalCapex / deprYears) : 0; let taxable = revenue - totalCost - depr - interest; let tax = taxable > 0 ? taxable * taxRate : 0;
        let netCf = revenue - totalCost - tax - (i <= loanTerm ? pmt : 0); 
        
        tempCumCf += netCf;
        if (paybackYearIndex === -1 && tempCumCf >= 0) { paybackYearIndex = i; }
    }

    let tableHTML = ""; let sumTotalGen = 0, sumUsableGen = 0, sumExcessGen = 0, sumSavings = 0; remainDebt = debt; 
    for (let i = 1; i <= 25; i++) {
        let curOmCost = totalCapex * omRate * Math.pow(1 + omEscalation, i - 1);
        let invReplace = (i === 12) ? capexBase * 0.1 : 0; let bessReplace = (activeBessCapacity > 0 && i === 15) ? (activeBessCapacity * capexPerKwhInput * 0.6) : 0;
        let totalCost = curOmCost + invReplace + bessReplace;
        
        let efficiency = (i === 1) ? (1 - degY1) : (1 - degY1 - degAnn * (i - 1)); let genYear = Math.max(baseYearlyGen * efficiency, 0);
        let directY = genYear * selfConsRate; let excessY = genYear - directY; let deficitY = Math.max(0, (monthlyUsage * 12) - directY);
        let bessDischargeY = (activeBessCapacity > 0) ? Math.min(excessY * 0.97, deficitY, activeBessCapacity * 0.95 * 0.97 * 365) : 0;
        let exportY = Math.max(0, excessY - (bessDischargeY / 0.97)); let usableY = directY + bessDischargeY;
        
        let currentElecPrice = elecPrice * Math.pow(1 + elecEscalation, i - 1); let revenueY = (usableY * currentElecPrice) + (exportY * exportPrice);

        let arbitrageNetY2 = 0;
        if (strategy === 'hybrid_bess' && bessStrategyVal === 'grid_arbitrage' && offPeakP > 0 && peakP > 0) {
            let currentOffPeakP = offPeakP * Math.pow(1 + elecEscalation, i - 1); let currentPeakP = peakP * Math.pow(1 + elecEscalation, i - 1);
            let dailyArbKwh = activeBessCapacity * 0.85; 
            let costArb = dailyArbKwh * 365 * (currentOffPeakP / 0.95); let revArb = dailyArbKwh * 365 * (currentPeakP * 0.95);
            if (revArb > costArb) { arbitrageNetY2 = revArb - costArb; }
        }
        revenueY += arbitrageNetY2;

        let interest = 0, principal = 0;
        if (i <= loanTerm && remainDebt > 0) { interest = remainDebt * interestRate; principal = pmt - interest; remainDebt -= principal; }
        
        let depr = (i <= deprYears) ? (totalCapex / deprYears) : 0; let taxable = revenueY - totalCost - depr - interest; let tax = taxable > 0 ? taxable * taxRate : 0;
        let netIncome = taxable - tax; let netCf = revenueY - totalCost - tax - (i <= loanTerm ? pmt : 0); 
        
        cfAnnArr.push(netCf); npv += netCf / Math.pow(1 + discountRate, i); cumCf += netCf; cumCfArr.push(cumCf);
        if (payback === -1 && cumCf >= 0) payback = (i - 1) + Math.abs(cumCf - netCf) / netCf; 
        
        lcoeNum += totalCost / Math.pow(1 + discountRate, i); lcoeDen += genYear / Math.pow(1 + discountRate, i);
        sumNetIncome += netIncome; sumFcfe += netCf; sumOpex += totalCost; sumTotalGen += genYear; sumUsableGen += usableY; sumExcessGen += exportY; sumSavings += revenueY;

        let rowClass = "";
        if (i === paybackYearIndex) { rowClass += " payback-row"; }
        if (!isLcaExpanded && i > 5 && i !== paybackYearIndex) { rowClass += " lca-row-hidden"; }

        tableHTML += `<tr class="${rowClass}">
            <td class="text-center font-bold">${i}</td><td class="text-center">${(efficiency * 100).toFixed(2)}%</td>
            <td class="text-center">${Math.round(genYear).toLocaleString('vi-VN')}</td>
            <td class="text-center text-success font-bold">${Math.round(usableY).toLocaleString('vi-VN')}</td>
            <td class="text-center" style="color:#7f8fa6">${Math.round(exportY).toLocaleString('vi-VN')}</td>
            <td class="text-right text-accent font-bold">${formatMoney(revenueY)}</td>
        </tr>`;
    }
    
    if(document.querySelector("#genTable tbody")) {
        document.querySelector("#genTable tbody").innerHTML = tableHTML;
        document.querySelector("#genTable tfoot").innerHTML = `<tr><th colspan="2" class="text-right" style="padding-right: 20px;">TỔNG CỘNG (25 năm):</th><th class="text-center">${Math.round(sumTotalGen).toLocaleString('vi-VN')}</th><th class="text-center text-success">${Math.round(sumUsableGen).toLocaleString('vi-VN')}</th><th class="text-center" style="color:#a4b0be">${Math.round(sumExcessGen).toLocaleString('vi-VN')}</th><th class="text-right text-accent">${formatMoney(sumSavings)}</th></tr>`;
    }

    cfAnnArr[0] = -equity; let valIrr = calculateIRR(cfAnnArr); let valLcoe = lcoeDen > 0 ? Math.round(lcoeNum / lcoeDen) : 0;

    document.getElementById('resCapexBase').innerText = formatMoney(totalCapex); 
    document.getElementById('resOpexTotalBase').innerText = formatMoney(sumOpex); document.getElementById('resFcfeTotalBase').innerText = formatMoney(sumFcfe);
    document.getElementById('resRoiBase').innerText = totalCapex > 0 ? ((sumNetIncome / totalCapex) * 100).toFixed(1) + " %" : "0 %";
    document.getElementById('resLcoeBase').innerText = valLcoe.toLocaleString('vi-VN') + " đ"; document.getElementById('resNpvBase').innerText = formatMoney(npv);
    document.getElementById('resIrrBase').innerText = valIrr.toFixed(2) + " %"; document.getElementById('resPaybackBase').innerText = payback > 0 ? payback.toFixed(1) + " năm" : "Chưa Thu Hồi";
    
    flashElements(); renderCashflowChart(cfAnnArr, cumCfArr); renderSpiderChart(valIrr); renderAnalysis();
    
    const fmt = (num) => num.toLocaleString('vi-VN', {maximumFractionDigits: 1});
    document.getElementById('formulaInverter').innerHTML = `
        $$ P_{Inverter} \\ge \\frac{P_{DC}}{Ratio_{DC/AC}} $$
        $$ \\Rightarrow P_{Inverter} \\ge \\frac{${sysPowerKW.toLocaleString('vi-VN', {maximumFractionDigits: 2})}}{${globalDcAcRatio}} = ${(sysPowerKW/globalDcAcRatio).toLocaleString('vi-VN', {maximumFractionDigits: 2})} \\text{ kW} $$
        <div class="var-legend" style="border-top: 1px dashed var(--border); padding-top: 15px; margin-top: 10px;">
            Trong đó:<br>
            \\(P_{DC}\\): Tổng công suất của toàn bộ mảng tấm pin (kWp)<br>
            \\(Ratio_{DC/AC}\\): Hệ số ép tải thực tế.
        </div>
    `;

    let bessFormulaHtml = `
        <div style="margin-bottom: 10px; color: var(--text-color);"><b>1. Tổng năng lượng thiếu hụt (Nhu cầu ban đêm):</b></div>
        $$ E_{Deficit} = \\sum \\max(0, L_h - S_h) $$
        $$ E_{Deficit} = ${fmt(eDeficit)} \\text{ kWh} $$
        <div style="margin-bottom: 10px; margin-top: 15px; color: var(--text-color);"><b>2. Năng lượng lưu trữ thực tế cần thiết:</b></div>
        $$ E_{Usable} = \\min(E_{Excess}, E_{Deficit}) $$
        $$ E_{Usable} = \\min(${fmt(eExcess)}, ${fmt(eDeficit)}) = ${fmt(usableExcess)} \\text{ kWh} $$
        <div style="margin-bottom: 10px; margin-top: 15px; color: var(--text-color);"><b>3. Ràng buộc theo Năng lượng (Bù hao hụt thiết bị):</b></div>
        $$ C_{Energy} = \\frac{E_{Usable}}{DoD \\times \\eta} $$
        $$ C_{Energy} = \\frac{${fmt(usableExcess)}}{0.95 \\times 0.97} = ${fmt(batteryByEnergy)} \\text{ kWh} $$
        <div style="margin-bottom: 10px; margin-top: 15px; color: var(--text-color);"><b>4. Ràng buộc theo Công suất xả đỉnh:</b></div>
        $$ C_{Power} = \\frac{P_{Deficit\\_Max}}{C\\text{-}Rate_{Max}} $$
        $$ C_{Power} = \\frac{${fmt(peakDeficit)}}{0.5} = ${fmt(batteryByPower)} \\text{ kWh} $$
        <div style="margin-bottom: 10px; margin-top: 15px; color: var(--primary); font-size: 1.1em;"><b>5. Chốt dung lượng BESS tối ưu:</b></div>
        $$ C_{BESS} = \\max(C_{Energy}, C_{Power}) $$
    `;

    if (activeBessCapacity > 0) { bessFormulaHtml += `<div style="text-align: center; margin: 15px 0; font-weight: bold; color: var(--primary); background: #f0f7ff; padding: 10px; border-radius: 8px;">\\( \\Rightarrow C_{BESS} = \\max(${fmt(batteryByEnergy)}, ${fmt(batteryByPower)}) = ${fmt(batterySuggest)} \\text{ kWh} \\)</div>`; } 
    else { bessFormulaHtml += `<div style="text-align: center; margin: 15px 0; font-weight: bold; color: var(--danger); background: #fff0f0; padding: 10px; border-radius: 8px;">\\( \\Rightarrow C_{BESS} = 0 \\text{ kWh (Kịch bản Zero-Export)} \\)</div>`; }
    bessFormulaHtml += `<div class="var-legend" style="border-top: 1px dashed var(--border); padding-top: 15px; margin-top: 10px; font-size: 0.9em; line-height: 1.6;"><b>Chú thích thông số:</b><br>• \\(E_{Excess}\\): Điện mặt trời dư (${fmt(eExcess)} kWh)<br>• \\(P_{Deficit\\_Max}\\): Đỉnh thiếu hụt cao nhất (${fmt(peakDeficit)} kW)<br>• \\(DoD = 0.95\\): Độ xả sâu an toàn.<br>• \\(\\eta = 0.97\\): Hiệu suất khứ hồi.<br>• \\(C\\text{-}Rate_{Max} = 0.5\\): Hệ số dòng xả an toàn.</div>`;
    document.getElementById('formulaBattery').innerHTML = bessFormulaHtml;

    document.getElementById('formulaGen').innerHTML = `
        $$ Yield_{Y1} = P_{DC} \\times PSH \\times PR \\times (1 - Deg_{Y1}) $$
        <div class="var-legend" style="border-top: 1px dashed var(--border); padding-top: 15px; margin-top: 10px;">Trong đó:<br>\\(P_{DC}\\): Công suất Pin (kWp)<br>\\(PSH\\): Giờ nắng (h)<br>\\(PR\\): Hiệu suất (%)<br>\\(Deg_{Y1}\\): Tỷ lệ suy hao năm đầu (%)</div>
    `;

    let formulaFinanceEl = document.getElementById('formulaFinance');
    if (formulaFinanceEl) {
        formulaFinanceEl.innerHTML = `
            <div style="margin-bottom: 10px; color: var(--text-color);"><b>1. Cấu trúc Vốn & Khấu hao (Lá chắn thuế):</b></div>
            $$ Tax\\_Shield = \\frac{CAPEX}{Depr\\_Years} \\times Tax\\_Rate $$
            <div style="margin-bottom: 10px; margin-top: 15px; color: var(--text-color);"><b>2. Quỹ Vận hành OPEX (Tích hợp lạm phát & Thay thế):</b></div>
            $$ OPEX_t = (CAPEX \\times OM\\_Rate \\times (1 + Inf)^{t-1}) + Replace_t $$
            <div style="margin-bottom: 10px; margin-top: 15px; color: var(--text-color);"><b>3. Dòng tiền Tự do (Free Cash Flow to Equity):</b></div>
            $$ FCFE_t = Revenue_t - OPEX_t - Interest_t - Principal_t - Tax_t $$
            <div style="margin-bottom: 10px; margin-top: 15px; color: var(--primary); font-size: 1.1em;"><b>4. Hiện giá Thuần (NPV) & Tỷ suất Sinh lời (IRR):</b></div>
            $$ NPV = \\sum_{t=1}^{25} \\frac{FCFE_t}{(1+Ke)^t} - Equity_0 $$
            <div class="var-legend" style="border-top: 1px dashed var(--border); padding-top: 15px; margin-top: 10px; line-height: 1.7;">
                <b>Cơ sở thiết lập (Bảo vệ rủi ro dòng tiền):</b><br>
                • \\(Replace_t\\): Phí thay thế Inverter (Năm 12) = 10% giá trị Solar. Phí thay thế Cell Pin (Năm 15) = 60% giá trị BESS.<br>
                • Phương pháp tính toán IRR tuân thủ chuẩn thẩm định dự án năng lượng của Ngân hàng Thế giới (WB).
            </div>
        `;
    }

    if(window.MathJax) { MathJax.typesetPromise().catch((err) => console.log('MathJax error: ', err.message)); }
}

window.onload = function() { autoSizePV(); };
