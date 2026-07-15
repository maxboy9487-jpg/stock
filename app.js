// --- Constants & Config ---
const CONFIG = { FEE_RATE: 0.001425, MIN_FEE: 20, TAX_RATE: 0.003, HKD_RATE: 4.05 }; // Mock HKD rate

// --- Global UI State ---
window.portfolioTab = 'inventory';
window.detailTab = 'chart';
window.currentInterval = '1d';
window.currentChartData = [];
window.currentMAs = [];
window.selectionTab = 'selector';
window.selectionFilter = '1h';
window.selectionSubPage = null;
window.selectionSubFilter = 'default';
window.expandedStocks = new Set();

window.togglePortfolioRow = function (symbol) {
    const detailEl = document.getElementById(`inv-detail-${symbol}`);
    if (!detailEl) return;

    const isCurrentlyVisible = detailEl.style.display !== 'none';
    if (isCurrentlyVisible) {
        detailEl.style.display = 'none';
        window.expandedStocks.delete(symbol);
    } else {
        detailEl.style.display = 'block';
        window.expandedStocks.add(symbol);
    }
};

const DEFAULT_ACCOUNTS = [
    { branch: '台南', id: '3815467' },
    { branch: '台北', id: '4163952' },
    { branch: '松江', id: '8250249' },
    { branch: '忠孝', id: '2948531' },
    { branch: '土城', id: '6430586' }
];

let customAccounts = JSON.parse(localStorage.getItem('stockCustomAccounts') || '[]');
let ACCOUNTS = [...DEFAULT_ACCOUNTS, ...customAccounts];

window.currentAccountId = localStorage.getItem('stockCurrentAccount');

const state = {
    currentPage: 'home', previousPage: 'home', currentStock: null, tradeTarget: null, lastTradeSymbol: '2330',
    balance: 10000000,
    _is1BillionUpgraded: true,
    feeDiscount: 0.6,
    todayTrades: new Set(),
    alerts: [],
    assets: [],
    searchHistory: [], // Recently viewed symbols
    isLightMode: false,
    colorMode: 'TW', // 'TW' (Red=Up) or 'INTL' (Green=Up)
    fullTimeSim: true, // Phase G: 24/7 simulation mode
    marketStatus: 'open', // 'open' or 'closed'
    portfolio: [],
    _demoDone: false,
    orders: [],
    history: [],
    triggers: [],
    watchlist: ['2330', '2454', '00326', '00805'],
    marketData: window.parsedMarketData || [],
    currentBranch: `(台)台南 3815467`,
    shouldMatchOrders: true
};

window.switchAccount = function (id) {
    if (window.currentAccountId) saveState();
    window.currentAccountId = id;
    localStorage.setItem('stockCurrentAccount', id);

    const account = ACCOUNTS.find(a => a.id === id);
    if (account) state.currentBranch = `(台)${account.branch} ${account.id}`;

    resetStateInMemory();
    loadState();

    // Remove overlay if it exists
    const overlay = document.querySelector('.account-selection-overlay');
    if (overlay) overlay.remove();

    renderPage('home');
    showToast(`已切換至帳戶: ${state.currentBranch}`);
};

window.resetCurrentAccountTrades = function () {
    if (confirm("確定要刪除此帳號內的所有交易紀錄並還原帳號嗎？")) {
        resetStateInMemory();
        saveState();
        if (state.currentPage === 'portfolio') renderPage('portfolio', { keepScroll: true });
        showToast("已成功刪除此帳號的所有交易紀錄！");
    }
};

function resetStateInMemory() {
    state.balance = 10000000;
    state.portfolio = [];
    state.orders = [];
    state.history = [];
    state.triggers = [];
    state.assetHistory = [];
    state.watchlist = ['2330', '2454', '00326', '00805'];
    state.todayTrades = new Set();
}

window.renderAccountSelectionOverlay = function () {
    const existing = document.querySelector('.account-selection-overlay');
    if (existing) return;

    const overlay = document.createElement('div');
    overlay.className = 'account-selection-overlay';

    let accountsHtml = ACCOUNTS.map(acc => `
        <div class="account-card ${window.currentAccountId === acc.id ? 'active' : ''}" onclick="window.switchAccount('${acc.id}')">
            <div>
                <div class="branch">${acc.branch} 分公司</div>
                <div class="id">${acc.id}</div>
            </div>
            <div class="arrow"><i class="fa-solid fa-chevron-right"></i></div>
        </div>
    `).join('');

    overlay.innerHTML = `
        <div class="account-selection-container">
            <h2 style="color:white; text-align:center; margin-bottom:24px; font-weight:800; letter-spacing:1px;">請選擇操作帳戶</h2>
            <div id="account-list-scroll" style="max-height: 480px; overflow-y: auto; margin: 0 -10px; padding: 0 10px;">
                ${accountsHtml}
            </div>
            <button onclick="window.promptAddAccount()" style="width:100%; padding:14px; margin-top:16px; border:1px dashed #444; background:rgba(255,255,255,0.03); color:#888; border-radius:12px; cursor:pointer; font-weight:600; display:flex; align-items:center; justify-content:center; gap:8px; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--accent-blue)'; this.style.color='white'" onmouseout="this.style.borderColor='#444'; this.style.color='#888'">
                <i class="fa-solid fa-plus"></i> 新增帳號
            </button>
            <p style="color:#666; text-align:center; font-size:0.85rem; margin-top:20px;">切換帳戶後，所有交易紀錄將獨立儲存。</p>
        </div>
    `;
    document.body.appendChild(overlay);

    // Allow clicking outside to close
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
};

window.promptAddAccount = function () {
    const branch = prompt('請輸入分公司地區 (例如: 台中)');
    if (!branch) return;
    const id = prompt('請輸入帳號數字 (例如: 1234567)');
    if (!id) return;

    const newAcc = { branch, id };
    ACCOUNTS.push(newAcc);

    let custom = JSON.parse(localStorage.getItem('stockCustomAccounts') || '[]');
    custom.push(newAcc);
    localStorage.setItem('stockCustomAccounts', JSON.stringify(custom));

    // Refresh the overlay
    const overlay = document.querySelector('.account-selection-overlay');
    if (overlay) document.body.removeChild(overlay);
    window.renderAccountSelectionOverlay();

    showToast(`✅ 已新增帳戶: ${branch} ${id}`, 'success');
};

window.checkMarketStatus = function () {
    let now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();
    let timeMin = h * 60 + m;
    // Market hours: 09:00 (540) to 13:30 (810), Mon-Fri
    let isOpen = state.fullTimeSim || (timeMin >= 540 && timeMin < 810 && now.getDay() > 0 && now.getDay() < 6);

    let newStatus = isOpen ? 'open' : 'closed';
    if (state.marketStatus === 'open' && newStatus === 'closed') {
        closeMarketSettlement();
    }
    state.marketStatus = newStatus;

    // Update Header
    let titleEl = document.getElementById('header-title');
    if (titleEl) {
        // No longer forcing branding text in the header
    }
}

function closeMarketSettlement() {
    state.marketData.forEach(s => {
        if (!s.isIndex && s.price) {
            s.prevClose = s.price;
            s.change = 0;
            s.volume = 0;
            s.high = s.price;
            s.low = s.price;
            s.limitUp = s.price * 1.1;
            s.limitDown = s.price * 0.9;
        }
    });
    const market = state.marketData.find(s => s.isIndex);
    if (market) { market.prevClose = market.price; market.change = 0; }

    state.todayTrades.clear();
    showToast('🔔 市場已收盤，系統進行日結作業 (更新收盤價/洗價)', 'info');
}

window.toggleFullTimeSim = function (val) {
    state.fullTimeSim = val;
    window.checkMarketStatus();
    if (state.currentPage === 'portfolio') renderPage('portfolio');
}

function showSystemNotification(title, desc) {
    let notification = document.getElementById('sys-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'sys-notification';
        notification.className = 'system-notification';
        document.body.appendChild(notification);
    }
    notification.innerHTML = `
        <div class="sys-icon"><i class="fa-solid fa-bell"></i></div>
        <div class="sys-content">
            <div class="sys-title">${title}</div>
            <div class="sys-desc">${desc}</div>
        </div>
    `;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 4000);
}

window.manualPriceUpdate = function (symbol, newPrice) {
    const stock = state.marketData.find(s => s.symbol === symbol);
    if (!stock) return;

    let p = parseFloat(newPrice);
    if (isNaN(p) || p < 0) return;

    stock.price = p;
    stock.change = p - stock.prevClose;
    if (p > stock.high) stock.high = p;
    if (p < stock.low) stock.low = p;

    // Auto-select this stock on the trade page for convenience
    state.lastTradeSymbol = symbol;

    // If static, we also move the prevClose to keep it stable at the new price
    if (stock.isStatic) {
        stock.prevClose = p;
        stock.change = 0;
        stock.open = p;
        stock.high = p;
        stock.low = p;
    }

    showToast(`✅ ${stock.name} (${symbol}) 價位已調整至 ${p}`, 'success');

    // Refresh relevant views
    if (state.currentPage === 'portfolio') renderPage('portfolio', { keepScroll: true });
    if (state.currentPage === 'stockDetail' && state.currentStock === symbol) renderPage('stockDetail');
    if (state.currentPage === 'home') renderPage('home');
};

// --- Price Manager Dropdown Helper Functions ---
window.showPriceMgrDropdown = function () {
    const listEl = document.getElementById('price-mgr-dropdown-list');
    if (listEl) {
        listEl.style.display = 'block';
        const inputEl = document.getElementById('stock-search-input');
        window.filterPriceMgrDropdown(inputEl ? inputEl.value : '');
    }
};

window.filterPriceMgrDropdown = function (query) {
    const listEl = document.getElementById('price-mgr-dropdown-list');
    if (!listEl) return;

    let searchWord = query.trim();
    const match = query.match(/\(([^)]+)\)/);
    if (match && window.priceMgrSelectedSymbol === match[1]) {
        searchWord = '';
    }

    const stocks = state.marketData.filter(s => !s.isIndex);
    const filtered = stocks.filter(s =>
        s.symbol.includes(searchWord) ||
        s.name.toLowerCase().includes(searchWord.toLowerCase())
    );

    if (filtered.length === 0) {
        listEl.innerHTML = '<div style="padding:12px; color:var(--text-secondary); text-align:center; font-size:0.95rem;">未找到相符的股票</div>';
        return;
    }

    listEl.innerHTML = filtered.slice(0, 30).map(s => {
        const isSelected = window.priceMgrSelectedSymbol === s.symbol;
        return `
            <div class="dropdown-item" style="padding:12px 16px; cursor:pointer; color:var(--text-primary); border-bottom:1px solid var(--border-color); font-size:0.95rem; display:flex; justify-content:space-between; align-items:center; background:${isSelected ? 'rgba(74, 134, 255, 0.15)' : 'none'};" onclick="window.selectPriceMgrStock('${s.symbol}')" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='${isSelected ? 'rgba(74, 134, 255, 0.15)' : 'none'}'">
                <span style="font-weight:${isSelected ? '600' : '400'}; color:${isSelected ? 'var(--accent-blue)' : 'var(--text-primary)'};">${s.name} (${s.symbol})</span>
                <span style="color:var(--text-secondary); font-family:var(--font-mono); font-size:0.9rem;">${s.price}</span>
            </div>
        `;
    }).join('');
};

window.selectPriceMgrStock = function (symbol) {
    window.priceMgrSelectedSymbol = symbol;
    const stock = state.marketData.find(s => s.symbol === symbol);
    if (!stock) return;

    const inputEl = document.getElementById('stock-search-input');
    if (inputEl) {
        inputEl.value = `${stock.name} (${stock.symbol})`;
        inputEl.blur();
    }

    const listEl = document.getElementById('price-mgr-dropdown-list');
    if (listEl) listEl.style.display = 'none';

    const cardEl = document.getElementById('selected-stock-card');
    if (cardEl) {
        cardEl.innerHTML = window.renderSelectedStockCardContent(stock);
    }
};

window.renderSelectedStockCardContent = function (stock) {
    return `
        <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size:1.15rem; font-weight:700; color:var(--text-primary);">${stock.name} (${stock.symbol})</div>
                    <div style="font-size:0.9rem; color:var(--text-secondary); margin-top:4px;">目前價格：<strong style="color:var(--text-primary); font-family:var(--font-mono); font-size:1.05rem;">${stock.price}</strong></div>
                </div>
                <div style="text-align:right;">
                    <span class="badge" style="background:${stock.isHK ? '#ffca28' : '#4a86ff'}; color:black; font-size:0.75rem; padding:2px 6px; border-radius:4px; font-weight:700;">${stock.isHK ? '複委託/港股' : '台股'}</span>
                </div>
            </div>
            
            <div style="display:flex; gap:10px; align-items:center; margin-top:8px;">
                <div style="flex:1; position:relative;">
                    <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#666; font-size:0.9rem;">新價格</span>
                    <input type="number" id="price-mgr-new-price" step="0.01" style="width:100%; background:#111; border:1px solid #444; color:white; padding:12px 12px 12px 60px; border-radius:8px; font-size:1rem;" placeholder="請輸入新價格" value="${stock.price}" onkeydown="if(event.key === 'Enter') window.manualPriceUpdate('${stock.symbol}', this.value)">
                </div>
                <button style="background:var(--accent-blue); color:white; border:none; padding:12px 24px; border-radius:8px; font-size:1rem; font-weight:700; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#3572e6'" onmouseout="this.style.background='var(--accent-blue)'" onclick="window.manualPriceUpdate('${stock.symbol}', document.getElementById('price-mgr-new-price').value)">更新</button>
            </div>
        </div>
    `;
};

// Global listener to dismiss dropdown on click outside
document.addEventListener('click', function (e) {
    const listEl = document.getElementById('price-mgr-dropdown-list');
    const inputEl = document.getElementById('stock-search-input');
    if (listEl && inputEl) {
        if (!inputEl.contains(e.target) && !listEl.contains(e.target)) {
            listEl.style.display = 'none';
        }
    }
});

window.setOrderMatching = function (shouldMatch) {
    state.shouldMatchOrders = shouldMatch;
    saveState();
    let msg = '已開啟自動成交';
    let type = 'success';
    if (shouldMatch === false) {
        msg = '已關閉自動成交（委託將維持「委託傳送中」狀態）';
        type = 'warning';
    } else if (shouldMatch === 'failed') {
        msg = '已設定委託狀態為「委託失敗」';
        type = 'error';
    }
    showToast(msg, type);
    if (state.currentPage === 'portfolio') renderPage('portfolio', { keepScroll: true });
};

window.setPriceFluctuations = function (enabled) {
    state.enablePriceFluctuations = enabled;
    saveState();
    if (state.currentPage === 'portfolio') renderPage('portfolio', { keepScroll: true });
    showToast(enabled ? '✅ 已開啟股票價格自動變動' : '📴 已關閉股票價格自動變動，價格將靜止');
};

// --- Formatters & UI Helpers ---
const formatNumber = (num, toFixed = 2) => {
    if (num === null || num === undefined || Number.isNaN(Number(num))) return (0).toFixed(toFixed);
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: toFixed, maximumFractionDigits: toFixed });
};
const getColorClass = (change, skipNeutral = false) => { if (change > 0) return 'text-up'; if (change < 0) return 'text-down'; return skipNeutral ? '' : 'text-neutral'; };
const getBgClass = (change) => change > 0 ? 'bg-up' : (change < 0 ? 'bg-down' : '');
const getSign = (change) => '';

function triggerFlash(el, change) {
    if (!el || !change) return;
    el.classList.remove('flash-up', 'flash-down');
    void el.offsetWidth; // trigger reflow
    if (change > 0) el.classList.add('flash-up');
    else if (change < 0) el.classList.add('flash-down');
}

window.showToast = (msg, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation';
    let color = type === 'success' ? 'var(--color-up)' : '#ff5252';
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color:${color}; font-size:1.1rem;"></i> <span>${msg}</span>`;
    document.querySelector('.toast-container').appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
};

window.showConfirmModal = (title, content, onConfirm, actionText = '確認', actionColor = 'var(--accent-blue)') => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card" style="animation: slideDown 0.3s ease-out;">
            <div class="modal-header" style="font-weight:700; font-size:1.1rem; margin-bottom:12px; color:var(--text-primary); text-align:center;">${title}</div>
            <div class="modal-body" style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:20px; line-height:1.5; text-align:center;">${content}</div>
            <div style="display:flex; gap:12px;">
                <button class="btn btn-outline" style="flex:1; border-radius:8px; padding:12px;" onclick="this.closest('.modal-overlay').remove()">取消</button>
                <button class="btn" style="flex:1.5; background:${actionColor}; border-radius:8px; padding:12px; color:white; font-weight:700;" id="modal-confirm-btn">${actionText}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#modal-confirm-btn').onclick = () => {
        onConfirm();
        modal.remove();
    };
};

window.toggleWatchlist = (e, symbol) => {
    e.stopPropagation();
    const idx = state.watchlist.indexOf(symbol);
    if (idx > -1) { state.watchlist.splice(idx, 1); showToast(`已從自選股移除 ${symbol}`, 'error'); }
    else { state.watchlist.push(symbol); showToast(`已加入自選股 ${symbol}`); }
    if (state.currentPage === 'home' || state.currentPage === 'stockDetail') renderPage(state.currentPage);
};

// --- Math & Execution ---
function calculateFees(amount, type, symbol) {
    const rate = CONFIG.FEE_RATE; // A1: Use CONFIG constant, not hardcoded value
    let taxRate = (type === 'sell' ? 0.003 : 0);

    // Day Trading (當沖) Tax Logic: If sold on same day as bought, tax is 0.15%
    if (type === 'sell' && state.todayTrades.has(symbol)) {
        taxRate = 0.0015;
    }

    const rawFee = Math.max(20, Math.floor(amount * rate));
    const discountedFee = Math.floor(rawFee * state.feeDiscount);
    const tax = Math.floor(amount * taxRate);
    return { fee: discountedFee, tax: tax, total: discountedFee + tax, isDayTrade: taxRate === 0.0015 };
}

function updateFeeDiscount(val) {
    state.feeDiscount = parseFloat(val);
    showToast(`手續費折數已更新為 ${(state.feeDiscount * 10).toFixed(1)} 折`);
    renderPage('portfolio');
}

function processOrderExecution(order, execPrice) {
    if (order.status === 'executed') return; // Absolute guard
    order.status = 'executed';
    order.execPrice = execPrice;

    let shares = order.shares;
    const stock = state.marketData.find(s => s.symbol === order.symbol);
    let isHK = stock && stock.isHK;
    let rate = isHK ? CONFIG.HKD_RATE : 1;
    let twdValue = execPrice * shares * rate;
    let marginType = order.marginType || 'cash';

    // Day trade classification logic can be enhanced, simplified for now
    if (order.side === 'buy') state.todayTrades.add(order.symbol);

    let { fee, tax } = calculateFees(twdValue, order.side, order.symbol);

    let totalCost = twdValue + fee;
    let totalProceeds = twdValue - fee - tax;
    order.fee = fee; order.tax = tax;

    let __y = "2026";
    let __m = "04";
    let __d = "23";
    let __h = "14";
    let __min = "58";
    let __s = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    let fullTimeStr = `${__y}/${__m}/${__d} ${__h}:${__min}:${__s}`;

    // Find corresponding position based on marginType
    // For OPENING: buy cash, buy margin, sell short
    // For CLOSING: sell cash, sell margin, buy short
    let pos = state.portfolio.find(p => p.symbol === order.symbol && p.marginType === marginType);

    if (order.side === 'buy' && marginType !== 'short') {
        // OPEN LONG (Cash / Margin)
        let requiredMargin = marginType === 'margin' ? (twdValue * 0.4) : totalCost;
        state.balance -= requiredMargin;

        if (pos) {
            let totalInvest = (pos.avgPrice * pos.shares) + totalCost;
            pos.shares += shares;
            pos.avgPrice = totalInvest / pos.shares;
        } else {
            state.portfolio.push({ symbol: order.symbol, name: order.name, shares: shares, avgPrice: totalCost / shares, marginType: marginType });
        }
        state.history.unshift({
            id: Date.now(), docNo: order.docNo, symbol: order.symbol, name: order.name, shares: shares,
            time: fullTimeStr,
            price: execPrice, fee: fee, tax: tax, profit: 0, type: 'buy', marginType: marginType
        });
        let hint = marginType === 'margin' ? ' (融資買進)' : '';
        showToast(`買進成交: ${order.name} ${shares}股 @ ${formatNumber(execPrice)}${hint}`);
    } else if (order.side === 'sell' && marginType === 'short') {
        // OPEN SHORT
        let requiredMargin = (twdValue * 0.9) + fee + tax;
        state.balance -= requiredMargin;
        if (pos) {
            let totalInvest = (pos.avgPrice * pos.shares) + totalProceeds;
            pos.shares += shares;
            pos.avgPrice = totalInvest / pos.shares;
        } else {
            state.portfolio.push({ symbol: order.symbol, name: order.name, shares: shares, avgPrice: totalProceeds / shares, marginType: marginType });
        }
        state.history.unshift({
            id: Date.now(), docNo: order.docNo, symbol: order.symbol, name: order.name, shares: shares,
            time: fullTimeStr,
            price: execPrice, fee: fee, tax: tax, profit: 0, type: 'sell', marginType: marginType
        });
        showToast(`融券賣出: ${order.name} ${shares}股 @ ${formatNumber(execPrice)}`);
    } else if (order.side === 'sell' && marginType !== 'short') {
        // CLOSE LONG (Cash / Margin)
        if (pos) {
            let profit = totalProceeds - (pos.avgPrice * shares);
            let returnedCapital = marginType === 'margin' ? ((pos.avgPrice * shares * 0.4) + profit) : totalProceeds;
            state.balance += returnedCapital;

            state.history.unshift({
                id: Date.now(), docNo: order.docNo, symbol: order.symbol, name: order.name, shares: shares,
                time: fullTimeStr,
                price: execPrice, buyAvgPrice: pos.avgPrice, sellPrice: execPrice, fee: fee, tax: tax, profit: profit, type: 'sell', marginType: marginType
            });
            pos.shares -= shares;
            if (pos.shares <= 0) state.portfolio = state.portfolio.filter(p => !(p.symbol === order.symbol && p.marginType === marginType));
        }
        showToast(`賣出成交: ${order.name} ${shares}股 @ ${formatNumber(execPrice)}`);
    } else if (order.side === 'buy' && marginType === 'short') {
        // CLOSE SHORT (融券買回)
        if (pos) {
            let profit = (pos.avgPrice * shares) - totalCost;
            let returnedCapital = (pos.avgPrice * shares * 0.9) + profit; // Return initial margin + Profit
            state.balance += returnedCapital;

            state.history.unshift({
                id: Date.now(), docNo: order.docNo, symbol: order.symbol, name: order.name, shares: shares,
                time: fullTimeStr,
                price: execPrice, buyAvgPrice: execPrice, sellPrice: pos.avgPrice, fee: fee, tax: tax, profit: profit, type: 'buy', marginType: marginType
            });
            pos.shares -= shares;
            if (pos.shares <= 0) state.portfolio = state.portfolio.filter(p => !(p.symbol === order.symbol && p.marginType === marginType));
        }
        showToast(`融券回補: ${order.name} ${shares}股 @ ${formatNumber(execPrice)}`);
    }
}

