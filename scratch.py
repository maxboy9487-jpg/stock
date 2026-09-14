import re

with open(r'c:\Users\maxbo\OneDrive\桌面\AI廚房\樹精靈(ios)\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add USD_RATE
content = content.replace('HKD_RATE: 4.05 }', 'HKD_RATE: 4.05, USD_RATE: 32.5 }')

# Fix rates
content = content.replace('let rate = isHK ? CONFIG.HKD_RATE : 1;', 'let rate = (typeof stock !== "undefined" && stock && stock.isUS) ? CONFIG.USD_RATE : (isHK ? CONFIG.HKD_RATE : 1);')
content = content.replace('let rate = stockObj && stockObj.isHK ? CONFIG.HKD_RATE : 1;', 'let rate = stockObj && stockObj.isUS ? CONFIG.USD_RATE : (stockObj && stockObj.isHK ? CONFIG.HKD_RATE : 1);')
content = content.replace('let rate = (stock && stock.isHK) ? CONFIG.HKD_RATE : 1;', 'let rate = (stock && stock.isUS) ? CONFIG.USD_RATE : ((stock && stock.isHK) ? CONFIG.HKD_RATE : 1);')
content = content.replace('let rate = isHKPos ? CONFIG.HKD_RATE : 1;', 'let rate = (stock && stock.isUS) ? CONFIG.USD_RATE : (isHKPos ? CONFIG.HKD_RATE : 1);')
content = content.replace('const r = (st && st.isHK) ? CONFIG.HKD_RATE : 1;', 'const r = (st && st.isUS) ? CONFIG.USD_RATE : ((st && st.isHK) ? CONFIG.HKD_RATE : 1);')
content = content.replace('const refRate = (refStock && refStock.isHK) ? CONFIG.HKD_RATE : 1;', 'const refRate = (refStock && refStock.isUS) ? CONFIG.USD_RATE : ((refStock && refStock.isHK) ? CONFIG.HKD_RATE : 1);')
content = content.replace('const rate = (stockForRate && stockForRate.isHK) ? CONFIG.HKD_RATE : 1;', 'const rate = (stockForRate && stockForRate.isUS) ? CONFIG.USD_RATE : ((stockForRate && stockForRate.isHK) ? CONFIG.HKD_RATE : 1);')
content = content.replace('let rate = stock.isHK ? CONFIG.HKD_RATE : 1;', 'let rate = stock.isUS ? CONFIG.USD_RATE : (stock.isHK ? CONFIG.HKD_RATE : 1);')

# Fix isHK conditions that should also apply to isUS
content = content.replace('if (stock.isHK)', 'if (stock.isHK || stock.isUS)')
content = content.replace('if (stock.isHK &&', 'if ((stock.isHK || stock.isUS) &&')
content = content.replace('if (isHK &&', 'if ((isHK || (stock && stock.isUS)) &&')
content = content.replace('let isHK = stock && stock.isHK;', 'let isHK = stock && stock.isHK;\n    let isUS = stock && stock.isUS;')

# Fix labels
content = content.replace("stock.isHK ? '複委託/港股' : '台股'", "stock.isUS ? '複委託/美股' : (stock.isHK ? '複委託/港股' : '台股')")
content = content.replace("s.isHK ? '(HK)' : ''", "s.isUS ? '(US)' : (s.isHK ? '(HK)' : '')")
content = content.replace("marketName = isHKPos ? '香港' : '台灣';", "marketName = (stock && stock.isUS) ? '美國' : (isHKPos ? '香港' : '台灣');")
content = content.replace("currencyName = isHKPos ? '港幣' : '台幣';", "currencyName = (stock && stock.isUS) ? '美金' : (isHKPos ? '港幣' : '台幣');")
content = content.replace("marketName = isHKLine ? '香港' : '台灣';", "marketName = ((typeof stockO !== 'undefined' && stockO && stockO.isUS) || (typeof stockH !== 'undefined' && stockH && stockH.isUS)) ? '美國' : (isHKLine ? '香港' : '台灣');")
content = content.replace("currencyName = isHKLine ? '港幣' : '台幣';", "currencyName = ((typeof stockO !== 'undefined' && stockO && stockO.isUS) || (typeof stockH !== 'undefined' && stockH && stockH.isUS)) ? '美金' : (isHKLine ? '港幣' : '台幣');")

# Fix lot size min and step
content = content.replace('min="${isHK ? currentLotSize : 1}"', 'min="${(isHK || (typeof isUS !== \'undefined\' && isUS)) ? currentLotSize : 1}"')
content = content.replace('step="${isHK ? currentLotSize : 1}"', 'step="${(isHK || (typeof isUS !== \'undefined\' && isUS)) ? currentLotSize : 1}"')
content = content.replace('${isHK ? `(${currentLotSize} 股為單位)` : \'(自由輸入)\'}', '${(isHK || (typeof isUS !== \'undefined\' && isUS)) ? `(${currentLotSize} 股為單位)` : \'(自由輸入)\'}')

# Fix decimal places for US stocks < 1 just like HK stocks (although not explicitly requested, good to have)
content = content.replace('isHKLine && o.price < 1', '(isHKLine || (stockO && stockO.isUS)) && o.price < 1')
content = content.replace('isHKLine && execAvgPrice < 1', '(isHKLine || (stockO && stockO.isUS)) && execAvgPrice < 1')
content = content.replace('isHKLine && tradePrice < 1', '(isHKLine || (stockH && stockH.isUS)) && tradePrice < 1')

# Write back
with open(r'c:\Users\maxbo\OneDrive\桌面\AI廚房\樹精靈(ios)\app.js', 'w', encoding='utf-8') as f:
    f.write(content)