function submitOrder(tradeParams, isTriggeredBySmart = false) {
    const { side, symbol, priceType, limitPrice, shares, tif, marginType } = tradeParams;
    const stock = state.marketData.find(s => s.symbol === symbol);
    if (!stock) return;

    // Advanced TIF Logic (IOC/FOK)
    const canImmediate = priceType === 'market' || (side === 'buy' && limitPrice >= stock.price) || (side === 'sell' && limitPrice <= stock.price);
    if ((tif === 'IOC' || tif === 'FOK') && (!canImmediate || state.marketStatus === 'closed')) {
        if (!isTriggeredBySmart) showToast(`❌ ${tif} 委託失敗: 無法立即成交 (委託已自動取消)`, 'error');
        return false;
    }
    if (tif === 'FOK' && shares > (stock.volume * 0.05)) { // Mock volume check for FOK
        if (!isTriggeredBySmart) showToast(`❌ FOK 委託失敗: 市場深部不足以全數成交 (委託已自動取消)`, 'error');
        return false;
    }

    // Final Safety Check (Blocking logic)
    const stockObj = state.marketData.find(s => s.symbol === symbol);
    let isHK = stockObj && stockObj.isHK;
    let rate = isHK ? CONFIG.HKD_RATE : 1;
    let currentPrice = stock.price;
    let estPrice = priceType === 'market' ? currentPrice : limitPrice;
    let totalTwd = estPrice * shares * rate;
    let { fee, tax } = calculateFees(totalTwd, side);

    let requiredMargin = 0;
    if (marginType === 'cash') requiredMargin = totalTwd + fee;
    else if (marginType === 'margin') requiredMargin = (totalTwd * 0.4) + fee;
    else if (marginType === 'short') requiredMargin = (totalTwd * 0.9) + fee + tax; // Initial margin for short sell

    // --- Risk Radar (Phase 22) ---
    const nav = state.balance + state.portfolio.reduce((sum, p) => sum + (p.avgPrice * p.shares), 0);
    const orderValue = estPrice * shares * rate;
    if (orderValue > (nav * 0.3) && !isTriggeredBySmart) {
        showToast(`⚠️ 風控雷達：此筆委託金額已超過您帳戶淨值的 30%，請留意風險與分散投資。`, 'info');
    }

    // Check Funds for Opening Positions
    if ((side === 'buy' && marginType !== 'short') || (side === 'sell' && marginType === 'short')) {
        if (state.balance < requiredMargin && priceType !== 'limit') {
            showToast('可用餘額不足 (交割準備金不足)，下單失敗', 'error');
            return false;
        }
    }

    // Check Inventory for Closing Positions
    if ((side === 'sell' && marginType !== 'short') || (side === 'buy' && marginType === 'short')) {
        let owned = state.portfolio.find(p => p.symbol === symbol && p.marginType === marginType)?.shares || 0;
        if (shares > owned) {
            showToast('持股庫存不足，無法賣出或回補', 'error');
            return false;
        }
    }

    const now = new Date();
    const realDate = now.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    const realTime = `${h}:${m}:${s}`;
    const orderTimeStr = `${realDate} ${realTime}`;

    const order = {
        id: Date.now() + Math.floor(Math.random() * 100),
        docNo: '900' + Math.floor(1000 + Math.random() * 9000).toString(),
        symbol: stock.symbol, name: stock.name, side: side,
        type: priceType, price: estPrice, tif: tif || 'ROD', marginType: marginType,
        shares: shares, status: 'pending',
        time: orderTimeStr
    };

    // --- Disposition Logic (Phase 21) ---
    if (stock.dispositionLevel > 0) {
        // Enforce Pre-collection: Must have 100% funds
        if (side === 'buy' && state.balance < (totalTwd + fee)) {
            showToast(`❌ 處置股須預收 100% 款項，餘額不足`, 'error');
            return false;
        }
        order.status = 'pending-disposition';
        const delayMin = stock.dispositionLevel === 1 ? 5 : 20;
        order.execTime = Date.now() + delayMin * 60 * 1000;
        order.dispositionLevel = stock.dispositionLevel;
        showToast(`⏳ 處置股委託：進入 ${delayMin} 分鐘分盤撮合`, 'warning');
    }

    let executed = false; let execPrice = 0;
    // Market orders or Limit matching only if NOT in disposition delay AND Market is OPEN
    if (state.shouldMatchOrders === 'failed') {
        order.status = 'failed';
    } else if (state.shouldMatchOrders !== false && order.status !== 'pending-disposition' && state.marketStatus === 'open') {
        if (priceType === 'market') { executed = true; execPrice = stock.price; }
        else {
            if (side === 'buy' && limitPrice >= stock.price) { executed = true; execPrice = stock.price; }
            else if (side === 'sell' && limitPrice <= stock.price) { executed = true; execPrice = stock.price; }
        }
    }

    state.orders.unshift(order);

    if (order.status === 'failed') {
        if (!isTriggeredBySmart) {
            showToast('📤 委託已送出...', 'info');
            setTimeout(() => {
                showToast('❌ 委託失敗: 模擬撮合失敗 (委託已自動取消)', 'error');
                if (state.currentPage === 'portfolio') renderPage('portfolio');
            }, 800);
        }
    } else if (executed) {
        if (!isTriggeredBySmart) {
            showToast('📤 委託已送出...', 'info');
            setTimeout(() => {
                showToast('✅ 委託成功，正待成交...', 'success');
                setTimeout(() => {
                    processOrderExecution(order, execPrice);
                    showToast(`🎯 完全成交: ${order.name} @ ${formatNumber(execPrice)}`);
                    if (state.currentPage === 'portfolio') renderPage('portfolio');
                }, 1200);
            }, 800);
        } else {
            // Background smart triggers skip the toast delay
            processOrderExecution(order, execPrice);
        }
    } else {
        if (!isTriggeredBySmart) {
            if (state.marketStatus === 'closed') {
                showToast(`⏳ 目前為收盤時間，委託已接收並轉為預約單 (等待開盤對價)`);
            } else {
                showToast(`⏳ 委託已排隊下單 (等待對價中)`);
            }
        }
    }
    return true;
}

function submitSmartTrigger(params) {
    if (state.marketStatus === 'closed') {
        showToast('❌ 目前為收盤時間，無法設定智慧單', 'error');
        return false;
    }
    const stock = state.marketData.find(s => s.symbol === params.symbol);
    if (!stock) return;
    state.triggers.unshift({
        id: Date.now(), symbol: stock.symbol, name: stock.name, side: params.side,
        condition: params.condition, triggerPrice: params.triggerPrice,
        executeType: params.executeType, orderPrice: params.orderPrice,
        shares: params.shares, tif: params.tif || 'ROD',
        status: 'active',
        time: new Date().toLocaleTimeString('en-US', { hour12: false })
    });
    showToast('🚀 智慧下單已啟動，開始監控行情');
}

function submitOcoTrigger(params) {
    if (state.marketStatus === 'closed') {
        showToast('❌ 目前為收盤時間，無法設定智慧單', 'error');
        return false;
    }
    const stock = state.marketData.find(s => s.symbol === params.symbol);
    if (!stock) return;
    state.triggers.unshift({
        id: Date.now(), symbol: stock.symbol, name: stock.name, side: params.side,
        type: 'oco', tpPrice: params.tpPrice, slPrice: params.slPrice,
        executeType: 'market', orderPrice: 0,
        shares: params.shares, tif: 'IOC', marginType: params.marginType || 'cash',
        status: 'active',
        time: new Date().toLocaleTimeString('en-US', { hour12: false })
    });
    showToast('🚀 OCO 雙向條件單已啟動，開始監控行情');
}

window.cancelOrder = (id) => {
    let o = state.orders.find(o => o.id === id);
    if (o && (o.status === 'pending' || o.status === 'pending-disposition')) { // A2: also cancel disposition orders
        o.status = 'canceled'; showToast('委託已撤銷', 'error'); if (state.currentPage === 'portfolio') renderPage('portfolio');
    }
};
window.cancelTrigger = (id) => {
    let t = state.triggers.find(t => t.id === id);
    if (t && t.status === 'active') { t.status = 'canceled'; showToast('監控已中止', 'error'); if (state.currentPage === 'portfolio') renderPage('portfolio'); }
};

// --- Initialization & Data generation ---
function recordAssetHistory() {
    let totalStockValue = state.portfolio.reduce((sum, pos) => {
        let stock = state.marketData.find(x => x.symbol === pos.symbol);
        let currentPrice = stock ? stock.price : pos.avgPrice;
        let rate = (stock && stock.isHK) ? CONFIG.HKD_RATE : 1;
        let pTwd = currentPrice * rate;

        const currentVal = pTwd * pos.shares;
        const { fee: simFee, tax: simTax } = calculateFees(currentVal, 'sell', pos.symbol, pos.shares);
        const netVal = currentVal - simFee - simTax;
        const cost = pos.avgPrice * pos.shares;
        const basePnl = netVal - cost;

        let posEquity = netVal;
        if (pos.marginType === 'margin') {
            posEquity = (cost * 0.4) + basePnl;
        } else if (pos.marginType === 'short') {
            let shortPnl = cost - netVal;
            posEquity = (cost * 0.9) + shortPnl;
        }
        return sum + posEquity;
    }, 0);

    const indexData = state.marketData.find(d => d.isIndex);
    const currentEquity = state.balance + totalStockValue;
    const currentIndex = indexData ? indexData.price : 22857;

    state.assetHistory.push({
        equity: currentEquity,
        index: currentIndex,
        time: new Date().toLocaleTimeString('en-US', { hour12: false })
    });

    if (state.assetHistory.length > 100) state.assetHistory.shift();
}

function checkPriceAlerts(stock) {
    state.alerts.forEach(alert => {
        if (alert.symbol === stock.symbol && alert.active) {
            if ((alert.side === 'above' && stock.price >= alert.price) ||
                (alert.side === 'below' && stock.price <= alert.price)) {
                alert.active = false; // Triggered
                showToast(`🔔 價格警示: ${stock.name} 已觸及 ${formatNumber(alert.price)}`, 'info');
                // Mock system notification
                showSystemNotification(`價格提醒`, `${stock.name} (${stock.symbol}) 目前價格 ${formatNumber(stock.price)}`);
            }
        }
    });
}

function setPriceAlert(symbol, price, side) {
    state.alerts.push({ symbol, price, side, active: true });
    showToast(`已設定 ${symbol} ${side === 'above' ? '突破' : '跌破'} ${formatNumber(price)} 提醒`);
    renderPage('stockDetail');
}

function initApp() {
    if (!window.currentAccountId) {
        // Initial setup
        window.renderAccountSelectionOverlay();
    } else {
        const account = ACCOUNTS.find(a => a.id === window.currentAccountId);
        if (account) state.currentBranch = `(台)${account.branch} ${account.id}`;
        loadState();
    }

    if (state.isLightMode) document.body.classList.add('light-mode');
    if (state.colorMode === 'INTL') document.body.classList.add('intl-mode');

    // Initialize price history for SVG chart
    state.marketData.forEach(s => {
        if (!s.priceHistory) s.priceHistory = []; // Fallback

        const intervals = ['1m', '5m', '1d', '1w', '1M'];
        intervals.forEach(inv => {
            const key = `priceHistory${inv}`;
            if (!s[key]) {
                s[key] = [];
                let points = inv === '1m' ? 60 : (inv === '5m' ? 100 : 80);
                let seed = s.price - (Math.random() * 10);
                for (let i = 0; i < points; i++) {
                    seed += (Math.random() - 0.5) * (seed * 0.005);
                    s[key].push(seed);
                }
            }
        });

        // Essential metadata for other high/low/vol displays
        if (!s.prevClose) s.prevClose = s.price - s.change;
        if (!s.high) s.high = s.price;
        if (!s.low) s.low = s.price;
        if (!s.volume) s.volume = Math.floor(Math.random() * 50000) + 1000;
        if (!s.pe) s.pe = (Math.random() * 20 + 10).toFixed(2);
        if (!s.divYield) s.divYield = (Math.random() * 5 + 2).toFixed(2);
    });

    const mainContent = document.getElementById('main-content');
    const navItems = document.querySelectorAll('.nav-item');
    const backBtn = document.getElementById('back-btn');

    window.mainContent = mainContent; window.navItems = navItems; window.backBtn = backBtn;

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            if (target === state.currentPage) return;
            state.tradeTarget = null;
            renderPage(target);
        });
    });
    backBtn.addEventListener('click', () => renderPage(state.previousPage));

    renderPage('home');
    startMarketSimulation();
}

window.viewStock = (symbol) => {
    state.currentStock = symbol;
    state.searchHistory = [symbol, ...state.searchHistory.filter(s => s !== symbol)].slice(0, 5);
    saveState();
    renderPage('stockDetail');
};

window.toggleTheme = () => {
    state.isLightMode = !state.isLightMode;
    document.body.classList.toggle('light-mode', state.isLightMode);
    const icon = document.querySelector('#theme-btn i');
    if (icon) icon.className = state.isLightMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    saveState();
};

window.toggleColorMode = () => {
    state.colorMode = state.colorMode === 'TW' ? 'INTL' : 'TW';
    document.body.classList.toggle('intl-mode', state.colorMode === 'INTL');
    showToast(`漲跌配色已切換為: ${state.colorMode === 'TW' ? '台股慣例 (紅漲)' : '國際慣例 (綠漲)'}`);
    saveState();
    renderPage(state.currentPage);
};

window.resetAppData = () => {
    if (confirm('確定要清除所有對帳庫存紀錄，並恢復 10 億元虛擬本金嗎？')) {
        window.isResetting = true;
        localStorage.removeItem('stockSimulatorState');
        window.location.reload();
    }
};

window.goToTrade = (symbol, side = 'buy') => {
    state.tradeTarget = { symbol, side };
    renderPage('trade');
};

// --- Router ---
function renderPage(page, options = {}) {
    if (page !== 'stockDetail' && page !== 'trade') state.previousPage = state.currentPage;
    state.currentPage = page;

    if (!options.keepScroll) {
        window.mainContent.scrollTop = 0;
    }
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'page-content';

    if (page === 'stockDetail') { window.backBtn.style.display = 'flex'; document.getElementById('bottom-nav').style.display = 'none'; document.getElementById('header-title').textContent = '個股資訊'; }
    else {
        window.backBtn.style.display = 'none'; document.getElementById('bottom-nav').style.display = 'flex';
        window.navItems.forEach(nav => {
            const target = nav.getAttribute('data-target');
            if (target === page) nav.classList.add('active');
            else nav.classList.remove('active');
        });
    }

    // A7: Hide header title bar for portfolio page as requested
    const headerEl = document.querySelector('.app-header');
    if (page === 'portfolio') {
        headerEl.style.display = 'none';
    } else {
        headerEl.style.display = 'flex';
    }

    switch (page) {
        case 'home': document.getElementById('header-title').textContent = '台股總覽'; pageWrapper.innerHTML = renderHomePage(); break;
        case 'portfolio': document.getElementById('header-title').textContent = '帳務與委託'; pageWrapper.innerHTML = renderPortfolioPage(); break;
        case 'more': document.getElementById('header-title').textContent = '更多設定'; pageWrapper.innerHTML = renderMorePage(); break;
        case 'trade': document.getElementById('header-title').textContent = '下單交易'; pageWrapper.appendChild(buildTradePage()); break;
        case 'selection': document.getElementById('header-title').textContent = '智慧選股'; pageWrapper.innerHTML = renderSelectionPage(); break;
        case 'stockDetail':
            pageWrapper.innerHTML = renderStockDetail();
            const actions = document.createElement('div');
            actions.className = 'fixed-bottom-actions';
            actions.innerHTML = `<button class="btn btn-down" style="flex:1;" onclick="goToTrade('${state.currentStock}', 'sell')">賣出</button><button class="btn btn-up" style="flex:1;" onclick="goToTrade('${state.currentStock}', 'buy')">買進</button>`;
            setTimeout(() => {
                document.querySelector('.app-container').appendChild(actions);
                const stock = state.marketData.find(s => s.symbol === state.currentStock);
                if (stock) initStockChart(stock);
            }, 50);
            break;
    }

    document.querySelectorAll('.fixed-bottom-actions').forEach(el => el.remove());
    window.mainContent.replaceChildren(pageWrapper);
}

// --- Home View ---
function renderHomePage() {
    const indexData = state.marketData.find(d => d.isIndex) || { symbol: 'IX0001', name: '加權指數', price: 0, change: 0, prevClose: 1 };
    const stocks = state.marketData.filter(d => !d.isIndex);
    const watchStocks = stocks.filter(s => state.watchlist.includes(s.symbol));
    const trendStocks = stocks.filter(s => !state.watchlist.includes(s.symbol)).slice(0, 15);

    const indexLabelStyle = 'font-size: 0.8rem; font-weight: 600; color: #ffb74d; margin-top: 6px; display: flex; align-items: center; justify-content: center; gap: 4px;';
    const indexAmp = indexData.amplitude?.toFixed(2) || '1.15';

    let globalNewsHtml = '';
    const hasNews = window.MockMarketEngine && window.MockMarketEngine.globalNews && window.MockMarketEngine.globalNews.length > 0;
    if (hasNews) {
        let newsItem = window.MockMarketEngine.globalNews[0];
        let colorStr = newsItem.type === 'positive' ? 'var(--color-up)' : 'var(--color-down)';
        globalNewsHtml = `
            <div style="margin: 16px 0; background: linear-gradient(135deg, rgba(41,121,255,0.05), rgba(41,121,255,0.01)); border: 1px solid rgba(41,121,255,0.2); border-radius: 12px; padding: 16px 16px 16px 20px; position:relative; min-height: 85px; display: flex; flex-direction: column;">
                <div style="position:absolute; left:0; top:0; bottom:0; width:4px; background:${colorStr}; border-top-left-radius: 11px; border-bottom-left-radius: 11px;"></div>
                <div style="font-weight:700; font-size:0.9rem; margin-bottom:8px; display:flex; align-items:center; gap:6px; color:var(--accent-blue); line-height:1;">
                    <i class="fa-solid fa-earth-americas"></i> 全球總經與產業快訊
                </div>
                <div style="font-size:1.05rem; font-weight:700; color:var(--text-primary); margin-bottom:6px; line-height: 1.4;">${newsItem.title}</div>
                <div style="color:var(--text-secondary); font-size:0.8rem; line-height:1;"><i class="fa-regular fa-clock"></i> ${newsItem.time}</div>
            </div>`;
    }

    let html = `
            <div class="card index-widget" style="text-align: center; background: linear-gradient(135deg, var(--bg-card), #2a1a1a); border: 1px solid var(--border-color);">
                <div class="text-label" style="margin-bottom: 4px;">${indexData.name} (市場基準)</div>
                <div id="price-${indexData.symbol}" class="text-hero tabular-nums ${getColorClass(indexData.change)}">
                    ${indexData.price.toFixed(2)}
                </div>
                <div id="change-${indexData.symbol}" style="font-size: 1.1rem; font-weight: 600;" class="tabular-nums ${getColorClass(indexData.change)}">
                    ${getSign(indexData.change)}${formatNumber(indexData.change)} (${((indexData.change / indexData.prevClose) * 100).toFixed(2)}%)
                </div>
                <div style="${indexLabelStyle}">
                    <i class="fa-solid fa-bolt"></i> 盤中即時振幅: ${indexAmp}%
                </div>
            </div>
            ${globalNewsHtml}
        <div style="margin: 16px 0;">
            <div style="position: relative;">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
                <input type="text" id="stock-search" placeholder="搜尋股號或名稱..." 
                    style="width: 100%; border: 1px solid var(--border-color); background: var(--bg-card); padding: 12px 12px 12px 42px; border-radius: 12px; color: var(--text-primary); font-size: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            </div>
        </div>

        ${state.searchHistory.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <div class="text-label" style="margin-bottom: 12px; display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-clock-rotate-left"></i> 最近看過
                </div>
                <div class="search-history-row" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
                    ${state.searchHistory.map(sym => {
        const s = state.marketData.find(x => x.symbol === sym);
        if (!s) return '';
        let pct = ((s.change / (s.price - s.change)) * 100);
        return `
                            <div onclick="viewStock('${s.symbol}')" style="min-width: 90px; background: var(--bg-card); border: 1px solid var(--border-color); padding: 10px; border-radius: 12px; text-align: center; cursor: pointer;">
                                <div style="font-weight: 700; font-size: 0.9rem;">${s.name}</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">${s.symbol}</div>
                                <div class="${getColorClass(s.change)}" style="font-size: 0.8rem; font-weight: 600; margin-top: 4px;">${getSign(s.change)}${pct.toFixed(1)}%</div>
                            </div>
                        `;
    }).join('')}
                </div>
            </div>
        ` : ''}
    `;

    const buildStockHtml = (arr) => {
        let str = '';
        arr.forEach(stock => {
            let pctChange = (stock.change / (stock.price - stock.change || 1)) * 100;
            let isStar = state.watchlist.includes(stock.symbol);
            let isLimitUp = !stock.isIndex && stock.price >= stock.limitUp;
            let isLimitDown = !stock.isIndex && stock.price <= stock.limitDown;
            let limitClass = isLimitUp ? 'bg-limit-up' : (isLimitDown ? 'bg-limit-down' : '');
            let badgeHtml = '';
            if (stock.status === '處置') badgeHtml = `<span style="position:absolute; top:8px; left:52px; font-size:0.6rem; background:#ff5252; color:white; padding:1px 5px; border-radius:4px; font-weight:700;">處置</span>`;
            else if (stock.status === '注意') badgeHtml = `<span style="position:absolute; top:8px; left:52px; font-size:0.6rem; background:#ff9800; color:white; padding:1px 5px; border-radius:4px; font-weight:700;">注意</span>`;
            str += `
                <div class="card clickable" onclick="state.currentStock='${stock.symbol}'; renderPage('stockDetail')" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; position:relative;">
                    ${badgeHtml}
                    <div style="display:flex; align-items:center; gap:12px;">
                        <button class="star-btn ${isStar ? 'active' : ''}" onclick="toggleWatchlist(event, '${stock.symbol}')">
                            <i class="${isStar ? 'fa-solid' : 'fa-regular'} fa-star"></i>
                        </button>
                        <div>
                            <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-primary);">${stock.name}</div>
                            <div style="font-size: 0.9rem; color: var(--text-primary); font-family:var(--font-mono); opacity:0.9;">${stock.symbol}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div id="price-${stock.symbol}" style="font-weight: 700; font-size: 1.25rem; font-variant-numeric: tabular-nums;" class="${limitClass || getColorClass(stock.change)}">
                            ${formatNumber(stock.price)}
                        </div>
                        <div id="change-${stock.symbol}" style="font-size: 0.95rem; font-weight: 700; padding:6px 8px; border-radius:8px; min-width:80px; text-align:center; display:inline-block; margin-top:4px;" class="${getBgClass(stock.change)} ${getColorClass(stock.change)}">
                            ${getSign(stock.change)}${formatNumber(pctChange)}%
                        </div>
                    </div>
                </div>`;
        });
        return str;
    };

    const renderGroupedView = () => {
        let out = '';
        if (watchStocks.length > 0) {
            const avgChg = watchStocks.reduce((s, x) => s + (x.change / (x.price - x.change || 1)) * 100, 0) / watchStocks.length;
            const best = watchStocks.reduce((a, b) => ((b.change / (b.price - b.change || 1)) > (a.change / (a.price - a.change || 1))) ? b : a);
            const worst = watchStocks.reduce((a, b) => ((b.change / (b.price - b.change || 1)) < (a.change / (a.price - a.change || 1))) ? b : a);
            const totalUp = watchStocks.filter(s => s.change > 0).length;
            const totalDn = watchStocks.filter(s => s.change < 0).length;
            const bestPct = (best.change / (best.price - best.change || 1)) * 100;
            const worstPct = (worst.change / (worst.price - worst.change || 1)) * 100;
            out += `<div style="background:linear-gradient(135deg,rgba(25,25,40,0.9),rgba(30,30,50,0.9));border:1px solid var(--border-color);border-radius:12px;padding:10px 14px;margin-bottom:10px;display:flex;gap:0;overflow-x:auto;align-items:stretch;">
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:62px;padding:4px 10px;border-right:1px solid var(--border-color);">
                    <span style="font-size:0.68rem;color:var(--text-secondary);white-space:nowrap;margin-bottom:2px;">平均漲跌</span>
                    <span style="font-size:0.95rem;font-weight:700;" class="${getColorClass(avgChg)}">${avgChg >= 0 ? '+' : ''}${avgChg.toFixed(2)}%</span>
                </div>
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:52px;padding:4px 10px;border-right:1px solid var(--border-color);">
                    <span style="font-size:0.68rem;color:var(--text-secondary);margin-bottom:2px;">漲/跌數</span>
                    <span style="font-size:0.9rem;font-weight:700;"><span class="text-up">${totalUp}</span> / <span class="text-down">${totalDn}</span></span>
                </div>
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:72px;padding:4px 10px;border-right:1px solid var(--border-color);cursor:pointer;" onclick="viewStock('${best.symbol}')">
                    <span style="font-size:0.68rem;color:var(--text-secondary);margin-bottom:2px;">最佳</span>
                    <span style="font-size:0.82rem;font-weight:700;white-space:nowrap;">${best.name}</span>
                    <span style="font-size:0.78rem;font-weight:700;" class="text-up">${bestPct >= 0 ? '+' : ''}${bestPct.toFixed(1)}%</span>
                </div>
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:72px;padding:4px 10px;cursor:pointer;" onclick="viewStock('${worst.symbol}')">
                    <span style="font-size:0.68rem;color:var(--text-secondary);margin-bottom:2px;">最弱</span>
                    <span style="font-size:0.82rem;font-weight:700;white-space:nowrap;">${worst.name}</span>
                    <span style="font-size:0.78rem;font-weight:700;" class="text-down">${worstPct.toFixed(1)}%</span>
                </div>
            </div>`;
            out += `<h3 class="section-title"><i class="fa-solid fa-star" style="color:#f5c518;"></i> 自選觀察</h3><div style="display:flex; flex-direction:column; gap:10px;">${buildStockHtml(watchStocks)}</div>`;
        }
        out += `<h3 class="section-title"><i class="fa-solid fa-fire" style="color:#ff9800;"></i> 熱門行情</h3><div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">${buildStockHtml(trendStocks)}</div>`;
        return out;
    };

    let debounceTimer;
    setTimeout(() => {
        const searchInput = document.getElementById('stock-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const q = e.target.value.trim().toLowerCase();
                    const container = document.getElementById('market-lists-container');
                    if (!container) return;

                    if (!q) {
                        // Restore grouped view when query is cleared
                        container.innerHTML = renderGroupedView();
                        return;
                    }

                    const filtered = stocks.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
                    const resultHtml = filtered.length > 0
                        ? `<h3 class="section-title"><i class="fa-solid fa-magnifying-glass"></i> 搜尋結果 (${filtered.length})</h3><div style="display:flex; flex-direction:column; gap:10px;">${buildStockHtml(filtered)}</div>`
                        : `<div style="text-align:center; padding:2rem; color:var(--text-secondary);"><i class="fa-solid fa-circle-xmark" style="font-size:2rem; margin-bottom:8px;"></i><br>未找到相符的股票</div>`;
                    container.innerHTML = resultHtml;
                }, 300); // 300ms debounce
            });
        }
    }, 100);

    html += `<div id="market-lists-container">`;
    html += renderGroupedView();
    html += `</div>`; // Close market-lists-container
    return html;
}

// --- Stock Detail View ---
function generateMockNews(stock) {
    if (!window.triggerNewsEvent) { // Initialize it only once to simplify scope issues
        window.triggerNewsEvent = (sym, direction) => {
            let s = state.marketData.find(x => x.symbol === sym);
            if (!s) return;
            s.newsTrend = direction === 'pump' ? (s.price > 500 ? 5 : 2) : (s.price > 500 ? -5 : -2);
            s.newsTrendTicks = Math.floor(Math.random() * 4) + 4; // 4-7 ticks duration
            showToast(direction === 'pump' ? '市場熱度上升，買盤湧入' : '市場傳出利空，賣壓湧現', direction === 'pump' ? 'success' : 'error');
            if (state.currentPage === 'stockDetail') renderPage('stockDetail');
        };
    }

    if (stock.symbol === '02225') {
        const selected = [
            { title: "金海醫療科技2025年虧損收窄；股價下跌12%", source: "[MT Newswires]", time: "03/30 12:25" },
            { title: "《業績》今海醫療科技(02225.HK)全年虧損收窄至1,708萬新元", source: "[AASTOCKS]", time: "03/29 21:01" },
            { title: "今海醫療科技(02225.HK)擬3月27日舉行董事會會議以審批年度業績", source: "[網易新聞]", time: "03/13 16:44" }
        ];
        return selected.map(n => `
        <div class="card" style="padding: 12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; margin-bottom:8px;">
            <div style="color:var(--text-primary); font-weight:600; margin-bottom:4px; font-size:0.95rem;">${n.title}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <div style="color:var(--text-secondary); font-size:0.8rem;">${n.source} ${n.time}</div>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem; color:var(--color-up); border-color:var(--color-up);" onclick="triggerNewsEvent('${stock.symbol}', 'pump')">利多拉抬</button>
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem; color:var(--color-down); border-color:var(--color-down);" onclick="triggerNewsEvent('${stock.symbol}', 'dump')">利空打壓</button>
                </div>
            </div>
        </div>
        `).join('');
    }

    if (stock.symbol === '01780') {
        const selected = [
            { title: "榮尊國際控股 (01780.HK) 宣佈要約人楊敬堯已完成收購約 13.55% 股份，持股增至 33.39% 觸發強制性全面要約義務", source: "[AASTOCKS]", time: "04/09 18:42" },
            { title: "榮尊國際控股 (01780.HK) 宣佈延期寄發強制性要約綜合文件，不遲於 6 月 18 日寄發", source: "[智通財經]", time: "05/20 09:15" },
            { title: "榮尊國際控股 (01780.HK) 近日股價異常波動，市場關注強制性要約進展與倉位異動風險", source: "[東方財富網]", time: "06/10 16:30" }
        ];
        return selected.map(n => `
        <div class="card" style="padding: 12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; margin-bottom:8px;">
            <div style="color:var(--text-primary); font-weight:600; margin-bottom:4px; font-size:0.95rem;">${n.title}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <div style="color:var(--text-secondary); font-size:0.8rem;">${n.source} ${n.time}</div>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem; color:var(--color-up); border-color:var(--color-up);" onclick="triggerNewsEvent('${stock.symbol}', 'pump')">利多拉抬</button>
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem; color:var(--color-down); border-color:var(--color-down);" onclick="triggerNewsEvent('${stock.symbol}', 'dump')">利空打壓</button>
                </div>
            </div>
        </div>
        `).join('');
    }

    if (stock.symbol === '00209') {
        const selected = [
            { title: "萬維智能科技 (00209.HK) 宣佈自 5 月 12 日起中文股份簡稱正式由「瀛晟科學」更改為「萬維智能科技」", source: "[AASTOCKS]", time: "05/08 17:10" },
            { title: "萬維智能科技 (00209.HK) 擬實施「10股合為1股」合併計劃，未來每手買賣單位將調整", source: "[智通財經]", time: "06/02 08:30" },
            { title: "萬維智能科技 (00209.HK) 近日錄得多次大額轉倉交易，市場交投顯著活躍", source: "[東方財富網]", time: "06/05 16:05" }
        ];
        return selected.map(n => `
        <div class="card" style="padding: 12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; margin-bottom:8px;">
            <div style="color:var(--text-primary); font-weight:600; margin-bottom:4px; font-size:0.95rem;">${n.title}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <div style="color:var(--text-secondary); font-size:0.8rem;">${n.source} ${n.time}</div>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem; color:var(--color-up); border-color:var(--color-up);" onclick="triggerNewsEvent('${stock.symbol}', 'pump')">利多拉抬</button>
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem; color:var(--color-down); border-color:var(--color-down);" onclick="triggerNewsEvent('${stock.symbol}', 'dump')">利空打壓</button>
                </div>
            </div>
        </div>
        `).join('');
    }

    if (stock.symbol === '01850') {
        const selected = [
            { title: "鴻盛昌資源 (01850.HK) 宣佈擬正式更名為「美好生活集團控股有限公司」以配合集團新業務戰略", source: "[AASTOCKS]", time: "04/18 18:05" },
            { title: "美好生活集團 (01850.HK) 中標本港多項公共屋邨消防安全系統安裝工程，合約總值逾千萬港元", source: "[智通財經]", time: "05/11 09:40" },
            { title: "鴻盛昌資源 (01850.HK) 近期股權與倉位變動頻繁，今日大手交易報 HK$3.07", source: "[東方財富網]", time: "06/05 16:15" }
        ];
        return selected.map(n => `
        <div class="card" style="padding: 12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; margin-bottom:8px;">
            <div style="color:var(--text-primary); font-weight:600; margin-bottom:4px; font-size:0.95rem;">${n.title}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <div style="color:var(--text-secondary); font-size:0.8rem;">${n.source} ${n.time}</div>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem; color:var(--color-up); border-color:var(--color-up);" onclick="triggerNewsEvent('${stock.symbol}', 'pump')">利多拉抬</button>
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem; color:var(--color-down); border-color:var(--color-down);" onclick="triggerNewsEvent('${stock.symbol}', 'dump')">利空打壓</button>
                </div>
            </div>
        </div>
        `).join('');
    }

    const uptrends = [
        `外資連三買！${stock.name} 突破前高有望，分析師調高目標價`,
        `${stock.name} 獲大單加持，第四季營收有望衝出新高點`,
        `高階產能供不應求，${stock.name} 市場佔有率持續攀升`,
        `技術面轉強！${stock.name} 出現帶量紅棒，短線動能充足`,
        `${stock.name} 布局新興市場見成效，明年展望樂觀`,
        `利多頻傳！${stock.name} 關鍵零件良率大增，獲利展望上修`,
        `${stock.name} 宣佈擴大配息政策，長線投資買盤湧入`,
        `領先同業，${stock.name} 榮獲 ESG 國際大獎，提升品牌估值`,
        `蘋果訂單回流？${stock.name} 供應鏈傳出稼動率已滿載`,
        `${stock.name} 強攻伺服器市場，明年 H1 成長動能強勁`
    ];
    const downtrends = [
        `${stock.name} 受大盤拖累回檔，長線投資價值浮現`,
        `市場觀望氣氛濃，${stock.name} 短期陷入震盪整理`,
        `利空出盡？${stock.name} 跌勢趨緩，底部支撐力道轉強`,
        `${stock.name} 法說會前夕投資人保守，股價小幅拉回`,
        `營收表現平平，${stock.name} 股價表現相對大盤疲軟`,
        `原物料成本上漲，${stock.name} 毛利率承壓，股價震盪`,
        `${stock.name} 面對同業價格戰，市場擔心其市場地位受損`,
        `技術面走弱，${stock.name} 跌破月線支撐，短線需謹慎`,
        `${stock.name} 傳出產線調整，法人短期操作轉趨保守`,
        `外資賣壓加劇，${stock.name} 持續探底，回補時機未到`
    ];
    const sources = ['[經濟日報]', '[工商時報]', '[路透社]', '[彭博新聞]', '[科技新報]', '[大華投顧]', '[富邦研究]', '[元大財經]'];
    const times = ['10 分鐘前', '45 分鐘前', '1 小時前', '3 小時前', '5 小時前'];

    let pool = stock.change >= 0 ? uptrends : downtrends;
    let selected = [];
    let tempPool = [...pool];
    for (let i = 0; i < 3; i++) {
        let idx = Math.floor(Math.random() * tempPool.length);
        selected.push({
            title: tempPool.splice(idx, 1)[0],
            source: sources[Math.floor(Math.random() * sources.length)],
            time: times[i]
        });
    }

    // triggerNewsEvent has been moved to the top of generateMockNews

    return selected.map(n => `
        <div class="card" style="padding: 12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:8px; margin-bottom:8px;">
            <div style="color:var(--text-primary); font-weight:600; margin-bottom:4px; font-size:0.95rem;">${n.title}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <div style="color:var(--text-secondary); font-size:0.8rem;">${n.source} ${n.time}</div>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem; color:var(--color-up); border-color:var(--color-up);" onclick="triggerNewsEvent('${stock.symbol}', 'pump')">利多拉抬</button>
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem; color:var(--color-down); border-color:var(--color-down);" onclick="triggerNewsEvent('${stock.symbol}', 'dump')">利空打壓</button>
                </div>
            </div>
        </div>
    `).join('');
}

const generateBook = (stock) => {
    let book = '';
    let spread = stock.price > 500 ? 1 : (stock.price > 100 ? 0.5 : 0.05);
    let maxV = 100;

    for (let i = 5; i >= 1; i--) {
        let p = stock.price + (spread * i);
        if (p > stock.limitUp && !stock.isIndex) continue;
        let v = Math.floor(Math.random() * 80) + 10;
        let barW = Math.min((v / maxV) * 100, 100);
        book += `<div style="display:flex; justify-content:space-between; padding:6px 4px; position:relative; overflow:hidden;">
                <div style="position:absolute; right:0; top:0; bottom:0; background:rgba(0,230,118,0.12); width:${barW}%; border-radius: 4px;"></div>
                <span class="text-down" style="z-index:1;">${formatNumber(p)}</span><span style="z-index:1;">${v}</span>
            </div>`;
    }
    book += `<div style="height:1px; background:var(--border-color); margin:8px 0;"></div>`;
    for (let i = 1; i <= 5; i++) {
        let p = stock.price - (spread * i); if (p < 0) p = 0;
        if (p < stock.limitDown && !stock.isIndex) continue;
        let v = Math.floor(Math.random() * 80) + 10;
        let barW = Math.min((v / maxV) * 100, 100);
        book += `<div style="display:flex; justify-content:space-between; padding:6px 4px; position:relative; overflow:hidden;">
                <div style="position:absolute; right:0; top:0; bottom:0; background:rgba(255,82,82,0.12); width:${barW}%; border-radius: 4px;"></div>
                <span class="text-up" style="z-index:1;">${formatNumber(p)}</span><span style="z-index:1;">${v}</span>
            </div>`;
    }
    return book;
};

const renderTimeAndSales = (stock) => {
    if (!stock.trades || stock.trades.length === 0) return '<div class="text-secondary" style="text-align:center; padding:20px; font-size:0.9rem;">尚無成交明細</div>';

    let html = `
        <div style="display:flex; justify-content:space-between; padding:4px 8px; font-size:0.8rem; color:var(--text-secondary); border-bottom:1px solid var(--border-color); margin-bottom:4px; font-weight:600;">
            <span style="flex:1.5;">時間</span>
            <span style="flex:1.5; text-align:right;">成交價</span>
            <span style="flex:1; text-align:right;">單量</span>
        </div>
        <div style="display:flex; flex-direction:column; padding-right:4px;">
    `;

    stock.trades.slice(0, 15).forEach(t => {
        let isBuy = t.side === 'buy';
        let priceColor = getColorClass(t.price - stock.prevClose);
        let volColor = isBuy ? 'text-up' : 'text-down';
        let arrowHtml = isBuy
            ? '<i class="fa-solid fa-arrow-up" style="font-size:0.75rem; margin-left:6px; opacity:0.8;"></i>'
            : '<i class="fa-solid fa-arrow-down" style="font-size:0.75rem; margin-left:6px; opacity:0.8;"></i>';

        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; font-size:0.95rem; border-bottom:1px solid rgba(255,255,255,0.02);">
                <span style="flex:1.5; color:var(--text-secondary);" class="tabular-nums">${t.time}</span>
                <span style="flex:1.5; text-align:right; font-weight:700;" class="tabular-nums ${priceColor}">${formatNumber(t.price)}</span>
                <span style="flex:1; text-align:right; font-weight:600; display:flex; align-items:center; justify-content:flex-end;" class="tabular-nums ${volColor}">
                    ${t.size} ${arrowHtml}
                </span>
            </div>
        `;
    });
    html += `</div>`;
    return html;
};

function renderSelectionPage() {
    if (window.selectionSubPage) return renderSubSelection(window.selectionSubPage);

    const q = window.selectionQuery ? window.selectionQuery.toLowerCase() : '';
    let stocks = state.marketData.filter(s => !s.isIndex);

    if (q) {
        stocks = stocks.filter(s => s.symbol.includes(q) || s.name.toLowerCase().includes(q) || (s.sector && s.sector.includes(q)) || (s.tags && s.tags.some(t => t.includes(q))));
    } else {
        stocks = stocks.slice(0, 30); // Top 30 default
    }

    let html = `
        <div style="margin-bottom: 20px;">
            <div style="position: relative; margin-bottom: 16px;">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
                <input type="text" placeholder="搜尋股票、期貨、概念、指標關鍵字" 
                    value="${window.selectionQuery || ''}"
                    oninput="window.selectionQuery=this.value; renderPage('selection')"
                    style="width: 100%; border: 1px solid var(--border-color); background: var(--bg-card); padding: 12px 12px 12px 42px; border-radius: 24px; color: var(--text-primary); font-size: 0.9rem; outline:none;">
            </div>
            
            <div class="tabs" style="border-bottom:none; margin-bottom: 20px;">
                <div class="tab ${window.selectionTab === 'selector' ? 'active' : ''}" onclick="window.selectionTab='selector'; renderPage('selection')">選股</div>
                <div class="tab ${window.selectionTab === 'news' ? 'active' : ''}" onclick="window.selectionTab='news'; renderPage('selection')">消息</div>
                <div class="tab ${window.selectionTab === 'watchlist' ? 'active' : ''}" onclick="window.selectionTab='watchlist'; renderPage('selection')">自選</div>
            </div>
        </div>
    `;

    if (!q) {
        // Show categories only if not searching
        html += `
            <div class="selection-grid">
                <div class="selection-card" onclick="window.selectionSubPage='ai'; renderPage('selection')"><i class="fa-solid fa-brain" style="color: #64b5f6;"></i><span>智慧選股</span></div>
                <div class="selection-card" onclick="window.selectionSubPage='indicator'; renderPage('selection')"><i class="fa-solid fa-chart-line" style="color: #81c784;"></i><span>指標選股</span></div>
                <div class="selection-card" onclick="window.selectionSubPage='theme'; renderPage('selection')"><i class="fa-solid fa-fire" style="color: #ffb74d;"></i><span>題材選股</span></div>
                <div class="selection-card" onclick="window.selectionSubPage='ranking'; renderPage('selection')"><i class="fa-solid fa-trophy" style="color: #ba68c8;"></i><span>排行選股</span></div>
                <div class="selection-card" onclick="window.selectionSubPage='advisory'; renderPage('selection')"><i class="fa-solid fa-user-tie" style="color: #4db6ac;"></i><span>投顧選股</span></div>
                <div class="selection-card" style="background: linear-gradient(135deg, #1a1a1a, #2c3e50);" onclick="window.selectionSubPage='ai-search'; renderPage('selection')"><i class="fa-solid fa-robot" style="color: #fff;"></i><span>AI 幫你搜</span></div>
                <div class="selection-card" style="background: linear-gradient(135deg, rgba(60,140,250,0.1), rgba(60,140,250,0.2)); border:1px solid var(--accent-blue);" onclick="window.selectionSubPage='backtest'; renderPage('selection')"><i class="fa-solid fa-calculator" style="color: var(--accent-blue);"></i><span style="color:var(--accent-blue); font-weight:700;">回測試算器</span></div>
            </div>

            <div style="margin-bottom: 12px; font-weight: 700; color:var(--text-secondary); font-size: 0.9rem;">標的類型</div>
            <div class="filter-pills">
                <div class="filter-pill ${window.selectionFilter === '1h' ? 'active' : ''}" onclick="window.selectionFilter='1h'; renderPage('selection')">一小時</div>
                <div class="filter-pill ${window.selectionFilter === 'daily' ? 'active' : ''}" onclick="window.selectionFilter='daily'; renderPage('selection')">今日熱門</div>
                <div class="filter-pill ${window.selectionFilter === 'comments' ? 'active' : ''}" onclick="window.selectionFilter='comments'; renderPage('selection')">最多評論</div>
            </div>

            <h3 class="section-title" style="font-size: 1rem; color:var(--text-secondary); margin-top:0;">近一小時最多人搜尋的標的 TOP 30</h3>
        `;
    } else {
        html += `<h3 class="section-title" style="font-size: 1rem; color:var(--text-secondary); margin-top:0;">搜尋結果 (${stocks.length})</h3>`;
    }

    html += `
        <div style="display:flex; justify-content:space-between; padding: 4px 8px; font-size: 0.8rem; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); margin-bottom: 8px;">
            <span style="flex:2;">股名</span>
            <span style="flex:2; text-align:center;">成交價</span>
            <span style="flex:3; text-align:center;">推薦理由</span>
            <span style="flex:1; text-align:right;">自選</span>
        </div>
    `;

    stocks.forEach(s => {
        let pctChange = (s.change / (s.price - s.change || 1)) * 100;
        let isStar = state.watchlist.includes(s.symbol);

        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #1a1a1a; cursor:pointer;" onclick="viewStock('${s.symbol}')">
                <div style="flex: 2;">
                    <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary);">${s.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${s.symbol}</div>
                </div>
                <div style="flex: 2; text-align: center;">
                    <div id="price-${s.symbol}" class="tabular-nums ${getColorClass(s.change)}" style="font-weight: 700; font-size: 1.1rem;">${formatNumber(s.price)}</div>
                    <div id="change-${s.symbol}" class="tabular-nums ${getColorClass(s.change)}" style="font-size: 0.85rem; font-weight: 600;">${getSign(s.change)}${formatNumber(pctChange)}%</div>
                </div>
                <div style="flex: 3; text-align: center; font-size: 0.85rem; color: var(--text-secondary);">
                    猜你也會喜歡
                </div>
                <div style="flex: 1; text-align: right;">
                    <button class="add-btn" onclick="toggleWatchlist(event, '${s.symbol}')">
                        <i class="fa-solid ${isStar ? 'fa-check' : 'fa-plus'}"></i>
                    </button>
                </div>
            </div>
        `;
    });

    return `<div style="padding-bottom: 100px;">${html}</div>`;
}

window.switchBacktestType = function (type) {
    window.btType = type;
    if (state.currentPage === 'selection') renderPage('selection');
}

window.calculateBacktest = function () {
    const buyPrice = parseFloat(document.getElementById('bt-buy-price')?.value || 0);
    const sellPrice = parseFloat(document.getElementById('bt-sell-price')?.value || 0);
    const shares = parseFloat(document.getElementById('bt-shares')?.value || 0);
    const container = document.getElementById('bt-result-container');
    if (!container) return;

    if (buyPrice <= 0 || sellPrice <= 0 || shares <= 0) {
        container.innerHTML = '<div class="card" style="padding:16px; text-align:center; color:var(--text-secondary);">請輸入有效的購買價格、賣出價格與交易股數以進行試算。</div>';
        return;
    }

    const buyVal = buyPrice * shares;
    const sellVal = sellPrice * shares;

    let buyFeeObj = calculateFees(buyVal, 'buy');
    let sellFeeObj = calculateFees(sellVal, 'sell');
    let buyFee = buyFeeObj.fee;
    let sellFee = sellFeeObj.fee;
    let sellTax = sellFeeObj.tax;

    let requiredCapital = 0;
    let netSell = sellVal - sellFee - sellTax;
    let grossPnl = 0;

    if (window.btType === 'cash') {
        requiredCapital = buyVal + buyFee;
        grossPnl = netSell - requiredCapital;
    } else if (window.btType === 'margin') {
        requiredCapital = (buyVal * 0.4) + buyFee;
        grossPnl = netSell - (buyVal + buyFee);
    } else if (window.btType === 'short') {
        requiredCapital = (sellVal * 0.9) + sellFee + sellTax;
        let buyBackCost = buyVal + buyFee;
        let netShortSell = sellVal - sellFee - sellTax;
        grossPnl = netShortSell - buyBackCost;
    }

    let roi = (grossPnl / requiredCapital) * 100;

    container.innerHTML = `
        <div class="card" style="padding: 16px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                <span class="text-secondary">預估需要本金 (交割款/保證金)</span>
                <span style="font-weight:700; font-size:1.1rem;">\$${formatNumber(requiredCapital)}</span>
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.9rem; color:var(--text-secondary);">
                <span>買入總額 (含手續費: \$${formatNumber(buyFee)})</span>
                <span>\$${formatNumber(buyVal + buyFee)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.9rem; color:var(--text-secondary);">
                <span>賣出淨收 (扣手續費: \$${formatNumber(sellFee)}, 稅: \$${formatNumber(sellTax)})</span>
                <span>\$${formatNumber(netSell)}</span>
            </div>
            
            <div style="margin: 16px 0; border-top: 1px dashed var(--border-color);"></div>
            
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600;">預估損益 (扣除所有稅費)</span>
                <div style="text-align:right;">
                    <div class="${getColorClass(grossPnl)}" style="font-size:1.4rem; font-weight:700;">${getSign(grossPnl)}${formatNumber(grossPnl)}</div>
                    <div class="${getColorClass(roi)}" style="font-size:0.95rem; font-weight:600;">${getSign(roi)}${roi.toFixed(2)}%</div>
                </div>
            </div>
        </div>
    `;
}

function renderSubSelection(type) {
    let title = ''; let subHtml = ''; let filtered = [];
    const backBtn = `<div onclick="window.selectionSubPage=null; window.selectionSubFilter='default'; renderPage('selection')" style="color:var(--accent-blue); margin-bottom:16px; cursor:pointer;"><i class="fa-solid fa-chevron-left"></i> 返回選股首頁</div>`;

    if (!window.selectionSubFilter) window.selectionSubFilter = 'default';

    switch (type) {
        case 'ai':
            title = '智慧選股策略';
            const isInst = window.selectionSubFilter === 'inst';
            filtered = state.marketData.filter(s => !s.isIndex && (isInst ? s.instBuy : (s.price > 1000)));
            subHtml = `
                <div class="pill-group">
                    <div class="pill ${!isInst ? 'active' : ''}" onclick="setSubFilter('default')">大師選股</div>
                    <div class="pill ${isInst ? 'active' : ''}" onclick="setSubFilter('inst')">法人同步</div>
                </div>`;
            break;
        case 'indicator':
            title = '技術/財務指標選股';
            const isPe = window.selectionSubFilter === 'pe';
            filtered = state.marketData.filter(s => !s.isIndex && (isPe ? parseFloat(s.pe) < 15 : parseFloat(s.divYield) > 5));
            subHtml = `
                <div class="pill-group">
                    <div class="pill ${!isPe ? 'active' : ''}" onclick="setSubFilter('default')">高殖利率 (>5%)</div>
                    <div class="pill ${isPe ? 'active' : ''}" onclick="setSubFilter('pe')">低本益比 (<15)</div>
                </div>`;
            break;
        case 'theme':
            title = '熱門題材板塊';
            const theme = window.selectionSubFilter;
            filtered = state.marketData.filter(s => !s.isIndex && (theme === 'semi' ? s.sector === '半導體' : (theme === 'green' ? s.sector === '綠能' : s.tags?.includes('AI概念'))));
            subHtml = `
                <div class="filter-pills">
                    <div class="filter-pill ${theme === 'default' ? 'active' : ''}" onclick="setSubFilter('default')">AI伺服器</div>
                    <div class="filter-pill ${theme === 'semi' ? 'active' : ''}" onclick="setSubFilter('semi')">半導體設備</div>
                    <div class="filter-pill ${theme === 'green' ? 'active' : ''}" onclick="setSubFilter('green')">綠能環保</div>
                </div>`;
            break;
        case 'ranking':
            title = '即時排行榜';
            filtered = [...state.marketData].filter(s => !s.isIndex).sort((a, b) => (b.change / b.price) - (a.change / a.price)).slice(0, 20);
            subHtml = `<div class="pill-group"><div class="pill active">漲幅排行</div><div class="pill">成交量排行</div></div>`;
            break;
        case 'advisory':
            title = '研究員報明牌';
            filtered = state.marketData.filter(s => s.symbol === '2330' || s.symbol === '2454' || s.symbol === '2317');
            subHtml = `<div class="card" style="border-left:4px solid var(--accent-blue);"><h4>今日投顧首選</h4><p style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">半導體龍頭展望樂觀，建議分批佈局。</p></div>`;
            break;
        case 'ai-search':
            title = 'AI 幫你搜';
            return `
                <div style="padding-bottom: 100px;">
                    ${backBtn}
                    <div class="card" style="background:#1a1a1a; padding: 20px;">
                        <h2 style="margin-bottom:12px;"><i class="fa-solid fa-robot"></i> 智慧助手</h2>
                        <div style="background:var(--bg-dark); padding:12px; border-radius:8px; font-size:0.9rem; color:var(--text-secondary); margin-bottom:16px;">
                            "幫我找最近法人買超，且殖利率大於 5% 的半導體股票"
                        </div>
                        <input type="text" placeholder="輸入您的指令..." style="width:100%; padding:14px; border-radius:8px; background:var(--bg-input); border:1px solid var(--border-color); color:white; outline:none;">
                        <button class="btn btn-blue" style="margin-top:12px;" onclick="showToast('AI 正在深度解析全市場數據...')">開始分析</button>
                    </div>
                </div>`;
        case 'backtest':
            if (!window.btType) window.btType = 'cash';
            // Default params
            setTimeout(() => { if (window.calculateBacktest) window.calculateBacktest(); }, 10);
            return `
                <div style="padding-bottom: 100px;">
                    ${backBtn}
                    <div class="card" style="padding: 16px; margin-bottom: 16px;">
                        <h2 style="margin-bottom:16px;"><i class="fa-solid fa-calculator" style="color:var(--accent-blue);"></i> 假設損益試算器</h2>
                        
                        <div style="margin-bottom:12px;">
                            <label class="text-label" style="margin-bottom:4px; display:block;">交易類別</label>
                            <div class="tabs" style="border-bottom:none; margin-bottom:0; background:var(--bg-dark); padding:2px; border-radius:8px;">
                                <div class="tab ${window.btType === 'cash' ? 'active' : ''}" style="padding:8px;" onclick="window.switchBacktestType('cash')">現股買賣</div>
                                <div class="tab ${window.btType === 'margin' ? 'active' : ''}" style="padding:8px;" onclick="window.switchBacktestType('margin')">融資買進</div>
                                <div class="tab ${window.btType === 'short' ? 'active' : ''}" style="padding:8px;" onclick="window.switchBacktestType('short')">融券放空</div>
                            </div>
                        </div>

                        <div style="display:flex; gap:12px; margin-bottom:12px;">
                            <div style="flex:1;">
                                <label class="text-label" style="margin-bottom:4px; display:block;">買進價格</label>
                                <input type="number" id="bt-buy-price" class="form-input" style="width:100%; border-radius:8px; padding:12px; font-size:1.1rem;" value="100" oninput="window.calculateBacktest()">
                            </div>
                            <div style="flex:1;">
                                <label class="text-label" style="margin-bottom:4px; display:block;">賣出價格</label>
                                <input type="number" id="bt-sell-price" class="form-input" style="width:100%; border-radius:8px; padding:12px; font-size:1.1rem;" value="110" oninput="window.calculateBacktest()">
                            </div>
                        </div>
                        <div style="margin-bottom:16px;">
                            <label class="text-label" style="margin-bottom:4px; display:block;">交易股數</label>
                            <input type="number" id="bt-shares" class="form-input" style="width:100%; border-radius:8px; padding:12px; font-size:1.1rem;" value="1000" oninput="window.calculateBacktest()">
                        </div>
                    </div>
                    
                    <div id="bt-result-container">
                        <!-- Computed by JS immediately -->
                    </div>
                </div>`;
    }

    let listHtml = filtered.map(s => {
        let pct = (s.change / (s.price - s.change || 1)) * 100;
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #1a1a1a; cursor:pointer;" onclick="viewStock('${s.symbol}')">
                <div style="flex: 2;">
                    <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary);">${s.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${s.symbol} | ${s.sector}</div>
                </div>
                <div style="flex: 2; text-align: center;">
                    <div class="tabular-nums ${getColorClass(s.change)}" style="font-weight: 700;">${formatNumber(s.price)}</div>
                    <div class="tabular-nums ${getColorClass(s.change)}" style="font-size: 0.85rem;">${getSign(s.change)}${formatNumber(pct)}%</div>
                </div>
                <div style="flex: 1; text-align: right;">
                    <i class="fa-solid fa-chevron-right" style="color:var(--border-color);"></i>
                </div>
            </div>`;
    }).join('');

    return `
        <div style="padding-bottom: 100px;">
            ${backBtn}
            <h2 style="margin-bottom:12px;">${title}</h2>
            ${subHtml}
            <div style="margin-top:20px;">${listHtml}</div>
        </div>
    `;
}

function renderStockDetail() {
    const stock = state.marketData.find(s => s.symbol === state.currentStock);
    if (!stock) return '<h3>Error loading stock.</h3>';

    document.getElementById('header-title').textContent = `${stock.name} ${stock.symbol}`;
    let pctChange = (stock.change / (stock.price - stock.change || 1)) * 100;

    if (stock.isHK) {
        const upColor = 'var(--color-up)';
        const downColor = 'var(--color-down)';
        const priceColor = stock.change > 0 ? upColor : (stock.change < 0 ? downColor : '#eee');
        const changeIcon = stock.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        const changeSign = stock.change >= 0 ? '+' : '';
        const pctSign = pctChange >= 0 ? '+' : '';

        return `
            <div style="background:#121212; color:#fff; min-height:100vh; font-family: inherit; padding-bottom: 80px;">
                <div style="padding: 16px; border-bottom: 1px solid #222; background: #121212;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:1.1rem; font-weight:700;">${stock.symbol} ${stock.name}</div>
                        <div style="display:flex; gap:20px; font-size:1.2rem; color:#f0f0f0;">
                            <i class="fa-solid fa-heart" style="color:#ff5252;"></i>
                            <i class="fa-solid fa-bell"></i>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; display:flex; align-items: baseline; gap: 12px;">
                        <span style="font-size: 3.2rem; font-weight: 700; color: ${priceColor}; font-variant-numeric: tabular-nums;">${formatNumber(stock.price, 3)}</span>
                        <div style="display:flex; flex-direction:column; color: ${priceColor}; font-weight: 700; font-size: 1.1rem; line-height: 1.2;">
                            <span><i class="fa-solid ${changeIcon}"></i> ${changeSign}${formatNumber(stock.change, 3)}</span>
                            <span>${pctSign}${formatNumber(pctChange, 2)}%</span>
                        </div>
                    </div>
                    <div style="color:#888; font-size:0.85rem; margin-top:4px;">${stock.isStatic ? '靜態報價' : '即時報價'}</div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(4, 1fr); padding: 16px; gap: 16px 8px; font-size: 0.85rem; border-bottom: 1px solid #222; background: #121212;">
                    <div><span style="color:#888;">最高</span><div style="color:${upColor}; margin-top:2px;">${formatNumber(stock.high, 3)}</div></div>
                    <div><span style="color:#888;">最低</span><div style="color:${downColor}; margin-top:2px;">${formatNumber(stock.low, 3)}</div></div>
                    <div><span style="color:#888;">開市</span><div style="color:#eee; margin-top:2px;">${formatNumber(stock.open, 3)}</div></div>
                    <div><span style="color:#888;">前收</span><div style="color:#eee; margin-top:2px;">${formatNumber(stock.prevClose, 3)}</div></div>
                    
                    <div><span style="color:#888;">成交量</span><div style="color:#eee; margin-top:2px;">${stock.volumeStr || formatNumber(stock.volume, 0)}</div></div>
                    <div><span style="color:#888;">成交額</span><div style="color:#eee; margin-top:2px;">${stock.turnoverAmount || '--'}</div></div>
                    <div><span style="color:#888;">平均價</span><div style="color:#eee; margin-top:2px;">${stock.avgPriceStr || '--'}</div></div>
                    <div><span style="color:#888;">振幅</span><div style="color:#eee; margin-top:2px;">${stock.amplitudeStr || '--'}</div></div>
                    
                    <div><span style="color:#888;">市值</span><div style="color:#eee; margin-top:2px;">${stock.marketCap || '--'}</div></div>
                    <div><span style="color:#888;">總股本</span><div style="color:#eee; margin-top:2px;">${stock.totalShares || '--'}</div></div>
                    <div><span style="color:#888;">流通值</span><div style="color:#eee; margin-top:2px;">${stock.circulatingValue || '--'}</div></div>
                    <div><span style="color:#888;">流通股</span><div style="color:#eee; margin-top:2px;">${stock.circulatingShares || '--'}</div></div>
                    
                    <div><span style="color:#888;">市盈率TTM</span><div style="color:#eee; margin-top:2px;">${stock.peTTM || '--'}</div></div>
                    <div><span style="color:#888;">市盈率(靜)</span><div style="color:#eee; margin-top:2px;">${stock.peStatic || '--'}</div></div>
                    <div><span style="color:#888;">市淨率</span><div style="color:#eee; margin-top:2px;">${stock.pb || '--'}</div></div>
                    <div><span style="color:#888;">市盈率(動)</span><div style="color:#eee; margin-top:2px;">${stock.peDynamic || '--'}</div></div>
                    
                    <div><span style="color:#888;">換手率</span><div style="color:#eee; margin-top:2px;">${stock.turnoverRateStr || '--'}</div></div>
                    <div><span style="color:#888;">委比</span><div style="color:${upColor}; margin-top:2px;">${stock.bidRatio || '--'}</div></div>
                    <div><span style="color:#888;">量比</span><div style="color:#eee; margin-top:2px;">${stock.volumeRatio || '--'}</div></div>
                    <div><span style="color:#888;">股息TTM</span><div style="color:#eee; margin-top:2px;">${stock.divYieldTTM || '--'}</div></div>
                    
                    <div><span style="color:#888;">股息率TTM</span><div style="color:#eee; margin-top:2px;">${stock.divYieldRateTTM || '--'}</div></div>
                    <div><span style="color:#888;">股息LFY</span><div style="color:#eee; margin-top:2px;">${stock.divYieldLFY || '--'}</div></div>
                    <div><span style="color:#888;">股息率LFY</span><div style="color:#eee; margin-top:2px;">${stock.divYieldRateLFY || '--'}</div></div>
                    <div><span style="color:#888;">52週最高</span><div style="color:${upColor}; margin-top:2px;">${stock.high52 || '--'}</div></div>
                    
                    <div><span style="color:#888;">52週最低</span><div style="color:${downColor}; margin-top:2px;">${stock.low52 || '--'}</div></div>
                    <div><span style="color:#888;">歷史最高</span><div style="color:${upColor}; margin-top:2px;">${stock.historyHigh || '--'}</div></div>
                    <div><span style="color:#888;">歷史最低</span><div style="color:${downColor}; margin-top:2px;">${stock.historyLow || '--'}</div></div>
                    <div><span style="color:#888;">每手</span><div style="color:#eee; margin-top:2px;">${stock.lotSize || '--'}</div></div>
                    
                    <div><span style="color:#888;">Beta</span><div style="color:#eee; margin-top:2px;">${stock.beta || '--'}</div></div>
                </div>

                <div style="display:flex; border-bottom: 1px solid #222; background: #121212;">
                    <div style="padding: 12px 20px; color: ${upColor}; border-bottom: 2px solid ${upColor}; font-weight: 700; font-size: 0.95rem;">圖表走勢</div>
                    <div style="padding: 12px 20px; color: #888; font-size: 0.95rem;">基本面與新聞</div>
                </div>
                
                <div id="tv-chart" style="width: 100%; height: 260px; padding: 16px; background:#121212;"></div>
            </div>
        `;
    }

    let topHtml = `
        <div class="card" style="text-align: center; position:relative; padding-bottom:0;">
            <button class="star-btn ${state.watchlist.includes(stock.symbol) ? 'active' : ''}" style="position:absolute; top:8px; right:8px; font-size:1.5rem;" onclick="toggleWatchlist(event, '${stock.symbol}')">
                <i class="${state.watchlist.includes(stock.symbol) ? 'fa-solid' : 'fa-regular'} fa-star"></i>
            </button>
            
            <div style="display:flex; justify-content:center; gap:8px; margin-bottom:8px; height:24px;">
                ${stock.status ? `<span class="badge ${stock.status === '處置' ? 'badge-alert' : 'badge-warning'}" title="${stock.warningReason || ''}">${stock.status}${stock.dispositionLevel ? `(${stock.dispositionLevel === 1 ? '一' : '二'})` : ''}</span>` : ''}
                ${stock.isWarning ? `<span class="badge badge-warning" title="${stock.warningReason || ''}"><i class="fa-solid fa-triangle-exclamation"></i> 監視中</span>` : ''}
                ${stock.price > 1000 ? `<span class="badge badge-primary">高價股</span>` : ''}
            </div>

            <div id="detail-price-${stock.symbol}" style="font-size: 3rem; font-weight: 700; font-variant-numeric: tabular-nums;" class="${(stock.price >= stock.limitUp && !stock.isIndex) ? 'bg-limit-up' : ((stock.price <= stock.limitDown && !stock.isIndex) ? 'bg-limit-down' : getColorClass(stock.change))}">
                ${formatNumber(stock.price)} <span style="font-size: 1.2rem; vertical-align: middle; color: var(--text-primary); font-family:var(--font-mono); opacity:0.8;">(${stock.symbol})</span>
            </div>
            <div id="detail-change-${stock.symbol}" style="font-size: 1.2rem; font-weight: 600; margin-top: 4px;" class="${getColorClass(stock.change)}">
                ${getSign(stock.change)}${formatNumber(stock.change)} (${getSign(pctChange)}${formatNumber(pctChange)}%)
            </div>
            
            <div class="tabs" style="margin-top:20px; border-bottom:none; margin-bottom:0;">
                <div class="tab ${window.detailTab === 'chart' ? 'active' : ''}" onclick="window.detailTab='chart'; renderPage('stockDetail')">圖表走勢</div>
                <div class="tab ${window.detailTab === 'info' ? 'active' : ''}" onclick="window.detailTab='info'; renderPage('stockDetail')">基本面與新聞</div>
            </div>
        </div>
    `;

    if (window.detailTab === 'chart') {
        const inv = window.currentInterval;
        const getStyle = (type) => inv === type ? 'color:var(--accent-blue); border-bottom:2px solid var(--accent-blue); padding-bottom:2px;' : 'cursor:pointer;';
        return topHtml + `
            <div class="card" style="padding: 6px 8px 12px 8px; margin-bottom:12px;">
                <div style="display:flex; gap:16px; font-size:0.9rem; color:var(--text-secondary); margin-bottom:8px; padding:0 8px; font-weight:600;">
                    <span style="${getStyle('1m')}" onclick="window.currentInterval='1m'; renderPage('stockDetail')">1分</span>
                    <span style="${getStyle('5m')}" onclick="window.currentInterval='5m'; renderPage('stockDetail')">5分</span>
                    <span style="${getStyle('1d')}" onclick="window.currentInterval='1d'; renderPage('stockDetail')">日</span>
                    <span style="${getStyle('1w')}" onclick="window.currentInterval='1w'; renderPage('stockDetail')">週</span>
                    <span style="${getStyle('1M')}" onclick="window.currentInterval='1M'; renderPage('stockDetail')">月</span>
                </div>
                <div id="tv-chart" style="width: 100%; height: 260px; position: relative;"></div>
                
                <!-- Phase B: Indicator toggle pills -->
                <div style="display:flex; gap:8px; padding:8px 4px 2px; flex-wrap:wrap;">
                    ${['MA5', 'MA20', 'BOLL', 'RSI'].map(ind => {
            const active = (window.chartIndicators || []).includes(ind);
            return `<div onclick="window.chartIndicators=window.chartIndicators||[]; const i=window.chartIndicators.indexOf('${ind}'); i>-1?window.chartIndicators.splice(i,1):window.chartIndicators.push('${ind}'); renderPage('stockDetail')" 
                            style="padding:3px 10px; border-radius:20px; font-size:0.75rem; cursor:pointer; font-weight:600; 
                            background:${active ? 'var(--accent-blue)' : 'rgba(255,255,255,0.07)'}; color:${active ? 'white' : 'var(--text-secondary)'}; transition:all 0.2s;">${ind}</div>`;
        }).join('')}
                </div>
                ${(window.chartIndicators || []).includes('RSI') ? '<div id="rsi-chart" style="width:100%; height:80px; margin-top:4px; position:relative;"></div>' : ''}
            </div>
            <div class="card" style="margin-bottom: 12px; padding: 12px;">
                <h3 style="font-size: 1rem; margin-bottom: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; display:flex; justify-content:space-between; align-items:center;">
                    <span>最佳五檔 (動態容量)</span>
                    <span style="font-size:0.75rem; font-weight:normal;">模擬逐筆撮合</span>
                </h3>
                <div id="order-book" style="font-family: var(--font-mono); font-size: 1.1rem;">${generateBook(stock)}</div>
            </div>

            <div class="card" style="margin-bottom: 100px; padding: 12px;">
                <h3 style="font-size: 1rem; margin-bottom: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">分時成交明細 (Time & Sales)</h3>
                <div id="time-and-sales" style="font-family: var(--font-mono);">${renderTimeAndSales(stock)}</div>
            </div>
        `;
    } else {
        return topHtml + `
            <div class="card" style="font-size: 1rem; color: var(--text-secondary); margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <span>昨日收盤價</span> <strong style="color:var(--text-primary); font-size:1.1rem;">${formatNumber(stock.prevClose)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <span>今日最高</span> <strong id="detail-high-${stock.symbol}" style="color:var(--color-up); font-size:1.1rem;">${formatNumber(stock.high)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <span>今日最低</span> <strong id="detail-low-${stock.symbol}" style="color:var(--color-down); font-size:1.1rem;">${formatNumber(stock.low)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <span>單日成交總量</span> <strong id="detail-vol-${stock.symbol}" style="color:var(--text-primary); font-size:1.1rem;">${formatNumber(stock.volume, 0)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <span>最新振幅 (Amplitude)</span> <strong style="color:var(--text-primary); font-size:1.1rem;">${stock.amplitude?.toFixed(2) || '0.00'}%</strong>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color); cursor:help;" title="${stock.warningReason || '正常'}">
                    <span>監視狀態 (Status)</span> <strong class="${stock.isWarning ? 'text-warning' : 'text-neutral'}" style="font-size:1.1rem;">${stock.status || '普通'}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 8px 0;">
                    <span>模擬本益比 (P/E)</span> <strong style="color:var(--text-primary); font-size:1.1rem;">${stock.pe}</strong>
                </div>
            </div>
            
            <div class="card" style="margin-top:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <div class="text-label">到價警示設定</div>
                    <div style="display:flex; gap:8px;">
                        <input id="alert-price" type="number" step="0.5" value="${stock.price}" style="width:80px; background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-primary); padding:4px; border-radius:4px;">
                        <button class="btn-shortcut" onclick="setPriceAlert('${stock.symbol}', parseFloat(document.getElementById('alert-price').value), 'above')" style="width:40px;">突破</button>
                        <button class="btn-shortcut" onclick="setPriceAlert('${stock.symbol}', parseFloat(document.getElementById('alert-price').value), 'below')" style="width:40px;">跌破</button>
                    </div>
                </div>
                <div class="text-label" style="margin-bottom:8px;">近期模擬新聞</div>
                <div id="mock-news-container">${generateMockNews(stock)}</div>
            </div>
        `;
    }
}

function initStockChart(stock) {
    const container = document.getElementById('tv-chart');
    if (!container) return;

    const historyKey = `priceHistory${window.currentInterval}`;
    const history = stock[historyKey] || [];
    if (history.length < 2) return;

    const width = container.clientWidth || 300;
    const height = 260;
    const padding = { top: 20, bottom: 20, left: 0, right: 0 };

    const min = Math.min(...history) * 0.998;
    const max = Math.max(...history) * 1.002;
    const range = max - min || 1;

    const getX = (idx) => (idx / (history.length - 1)) * width;
    const getY = (price) => height - padding.bottom - ((price - min) / range) * (height - padding.top - padding.bottom);

    const pathD = `M ${getX(0)},${getY(history[0])} ` + history.slice(1).map((p, i) => `L ${getX(i + 1)},${getY(p)}`).join(' ');
    const areaD = pathD + ` L ${width},${height} L 0,${height} Z`;
    const chartColor = stock.change >= 0 ? 'var(--color-up)' : 'var(--color-down)';

    // --- Phase C: Professional Candlestick (K-Line) Logic ---
    const candleCount = Math.min(history.length, 60);
    const chunkSize = Math.max(1, Math.floor(history.length / candleCount));
    let ohlc = [];
    for (let i = 0; i < history.length; i += chunkSize) {
        let chunk = history.slice(i, i + chunkSize);
        ohlc.push({
            o: chunk[0],
            h: Math.max(...chunk),
            l: Math.min(...chunk),
            c: chunk[chunk.length - 1],
            idx: i + Math.floor(chunk.length / 2)
        });
    }

    const candleWidth = Math.max(2, (width / ohlc.length) * 0.7);
    let candlesSvg = '';
    ohlc.forEach((c) => {
        let x = getX(Math.min(c.idx, history.length - 1));
        if (ohlc.length === 1) x = width / 2;

        let isUp = c.c >= c.o;
        let cColor = isUp ? 'var(--color-up)' : 'var(--color-down)';

        let yHigh = getY(c.h);
        let yLow = getY(c.l);
        let yOpen = getY(c.o);
        let yClose = getY(c.c);

        let bodyTop = Math.min(yOpen, yClose);
        let bodyBottom = Math.max(yOpen, yClose);
        let bodyHeight = Math.max(1, bodyBottom - bodyTop);

        candlesSvg += `<line x1="${x}" y1="${yHigh}" x2="${x}" y2="${yLow}" stroke="${cColor}" stroke-width="1.2" />`;
        candlesSvg += `<rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" fill="${cColor}" rx="1" />`;
    });

    // --- Phase B: Compute indicators ---
    const indicators = window.chartIndicators || [];
    let indicatorSvg = '';

    const calcMA = (data, period) => data.map((_, i) => {
        if (i < period - 1) return null;
        const slice = data.slice(i - period + 1, i + 1);
        return slice.reduce((a, b) => a + b, 0) / period;
    });

    if (indicators.includes('MA5')) {
        const ma5 = calcMA(history, 5);
        const pts = ma5.map((v, i) => v !== null ? `${getX(i)},${getY(v)}` : null).filter(Boolean).join(' ');
        if (pts) indicatorSvg += `<polyline points="${pts}" fill="none" stroke="#ffd54f" stroke-width="1.5" stroke-linejoin="round" opacity="0.9"/>`;
    }
    if (indicators.includes('MA20')) {
        const ma20 = calcMA(history, 20);
        const pts = ma20.map((v, i) => v !== null ? `${getX(i)},${getY(v)}` : null).filter(Boolean).join(' ');
        if (pts) indicatorSvg += `<polyline points="${pts}" fill="none" stroke="#4dd0e1" stroke-width="1.5" stroke-linejoin="round" opacity="0.9"/>`;
    }
    if (indicators.includes('BOLL')) {
        const ma20 = calcMA(history, 20);
        const upper = [], lower = [];
        history.forEach((_, i) => {
            if (i < 19) { upper.push(null); lower.push(null); return; }
            const slice = history.slice(i - 19, i + 1);
            const mean = ma20[i];
            const std = Math.sqrt(slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / 20);
            upper.push(mean + 2 * std);
            lower.push(mean - 2 * std);
        });
        const upPts = upper.map((v, i) => v !== null ? `${getX(i)},${getY(v)}` : null).filter(Boolean).join(' ');
        const loPts = lower.map((v, i) => v !== null ? `${getX(i)},${getY(v)}` : null).filter(Boolean).join(' ');
        if (upPts) indicatorSvg += `<polyline points="${upPts}" fill="none" stroke="#ba68c8" stroke-width="1" stroke-dasharray="4,2" opacity="0.7"/>`;
        if (loPts) indicatorSvg += `<polyline points="${loPts}" fill="none" stroke="#ba68c8" stroke-width="1" stroke-dasharray="4,2" opacity="0.7"/>`;
    }

    container.innerHTML = `
        <svg width="${width}" height="${height}" style="background: rgba(255,255,255,0.01); overflow: visible;">
            <line x1="0" y1="${getY(history[0])}" x2="${width}" y2="${getY(history[0])}" stroke="var(--text-secondary)" stroke-dasharray="4" opacity="0.3" />
            ${candlesSvg}
            ${indicatorSvg}
            <circle cx="${getX(history.length - 1)}" cy="${getY(history[history.length - 1])}" r="3" fill="${chartColor}" />
        </svg>
    `;

    // --- Phase B: RSI sub-chart ---
    if (indicators.includes('RSI')) {
        const rsiEl = document.getElementById('rsi-chart');
        if (rsiEl && history.length >= 14) {
            const rsiW = rsiEl.clientWidth || width;
            const rsiH = 80;
            const gains = [], losses = [];
            for (let i = 1; i < history.length; i++) {
                const diff = history[i] - history[i - 1];
                gains.push(diff > 0 ? diff : 0);
                losses.push(diff < 0 ? -diff : 0);
            }
            const avgGain = (arr, i, p) => arr.slice(Math.max(0, i - p + 1), i + 1).reduce((a, b) => a + b, 0) / p;
            const avgLoss = (arr, i, p) => arr.slice(Math.max(0, i - p + 1), i + 1).reduce((a, b) => a + b, 0) / p;
            const rsiData = gains.map((_, i) => {
                if (i < 13) return null;
                const rs = avgLoss(losses, i, 14) === 0 ? 100 : avgGain(gains, i, 14) / avgLoss(losses, i, 14);
                return 100 - (100 / (1 + rs));
            }).filter(Boolean);

            const rsiGetX = (i) => (i / (rsiData.length - 1)) * rsiW;
            const rsiGetY = (v) => rsiH - ((v / 100) * rsiH * 0.8) - rsiH * 0.1;
            const rsiPts = rsiData.map((v, i) => `${rsiGetX(i)},${rsiGetY(v)}`).join(' ');
            const lastRsi = rsiData[rsiData.length - 1]?.toFixed(1) || '—';
            const rsiColor = rsiData[rsiData.length - 1] > 70 ? '#f63e3e' : (rsiData[rsiData.length - 1] < 30 ? '#1eb274' : '#64b5f6');

            rsiEl.innerHTML = `
                <div style="font-size:0.7rem; color:var(--text-secondary); padding:0 4px; margin-bottom:2px;">RSI(14): <strong style="color:${rsiColor}">${lastRsi}</strong></div>
                <svg width="${rsiW}" height="${rsiH - 16}" style="overflow:visible;">
                    <line x1="0" y1="${rsiGetY(70) - 16}" x2="${rsiW}" y2="${rsiGetY(70) - 16}" stroke="#f63e3e" stroke-width="0.8" stroke-dasharray="3,2" opacity="0.5"/>
                    <line x1="0" y1="${rsiGetY(30) - 16}" x2="${rsiW}" y2="${rsiGetY(30) - 16}" stroke="#1eb274" stroke-width="0.8" stroke-dasharray="3,2" opacity="0.5"/>
                    <polyline points="${rsiPts}" fill="none" stroke="#64b5f6" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>`;
        }
    }
}

// --- Portfolio View Override (Adding Smart Triggers) ---
function exportHistoryCSV() {
    if (state.history.length === 0) { showToast('尚無對帳紀錄可匯出', 'error'); return; }
    const headers = ['成交時間', '股票', '代號', '買賣', '成交價', '股數', '手續費', '證交稅', '已實現損益'];
    const rows = state.history.map(h => [
        `="${h.time}"`,
        h.name, h.symbol, h.type === 'buy' ? '買入' : '賣出',
        h.price?.toFixed(2) || (h.type === 'sell' ? h.sellPrice : h.buyAvgPrice)?.toFixed(2) || '',
        h.shares, h.fee, h.tax, h.profit ? h.profit.toFixed(0) : ''
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `對於帳單_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('對帳單已匯出為 CSV 檔案');
}
window.exportHistoryCSV = exportHistoryCSV;

function renderPortfolioPage() {
    let topHtml = `
            <div style="background-color: #2b2a2f; color: white; margin: 0; padding: 0 4px;">
          <!-- First row: Header substitute -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 14px;">
            <div style="font-size:1.15rem; font-weight:600; display:flex; align-items:center; gap:8px; cursor:pointer;" onclick="renderPage('home')"><i class="fa-solid fa-chevron-left" style="font-size:1.4rem;"></i> 帳務</div>
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="background:#1a1a1a; padding:10px 14px; border-radius:6px; font-size:1.1rem; border:1px solid #333; display:flex; align-items:center; justify-content: space-between; gap:10px; cursor:pointer; color:#ffffff; min-width: 260px;" onclick="window.renderAccountSelectionOverlay()">
                <span style="letter-spacing: 0.5px; flex: 1;">${state.currentBranch}</span>
                <span style="color:#444; font-weight:300; margin: 0 2px;">|</span>
                <i class="fa-solid fa-chevron-down" style="font-size:0.9rem; color:#ffffff;"></i>
              </div>
              <i class="fa-solid fa-rotate" style="font-size:1.4rem; color:var(--text-secondary); cursor:pointer;" onclick="renderPage('portfolio', {keepScroll:true})" title="重置帳務顯示"></i>
            </div>
          </div>
          <!-- Second row: Account Type Tabs -->
          <div class="sub-tab-group">
            <div class="sub-tab-item">證券</div>
            <div class="sub-tab-item">期權</div>
            <div class="sub-tab-item active">複委託</div>
          </div>
          <!-- Third row: Function Tabs -->
          <div style="display:flex; overflow-x:auto; background:#222126; justify-content:space-around; font-size:1.1rem; padding: 0 4px; border-bottom: 2px solid #555;">
             ${['orders', 'trades', 'inventory', 'history', 'buying-power', 'long-term'].map(tab => {
        const labels = { orders: '委託', trades: '成交', inventory: '庫存', history: '已實現', 'buying-power': '購買力', 'long-term': '長...' };
        const isActive = window.portfolioTab === tab;
        return `
                    <div style="flex:1; display:flex; justify-content:center; white-space:nowrap;" onclick="window.portfolioTab='${tab}'; renderPage('portfolio')">
                        <div class="portfolio-tab ${isActive ? 'active' : ''}">${labels[tab]}</div>
                    </div>`;
    }).join('')}
          </div>
        </div>
        <!-- Below the tabs: filtering options bar -->
        <div style="display:flex; justify-content:space-between; padding: 10px 16px; background:#141310; align-items:center; margin: 0;">
            <div style="display:flex; gap:12px; color:white; font-size:1.1rem; font-weight:600; align-items:center;">
                <div style="cursor:pointer; display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-magnifying-glass" style="font-size:0.9rem;"></i> 篩選</div>
                <div style="cursor:pointer; display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-info-circle" style="font-size:0.9rem; color:#aaa;"></i> 說明</div>
                ${window.portfolioTab === 'inventory' ? '<span class="tabular-nums" style="border:1px solid #e65100; color:#e65100; font-size:0.75rem; padding: 1px 5px; border-radius:4px; font-weight:700; cursor:pointer;">匯出</span>' : ''}
            </div>
            ${window.portfolioTab === 'orders' ? '<div style="background:#555; color:white; padding:8px 16px; font-size:1rem; font-weight:bold; cursor:pointer;" onclick="state.triggers=[];state.orders=[];renderPage(\'portfolio\');showToast(\'已全刪未成交委託\');">全刪</div>' : ''}
        </div>
    `;

    if (window.portfolioTab === 'inventory') {
        let totalStockValue = 0; let totalUnrealized = 0; let holdingsHtml = '';
        let totalCostVal = 0; let totalUnrealizedPct = 0;

        // ---- Shared header HTML ----
        const invHeader = `
            <div style="display:flex; align-items:center; background:#1a3347; padding: 16px 12px; border-bottom: 1px solid #122436;">
                <div style="flex:1.4; font-size:1.1rem; color:#ffffff; font-weight:700; letter-spacing:0.5px; text-align:center;">代號</div>
                <div style="color:#3a5a72; padding:0 6px; font-size:1.1rem; font-weight:300; line-height:1;">|</div>
                <div style="flex:1.1; font-size:1.1rem; color:#ffffff; font-weight:700; text-align:center;">最新價</div>
                <div style="color:#3a5a72; padding:0 6px; font-size:1.1rem; font-weight:300; line-height:1;">|</div>
                <div style="flex:1.2; font-size:1.1rem; color:#ffffff; font-weight:700; text-align:center;">目前庫存</div>
                <div style="color:#3a5a72; padding:0 6px; font-size:1.1rem; font-weight:300; line-height:1;">|</div>
                <div style="flex:1; font-size:1.1rem; color:#ffffff; font-weight:700; text-align:right;">報酬率</div>
            </div>`;

        if (state.portfolio.length === 0) {
            holdingsHtml = invHeader + `
                <div style="text-align:center; padding: 3rem 1rem; color:#555; font-size:0.95rem;">目前無「複委託」庫存部位</div>
            `;
        } else {
            holdingsHtml += invHeader;

            state.portfolio.forEach(pos => {
                const stock = state.marketData.find(s => s.symbol === pos.symbol);
                let currentPrice = stock ? stock.price : pos.avgPrice;
                let isHKPos = stock && stock.isHK;
                let marketName = isHKPos ? '香港' : '台灣';
                let currencyName = isHKPos ? '港幣' : '台幣';
                let rate = isHKPos ? CONFIG.HKD_RATE : 1;

                let costTwd = pos.avgPrice * pos.shares;
                let currentValTwd = currentPrice * pos.shares * rate;
                const { fee: simFee, tax: simTax } = calculateFees(currentValTwd, 'sell', pos.symbol, pos.shares);
                let netValTwd = currentValTwd - simFee - simTax;

                let actualCostTwd = costTwd;
                let finalPnlTwd = netValTwd - costTwd;
                if (pos.marginType === 'margin') actualCostTwd = costTwd * 0.4;
                else if (pos.marginType === 'short') {
                    actualCostTwd = costTwd * 0.9;
                    finalPnlTwd = costTwd - netValTwd;
                }

                // Local currency display
                let localAvgPrice = pos.avgPrice / rate;
                let localCost = localAvgPrice * pos.shares;
                let localCurrentVal = currentPrice * pos.shares;
                let localGrossPnl = localCurrentVal - localCost;
                if (pos.marginType === 'short') localGrossPnl = localCost - localCurrentVal;
                let localPnlPct = localCost > 0 ? (localGrossPnl / localCost) * 100 : 0;

                totalCostVal += actualCostTwd;
                totalStockValue += (actualCostTwd + finalPnlTwd);
                totalUnrealized += finalPnlTwd;

                const pnlColor = getColorClass(localGrossPnl);
                const pnlPctColor = getColorClass(localPnlPct);
                const isExpanded = window.expandedStocks.has(pos.symbol);

                holdingsHtml += `
                    <div id="inv-row-${pos.symbol}" style="background:#111; border-bottom: 1px solid #1d1d1d;">
                        <div style="display:flex; align-items:center; padding: 18px 16px 16px; cursor:pointer;" onclick="window.togglePortfolioRow('${pos.symbol}')">
                            <div style="flex:1.4; font-family:var(--font-mono); color:#E1E1DA; font-size:1.25rem; text-decoration:underline; font-weight:600; letter-spacing:0.5px; text-align:left;">${pos.symbol}</div>
                            <div id="inv-price-${pos.symbol}" style="flex:1; font-family:var(--font-mono); font-size:1.3rem; font-weight:500; color:#ffffff; text-align:center;">${formatNumber(currentPrice, 3)}</div>
                            <div style="flex:1.2; font-family:var(--font-mono); color:#E1E1DA; font-size:1.1rem; text-decoration:underline; font-weight:500; text-align:center;">${formatNumber(pos.shares, 0)}</div>
                            <div id="inv-pnlpct-${pos.symbol}" style="flex:1; font-family:var(--font-mono); font-weight:700; font-size:1.2rem; text-align:right; font-variant-numeric: tabular-nums;" class="${pnlPctColor}">${getSign(localPnlPct)}${formatNumber(localPnlPct, 2)}%</div>
                        </div>

                        <div id="inv-detail-${pos.symbol}" class="portfolio-expanded-section" style="display: ${isExpanded ? 'block' : 'none'};">
                            <div class="inventory-detail-header">
                                <div class="yellow-bar"></div>
                                <span>整股/定期定額庫存</span>
                            </div>
                            <div class="inventory-detail-grid">
                                <span class="detail-label">市場</span>
                                <span class="detail-value" style="text-align:right;">${marketName}</span>
                                <span class="detail-label">均價</span>
                                <span class="detail-value">${formatNumber(localAvgPrice, 3)}</span>

                                <span class="detail-label">目前庫存</span>
                                <span class="detail-value">${formatNumber(pos.shares, 0)}</span>
                                <span class="detail-label">可用庫存</span>
                                <span class="detail-value">${formatNumber(pos.shares, 0)}</span>

                                <span class="detail-label">庫存成本</span>
                                <span class="detail-value" id="inv-cost-${pos.symbol}">${formatNumber(Math.round(localCost), 0)}</span>
                                <span class="detail-label">現值*</span>
                                <span class="detail-value" id="inv-val-${pos.symbol}">${formatNumber(Math.round(localCurrentVal), 0)}</span>

                                <span class="detail-label">投資損益*</span>
                                <span class="detail-value ${pnlColor}" id="inv-pnl-${pos.symbol}">${getSign(localGrossPnl)}${formatNumber(Math.round(localGrossPnl), 0)}</span>
                                <span class="detail-label">含息報酬率 <i class="fa-solid fa-circle-info" style="font-size:0.8rem; opacity:0.6;"></i></span>
                                <span class="detail-value text-up" id="inv-yield-${pos.symbol}">${pos.symbol === '02940' ? '3.59%' : formatNumber(localPnlPct, 2) + '%'}</span>
                            </div>
                        </div>

                        <div style="background:#161616; padding: 0 16px 18px;">
                            <div style="padding: 10px 0 14px; border-bottom: 1px solid #222; margin-bottom: 14px;">
                                <span style="color:#ffffff; font-size:1.2rem;">幣別</span>
                                <span style="color:#ffffff; font-size:1.2rem; font-weight:700; margin-left:20px;">${currencyName}</span>
                            </div>
                            <!-- Improved Summary Grid: 2 columns to prevent overlap -->
                            <div style="display:grid; grid-template-columns: 1.1fr 0.9fr; row-gap:14px; column-gap:16px; margin-bottom:14px;">
                                <div style="display:flex; justify-content:space-between; align-items:baseline; gap:4px;">
                                    <span style="color:#ffffff; font-size:1.05rem; font-weight:700; white-space:nowrap;">總投資損益*</span>
                                    <span id="summary-pnl-${pos.symbol}" class="${pnlColor}" style="font-size:1.05rem; font-weight:700; font-family:var(--font-mono); text-align:right;">${getSign(localGrossPnl)}${formatNumber(Math.round(localGrossPnl), 0)}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:baseline; gap:4px;">
                                    <span style="color:#ffffff; font-size:1.05rem; font-weight:700; white-space:nowrap;">總報酬率*</span>
                                    <span id="summary-pct-${pos.symbol}" class="${pnlPctColor}" style="font-size:1.05rem; font-weight:700; font-family:var(--font-mono); text-align:right; font-variant-numeric: tabular-nums;">${getSign(localPnlPct)}${formatNumber(localPnlPct, 2)}%</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:baseline; gap:4px;">
                                    <span style="color:#ffffff; font-size:1.05rem; font-weight:700; white-space:nowrap;">總成本</span>
                                    <span id="summary-cost-${pos.symbol}" style="color:#ffffff; font-size:1.05rem; font-weight:700; font-family:var(--font-mono); text-align:right;">${formatNumber(Math.round(localCost), 0)}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:baseline; gap:4px;">
                                    <span style="color:#ffffff; font-size:1.05rem; font-weight:700; white-space:nowrap;">庫存現值*</span>
                                    <span id="summary-val-${pos.symbol}" style="color:#ffffff; font-size:1.05rem; font-weight:700; font-family:var(--font-mono); text-align:right;">${formatNumber(Math.round(localCurrentVal), 0)}</span>
                                </div>
                            </div>
                            <div style="color:#ffffff; font-size:1rem; font-weight:700; line-height:1.6; padding-top:12px; border-top:1px solid #222;">標註*欄位為延遲報價計算，日/深/滬為昨收價計算</div>
                        </div>
                    </div>
                `;
            });

        }

        totalUnrealizedPct = totalCostVal > 0 ? (totalUnrealized / totalCostVal) * 100 : 0;
        const totalEquity = state.balance + totalStockValue;



        let userPts = ''; let indexPts = '';
        if (state.assetHistory && state.assetHistory.length > 1) {
            const first = state.assetHistory[0];
            const history = state.assetHistory;

            // Normalize all points to 100 based on the first record
            let normalizedHistory = history.map(h => ({
                user: (h.equity / first.equity) * 100,
                market: (h.index / first.index) * 100
            }));

            let allVals = normalizedHistory.flatMap(h => [h.user, h.market]);
            let maxV = Math.max(...allVals);
            let minV = Math.min(...allVals);
            let range = (maxV - minV) || 1;

            userPts = normalizedHistory.map((h, i) => {
                let x = (i / (Math.max(normalizedHistory.length - 1, 1))) * 100;
                let y = 100 - (((h.user - minV) / range) * 80 + 10); // 10% padding
                return `${x},${y}`;
            }).join(' ');

            indexPts = normalizedHistory.map((h, i) => {
                let x = (i / (Math.max(normalizedHistory.length - 1, 1))) * 100;
                let y = 100 - (((h.market - minV) / range) * 80 + 10);
                return `${x},${y}`;
            }).join(' ');
        } else {
            userPts = '0,50 100,50'; indexPts = '0,50 100,50';
        }

        // totalCostVal and totalUnrealizedPct calculations were moved up to correctly account for margin metrics natively inside the loop

        let pieHtml = '';
        if (state.portfolio.length > 0) {
            let cashPct = (state.balance / totalEquity) * 100;
            let currentAngle = 0;
            const colors = ['#64b5f6', '#81c784', '#ffb74d', '#ba68c8', '#4db6ac', '#f06292', '#aed581', '#ffd54f'];
            let piePaths = ''; let legends = '';

            piePaths += `<circle r="15.91549431" cx="21" cy="21" fill="transparent" stroke="#ffca28" stroke-width="6" stroke-dasharray="${cashPct} ${100 - cashPct}" stroke-dashoffset="${25 - currentAngle}"></circle>`;
            legends += `<div style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:var(--text-secondary); margin-top:4px;"><div style="width:10px; height:10px; border-radius:50%; background:#ffca28;"></div>帳戶剩餘額度 (${cashPct.toFixed(1)}%)</div>`;
            currentAngle += cashPct;

            state.portfolio.forEach((p, idx) => {
                let stock = state.marketData.find(x => x.symbol === p.symbol);
                let price = stock ? stock.price : p.avgPrice;
                let rate = (stock && stock.isHK) ? CONFIG.HKD_RATE : 1;

                let currentVal = price * rate * p.shares;
                let { fee: simFee, tax: simTax } = calculateFees(currentVal, 'sell');
                let netVal = currentVal - simFee - simTax;

                let pct = (netVal / totalEquity) * 100;
                let col = colors[idx % colors.length];
                piePaths += `<circle r="15.91549431" cx="21" cy="21" fill="transparent" stroke="${col}" stroke-width="6" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${25 - currentAngle}"></circle>`;
                legends += `<div style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:var(--text-secondary); margin-top:4px;"><div style="width:10px; height:10px; border-radius:50%; background:${col};"></div>${p.name} (${pct.toFixed(1)}%)</div>`;
                currentAngle += pct;
            });

            pieHtml = `
            <div class="card" style="margin-bottom: 12px; padding: 16px; display:flex; align-items:center; justify-content: space-around;">
                <div style="flex:1;">
                    <div style="color:var(--text-secondary); font-size:0.95rem; margin-bottom:8px; font-weight:600;"><i class="fa-solid fa-chart-pie"></i> 資產配置圓餅圖</div>
                    ${legends}
                </div>
                <div style="width: 100px; height: 100px; border-radius: 50%;">
                    <svg width="100%" height="100%" viewBox="0 0 42 42" style="border-radius: 50%;">
                      <circle r="15.91549431" cx="21" cy="21" fill="var(--bg-card)" stroke="var(--border-color)" stroke-width="6"></circle>
                      ${piePaths}
                    </svg>
                </div>
            </div>`;
        }

        let heatmapHtml = '';

        return topHtml + `<div id="portfolio-list">${holdingsHtml}</div>`;
    } else if (window.portfolioTab === 'long-term') {
        let stocks = state.marketData.filter(s => !s.isIndex);

        let currentSelectedStock = null;
        if (window.priceMgrSelectedSymbol) {
            currentSelectedStock = state.marketData.find(s => s.symbol === window.priceMgrSelectedSymbol);
        }

        let searchVal = currentSelectedStock ? `${currentSelectedStock.name} (${currentSelectedStock.symbol})` : '';
        let cardContent = currentSelectedStock
            ? window.renderSelectedStockCardContent(currentSelectedStock)
            : `<div style="text-align:center; color:var(--text-secondary); padding:24px 10px; font-size:0.95rem;">🔍 請搜尋並點選下方清單選擇股票</div>`;

        let managerHtml = `
            <div style="padding: 16px;">
                <h3 style="color:var(--text-primary); margin-bottom:12px; font-size:1.1rem; display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-screwdriver-wrench" style="color:var(--accent-blue);"></i> 個股價位管理後台
                </h3>
                <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:20px; line-height:1.4;">
                    請在下方搜尋框輸入代號或名稱，選取股票後即可快速修改其最新報價。此變更僅限當次工作階段。
                </p>
                
                <div style="position: relative; margin-bottom: 16px;">
                    <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
                    <input type="text" id="stock-search-input" placeholder="搜尋股號或名稱..." 
                        style="width: 100%; border: 1px solid var(--border-color); background: var(--bg-card); padding: 12px 12px 12px 42px; border-radius: 12px; color: var(--text-primary); font-size: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); outline: none;" 
                        value="${searchVal}"
                        onfocus="window.showPriceMgrDropdown()" 
                        oninput="window.filterPriceMgrDropdown(this.value)">
                    <div id="price-mgr-dropdown-list" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:250px; overflow-y:auto; background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; z-index:1000; margin-top:4px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                        <!-- Dynamic options loaded via JS -->
                    </div>
                </div>

                <div id="selected-stock-card" style="background:#1a191d; border:1px solid #333; border-radius:8px; padding:16px; margin-bottom:24px;">
                    ${cardContent}
                </div>
                
                <div style="margin-top:24px; padding:12px; background:rgba(255,179,0,0.1); border:1px dashed rgba(255,179,0,0.3); border-radius:8px; color:rgba(255,179,0,0.8); font-size:0.8rem; margin-bottom: 24px;">
                    提示：如果是「今海醫療科技」等靜態股票，系統會自動將前收價同步為新價位，以維持價格穩定。
                </div>

                <div style="background:#1a191d; border:1px solid #333; border-radius:8px; padding:16px;">
                    <h4 style="color:white; margin:0 0 10px 0; font-size:1.05rem; display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-circle-check" style="color:#4db6ac;"></i> 模擬交易成交設定
                    </h4>
                    <p style="color:var(--text-secondary); font-size:0.88rem; margin-bottom:16px; line-height:1.45;">
                        開啟後委託將正常撮合成交；關閉後委託將保持「委託傳送中」狀態，便於擷取委託成功的畫面。
                    </p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:white; font-size:0.95rem; font-weight:600;">下單後要不要成交</span>
                        <div style="display:flex; gap:8px;">
                            <button id="toggle-match-yes" style="background: ${state.shouldMatchOrders === true || state.shouldMatchOrders === undefined ? '#4db6ac' : '#333'}; color: ${state.shouldMatchOrders === true || state.shouldMatchOrders === undefined ? 'white' : '#888'}; border:none; padding:8px 18px; border-radius:6px; font-size:0.95rem; font-weight:700; cursor:pointer;" onclick="window.setOrderMatching(true)">要成交</button>
                            <button id="toggle-match-no" style="background: ${state.shouldMatchOrders === false ? '#4db6ac' : '#333'}; color: ${state.shouldMatchOrders === false ? 'white' : '#888'}; border:none; padding:8px 18px; border-radius:6px; font-size:0.95rem; font-weight:700; cursor:pointer;" onclick="window.setOrderMatching(false)">不成交 (委託中)</button>
                            <button id="toggle-match-failed" style="background: ${state.shouldMatchOrders === 'failed' ? '#4db6ac' : '#333'}; color: ${state.shouldMatchOrders === 'failed' ? 'white' : '#888'}; border:none; padding:8px 18px; border-radius:6px; font-size:0.95rem; font-weight:700; cursor:pointer;" onclick="window.setOrderMatching('failed')">委託失敗</button>
                        </div>
                    </div>
                </div>

                <div style="background:#1a191d; border:1px solid #333; border-radius:8px; padding:16px; margin-top:16px;">
                    <h4 style="color:white; margin:0 0 10px 0; font-size:1.05rem; display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-chart-line" style="color:var(--accent-blue);"></i> 股票價格變動設定
                    </h4>
                    <p style="color:var(--text-secondary); font-size:0.88rem; margin-bottom:16px; line-height:1.45;">
                        開啟後系統會模擬即時市場價格波動；關閉後價格將完全靜止，便於手動指定報價以進行截圖或演示。
                    </p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:white; font-size:0.95rem; font-weight:600;">股票價格變動</span>
                        <div style="display:flex; gap:8px;">
                            <button id="toggle-price-fluct-yes" style="background: ${state.enablePriceFluctuations === true || state.enablePriceFluctuations === undefined ? 'var(--accent-blue)' : '#333'}; color: ${state.enablePriceFluctuations === true || state.enablePriceFluctuations === undefined ? 'white' : '#888'}; border:none; padding:8px 18px; border-radius:6px; font-size:0.95rem; font-weight:700; cursor:pointer;" onclick="window.setPriceFluctuations(true)">開啟</button>
                            <button id="toggle-price-fluct-no" style="background: ${state.enablePriceFluctuations === false ? 'var(--accent-blue)' : '#333'}; color: ${state.enablePriceFluctuations === false ? 'white' : '#888'}; border:none; padding:8px 18px; border-radius:6px; font-size:0.95rem; font-weight:700; cursor:pointer;" onclick="window.setPriceFluctuations(false)">關閉</button>
                        </div>
                    </div>
                </div>

                <div style="background:#1a191d; border:1px solid #333; border-radius:8px; padding:16px; margin-top:16px;">
                    <h4 style="color:#ff5252; margin:0 0 10px 0; font-size:1.05rem; display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-trash-can" style="color:#ff5252;"></i> 還原此帳號
                    </h4>
                    <p style="color:var(--text-secondary); font-size:0.88rem; margin-bottom:16px; line-height:1.45;">
                        此操作將會刪除目前帳號內的所有交易紀錄、委託單、損益以及重設可用餘額為一千萬元。
                    </p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:#ff5252; font-size:0.95rem; font-weight:600;">清除所有資料</span>
                        <button style="background: #ff5252; color: white; border:none; padding:8px 18px; border-radius:6px; font-size:0.95rem; font-weight:700; cursor:pointer;" onclick="window.resetCurrentAccountTrades()">還原帳號</button>
                    </div>
                </div>
            </div>
        `;
        return topHtml + managerHtml;
    } else if (window.portfolioTab === 'orders') {
        let ordersHtml = '';

        // Smart Triggers Rendering
        if (state.triggers.length > 0) {
            ordersHtml += '<h4 style="color:var(--text-secondary); margin: 6px 0 12px; font-size:1rem;">⚡ 智慧條件單 (觸價單)</h4>';
            state.triggers.forEach(t => {
                let statusColor = t.status === 'active' ? '#ff9800' : (t.status === 'triggered' ? 'var(--color-up)' : 'var(--text-secondary)');
                let actionBtn = t.status === 'active' ? `<button class="btn btn-outline" style="padding:4px 12px; font-size:0.85rem; color:var(--color-down); border-color:var(--color-down);" onclick="cancelTrigger(${t.id})">中止監控</button>` : '';
                let conditionText = '';
                if (t.type === 'oco') {
                    conditionText = `停利: >= <strong>${formatNumber(t.tpPrice)}</strong> | 停損: <= <strong>${formatNumber(t.slPrice)}</strong>`;
                } else {
                    conditionText = `市價 <strong>${t.condition} ${formatNumber(t.triggerPrice)}</strong>`;
                }

                ordersHtml += `
                    <div class="card" style="margin-bottom: 12px; padding: 16px; border-left: 3px solid ${statusColor};">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px; align-items:center;">
                            <div style="font-weight:bold; font-size:1.1rem;"><span class="${t.side === 'buy' ? 'text-up' : 'text-down'}">${t.side === 'buy' ? '買' : '賣'}</span> ${t.name} ${t.type === 'oco' ? '<span class="badge" style="background:#4db6ac; color:white; font-size:0.75rem; margin-left:6px;">OCO</span>' : ''}</div>
                            <div style="color:${statusColor}; font-weight:600; font-size:0.95rem;">${t.status === 'active' ? '監控中' : (t.status === 'triggered' ? '已觸發' : '已撤銷')}</div>
                        </div>
                        <div style="display:flex; justify-content:space-between; color:var(--text-secondary); font-size:0.9rem; margin-bottom:4px;">
                            <span>觸發: ${conditionText}</span>
                            <span>委託數量: <strong style="color:var(--text-primary)">${t.shares}</strong> 股</span>
                        </div>
                        <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px;">
                            觸發動作: ${t.executeType === 'market' ? '市價' : `限價 ${formatNumber(t.orderPrice)}`} | 條件: ${t.tif}
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                            <span style="font-size:0.8rem; color:var(--text-secondary);">${t.time}</span>
                            ${actionBtn}
                        </div>
                    </div>
                `;
            });
        }

        // Normal Orders Rendering (Real App Style)
        ordersHtml += `
            <div style="display:flex; align-items:center; background:#0d4e6b; color:white; padding:12px 16px; font-size:1.15rem; margin: 0 -16px; font-weight:bold;">
                <div style="flex:0.8; text-align:center;">刪單</div>
                <div style="color:rgba(255,255,255,0.3); font-size:1rem; margin:0 8px;">|</div>
                <div style="flex:1.2; text-align:center;">代號</div>
                <div style="color:rgba(255,255,255,0.3); font-size:1rem; margin:0 8px;">|</div>
                <div style="flex:1; text-align:center;">價格</div>
                <div style="color:rgba(255,255,255,0.3); font-size:1rem; margin:0 8px;">|</div>
                <div style="flex:1.5; text-align:center;">委託狀態</div>
            </div>
        `;

        if (state.orders.length === 0) {
            ordersHtml += '<div style="text-align:center; padding: 2.5rem; color: var(--text-secondary); background:#161511; margin: 0 -16px; font-weight:bold;">無委託紀錄</div>';
        }
        else {
            let orderHtmlContent = '';
            state.orders.forEach(o => {
                let statusLabel = '';
                if (o.status === 'pending') statusLabel = '委託傳送中';
                else if (o.status === 'pending-disposition') statusLabel = '分盤中';
                else if (o.status === 'executed') statusLabel = '全部成交';
                else if (o.status === 'failed') statusLabel = '委託失敗';
                else statusLabel = '已撤銷';

                let isCancellable = (o.status === 'pending' || o.status === 'pending-disposition');
                let actionBtnHtml = isCancellable
                    ? `<button onclick="cancelOrder(${o.id})" style="background:#444; color:white; border:none; padding:6px 14px; font-size:1rem; font-weight:bold; border-radius:4px; cursor:pointer;">刪</button>`
                    : `<button disabled style="background:#2a2a2a; color:#555; border:none; padding:6px 14px; font-size:1rem; font-weight:bold; border-radius:4px;">刪</button>`;

                let sideColor = o.side === 'buy' ? 'var(--color-up)' : 'var(--color-down)';
                let execShares = o.status === 'executed' ? o.shares : 0;
                let cancelShares = o.status === 'canceled' ? o.shares : 0;
                let execAvgPrice = o.execPrice ? o.execPrice : 0;

                const stockO = state.marketData.find(s => s.symbol === o.symbol);
                let isHKLine = stockO && stockO.isHK;
                let marketName = isHKLine ? '香港' : '台灣';
                let currencyName = isHKLine ? '港幣' : '台幣';

                let orderDate = o.time && o.time.includes('/') ? o.time.split(' ')[0] : new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
                const _now = new Date();
                const _h = String(_now.getHours()).padStart(2, '0');
                const _m = String(_now.getMinutes()).padStart(2, '0');
                const _s = String(Math.floor(Math.random() * 60)).padStart(2, '0');
                let orderTimeOnly = o.time && o.time.includes('/') ? o.time.split(' ')[1] : (o.time || `${_h}:${_m}:${_s}`);

                orderHtmlContent += `
                    <div style="background:#161511; border-bottom:1px solid #1a1a1a;">
                        <!-- Top Row -->
                        <div style="display:flex; align-items:center; padding: 14px 16px; border-bottom:1px solid #222; font-weight:bold;">
                            <div style="flex:0.8; text-align:center;">
                                ${actionBtnHtml}
                            </div>
                            <div style="width: 20px;"></div>
                            <div style="flex:1.2; text-align:left; cursor:pointer;" onclick="viewStock('${o.symbol}')">
                                <div style="font-size:1.15rem; color:white; text-decoration:underline;">${o.symbol}</div>
                                <div style="font-size:0.95rem; color:${sideColor}; margin-top:6px;">${o.side === 'buy' ? '買進' : '賣出'}</div>
                            </div>
                            <div style="width: 20px;"></div>
                            <div style="flex:1; text-align:right; font-size:1.15rem; color:white; font-family:var(--font-mono);">
                                ${formatNumber(o.price)}
                            </div>
                            <div style="width: 20px;"></div>
                            <div style="flex:1.5; text-align:right; font-size:1.1rem; color:white;">
                                ${statusLabel}
                            </div>
                        </div>

                        <!-- Details Row -->
                        <div style="padding: 16px; font-size:1.05rem; color:#fff; line-height:1.8; font-weight:bold;">
                            <!-- Detail Grid Layout -->
                            <div style="display:grid; grid-template-columns: 75px 1fr; row-gap: 12px; align-items: center;">
                                <div>股票名稱</div>
                                <div>${o.name}</div>
                            </div>

                            <div style="display:grid; grid-template-columns: 1fr 1fr; margin-top:12px; margin-bottom:12px;">
                                <div style="display:grid; grid-template-columns: 75px 1fr; align-items: center;">
                                    <div>市場</div>
                                    <div>${marketName}</div>
                                </div>
                                <div style="display:flex; gap:16px;">
                                    <div>幣別</div>
                                    <div>${currencyName}</div>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns: 1fr 1fr; margin-bottom:12px;">
                                <div style="display:flex; justify-content:space-between; padding-right:24px;">
                                    <div>委託股數</div>
                                    <div style="font-family:var(--font-mono);">${formatNumber(o.shares, 0)}</div>
                                </div>
                                <div style="display:flex; justify-content:space-between;">
                                    <div>成交股數</div>
                                    <div style="font-family:var(--font-mono);">${formatNumber(execShares, 0)}</div>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns: 1fr 1fr; margin-bottom:12px;">
                                <div style="display:flex; justify-content:space-between; padding-right:24px;">
                                    <div>取消股數</div>
                                    <div style="font-family:var(--font-mono);">${formatNumber(cancelShares, 0)}</div>
                                </div>
                                <div style="display:flex; justify-content:space-between;">
                                    <div>成交均價</div>
                                    <div style="font-family:var(--font-mono);">${formatNumber(execAvgPrice)}</div>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns: 75px 1fr; row-gap: 12px; margin-bottom:12px; align-items: center;">
                                <div>委託時間</div>
                                <div style="font-family:var(--font-mono);">${orderDate} ${orderTimeOnly}</div>
                            </div>

                            <div style="display:grid; grid-template-columns: 1fr 1fr; margin-bottom:12px;">
                                <div style="display:grid; grid-template-columns: 75px 1fr; align-items: center;">
                                    <div>委託書號</div>
                                    <div style="font-family:var(--font-mono);">${o.docNo || ''}</div>
                                </div>
                                <div style="display:flex; gap:16px;">
                                    <div>來源別</div>
                                    <div>樹精靈 App</div>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns: 75px 1fr; row-gap: 12px; align-items: center;">
                                <div>委託狀態</div>
                                <div>${statusLabel}</div>
                            </div>

                            <div style="color:#ffb74d; font-size:0.9rem; line-height:1.4; margin-top:20px;">
                                *提醒：預約單請至原委託下單平台確認預約狀態，各交易平台因系統不同暫無法提供預約單同步查詢，敬請留意避免重複下單。
                            </div>
                        </div>
                    </div>
                `;
            });
            ordersHtml += `<div style="margin: 0 -16px;">${orderHtmlContent}</div>`;
        }
        return topHtml + `<div id="portfolio-list">${ordersHtml}</div>`;
    } else if (window.portfolioTab === 'trades') {
        let tradesHtml = `
            <div style="display:flex; align-items:center; background:#16425b; color:white; padding:12px 16px; font-size:1.1rem; margin: 0 -16px; font-weight:bold; border-top: 1px solid #1c4e6c;">
                <div style="flex:1; text-align:left; position:relative;">買賣別<span style="color:rgba(255,255,255,0.3); position:absolute; right:0;">|</span></div>
                <div style="flex:1.2; text-align:center; position:relative;">代號<span style="color:rgba(255,255,255,0.3); position:absolute; right:0;">|</span></div>
                <div style="flex:1.5; text-align:center; position:relative;">成交均價<span style="color:rgba(255,255,255,0.3); position:absolute; right:0;">|</span></div>
                <div style="flex:1.5; text-align:center;">成交股數</div>
            </div>
        `;
        if (state.history.length === 0) {
            tradesHtml += '<div style="text-align:center; padding: 2.5rem; color: var(--text-secondary); background:#161511; margin: 0 -16px; font-weight:bold;">尚無成交紀錄</div>';
        } else {
            let tradesContent = '';
            state.history.slice().reverse().forEach((h, index) => {
                let tradePrice = h.price || h.sellPrice || h.buyAvgPrice || 0;
                let volumeAmount = tradePrice * h.shares;
                let sideColor = h.type === 'buy' ? '#ff3333' : '#1eb274';
                let sideName = h.type === 'buy' ? '買進' : '賣出';
                const stockH = state.marketData.find(s => s.symbol === h.symbol);
                let isHKLine = stockH && stockH.isHK;
                let marketName = isHKLine ? '香港' : '台灣';
                let currencyName = isHKLine ? '港幣' : '台幣';

                let execTime = h.time || "2026/04/23 14:58:" + String(Math.floor(Math.random() * 60)).padStart(2, '0');


                tradesContent += `
                    <div style="background:#161511; border-bottom:1px solid #1a1a1a;">
                        <div style="display:flex; align-items:center; padding: 14px 16px; font-weight:bold;">
                            <div style="flex:1; text-align:left; color:${sideColor}; font-size:1.15rem;">${sideName}</div>
                            <div style="flex:1.2; text-align:left; color:white; font-size:1.15rem; font-family:var(--font-mono); padding-left:12px;">${h.symbol}</div>
                            <div style="flex:1.5; text-align:right; color:white; font-size:1.15rem; font-family:var(--font-mono); padding-right:12px;">${formatNumber(tradePrice)}</div>
                            <div style="flex:1.5; text-align:right; color:white; font-size:1.15rem; font-family:var(--font-mono);">${formatNumber(h.shares, 0)}</div>
                        </div>
                        <div style="height:1px; background:#444; margin:0 16px;"></div>
                        <div style="padding: 16px; font-size:1.05rem; color:#fff; line-height:1.8; font-weight:bold;">
                            <div style="display:grid; grid-template-columns: 85px 1fr; align-items: center; margin-bottom:12px;">
                                <div>股票名稱</div>
                                <div>${h.name}</div>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; margin-bottom:12px;">
                                <div style="display:grid; grid-template-columns: 85px 1fr; align-items: center;">
                                    <div>市場</div>
                                    <div>${marketName}</div>
                                </div>
                                <div style="display:grid; grid-template-columns: 70px 1fr; align-items: center;">
                                    <div>幣別</div>
                                    <div>${currencyName}</div>
                                </div>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; margin-bottom:12px;">
                                <div style="display:grid; grid-template-columns: 85px 1fr; align-items: center;">
                                    <div>成交金額</div>
                                    <div style="font-family:var(--font-mono);">${formatNumber(volumeAmount, 0)}</div>
                                </div>
                                <div style="display:grid; grid-template-columns: 70px 1fr; align-items: center;">
                                    <div>手續費</div>
                                    <div style="font-family:var(--font-mono);">${formatNumber(h.fee + (h.tax || 0), 0)}</div>
                                </div>
                            </div>
                            <div style="display:grid; grid-template-columns: 85px 1fr; align-items: center; margin-bottom:12px;">
                                <div>成交時間</div>
                                <div style="font-family:var(--font-mono);">${execTime}</div>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; margin-bottom:12px;">
                                <div style="display:grid; grid-template-columns: 85px 1fr; align-items: center;">
                                    <div>委託書號</div>
                                    <div style="font-family:var(--font-mono);">${h.docNo || ''}</div>
                                </div>
                                <div style="display:grid; grid-template-columns: 70px 1fr; align-items: center;">
                                    <div>來源別</div>
                                    <div style="white-space:nowrap;">樹精靈 App</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            tradesHtml += `<div style="margin: 0 -16px;">${tradesContent}</div>`;
        }
        return topHtml + `<div id="portfolio-list">${tradesHtml}</div>`;
    } else if (window.portfolioTab === 'history') {
        let historyHtml = '<h4 style="color:var(--text-secondary); margin: 20px 0 12px; font-size:1rem;">💰 已實現損益</h4>';
        const sells = state.history.filter(h => h.type === 'sell');
        if (sells.length === 0) {
            historyHtml += '<div style="text-align:center; padding: 1rem; color: var(--text-secondary);">尚無已實現損益紀錄</div>';
        } else {
            sells.slice().reverse().forEach(h => {
                historyHtml += `
                    <div class="card" style="margin-bottom: 12px; padding: 16px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px; align-items:center;">
                            <div style="font-weight:bold; font-size:1.1rem;"><span class="text-down">賣</span> ${h.name}</div>
                            <div style="font-weight:bold; font-size:1.1rem;" class="${getColorClass(h.profit)}">${getSign(h.profit)}${formatNumber(h.profit)}</div>
                        </div>
                        <div style="display:flex; justify-content:space-between; color:var(--text-secondary); font-size:0.9rem; margin-bottom:4px;">
                            <span>賣出數量: <strong style="color:var(--text-primary)">${h.shares}</strong> 股</span>
                            <span class="tabular-nums">${h.time}</span>
                        </div>
                        <div style="font-size:0.85rem; color:var(--text-secondary);">成交價: ${formatNumber(h.price || h.sellPrice || h.buyAvgPrice || 0)} | 總費稅: ${h.fee + h.tax}</div>
                    </div>
                `;
            });
        }
        return topHtml + `<div id="portfolio-list">${historyHtml}</div>`;
    } else if (window.portfolioTab === 'stats') {
        const hist = state.history;
        const totalTrades = hist.length;
        const winningTrades = hist.filter(h => h.profit > 0).length;
        const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : '0.0';

        // Simple max drawdown calculation 
        let maxDrawdown = 0, peak = 0;
        (state.assetHistory || []).forEach(h => {
            if (h.equity > peak) peak = h.equity;
            if (peak > 0) {
                let dd = (peak - h.equity) / peak * 100;
                if (dd > maxDrawdown) maxDrawdown = dd;
            }
        });

        const bestTrade = totalTrades > 0 ? Math.max(...hist.map(h => h.profit)) : 0;
        const worstTrade = totalTrades > 0 ? Math.min(...hist.map(h => h.profit)) : 0;

        return topHtml + `
            <div class="card" style="margin-bottom:12px; padding:16px;">
                <h4 style="color:var(--text-secondary); margin-bottom:16px; font-size:1.05rem;"><i class="fa-solid fa-chart-pie"></i> 模擬交易績效</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div style="background:var(--bg-card); border:1px solid var(--border-color); padding:12px; border-radius:8px;">
                        <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">交易勝率</div>
                        <div style="font-size:1.4rem; font-weight:700; color:var(--accent-blue);">${winRate}%</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">(獲利: ${winningTrades}/${totalTrades})</div>
                    </div>
                    <div style="background:var(--bg-card); border:1px solid var(--border-color); padding:12px; border-radius:8px;">
                        <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">最大回撤 (MDD)</div>
                        <div style="font-size:1.4rem; font-weight:700; color:var(--color-down);">${maxDrawdown.toFixed(2)}%</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">(資產高點回落幅度)</div>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div style="background:var(--bg-card); border:1px solid var(--border-color); padding:12px; border-radius:8px;">
                        <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">最佳單筆獲利</div>
                        <div class="tabular-nums ${getColorClass(bestTrade)}" style="font-size:1.1rem; font-weight:600;">${getSign(bestTrade)}${formatNumber(bestTrade)}</div>
                    </div>
                    <div style="background:var(--bg-card); border:1px solid var(--border-color); padding:12px; border-radius:8px;">
                        <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">最差單筆虧損</div>
                        <div class="tabular-nums ${getColorClass(worstTrade)}" style="font-size:1.1rem; font-weight:600;">${getSign(worstTrade)}${formatNumber(worstTrade)}</div>
                    </div>
                </div>
            </div>`;
    } else if (window.portfolioTab === 'buying-power') {
        let totalHeldTwd = state.portfolio.reduce((sum, pos) => {
            const st = state.marketData.find(x => x.symbol === pos.symbol);
            const price = st ? st.price : pos.avgPrice;
            const r = (st && st.isHK) ? CONFIG.HKD_RATE : 1;
            return sum + (price * r * pos.shares);
        }, 0);
        const totalEquityEst = state.balance + totalHeldTwd;
        const usedPct = totalEquityEst > 0 ? (totalHeldTwd / totalEquityEst * 100) : 0;
        const freePct = 100 - usedPct;
        const tsmc = state.marketData.find(s => s.symbol === '2330');
        const refStock = tsmc || state.marketData.filter(s => !s.isIndex && s.price > 0).sort((a, b) => a.price - b.price)[0];
        const refLot = refStock ? (refStock.lotSizeVal || 1000) : 1000;
        const refRate = (refStock && refStock.isHK) ? CONFIG.HKD_RATE : 1;
        const refCostPerLot = refStock ? (refStock.price * refRate * refLot * 1.001425) : 1;
        const maxLots = refStock ? Math.floor(state.balance / refCostPerLot) : 0;
        return topHtml + `
            <div style="padding: 16px;">
                <h3 style="color:var(--text-primary); font-size:1.1rem; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-wallet" style="color:var(--accent-blue);"></i> 帳戶購買力
                </h3>
                <div class="card" style="padding:16px; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">
                        <span style="color:var(--text-secondary); font-size:0.9rem;">可用餘額 (交割帳戶)</span>
                        <span style="font-size:1.4rem; font-weight:700; color:var(--accent-blue); font-family:var(--font-mono);">$${formatNumber(state.balance)}</span>
                    </div>
                    <div style="height:8px; background:var(--border-color); border-radius:4px; overflow:hidden; margin-bottom:6px;">
                        <div style="height:100%; width:${freePct.toFixed(1)}%; background:var(--accent-blue); border-radius:4px;"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-secondary);">
                        <span>可用 ${freePct.toFixed(1)}%</span>
                        <span>已部署 ${usedPct.toFixed(1)}%</span>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div class="card" style="padding:14px;">
                        <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">已部署資金</div>
                        <div style="font-size:1.15rem; font-weight:700; font-family:var(--font-mono);">$${formatNumber(totalHeldTwd)}</div>
                    </div>
                    <div class="card" style="padding:14px;">
                        <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">帳戶總估値</div>
                        <div style="font-size:1.15rem; font-weight:700; font-family:var(--font-mono);">$${formatNumber(totalEquityEst)}</div>
                    </div>
                </div>
                ${refStock ? `
                <div class="card" style="padding:14px; border:1px solid var(--accent-blue); background:rgba(60,140,250,0.05);">
                    <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px;"><i class="fa-solid fa-calculator"></i> 試算：以目前餘額最多可買</div>
                    <div style="display:flex; align-items:baseline; gap:8px;">
                        <span style="font-size:1.8rem; font-weight:700; color:var(--accent-blue);">${formatNumber(maxLots, 0)}</span>
                        <span style="color:var(--text-secondary); font-size:0.9rem;">股 ${refStock.name} (現價 ${formatNumber(refStock.price)})</span>
                    </div>
                </div>` : ''}
            </div>
        `;
    } else {
        // History Render 
        let histHtml = ''; let totalRealized = state.history.reduce((sum, h) => sum + h.profit, 0);
        if (state.history.length === 0) histHtml = '<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">尚無已實現對帳紀錄</div>';
        else {
            [...state.history].reverse().forEach(h => {
                histHtml += `
                     <div class="card" style="margin-bottom: 12px; padding: 16px;">
                         <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="font-weight:600; font-size:1.1rem;">${h.name} (${h.symbol})</span>
                            <span class="${getColorClass(h.profit)}" style="font-weight:700;">${getSign(h.profit)}${formatNumber(h.profit)}</span>
                         </div>
                         <div style="display:flex; justify-content:space-between; font-size:0.9rem; color:var(--text-secondary); margin-bottom:4px;">
                            <span>賣出數量: ${h.shares} 股</span>
                            <span>加權買均價: ${formatNumber(h.buyAvgPrice)}</span>
                         </div>
                         <div style="display:flex; justify-content:space-between; font-size:0.9rem; color:var(--text-secondary); margin-bottom:8px;">
                            <span>賣出成交價: ${formatNumber(h.sellPrice)}</span>
                            <span title="手續費: ${h.fee} / 證交稅: ${h.tax}">費: ${h.fee} / 稅: ${h.tax}</span>
                         </div>
                         <div style="font-size:0.8rem; color:var(--text-secondary); border-top:1px solid var(--border-color); padding-top:6px;">時間: ${h.time}</div>
                     </div>
                 `;
            });
        }
        return topHtml + `<div style="display:flex; justify-content:space-between; align-items:center; padding: 0 4px 12px;"><span style="color:var(--text-secondary);">累計已實現損益</span><span class="${getColorClass(totalRealized)}" style="font-size:1.4rem; font-weight:bold;">${getSign(totalRealized)}${formatNumber(totalRealized)}</span></div>
         <div style="text-align:right; margin-bottom:12px;"><button class="btn btn-outline" style="padding:6px 12px; font-size:0.85rem;" onclick="exportHistoryCSV()"><i class="fa-solid fa-file-csv"></i> 匯出 CSV</button></div>
         ${histHtml}
         <div class="card" style="margin-top:20px; padding:16px; border:1px dashed var(--accent-blue); background:rgba(60,140,250,0.05);">
             <div style="display:flex; justify-content:space-between; align-items:center;">
                 <span style="font-weight:600;"><i class="fa-solid fa-percent"></i> 手續費折數設定</span>
                 <select onchange="updateFeeDiscount(this.value)" style="background:var(--bg-input); color:var(--text-primary); border:1px solid var(--border-color); padding:4px 8px; border-radius:6px;">
                     <option value="1" ${state.feeDiscount === 1 ? 'selected' : ''}>不二價 (10折)</option>
                     <option value="0.6" ${state.feeDiscount === 0.6 ? 'selected' : ''}>常見優惠 (6折)</option>
                     <option value="0.5" ${state.feeDiscount === 0.5 ? 'selected' : ''}>優質客戶 (5折)</option>
                     <option value="0.28" ${state.feeDiscount === 0.28 ? 'selected' : ''}>極限優惠 (2.8折)</option>
                     <option value="0.1" ${state.feeDiscount === 0.1 ? 'selected' : ''}>VIP 大戶 (1折)</option>
                 </select>
             </div>
             <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:8px;">設定將即時套用於未來的委託計算與預估損益。</p>
         </div>
         <div class="card" style="margin-top:12px; padding:16px; border:1px solid var(--border-color); background:rgba(255,255,255,0.02);">
             <div style="display:flex; justify-content:space-between; align-items:center;">
                 <span style="font-weight:600;"><i class="fa-solid fa-palette"></i> 漲跌配色模式</span>
                 <div style="display:flex; gap:4px; background:var(--bg-input); padding:4px; border-radius:8px;">
                     <div class="pill ${state.colorMode === 'TW' ? 'active' : ''}" style="padding:4px 12px; font-size:0.75rem; border:none; cursor:pointer;" onclick="window.toggleColorMode()">台股 (紅漲)</div>
                     <div class="pill ${state.colorMode === 'INTL' ? 'active' : ''}" style="padding:4px 12px; font-size:0.75rem; border:none; cursor:pointer;" onclick="window.toggleColorMode()">國際 (綠漲)</div>
                 </div>
             </div>
         </div>
         <div class="card" style="margin-top:12px; padding:16px; border:1px solid var(--border-color); background:rgba(255,255,255,0.02);">
             <div style="display:flex; justify-content:space-between; align-items:center;">
                 <span style="font-weight:600;"><i class="fa-regular fa-clock"></i> 全時段模擬模式</span>
                 <div style="display:flex; gap:4px; background:var(--bg-input); padding:4px; border-radius:8px;">
                     <div class="pill ${state.fullTimeSim ? 'active' : ''}" style="padding:4px 12px; font-size:0.75rem; border:none; cursor:pointer;" onclick="window.toggleFullTimeSim(true)">24H 開放</div>
                     <div class="pill ${!state.fullTimeSim ? 'active' : ''}" style="padding:4px 12px; font-size:0.75rem; border:none; cursor:pointer;" onclick="window.toggleFullTimeSim(false)">真實台股時間</div>
                 </div>
             </div>
             <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:8px;">關閉全時段時，系統依照真實台股開盤時間限制交易，收盤自動結算昨日收盤價計算當沖稅率。</p>
         </div>
         <div style="text-align:center; margin-top: 24px; margin-bottom: 24px;"><button class="btn btn-outline" style="border-color:#ff5252; color:#ff5252; width:100%; border-radius:8px; padding:12px;" onclick="window.resetAppData()">重置模擬對帳單資料</button></div>`;
    }
}

function renderMorePage() {
    let ordersWithDocNo = state.orders.map(o => ({ id: o.id, symbol: o.symbol, name: o.name, docNo: o.docNo, type: 'order' }));
    let historyWithDocNo = state.history.map(h => ({ id: h.id, symbol: h.symbol, name: h.name, docNo: h.docNo, type: 'history' }));

    let allEntries = [...ordersWithDocNo, ...historyWithDocNo];

    let listHtml = allEntries.map(entry => {
        let entryObj = entry.type === 'order' ? state.orders.find(o => o.id == entry.id) : state.history.find(h => h.id == entry.id);
        let currentTime = entryObj ? entryObj.time : '';

        return `
            <div class="card" style="margin-bottom:12px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div style="font-weight:600;">${entry.symbol} ${entry.name} <span style="font-size:0.8rem; color:#888;">(${entry.type === 'order' ? '未成交' : '已成交'})</span></div>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <span style="font-size:0.9rem; color:var(--text-secondary); white-space:nowrap; width:70px;">${entry.type === 'order' ? '委託書號' : '成交書號'}:</span>
                        <input type="text" class="form-control doc-no-input" data-id="${entry.id}" data-type="${entry.type}" value="${entry.docNo || ''}" maxlength="7" placeholder="7位書號" style="flex:1; background:var(--bg-input); border-color:#444;">
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <span style="font-size:0.9rem; color:var(--text-secondary); white-space:nowrap; width:70px;">時間:</span>
                        <input type="text" class="form-control time-input" data-id="${entry.id}" data-type="${entry.type}" value="${currentTime}" placeholder="YYYY/MM/DD HH:MM:SS" style="flex:1; background:var(--bg-input); border-color:#444; font-family:var(--font-mono); font-size:0.85rem;">
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (allEntries.length === 0) listHtml = '<div style="text-align:center; padding:2rem; color:#888;">目前尚無委託或成交紀錄可供修改。</div>';

    return `
        <div style="padding: 16px;">
            <h3 style="color:white; margin-bottom:8px; font-size:1.2rem;">管理委託與成交資料</h3>
            <p style="color:#888; font-size:0.85rem; margin-bottom:20px;">您可以在此手動修改書號與時間資訊。</p>
            
            ${listHtml}
            
            <button class="btn btn-up" style="margin-top:12px; height:50px; font-weight:bold;" onclick="window.saveBatchEdits()">儲存所有變更</button>
            <div style="margin-top:24px; padding:16px; background:#1e1e1e; border-radius:8px; color:#888; font-size:0.85rem;">
                <div style="font-weight:bold; color:#ffb74d; margin-bottom:8px;"><i class="fa-solid fa-circle-info"></i> 操作提示</div>
                1. 時間格式建議為：2026/04/23 14:58:22<br>
                2. 修改後會即時同步至帳務列表及成交詳情。<br>
                3. 此功能僅影響顯示，不影響模擬帳戶餘額。
            </div>
        </div>
    `;
}

window.saveBatchEdits = function () {
    const docInputs = document.querySelectorAll('.doc-no-input');
    const timeInputs = document.querySelectorAll('.time-input');

    // Process DocNos
    docInputs.forEach(input => {
        const id = input.getAttribute('data-id');
        const type = input.getAttribute('data-type');
        const newVal = input.value.trim();
        if (type === 'order') {
            const order = state.orders.find(o => o.id == id);
            if (order) {
                const oldDocNo = order.docNo;
                order.docNo = newVal;
                // Sync to history
                state.history.forEach(h => {
                    if (h.docNo === oldDocNo) h.docNo = newVal;
                });
            }
        } else {
            const hist = state.history.find(h => h.id == id);
            if (hist) {
                const oldDocNo = hist.docNo;
                hist.docNo = newVal;
                // Sync to order
                state.orders.forEach(o => {
                    if (o.docNo === oldDocNo) o.docNo = newVal;
                });
            }
        }
    });

    // Process Times
    timeInputs.forEach(input => {
        const id = input.getAttribute('data-id');
        const type = input.getAttribute('data-type');
        const newVal = input.value.trim();
        if (type === 'order') {
            const order = state.orders.find(o => o.id == id);
            if (order) order.time = newVal;
        } else {
            const hist = state.history.find(h => h.id == id);
            if (hist) hist.time = newVal;
        }
    });

    saveState();
    showToast('資料已批量更新成功', 'success');
    renderPage('more');
};

// --- Trade View ---
function buildTradePage() {
    const container = document.createElement('div');

    let initSym = state.tradeTarget ? state.tradeTarget.symbol : (state.lastTradeSymbol || '2330');
    const initStock = state.marketData.find(s => s.symbol === initSym);
    let initShares = initStock ? (initStock.lotSizeVal || 1000) : 1000;

    let tradeState = {
        side: state.tradeTarget ? state.tradeTarget.side : 'buy',
        marginType: 'cash',
        symbol: initSym,
        searchQuery: '',
        priceType: 'market',
        tif: 'ROD', // Time In Force: ROD, IOC, FOK
        limitPrice: 0,
        shares: initShares,
        triggerCondition: '<=',
        triggerPrice: 0,
        triggerExecuteType: 'market',
        triggerOrderPrice: 0
    };

    const stockInit = state.marketData.find(s => s.symbol === tradeState.symbol);
    if (stockInit) { tradeState.limitPrice = stockInit.price; tradeState.triggerPrice = stockInit.price; tradeState.triggerOrderPrice = stockInit.price; }

    const renderForm = () => {
        const stock = state.marketData.find(s => s.symbol === tradeState.symbol);
        const currentPrice = stock ? stock.price : 0;

        let estPrice = currentPrice;
        if (tradeState.priceType === 'limit') estPrice = tradeState.limitPrice;
        if (tradeState.priceType === 'smart') { estPrice = tradeState.triggerExecuteType === 'limit' ? tradeState.triggerOrderPrice : currentPrice; }

        let isHK = stock && stock.isHK;
        let rate = isHK ? CONFIG.HKD_RATE : 1;
        let estTwdPrice = estPrice * rate;
        let totalVal = estTwdPrice * tradeState.shares;

        let { fee, tax } = calculateFees(totalVal, tradeState.side, tradeState.symbol);

        let requiredMargin = 0;
        if (tradeState.marginType === 'cash') requiredMargin = totalVal + fee;
        else if (tradeState.marginType === 'margin') requiredMargin = (totalVal * 0.4) + fee;
        else if (tradeState.marginType === 'short') requiredMargin = (totalVal * 0.9) + fee + tax;

        // Determine whether this operation requires funds (opening a position) or releases funds (closing)
        let opType = 'close';
        if ((tradeState.side === 'buy' && tradeState.marginType !== 'short') ||
            (tradeState.side === 'sell' && tradeState.marginType === 'short')) {
            opType = 'open';
        }

        let totalCost = opType === 'open' ? requiredMargin : (totalVal - fee - tax);

        let disabled = false; let warning = '';
        if (tradeState.shares <= 0) { disabled = true; warning = '請輸入正確數量'; }

        let currentLotSize = (stock && stock.lotSizeVal) ? stock.lotSizeVal : 1000;
        if (isHK && tradeState.shares % currentLotSize !== 0) { disabled = true; warning = `港股訂單必須為 ${currentLotSize} 股的倍數`; }

        // Safety check based on position logic
        if (opType === 'open' && tradeState.shares > 0 && totalCost > state.balance && tradeState.priceType !== 'smart') {
            disabled = true; warning = '交割帳戶可用餘額 (保證金) 不足';
        } else if (opType === 'close' && tradeState.shares > 0 && tradeState.priceType !== 'smart') {
            let owned = state.portfolio.find(p => p.symbol === tradeState.symbol && p.marginType === tradeState.marginType)?.shares || 0;
            if (tradeState.shares > owned) { disabled = true; warning = `現有目標庫存不足 (僅持有 ${owned} 股)`; }
        }

        let actionColor = tradeState.side === 'buy' ? 'up' : 'down';
        let actionText = tradeState.side === 'buy' ? '確認買進' : '確認賣出';
        if (tradeState.priceType === 'smart') {
            actionText = `啟動${tradeState.side === 'buy' ? '買進' : '賣出'}條件單`;
            actionColor = tradeState.side === 'buy' ? 'up' : 'down';
        }

        window.setTif = (tif) => { tradeState.tif = tif; renderForm(); };

        let smartHtml = ''; let normHtml = ''; let ocoHtml = '';
        if (tradeState.priceType === 'smart') {
            smartHtml = `
                <div class="form-group" style="background: rgba(255,165,0,0.05); padding: 16px; border-radius:8px; border:1px solid rgba(255,165,0,0.3); margin-top:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <div style="color:#ffb74d; font-weight:600; font-size:1.05rem;"><i class="fa-solid fa-bolt"></i> 智慧條件設定</div>
                        <span class="badge" style="background:${tradeState.side === 'buy' ? '#2e7d32' : '#c62828'}; color:white; font-size:0.75rem;">${tradeState.side === 'buy' ? '買進委託' : '賣出委託'}</span>
                    </div>
                    <label class="form-label" style="color:var(--text-secondary); margin-bottom:6px;">當市價觸及以下條件</label>
                    <div style="display:flex; gap:8px; margin-bottom:16px;">
                        <select id="trade-trigger-cond" class="form-control" style="flex:1;">
                            <option value=">=" ${tradeState.triggerCondition === '>=' ? 'selected' : ''}>大於等於 (>=)</option>
                            <option value="<=" ${tradeState.triggerCondition === '<=' ? 'selected' : ''}>小於等於 (<=)</option>
                        </select>
                        <input type="number" id="trade-trigger-price" class="form-control" value="${tradeState.triggerPrice}" style="flex:1.5;" step="0.5" placeholder="觸發價">
                    </div>
                    <label class="form-label" style="color:var(--text-secondary); margin-bottom:6px;">觸發後立刻送出新委託</label>
                    <div style="display:flex; gap:8px;">
                        <select id="trade-trigger-type" class="form-control" style="flex:1;">
                            <option value="market" ${tradeState.triggerExecuteType === 'market' ? 'selected' : ''}>市價</option>
                            <option value="limit" ${tradeState.triggerExecuteType === 'limit' ? 'selected' : ''}>限價</option>
                        </select>
                        <input type="number" id="trade-trigger-order" class="form-control" value="${tradeState.triggerOrderPrice}" style="flex:1.5; ${tradeState.triggerExecuteType === 'market' ? 'opacity:0.4; pointer-events:none;' : ''}" step="0.5" placeholder="委託金額">
                    </div>
                </div>
            `;
        } else if (tradeState.priceType === 'oco') {
            ocoHtml = `
                <div class="form-group" style="background: rgba(77,182,172,0.05); padding: 16px; border-radius:8px; border:1px solid rgba(77,182,172,0.3); margin-top:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <div style="color:#4db6ac; font-weight:600; font-size:1.05rem;"><i class="fa-solid fa-arrows-split-up-and-left"></i> OCO 雙向條件單</div>
                        <span class="badge" style="background:${tradeState.side === 'buy' ? '#2e7d32' : '#c62828'}; color:white; font-size:0.75rem;">${tradeState.side === 'buy' ? '買進委託' : '賣出委託'}</span>
                    </div>
                    <label class="form-label" style="color:var(--text-secondary); margin-bottom:6px;">停利觸發價 (當市價 >= 此價格時丟出市價單)</label>
                    <input type="number" id="trade-oco-tp" class="form-control" value="${tradeState.ocoTpPrice || Number((currentPrice * 1.05).toFixed(2))}" style="margin-bottom:12px;" step="0.5" placeholder="停利價">
                    <label class="form-label" style="color:var(--text-secondary); margin-bottom:6px;">停損觸發價 (當市價 <= 此價格時丟出市價單)</label>
                    <input type="number" id="trade-oco-sl" class="form-control" value="${tradeState.ocoSlPrice || Number((currentPrice * 0.95).toFixed(2))}" step="0.5" placeholder="停損價">
                    <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:12px; text-align:center;">* 任一條件達成後，另一端自動撤銷</div>
                </div>
            `;
        } else {
            normHtml = `<input type="number" class="form-control" value="${tradeState.limitPrice}" ${tradeState.priceType === 'market' ? 'disabled' : ''} id="trade-price" placeholder="市價單不需指定金額" step="0.5" style="margin-top:8px; ${tradeState.priceType === 'market' ? 'opacity:0.4;' : ''}">`;
        }

        container.innerHTML = `
            <div style="display:flex; gap:8px; margin-bottom:12px;">
                <div class="pill-group" style="flex:1; margin-bottom:0;">
                    <div class="pill ${tradeState.side === 'buy' ? 'active up' : ''}" id="trade-side-buy" data-side="buy">買進</div>
                    <div class="pill ${tradeState.side === 'sell' ? 'active down' : ''}" id="trade-side-sell" data-side="sell">賣出</div>
                </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 16px;">
                <label class="form-label">交易類別</label>
                <div class="pill-group" style="margin-bottom: 0px;">
                    <div class="pill ${tradeState.marginType === 'cash' ? 'active' : ''}" style="padding:6px; flex:1;" id="trade-margin-cash">現股</div>
                    <div class="pill ${tradeState.marginType === 'margin' ? 'active' : ''}" style="padding:6px; flex:1;" id="trade-margin-margin">融資 (40%)</div>
                    <div class="pill ${tradeState.marginType === 'short' ? 'active' : ''}" style="padding:6px; flex:1;" id="trade-margin-short">融券 (90%)</div>
                </div>
            </div>
            
            <div class="card">
                <div class="form-group">
                    <label class="form-label">搜尋標的 (輸入代號或名稱)</label>
                    <input type="text" id="trade-search" class="form-control" placeholder="例如: 2330 或 台積電" value="${tradeState.searchQuery}" style="margin-bottom:8px; border-color:var(--accent-blue);">
                    <select id="trade-symbol" class="form-control" style="background:var(--bg-input);">
                        ${state.marketData.filter(s => !s.isIndex && (s.symbol.includes(tradeState.searchQuery) || s.name.includes(tradeState.searchQuery)))
                .map(s => `<option value="${s.symbol}" ${s.symbol === tradeState.symbol ? 'selected' : ''}>${s.symbol} ${s.name} ${s.isHK ? '(HK)' : ''}</option>`)
                .join('') || '<option disabled>查對相符股票</option>'}
                    </select>
                </div>
                <div style="margin-bottom: 16px; padding-bottom:12px; border-bottom:1px dashed var(--border-color);">
                    <div style="display:flex; justify-content:space-between; font-size:1.1rem; margin-bottom:6px;">
                        <span style="color:var(--text-secondary);">目前即時報價</span>
                        <span class="${getColorClass(stock ? stock.change : 0)}" style="font-weight: 600;">${formatNumber(currentPrice)}</span>
                    </div>
                    ${stock && stock.high && stock.low && stock.high !== stock.low ? `
                    <div style="display:flex; gap:10px; font-size:0.8rem; color:var(--text-secondary); align-items:center;">
                        <span style="white-space:nowrap;">今日: <strong class="text-up">${formatNumber(stock.high)}</strong> / <strong class="text-down">${formatNumber(stock.low)}</strong></span>
                        <div style="flex:1; height:5px; background:var(--border-color); border-radius:3px; position:relative;">
                            <div style="position:absolute;left:0;top:0;bottom:0;right:0;background:linear-gradient(to right,var(--color-down),#888,var(--color-up));border-radius:3px;"></div>
                            <div style="position:absolute;top:-3px;bottom:-3px;width:7px;background:white;border-radius:3px;box-shadow:0 0 3px rgba(0,0,0,0.5);left:${Math.min(98, Math.max(2, ((currentPrice - stock.low) / (stock.high - stock.low)) * 100)).toFixed(1)}%;transform:translateX(-50%);"></div>
                        </div>
                    </div>` : ''}
                </div>
                
                <div class="form-group">
                    <label class="form-label" style="margin-top:12px;">委託類別</label>
                    <div class="pill-group" style="margin-bottom: 0px; flex-wrap:wrap;">
                        <div class="pill ${tradeState.priceType === 'limit' ? 'active' : ''}" style="padding:6px; flex:1 1 45%;" id="trade-type-limit">限價</div>
                        <div class="pill ${tradeState.priceType === 'market' ? 'active' : ''}" style="padding:6px; flex:1 1 45%;" id="trade-type-market">市價</div>
                        <div class="pill ${tradeState.priceType === 'smart' ? 'active' : ''}" style="padding:6px; flex:1 1 45%;" id="trade-type-smart">條件單<i class="fa-solid fa-bolt" style="margin-left:4px; font-size:0.8rem; color:#ffb74d;"></i></div>
                        <div class="pill ${tradeState.priceType === 'oco' ? 'active' : ''}" style="padding:6px; flex:1 1 45%;" id="trade-type-oco">OCO單<i class="fa-solid fa-arrows-split-up-and-left" style="margin-left:4px; font-size:0.8rem; color:#4db6ac;"></i></div>
                    </div>
                    ${normHtml}
                    ${smartHtml}
                    ${ocoHtml}
                </div>

                <div class="form-group" style="margin-top:12px;">
                    <label class="form-label">委託條件 (Time In Force)</label>
                    <div style="display:flex; gap:8px;">
                        <div class="pill ${tradeState.tif === 'ROD' ? 'active' : ''}" style="flex:1; padding:10px; font-size:0.8rem;" onclick="window.setTif('ROD')">ROD (當日)</div>
                        <div class="pill ${tradeState.tif === 'IOC' ? 'active' : ''}" style="flex:1; padding:10px; font-size:0.8rem;" onclick="window.setTif('IOC')">IOC (立即)</div>
                        <div class="pill ${tradeState.tif === 'FOK' ? 'active' : ''}" style="flex:1; padding:10px; font-size:0.8rem;" onclick="window.setTif('FOK')">FOK (全成)</div>
                    </div>
                    <p style="font-size:0.75rem; color:var(--text-secondary); margin-top:8px;">
                        ${tradeState.tif === 'ROD' ? 'ROD: 委託效期至當日收盤。' : (tradeState.tif === 'IOC' ? 'IOC: 立即成交，否則部分或全數取消。' : 'FOK: 必須全數立即成交，否則全數取消。')}
                    </p>
                </div>
                
                <div class="form-group" style="margin-top:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <label class="text-label">委託股數 ${isHK ? `(${currentLotSize} 股為單位)` : '(自由輸入)'}</label>
                        <span style="font-size:0.8rem; color:var(--text-secondary);">目前持有: <strong style="color:var(--accent-blue);" class="tabular-nums">${state.portfolio.find(p => p.symbol === tradeState.symbol && p.marginType === tradeState.marginType)?.shares || 0}</strong> 股</span>
                    </div>
                    <div style="display:flex; gap:12px;">
                        <div style="flex:1;">
                            <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">手數 (幾手)</div>
                            <input type="number" id="trade-lots" class="form-control tabular-nums" value="${Math.floor(tradeState.shares / currentLotSize) || 0}" min="0" step="1">
                        </div>
                        <div style="flex:1;">
                            <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">總股數</div>
                            <input type="number" id="trade-shares" class="form-control tabular-nums" value="${tradeState.shares}" min="${isHK ? currentLotSize : 1}" step="${isHK ? currentLotSize : 1}">
                        </div>
                    </div>
                    <div class="shortcut-group">
                        <button class="btn-shortcut" data-lot="1">1 手 (${currentLotSize}股)</button>
                        <button class="btn-shortcut" data-ratio="0.25">1/4 倉</button>
                        <button class="btn-shortcut" data-ratio="0.5">半倉</button>
                        <button class="btn-shortcut" data-ratio="1">全倉</button>
                    </div>
                </div>
            </div>
            
            <div class="card" style="background:transparent; border:1px solid var(--border-color);">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.9rem; color:var(--text-secondary);">
                    <span>價金估算 (${formatNumber(estPrice)} x ${tradeState.shares}股 x 匯率 ${rate})</span>
                    <span>$${formatNumber(totalVal)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.9rem; color:var(--text-secondary);">
                    <span>聯網手續費預估</span>
                    <span>$${fee}</span>
                </div>
                ${tradeState.side === 'sell' && tradeState.marginType !== 'short' ? `
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem; color:var(--text-secondary);">
                    <span>證交稅預估 (0.3%)</span>
                    <span>$${tax}</span>
                </div>` : ''}
                
                <div style="display: flex; justify-content: space-between; border-top: 1px dashed var(--border-color); padding-top:12px;">
                    <span style="font-weight:600; color:var(--text-primary)">
                        發動時${opType === 'open' ? '交割扣款 (含保證金)' : '入帳總額'}估計
                    </span>
                    <span style="font-weight: 700; font-size: 1.2rem;" class="${opType === 'open' ? 'text-down' : 'text-up'}">
                        $${formatNumber(totalCost)}
                    </span>
                </div>
                ${warning ? `<div style="color:#ff5252; font-size:0.9rem; font-weight:600; margin-top:12px; text-align:right; animation: slideDown 0.2s;"><i class="fa-solid fa-triangle-exclamation"></i> ${warning}</div>` : ''}
            </div>
            
            <button class="btn btn-${actionColor}" id="trade-submit-btn" style="height: 56px; font-size: 1.2rem; margin-bottom: 24px; transition: transform 0.1s;" ${disabled ? 'disabled' : ''} onmousedown="this.style.transform='scale(0.97)'" onmouseup="this.style.transform='scale(1)'">
                ${actionText}
            </button>
        `;

        container.querySelector('#trade-side-buy').onclick = () => { tradeState.side = 'buy'; renderForm(); };
        container.querySelector('#trade-side-sell').onclick = () => { tradeState.side = 'sell'; renderForm(); };

        container.querySelector('#trade-margin-cash').onclick = () => { tradeState.marginType = 'cash'; renderForm(); };
        container.querySelector('#trade-margin-margin').onclick = () => { tradeState.marginType = 'margin'; renderForm(); };
        container.querySelector('#trade-margin-short').onclick = () => { tradeState.marginType = 'short'; renderForm(); };

        container.querySelector('#trade-type-market').onclick = () => { tradeState.priceType = 'market'; renderForm(); };
        container.querySelector('#trade-type-limit').onclick = () => { tradeState.priceType = 'limit'; renderForm(); };
        container.querySelector('#trade-type-smart').onclick = () => { tradeState.priceType = 'smart'; renderForm(); };
        container.querySelector('#trade-type-oco').onclick = () => { tradeState.priceType = 'oco'; renderForm(); };

        container.querySelector('#trade-search').oninput = (e) => {
            tradeState.searchQuery = e.target.value;
            // Auto-select first result if current symbol is filtered out
            const filtered = state.marketData.filter(s => !s.isIndex && (s.symbol.includes(tradeState.searchQuery) || s.name.includes(tradeState.searchQuery)));
            if (filtered.length > 0 && !filtered.some(s => s.symbol === tradeState.symbol)) {
                tradeState.symbol = filtered[0].symbol;
                state.lastTradeSymbol = tradeState.symbol;
                const newStock = state.marketData.find(s => s.symbol === tradeState.symbol);
                if (newStock) { tradeState.limitPrice = newStock.price; tradeState.triggerPrice = newStock.price; tradeState.triggerOrderPrice = newStock.price; }
            }
            renderForm();
            // Focus hack to maintain input focus across re-renders
            const input = container.querySelector('#trade-search');
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        };

        container.querySelector('#trade-symbol').onchange = (e) => {
            tradeState.symbol = e.target.value;
            state.lastTradeSymbol = tradeState.symbol;
            const newStock = state.marketData.find(s => s.symbol === tradeState.symbol);
            if (newStock) {
                tradeState.limitPrice = newStock.price;
                tradeState.triggerPrice = newStock.price;
                tradeState.triggerOrderPrice = newStock.price;
                tradeState.shares = newStock.lotSizeVal || 1000;
            } else {
                tradeState.shares = 1000;
            }
            renderForm();
        };

        const sharesIn = container.querySelector('#trade-shares');
        sharesIn.oninput = (e) => { tradeState.shares = parseInt(e.target.value) || 0; renderForm(); };

        const lotsIn = container.querySelector('#trade-lots');
        if (lotsIn) {
            lotsIn.oninput = (e) => {
                const lots = parseInt(e.target.value) || 0;
                tradeState.shares = lots * currentLotSize;
                renderForm();
            };
        }

        const priceIn = container.querySelector('#trade-price');
        if (priceIn) priceIn.oninput = (e) => { tradeState.limitPrice = parseFloat(e.target.value) || 0; renderForm(); };

        if (tradeState.priceType === 'smart') {
            container.querySelector('#trade-trigger-cond').onchange = (e) => { tradeState.triggerCondition = e.target.value; renderForm(); };
            container.querySelector('#trade-trigger-price').oninput = (e) => { tradeState.triggerPrice = parseFloat(e.target.value) || 0; renderForm(); };
            container.querySelector('#trade-trigger-type').onchange = (e) => { tradeState.triggerExecuteType = e.target.value; renderForm(); };
            container.querySelector('#trade-trigger-order').oninput = (e) => { tradeState.triggerOrderPrice = parseFloat(e.target.value) || 0; renderForm(); };
        } else if (tradeState.priceType === 'oco') {
            container.querySelector('#trade-oco-tp').oninput = (e) => { tradeState.ocoTpPrice = parseFloat(e.target.value) || 0; };
            container.querySelector('#trade-oco-sl').oninput = (e) => { tradeState.ocoSlPrice = parseFloat(e.target.value) || 0; };
        }

        // Add Shortcut Logic INSIDE renderForm to persist across re-renders
        container.querySelectorAll('.btn-shortcut').forEach(btn => {
            btn.onclick = () => {
                // Handle "1 手" lot button
                if (btn.hasAttribute('data-lot')) {
                    const stock = state.marketData.find(s => s.symbol === tradeState.symbol);
                    tradeState.shares = (stock && stock.lotSizeVal) ? stock.lotSizeVal : 1000;
                    renderForm();
                    return;
                }
                const ratio = parseFloat(btn.getAttribute('data-ratio'));
                const side = tradeState.side;
                const symbol = tradeState.symbol;
                const stock = state.marketData.find(s => s.symbol === symbol);
                if (!stock) return;

                const price = stock.price;
                const stockForRate = state.marketData.find(s => s.symbol === symbol);
                const rate = (stockForRate && stockForRate.isHK) ? CONFIG.HKD_RATE : 1;

                let targetShares = 0;
                let opType = 'close';
                if ((side === 'buy' && tradeState.marginType !== 'short') ||
                    (side === 'sell' && tradeState.marginType === 'short')) {
                    opType = 'open';
                }

                if (opType === 'open') {
                    const maxVal = state.balance * ratio;
                    let pricePlusTaxes = (price * rate);
                    if (tradeState.marginType === 'cash') pricePlusTaxes *= 1.001425;
                    else if (tradeState.marginType === 'margin') pricePlusTaxes = (pricePlusTaxes * 0.4) + (pricePlusTaxes * 0.001425);
                    else if (tradeState.marginType === 'short') pricePlusTaxes = (pricePlusTaxes * 0.9) + (pricePlusTaxes * 0.004425);

                    targetShares = Math.floor(maxVal / pricePlusTaxes);
                } else {
                    const owned = state.portfolio.find(p => p.symbol === symbol && p.marginType === tradeState.marginType)?.shares || 0;
                    targetShares = Math.floor(owned * ratio);
                }

                // For HK stocks, snap to lot size
                if (stock.isHK && targetShares > 0) {
                    const lsv = stock.lotSizeVal || 1000;
                    targetShares = Math.floor(targetShares / lsv) * lsv;
                }

                tradeState.shares = targetShares;
                if (ratio > 0 && targetShares === 0) {
                    showToast(opType === 'open' ? '餘額不足以購買此比例之股數' : '目前無持股可供出售', 'error');
                }
                renderForm();
            };
        });

        const submitBtn = container.querySelector('#trade-submit-btn');
        if (!disabled && submitBtn) {
            submitBtn.onclick = () => {
                const stock = state.marketData.find(s => s.symbol === tradeState.symbol);
                const title = tradeState.priceType === 'smart' ? '設置智慧條件委託' : '確認送出委託單';
                const color = tradeState.side === 'buy' ? 'var(--color-up)' : 'var(--color-down)';
                const content = `您正在${tradeState.side === 'buy' ? '買入' : '賣出'} <strong>${stock.name} (${stock.symbol})</strong><br>
                                 數量: <strong>${tradeState.shares}</strong> 股<br>
                                 類別: <strong>${tradeState.priceType === 'market' ? '市價' : (tradeState.priceType === 'smart' ? '智慧觸價' : (tradeState.priceType === 'oco' ? 'OCO雙向單' : `限價 ${formatNumber(tradeState.limitPrice)}`))}</strong><br>
                                 條件: <strong>${tradeState.tif}</strong><br><br>
                                 <span style="font-size:0.8rem;">(預估總額: $${formatNumber(totalCost)})</span>`;

                showConfirmModal(title, content, () => {
                    let success = false;
                    if (tradeState.priceType === 'smart') {
                        submitSmartTrigger({
                            side: tradeState.side, symbol: tradeState.symbol, condition: tradeState.triggerCondition,
                            triggerPrice: tradeState.triggerPrice, executeType: tradeState.triggerExecuteType,
                            orderPrice: tradeState.triggerOrderPrice, shares: tradeState.shares,
                            tif: tradeState.tif
                        });
                        success = true;
                        window.portfolioTab = 'orders';
                    } else if (tradeState.priceType === 'oco') {
                        const tpInput = document.getElementById('trade-oco-tp');
                        const slInput = document.getElementById('trade-oco-sl');
                        submitOcoTrigger({
                            side: tradeState.side, symbol: tradeState.symbol,
                            tpPrice: tradeState.ocoTpPrice || (tpInput ? parseFloat(tpInput.value) : 0) || 0,
                            slPrice: tradeState.ocoSlPrice || (slInput ? parseFloat(slInput.value) : 0) || 0,
                            shares: tradeState.shares, marginType: tradeState.marginType
                        });
                        success = true;
                        window.portfolioTab = 'orders';
                    } else {
                        success = submitOrder(tradeState);
                        if (success) {
                            if (tradeState.priceType === 'limit' && tradeState.tif === 'ROD') window.portfolioTab = 'orders';
                            else window.portfolioTab = 'inventory';
                        }
                    }

                    if (success) {
                        setTimeout(() => renderPage('portfolio'), 600);
                    }
                }, tradeState.priceType === 'smart' ? '確認掛單' : actionText, color);
            };
        }
    };

    renderForm();
    return container;
}


// --- Market Engine ---
function checkTriggers() {
    let triggeredAny = false;
    state.triggers.forEach(t => {
        if (t.status !== 'active') return;
        const stock = state.marketData.find(s => s.symbol === t.symbol);

        let tripped = false;

        if (t.type === 'oco') {
            if (stock.price >= t.tpPrice) { tripped = true; showToast(`🔥 OCO 觸發: ${stock.name} 達停利價 ${t.tpPrice}!`); }
            else if (stock.price <= t.slPrice) { tripped = true; showToast(`🔥 OCO 觸發: ${stock.name} 達停損價 ${t.slPrice}!`); }
        } else {
            if (t.condition === '>=' && stock.price >= t.triggerPrice) { tripped = true; showToast(`🔥 智慧單達成: ${stock.name} 觸碰 ${t.triggerPrice}!`); }
            if (t.condition === '<=' && stock.price <= t.triggerPrice) { tripped = true; showToast(`🔥 智慧單達成: ${stock.name} 觸碰 ${t.triggerPrice}!`); }
        }

        if (tripped) {
            t.status = 'triggered';
            submitOrder({
                side: t.side, symbol: t.symbol, priceType: t.executeType, limitPrice: t.orderPrice, shares: t.shares, tif: t.tif || 'ROD', marginType: t.marginType || 'cash'
            }, true);
            triggeredAny = true;
        }
    });
    // Filter out triggered triggers after loop
    state.triggers = state.triggers.filter(t => t.status !== 'triggered' && t.status !== 'canceled');
    return triggeredAny;
}

function checkPendingOrders() {
    if (state.shouldMatchOrders === false || state.shouldMatchOrders === 'failed') {
        return false;
    }
    let triggered = false;
    const now = Date.now();

    state.orders.forEach(o => {
        // Handle normal pending limit orders
        if (o.status === 'pending') {
            const stock = state.marketData.find(s => s.symbol === o.symbol);
            if (!stock) return;

            if (o.side === 'buy' && stock.price <= o.price) {
                o.status = 'executing'; // State lock
                processOrderExecution(o, o.price);
                triggered = true;
            } else if (o.side === 'sell' && stock.price >= o.price) {
                o.status = 'executing'; // State lock
                processOrderExecution(o, o.price);
                triggered = true;
            }
        }

        // Handle disposition delayed orders (Phase 21)
        if (o.status === 'pending-disposition' && now >= o.execTime) {
            const stock = state.marketData.find(s => s.symbol === o.symbol);
            if (!stock) return;

            // For disposition stocks, they match at market price after delay
            processOrderExecution(o, stock.price);
            triggered = true;
            showToast(`✅ 處置股分盤撮合完成：${stock.name} 已成交`);
        }
    });
    return triggered;
}

function updateStockUIHome(stock, tickDiff = 0) {
    const pEl = document.getElementById(`price-${stock.symbol}`);
    const cEl = document.getElementById(`change-${stock.symbol}`);
    if (!pEl || !cEl) return;

    let pctChange = (stock.change / (stock.price - stock.change || 1)) * 100;
    let isLimitUp = !stock.isIndex && stock.price >= stock.limitUp;
    let isLimitDown = !stock.isIndex && stock.price <= stock.limitDown;

    pEl.textContent = stock.isIndex ? stock.price.toFixed(2) : formatNumber(stock.price);
    pEl.classList.remove('text-up', 'text-down', 'text-neutral', 'bg-limit-up', 'bg-limit-down');
    if (isLimitUp) pEl.classList.add('bg-limit-up');
    else if (isLimitDown) pEl.classList.add('bg-limit-down');
    else pEl.classList.add(getColorClass(stock.change));

    if (tickDiff) triggerFlash(pEl, tickDiff);

    if (stock.isIndex) {
        cEl.textContent = `${getSign(stock.change)}${formatNumber(stock.change)} (${getSign(pctChange)}${formatNumber(pctChange)}%)`;
        cEl.classList.remove('text-up', 'text-down', 'text-neutral');
        const tc = getColorClass(stock.change);
        if (tc) cEl.classList.add(tc);
    } else {
        cEl.textContent = `${getSign(stock.change)}${formatNumber(pctChange)}%`;
        cEl.classList.remove('bg-up', 'bg-down', 'text-up', 'text-down', 'text-neutral');
        const bg = getBgClass(stock.change);
        if (bg) cEl.classList.add(bg);
        const tc = getColorClass(stock.change);
        if (tc) cEl.classList.add(tc);
    }
}

function updateStockUIDetail(stock, tickDiff = 0) {
    const pEl = document.getElementById(`detail-price-${stock.symbol}`);
    const cEl = document.getElementById(`detail-change-${stock.symbol}`);
    if (!pEl || !cEl) return;

    let pctChange = (stock.change / (stock.price - stock.change || 1)) * 100;
    let isLimitUp = !stock.isIndex && stock.price >= stock.limitUp;
    let isLimitDown = !stock.isIndex && stock.price <= stock.limitDown;

    pEl.textContent = stock.isIndex ? stock.price.toFixed(2) : formatNumber(stock.price);
    pEl.classList.remove('text-up', 'text-down', 'text-neutral', 'bg-limit-up', 'bg-limit-down');
    if (isLimitUp) pEl.classList.add('bg-limit-up');
    else if (isLimitDown) pEl.classList.add('bg-limit-down');
    else pEl.classList.add(getColorClass(stock.change));

    if (tickDiff) triggerFlash(pEl, tickDiff);

    cEl.textContent = `${getSign(stock.change)}${formatNumber(stock.change)} (${getSign(pctChange)}${formatNumber(pctChange)}%)`;
    cEl.classList.remove('text-up', 'text-down', 'text-neutral');
    cEl.classList.add(getColorClass(stock.change));
}

// --- PnL Alert System (Feature 1) ---
const PNL_ALERT_LEVELS = [-10, -5, 5, 10];
function checkPortfolioPnlAlerts() {
    state.portfolio.forEach(pos => {
        const stock = state.marketData.find(s => s.symbol === pos.symbol);
        if (!stock) return;
        const rate = (stock && stock.isHK) ? CONFIG.HKD_RATE : 1;
        const localAvgPrice = pos.avgPrice / rate;
        const localCost = localAvgPrice * pos.shares;
        const localCurrentVal = stock.price * pos.shares;
        let localPnlPct = localCost > 0 ? ((localCurrentVal - localCost) / localCost) * 100 : 0;
        if (pos.marginType === 'short') localPnlPct = -localPnlPct;
        if (!pos._pnlAlertFired) pos._pnlAlertFired = {};
        PNL_ALERT_LEVELS.forEach(level => {
            const key = String(level);
            if (pos._pnlAlertFired[key]) return;
            const triggered = (level > 0 && localPnlPct >= level) || (level < 0 && localPnlPct <= level);
            if (triggered) {
                pos._pnlAlertFired[key] = true;
                const emoji = level > 0 ? '\uD83C\uDFAF' : '\u26A0\uFE0F';
                const label = level > 0 ? '\u7372\u5229\u9054' : '\u865f\u640d\u9054';
                showToast(emoji + ' ' + pos.name + ' ' + label + ' ' + Math.abs(level) + '%\uff08' + (localPnlPct >= 0 ? '+' : '') + localPnlPct.toFixed(2) + '%\uff09', level > 0 ? 'success' : 'error');
                if (typeof showSystemNotification === 'function') {
                    showSystemNotification('\u6301\u5009\u640d\u76ca\u63d0\u9192', pos.name + ' ' + label + ' ' + Math.abs(level) + '%\uff0c\u76ee\u524d\u5831\u916c\u7387 ' + (localPnlPct >= 0 ? '+' : '') + localPnlPct.toFixed(2) + '%');
                }
            }
        });
    });
}

function startMarketSimulation() {
    window.marketSimInterval = setInterval(() => { // A6: save interval ID
        if (window.checkMarketStatus) window.checkMarketStatus();

        // Stop tick processing if market is closed
        if (state.marketStatus === 'closed') {
            saveState();
            return;
        }

        let triggerRerenderPortfolio = false;
        // 3. Update active pages and Record History
        if (Math.random() > 0.95) recordAssetHistory(); // Sample every ~5 seconds

        state.marketData.forEach(stock => {
            const hasMoved = (state.enablePriceFluctuations !== false) ? window.MockMarketEngine.tick(stock) : 0;
            checkPriceAlerts(stock); // Check alerts for this stock
            if (!hasMoved) return;

            // A3: High/Low already updated in data.js tick() — removed duplicate logic here
            stock.volume += Math.floor(Math.random() * 80);

            // Feed data to the current interval (mimic real-time updates)
            const activeKey = `priceHistory${window.currentInterval}`;
            if (stock[activeKey]) {
                stock[activeKey].push(stock.price);
                if (stock[activeKey].length > 150) stock[activeKey].shift();
            }

            if (state.currentPage === 'home') updateStockUIHome(stock, hasMoved);
            else if (state.currentPage === 'selection') {
                updateStockUIDetail(stock, hasMoved); // Reuse detail update logic (id-price prefix is same)
            }
            else if (state.currentPage === 'stockDetail' && state.currentStock === stock.symbol) {
                updateStockUIDetail(stock, hasMoved);
                if (window.detailTab === 'chart') {
                    initStockChart(stock);
                    const bookEl = document.getElementById('order-book');
                    if (bookEl) bookEl.innerHTML = generateBook(stock);
                    const tsEl = document.getElementById('time-and-sales');
                    if (tsEl) tsEl.innerHTML = renderTimeAndSales(stock);
                }
                if (window.detailTab === 'info') {
                    const lowEl = document.getElementById(`detail-low-${stock.symbol}`); if (lowEl) lowEl.textContent = formatNumber(stock.low);
                    const highEl = document.getElementById(`detail-high-${stock.symbol}`); if (highEl) highEl.textContent = formatNumber(stock.high);
                    const volEl = document.getElementById(`detail-vol-${stock.symbol}`); if (volEl) volEl.textContent = formatNumber(stock.volume, 0);
                }
            }
            else if (state.currentPage === 'portfolio' && window.portfolioTab === 'inventory') {
                updatePortfolioRowUI(stock);
            }
        });

        checkPortfolioPnlAlerts();
        let t1 = checkTriggers();
        let t2 = checkPendingOrders();

        saveState();
    }, 1500);
}

function updatePortfolioRowUI(stock) {
    const pos = state.portfolio.find(p => p.symbol === stock.symbol);
    if (!pos) return;

    const pEl = document.getElementById(`inv-price-${stock.symbol}`);
    const pctEl = document.getElementById(`inv-pnlpct-${stock.symbol}`);
    if (!pEl || !pctEl) return;

    let rate = stock.isHK ? CONFIG.HKD_RATE : 1;
    let localAvgPrice = pos.avgPrice / rate;
    let localCost = localAvgPrice * pos.shares;
    let localCurrentVal = stock.price * pos.shares;
    let localGrossPnl = localCurrentVal - localCost;
    if (pos.marginType === 'short') localGrossPnl = localCost - localCurrentVal;
    let localPnlPct = localCost > 0 ? (localGrossPnl / localCost) * 100 : 0;

    // Update Main Row
    pEl.textContent = formatNumber(stock.price, 3);
    pctEl.textContent = `${getSign(localPnlPct)}${formatNumber(localPnlPct, 2)}%`;
    pctEl.className = `flex:1; font-family:var(--font-mono); font-weight:700; font-size:1.2rem; text-align:right; ${getColorClass(localPnlPct)}`;

    // Update Expanded Section if visible
    const valEl = document.getElementById(`inv-val-${stock.symbol}`);
    const pnlEl = document.getElementById(`inv-pnl-${stock.symbol}`);
    const yieldEl = document.getElementById(`inv-yield-${stock.symbol}`);

    // Bottom Summary Fields
    const sPnlEl = document.getElementById(`summary-pnl-${stock.symbol}`);
    const sPctEl = document.getElementById(`summary-pct-${stock.symbol}`);
    const sValEl = document.getElementById(`summary-val-${stock.symbol}`);

    if (valEl) valEl.textContent = formatNumber(Math.round(localCurrentVal), 0);
    if (pnlEl) {
        pnlEl.textContent = `${getSign(localGrossPnl)}${formatNumber(Math.round(localGrossPnl), 0)}`;
        pnlEl.className = `detail-value ${getColorClass(localGrossPnl)}`;
    }
    if (yieldEl && stock.symbol !== '02940') {
        yieldEl.textContent = `${formatNumber(localPnlPct, 2)}%`;
    }

    if (sPnlEl) {
        sPnlEl.textContent = `${getSign(localGrossPnl)}${formatNumber(Math.round(localGrossPnl), 0)}`;
        sPnlEl.className = `${getColorClass(localGrossPnl)}`;
        sPnlEl.style.fontSize = (sPnlEl.textContent.length > 10 ? '0.9rem' : '1.05rem');
        sPnlEl.style.fontWeight = '700'; sPnlEl.style.fontFamily = 'var(--font-mono)'; sPnlEl.style.textAlign = 'right';
    }
    if (sPctEl) {
        sPctEl.textContent = `${getSign(localPnlPct)}${formatNumber(localPnlPct, 2)}%`;
        sPctEl.className = `${getColorClass(localPnlPct)}`;
        sPctEl.style.fontSize = '1.05rem'; sPctEl.style.fontWeight = '700'; sPctEl.style.fontFamily = 'var(--font-mono)'; sPctEl.style.textAlign = 'right'; sPctEl.style.fontVariantNumeric = 'tabular-nums';
    }
    if (sValEl) {
        sValEl.textContent = formatNumber(Math.round(localCurrentVal), 0);
        sValEl.style.fontSize = (sValEl.textContent.length > 10 ? '0.9rem' : '1.05rem');
    }

    const sCostEl = document.getElementById(`summary-cost-${stock.symbol}`);
    const iCostEl = document.getElementById(`inv-cost-${stock.symbol}`);
    if (sCostEl) sCostEl.textContent = formatNumber(Math.round(localCost), 0);
    if (iCostEl) iCostEl.textContent = formatNumber(Math.round(localCost), 0);
}

function saveState() {
    if (window.isResetting || !window.currentAccountId) return;
    const saveData = {
        balance: state.balance, portfolio: state.portfolio, orders: state.orders,
        history: state.history, triggers: state.triggers, assetHistory: state.assetHistory,
        watchlist: state.watchlist, isLightMode: state.isLightMode, colorMode: state.colorMode,
        alerts: state.alerts, feeDiscount: state.feeDiscount,
        shouldMatchOrders: state.shouldMatchOrders,
        enablePriceFluctuations: state.enablePriceFluctuations,
        savedDate: new Date().toDateString()
    };
    localStorage.setItem('stockState_' + window.currentAccountId, JSON.stringify(saveData));
}

function loadState() {
    if (!window.currentAccountId) return;
    const saved = localStorage.getItem('stockState_' + window.currentAccountId);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.balance !== undefined) state.balance = parsed.balance;
            if (parsed.portfolio) state.portfolio = parsed.portfolio;
            if (parsed.orders) state.orders = parsed.orders;
            if (parsed.history) state.history = parsed.history;
            if (parsed.triggers) state.triggers = parsed.triggers;
            if (parsed.assetHistory) {
                const filtered = parsed.assetHistory.filter(h => h && typeof h === 'object' && 'equity' in h && 'index' in h);
                state.assetHistory = filtered;
            }

            if (parsed.watchlist) state.watchlist = parsed.watchlist;
            if (parsed.alerts) state.alerts = parsed.alerts;
            if (parsed.feeDiscount !== undefined) state.feeDiscount = parsed.feeDiscount;
            if (parsed.shouldMatchOrders !== undefined) state.shouldMatchOrders = parsed.shouldMatchOrders;
            if (parsed.enablePriceFluctuations !== undefined) state.enablePriceFluctuations = parsed.enablePriceFluctuations;

            if (parsed.savedDate && parsed.savedDate !== new Date().toDateString()) {
                state.todayTrades = new Set();
            }
        } catch (e) { }
    }
}

window.resetAppData = () => {
    if (confirm('確定要將帳戶資金重置為 10,000,000 元，並清空所有庫存與歷史紀錄嗎？交易紀錄將無法復原。')) {
        state.balance = 10000000;
        state.portfolio = [];
        state.history = [];
        state.orders = [];
        state.triggers = [];
        state.assetHistory = [];
        state._demoDone = true; // Mark as done so demo data doesn't auto-repopulate
        saveState();
        renderPage('portfolio');
        showToast('帳戶已成功重置為 10,000,000 元');
    }
};

// OS Status Bar Clock - Live Time
function updateOSTime() {
    const timeEl = document.getElementById('os-time');
    if (timeEl) {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        timeEl.textContent = `${h}:${m}`;
    }
}
setInterval(updateOSTime, 1000);
updateOSTime();

// Boot
initApp();

