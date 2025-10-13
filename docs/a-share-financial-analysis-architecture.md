# A股财报风险分析系统架构设计文档

> 创建时间：2025-01-XX
> 更新时间：2025-01-XX
> 状态：设计阶段
> 市场：中国A股市场

## 目录
- [概述](#概述)
- [A股市场特点](#a股市场特点)
- [数据源方案](#数据源方案)
- [数据库架构](#数据库架构)
- [A股特色风险模型](#a股特色风险模型)
- [用户体验流程](#用户体验流程)
- [实施路线图](#实施路线图)

---

## 概述

为A股散户投资者打造一个**嵌入在AI对话中的财报风险分析系统**，通过分析上市公司5年以上的财务数据，识别潜在财务风险，特别关注**ST预警、财务造假检测、退市风险**等A股特有问题。

### 核心特点
- ✅ **对话式交互**：在现有聊天流程中无缝嵌入分析
- ✅ **A股本土化**：适配中国会计准则、ST制度、涨跌停限制
- ✅ **免费数据源**：基于AKShare开源库（无需付费）
- ✅ **多年度分析**：支持5-10年历史趋势分析
- ✅ **智能缓存**：避免重复爬取数据
- ✅ **ST风险预警**：提前识别退市风险

---

## A股市场特点

### 与美股的关键差异

| 特征 | A股 | 美股 |
|-----|-----|-----|
| **股票代码** | 6位数字 (000001.SZ) | 字母代码 (AAPL) |
| **交易所** | 上交所、深交所、北交所 | NYSE, NASDAQ |
| **涨跌幅限制** | 10%（科创板20%，ST 5%） | 无限制 |
| **财报频率** | 季报（4次/年）+ 年报 | 季报（4次/年）|
| **会计准则** | 中国会计准则（CAS） | US-GAAP |
| **特殊制度** | ST/\*ST/退市 | 无 |
| **关键指标** | 扣非净利润、净资产 | GAAP净利润 |
| **做空机制** | 限制较多 | 自由做空 |
| **信息披露** | 巨潮资讯网 | SEC EDGAR |

### A股特有风险点

1. **ST风险**（Special Treatment）
   - 连续2年亏损 → ST
   - 连续3年亏损 → \*ST
   - 连续4年亏损 → 退市风险

2. **财务造假风险**
   - 关联交易、虚增收入、隐藏负债
   - 审计意见：保留意见、无法表示意见、否定意见

3. **大股东掏空风险**
   - 占用资金、违规担保、关联交易

4. **退市风险**
   - 净资产为负
   - 营收低于1亿元
   - 股价连续20日低于1元

---

## 数据源方案

### 推荐方案：AKShare ⭐ 主数据源

**为什么选择AKShare？**
- ✅ **完全免费开源**：无需API Key，无积分限制
- ✅ **数据全面**：覆盖A股所有财报、行情、公告
- ✅ **更新活跃**：社区维护，持续更新接口
- ✅ **易于集成**：Python库，直接调用
- ✅ **数据源权威**：来自巨潮资讯、新浪财经、东方财富

**安装**：
```bash
pip install akshare --upgrade
```

### AKShare核心接口

#### 1. 获取A股列表
```python
import akshare as ak

# 获取所有A股股票列表
stock_list = ak.stock_info_a_code_name()
# 返回: code, name
# 示例: 000001, 平安银行
```

#### 2. 获取财务报表

```python
# 利润表（新浪财经源）
income_df = ak.stock_financial_report_sina(
    stock="600519",  # 贵州茅台
    symbol="利润表"
)

# 资产负债表
balance_df = ak.stock_financial_report_sina(
    stock="600519",
    symbol="资产负债表"
)

# 现金流量表
cashflow_df = ak.stock_financial_report_sina(
    stock="600519",
    symbol="现金流量表"
)

# 主要财务指标（东方财富源）
indicators_df = ak.stock_financial_analysis_indicator(
    symbol="600519",
    start_year="2019"
)
# 返回：ROE、毛利率、净利率、流动比率、速动比率等
```

#### 3. ST股票查询
```python
# 获取ST股票列表
st_list = ak.stock_zh_a_st_em()
# 返回：代码、名称、ST原因、ST日期
```

#### 4. 财务公告
```python
# 获取业绩预告
performance_df = ak.stock_yjyg_em(date="2024-12-31")

# 获取年报披露时间
annual_report_date = ak.stock_report_disclosure()
```

#### 5. 审计意见
```python
# 获取审计意见（从年报中提取）
# 需要通过巨潮资讯API抓取PDF解析
```

### 备选方案：Tushare Pro

**特点**：
- 💰 需要积分（每日500次免费额度）
- ✅ 数据质量更高、更规范
- ✅ 支持财务数据回溯

**适用场景**：
- 需要高频实时数据
- 机构级数据质量要求
- 有预算支持

```python
import tushare as ts

ts.set_token('your_token')
pro = ts.pro_api()

# 获取财务指标
df = pro.fina_indicator(
    ts_code='600519.SH',
    start_date='20190101',
    end_date='20241231'
)
```

### 数据源对比

| 数据源 | 成本 | 数据质量 | 更新频率 | 易用性 | 推荐度 |
|-------|------|---------|---------|--------|--------|
| **AKShare** | 免费 | ⭐⭐⭐⭐ | 日更 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Tushare Pro** | 付费/积分 | ⭐⭐⭐⭐⭐ | 实时 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **巨潮资讯** | 免费 | ⭐⭐⭐⭐⭐ | 官方 | ⭐⭐⭐ | ⭐⭐⭐ |
| **Wind/同花顺** | 昂贵 | ⭐⭐⭐⭐⭐ | 实时 | ⭐⭐⭐⭐ | ⭐⭐ |

**结论**：初期使用**AKShare**，后期如有需求升级到**Tushare Pro**。

---

## 数据库架构

### Supabase Schema（A股版）

#### 1. a_share_stocks（A股股票表）
```sql
CREATE TABLE a_share_stocks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_code TEXT UNIQUE NOT NULL,      -- 股票代码 (000001)
  stock_name TEXT NOT NULL,             -- 股票名称
  market TEXT NOT NULL,                 -- 市场 (SH/SZ/BJ)
  full_code TEXT GENERATED ALWAYS AS    -- 完整代码 (000001.SZ)
    (stock_code || '.' || market) STORED,
  industry TEXT,                        -- 行业
  sector TEXT,                          -- 板块
  listing_date DATE,                    -- 上市日期
  is_st BOOLEAN DEFAULT false,          -- 是否ST
  st_reason TEXT,                       -- ST原因
  st_date DATE,                         -- ST日期
  delisting_risk BOOLEAN DEFAULT false, -- 退市风险
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stocks_code ON a_share_stocks(stock_code);
CREATE INDEX idx_stocks_st ON a_share_stocks(is_st) WHERE is_st = true;
```

#### 2. a_share_financials（财务报表表）
```sql
CREATE TABLE a_share_financials (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_code TEXT NOT NULL REFERENCES a_share_stocks(stock_code),
  report_date DATE NOT NULL,            -- 报告期 (2024-12-31)
  report_type TEXT NOT NULL,            -- 报表类型 (年报/一季报/中报/三季报)
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter INTEGER,               -- 1-4
  
  -- 利润表
  revenue NUMERIC(20, 2),               -- 营业收入
  operating_costs NUMERIC(20, 2),       -- 营业成本
  gross_profit NUMERIC(20, 2),          -- 营业毛利
  operating_profit NUMERIC(20, 2),      -- 营业利润
  total_profit NUMERIC(20, 2),          -- 利润总额
  net_profit NUMERIC(20, 2),            -- 净利润
  deducted_net_profit NUMERIC(20, 2),   -- 扣非净利润 ⭐ A股特有
  basic_eps NUMERIC(10, 4),             -- 基本每股收益
  
  -- 资产负债表
  total_assets NUMERIC(20, 2),          -- 资产总计
  current_assets NUMERIC(20, 2),        -- 流动资产
  non_current_assets NUMERIC(20, 2),    -- 非流动资产
  total_liabilities NUMERIC(20, 2),     -- 负债合计
  current_liabilities NUMERIC(20, 2),   -- 流动负债
  total_equity NUMERIC(20, 2),          -- 所有者权益 ⭐ 关键指标
  
  -- 现金流量表
  operating_cash_flow NUMERIC(20, 2),   -- 经营活动现金流
  investing_cash_flow NUMERIC(20, 2),   -- 投资活动现金流
  financing_cash_flow NUMERIC(20, 2),   -- 筹资活动现金流
  
  -- 计算指标
  roe NUMERIC(8, 4),                    -- 净资产收益率 ⭐
  roa NUMERIC(8, 4),                    -- 总资产收益率
  gross_margin NUMERIC(8, 4),           -- 毛利率
  net_margin NUMERIC(8, 4),             -- 净利率
  current_ratio NUMERIC(8, 4),          -- 流动比率
  quick_ratio NUMERIC(8, 4),            -- 速动比率
  asset_liability_ratio NUMERIC(8, 4),  -- 资产负债率
  
  -- 元数据
  data_source TEXT DEFAULT 'akshare',   -- 数据来源
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(stock_code, report_date, report_type)
);

CREATE INDEX idx_financials_code_date ON a_share_financials(stock_code, report_date DESC);
```

#### 3. a_share_risk_analyses（风险分析表）
```sql
CREATE TABLE a_share_risk_analyses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_code TEXT NOT NULL REFERENCES a_share_stocks(stock_code),
  analysis_type TEXT NOT NULL,          -- 'multi-year', 'st-warning', 'fraud-detection'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- 综合评分
  overall_risk_score NUMERIC(5, 2),     -- 0-100，越高风险越大
  risk_level TEXT,                      -- '低风险', '中风险', '高风险', '极高风险'
  
  -- A股特色评分
  st_risk_score NUMERIC(5, 2),          -- ST风险评分 0-100
  st_probability NUMERIC(5, 4),         -- ST概率 0-1
  delisting_risk_score NUMERIC(5, 2),   -- 退市风险评分
  fraud_risk_score NUMERIC(5, 2),       -- 造假风险评分
  
  -- 传统评分
  z_score NUMERIC(8, 4),                -- 修正Z-Score（适配A股）
  f_score INTEGER,                      -- Piotroski F-Score 0-9
  
  -- 趋势标识
  revenue_trend TEXT,
  profitability_trend TEXT,
  cash_flow_trend TEXT,
  equity_trend TEXT,                    -- 净资产趋势 ⭐
  
  -- 风险因素
  risk_factors JSONB,                   -- [{type, severity, description, evidence}]
  
  -- 完整报告
  analysis_report JSONB,
  
  -- 元数据
  status TEXT DEFAULT 'processing',
  error_message TEXT,
  processing_time_ms INTEGER,
  requested_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_analyses_code ON a_share_risk_analyses(stock_code, created_at DESC);
CREATE INDEX idx_analyses_st_risk ON a_share_risk_analyses(st_probability DESC);
```

#### 4. a_share_st_records（ST记录表）
```sql
CREATE TABLE a_share_st_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_code TEXT NOT NULL REFERENCES a_share_stocks(stock_code),
  st_type TEXT NOT NULL,                -- 'ST', '*ST', '退市整理'
  st_reason TEXT,                       -- ST原因
  st_date DATE NOT NULL,                -- ST实施日期
  removed_date DATE,                    -- 摘帽日期
  is_active BOOLEAN DEFAULT true,       -- 是否仍在ST
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_st_records_code ON a_share_st_records(stock_code);
CREATE INDEX idx_st_active ON a_share_st_records(is_active) WHERE is_active = true;
```

#### 5. a_share_audit_opinions（审计意见表）
```sql
CREATE TABLE a_share_audit_opinions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_code TEXT NOT NULL REFERENCES a_share_stocks(stock_code),
  fiscal_year INTEGER NOT NULL,
  opinion_type TEXT NOT NULL,           -- '标准无保留', '保留意见', '无法表示', '否定意见'
  auditor TEXT,                         -- 审计机构
  opinion_detail TEXT,                  -- 审计意见详情
  emphasis_of_matter TEXT,              -- 强调事项段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(stock_code, fiscal_year)
);

CREATE INDEX idx_audit_code_year ON a_share_audit_opinions(stock_code, fiscal_year DESC);
CREATE INDEX idx_audit_non_standard ON a_share_audit_opinions(opinion_type) 
  WHERE opinion_type != '标准无保留';
```

---

## A股特色风险模型

### 1. ST风险预警模型（XGBoost）⭐ 核心

基于BigQuant研究，AUC=0.997的高精度模型。

#### 关键特征（约60个因子）

**财务类因子（主导）**：
```python
# 盈利能力
- 扣非净利润（连续性）
- 扣非净利润 / 净利润 比值（利润质量）
- 净资产（绝对值）
- 净资产收益率ROE
- 总资产收益率ROA

# 偿债能力
- 流动比率
- 速动比率
- 资产负债率
- 利息保障倍数

# 现金流
- 经营现金流 / 净利润
- 自由现金流
- 现金流连续为负次数

# 成长性
- 营收同比增长率
- 净利润同比增长率
- 扣非净利润同比增长率

# 审计信号
- 审计意见类型（哑变量）
- 审计机构变更次数
```

**市场类因子**：
```python
- 市盈率PE（TTM）
- 市净率PB
- 换手率
- 股价波动率
- 相对大盘表现
```

**时间因素**：
```python
- 年报季节（3-4月）ST概率显著增加
- 距离上次财报时间
```

#### ST判定规则（2023新规）

```python
def check_st_risk(financials: List[Financial]) -> STRisk:
    """
    ST风险判定逻辑
    """
    # 1. 连续亏损检查
    consecutive_loss = 0
    for f in financials[-3:]:  # 最近3年
        if f.deducted_net_profit < 0:
            consecutive_loss += 1
    
    if consecutive_loss >= 2:
        risk_level = 'high'
        st_probability = 0.8
    
    # 2. 净资产为负
    if financials[0].total_equity < 0:
        risk_level = 'critical'
        st_probability = 0.95
    
    # 3. 营收低于1亿
    if financials[0].revenue < 1e8:
        risk_level = 'high'
        st_probability = 0.7
    
    # 4. 审计意见异常
    if audit_opinion != '标准无保留':
        st_probability *= 1.5
    
    return STRisk(
        level=risk_level,
        probability=min(st_probability, 1.0),
        reasons=[...]
    )
```

#### 模型实现

```typescript
// lib/financial-analysis/st-risk-predictor.ts

export class STRiskPredictor {
  /**
   * ST风险预测（基于规则引擎 + ML模型）
   */
  async predictSTRisk(
    stockCode: string, 
    financials: AShareFinancial[]
  ): Promise<STRiskResult> {
    
    // 1. 规则引擎初筛
    const ruleBasedRisk = this.ruleBasedSTCheck(financials);
    
    if (ruleBasedRisk.probability > 0.8) {
      // 高风险直接返回
      return ruleBasedRisk;
    }
    
    // 2. ML模型精细预测（可选，需训练XGBoost模型）
    // const mlRisk = await this.mlSTPredict(stockCode, financials);
    
    return ruleBasedRisk;
  }
  
  /**
   * 规则引擎：基于新规判定
   */
  private ruleBasedSTCheck(financials: AShareFinancial[]): STRiskResult {
    const risks = [];
    let probability = 0;
    
    // 检查1：连续亏损
    const recentYears = financials.slice(0, 3);
    const lossYears = recentYears.filter(f => f.deducted_net_profit < 0).length;
    
    if (lossYears >= 2) {
      probability += 0.6;
      risks.push({
        type: 'consecutive_loss',
        severity: 'high',
        description: `最近${lossYears}年扣非净利润为负`,
        evidence: recentYears.map(f => ({
          year: f.fiscal_year,
          deducted_net_profit: f.deducted_net_profit
        }))
      });
    }
    
    // 检查2：净资产为负
    if (financials[0].total_equity < 0) {
      probability += 0.8;
      risks.push({
        type: 'negative_equity',
        severity: 'critical',
        description: `净资产为负（${(financials[0].total_equity / 1e8).toFixed(2)}亿元）`,
        evidence: { equity: financials[0].total_equity }
      });
    }
    
    // 检查3：营收过低
    if (financials[0].revenue < 1e8) {
      probability += 0.5;
      risks.push({
        type: 'low_revenue',
        severity: 'high',
        description: `营业收入低于1亿元（${(financials[0].revenue / 1e8).toFixed(2)}亿）`,
        evidence: { revenue: financials[0].revenue }
      });
    }
    
    // 检查4：ROE持续低迷
    const avgROE = this.mean(recentYears.map(f => f.roe));
    if (avgROE < 0.03) {  // 低于3%
      probability += 0.3;
      risks.push({
        type: 'poor_roe',
        severity: 'medium',
        description: `近3年平均ROE仅${(avgROE * 100).toFixed(2)}%，盈利能力弱`,
        evidence: { avg_roe: avgROE }
      });
    }
    
    // 检查5：资产负债率过高
    const latest = financials[0];
    const debtRatio = latest.total_liabilities / latest.total_assets;
    if (debtRatio > 0.8) {
      probability += 0.4;
      risks.push({
        type: 'high_leverage',
        severity: 'high',
        description: `资产负债率${(debtRatio * 100).toFixed(1)}%，债务压力大`,
        evidence: { debt_ratio: debtRatio }
      });
    }
    
    // 概率限制在0-1
    probability = Math.min(probability, 1.0);
    
    return {
      probability,
      level: this.getRiskLevel(probability),
      risks,
      recommendation: this.getSTRecommendation(probability, risks)
    };
  }
  
  private getRiskLevel(prob: number): string {
    if (prob > 0.7) return '极高风险';
    if (prob > 0.5) return '高风险';
    if (prob > 0.3) return '中风险';
    return '低风险';
  }
  
  private getSTRecommendation(prob: number, risks: any[]): string {
    if (prob > 0.7) {
      return '⚠️ 强烈建议规避！公司面临严重财务困境，ST或退市风险极高。';
    } else if (prob > 0.5) {
      return '⚠️ 建议谨慎！公司财务状况堪忧，存在较大ST风险。';
    } else if (prob > 0.3) {
      return '⚠️ 需关注风险点，密切跟踪财报变化。';
    } else {
      return '✅ ST风险较低，但仍需关注基本面变化。';
    }
  }
}
```

### 2. 修正Z-Score模型（适配A股）

原始Z-Score需调整以适应A股特点：

```typescript
// lib/financial-analysis/z-score-china.ts

export class ChinaZScoreCalculator {
  /**
   * A股修正Z-Score计算
   * 
   * 原始公式：Z = 1.2X1 + 1.4X2 + 3.3X3 + 0.6X4 + 0.999X5
   * 
   * 修正要点：
   * 1. X4使用账面价值而非市值（A股市值波动大）
   * 2. 调整权重系数以适应中国企业特征
   */
  calculateZScore(financial: AShareFinancial): ZScoreResult {
    const {
      total_assets,
      current_assets,
      current_liabilities,
      total_equity,
      total_liabilities,
      operating_profit,
      revenue
    } = financial;
    
    // X1: 营运资本 / 总资产（流动性）
    const workingCapital = current_assets - current_liabilities;
    const x1 = workingCapital / total_assets;
    
    // X2: 留存收益 / 总资产（累积盈利能力）
    // 简化：使用总权益代替
    const x2 = total_equity / total_assets;
    
    // X3: 息税前利润 / 总资产（盈利能力）
    const x3 = operating_profit / total_assets;
    
    // X4: 所有者权益 / 总负债（杠杆）⭐ 修正点
    const x4 = total_equity / total_liabilities;
    
    // X5: 销售收入 / 总资产（资产周转）
    const x5 = revenue / total_assets;
    
    // 修正权重（针对A股）
    const z = 
      1.0 * x1 +    // 降低流动性权重（A股现金流管理较弱）
      1.5 * x2 +    // 提高权益权重（净资产重要性）
      3.0 * x3 +    // 保持盈利能力权重
      0.8 * x4 +    // 提高杠杆权重（A股高杠杆常见）
      0.8 * x5;     // 降低周转权重
    
    // A股判定区间（调整后）
    let risk: 'safe' | 'gray' | 'distress';
    let zone: string;
    
    if (z > 2.6) {
      risk = 'safe';
      zone = '安全区';
    } else if (z > 1.5) {
      risk = 'gray';
      zone = '灰色区';
    } else {
      risk = 'distress';
      zone = '困境区';
    }
    
    return {
      score: z,
      risk,
      zone,
      components: { x1, x2, x3, x4, x5 },
      interpretation: this.interpretZScore(z)
    };
  }
  
  private interpretZScore(z: number): string {
    if (z > 2.6) {
      return '财务状况健康，短期内破产风险极低。';
    } else if (z > 1.5) {
      return '财务状况一般，需警惕潜在风险，建议密切关注。';
    } else {
      return '⚠️ 财务困境风险高，可能面临ST或退市，建议规避。';
    }
  }
}
```

### 3. 财务造假检测模型

基于Beneish M-Score和中国特色指标：

```typescript
// lib/financial-analysis/fraud-detector.ts

export class FraudDetector {
  /**
   * 财务造假风险检测
   */
  detectFraudRisk(
    current: AShareFinancial,
    previous: AShareFinancial
  ): FraudRiskResult {
    const signals = [];
    let fraudScore = 0;
    
    // 信号1：扣非净利润 vs 净利润差异巨大
    const nonRecurringRatio = Math.abs(
      (current.net_profit - current.deducted_net_profit) / current.net_profit
    );
    
    if (nonRecurringRatio > 0.5) {
      fraudScore += 25;
      signals.push({
        name: '非经常性损益占比过高',
        value: nonRecurringRatio,
        threshold: 0.5,
        description: `非经常性损益占净利润${(nonRecurringRatio * 100).toFixed(1)}%，可能存在利润调节`
      });
    }
    
    // 信号2：应收账款异常增长
    const receivableGrowth = (current.accounts_receivable - previous.accounts_receivable) 
                            / previous.accounts_receivable;
    const revenueGrowth = (current.revenue - previous.revenue) / previous.revenue;
    
    if (receivableGrowth > revenueGrowth * 1.5) {
      fraudScore += 30;
      signals.push({
        name: '应收账款增速远超收入',
        description: `应收账款增长${(receivableGrowth * 100).toFixed(1)}%，收入增长${(revenueGrowth * 100).toFixed(1)}%，可能虚增收入`
      });
    }
    
    // 信号3：经营现金流与净利润背离
    const cashProfitRatio = current.operating_cash_flow / current.net_profit;
    
    if (cashProfitRatio < 0.5 && current.net_profit > 0) {
      fraudScore += 20;
      signals.push({
        name: '盈利质量差',
        description: '经营现金流远低于净利润，盈利可能不真实'
      });
    }
    
    // 信号4：关联交易比例过高（需从年报中提取）
    // 信号5：审计机构变更
    // 信号6：大额其他应收款
    // ...
    
    return {
      fraudScore,
      riskLevel: this.getFraudRiskLevel(fraudScore),
      signals,
      recommendation: this.getFraudRecommendation(fraudScore)
    };
  }
  
  private getFraudRiskLevel(score: number): string {
    if (score > 70) return '极高风险';
    if (score > 50) return '高风险';
    if (score > 30) return '中风险';
    return '低风险';
  }
}
```

### 4. 综合风险评分

```typescript
// lib/financial-analysis/comprehensive-risk-scorer.ts

export class ComprehensiveRiskScorer {
  calculateOverallRisk(
    financials: AShareFinancial[],
    stRisk: STRiskResult,
    zScore: ZScoreResult,
    fScore: PiotroskiResult,
    fraudRisk: FraudRiskResult
  ): OverallRiskResult {
    
    let riskScore = 50;  // 基准分
    
    // 1. ST风险影响（权重40%）⭐ A股最重要
    riskScore += (stRisk.probability * 40);
    
    // 2. Z-Score影响（权重20%）
    if (zScore.score > 2.6) {
      riskScore -= 20;
    } else if (zScore.score < 1.5) {
      riskScore += 20;
    }
    
    // 3. Piotroski F-Score影响（权重15%）
    if (fScore.score >= 7) {
      riskScore -= 15;
    } else if (fScore.score <= 3) {
      riskScore += 15;
    }
    
    // 4. 造假风险影响（权重15%）
    riskScore += (fraudRisk.fraudScore * 0.15);
    
    // 5. 趋势影响（权重10%）
    const trends = this.analyzeTrends(financials);
    if (trends.equity_trend === 'declining') {
      riskScore += 10;  // 净资产持续下降
    }
    
    riskScore = Math.max(0, Math.min(100, riskScore));
    
    return {
      score: riskScore,
      level: this.getRiskLevel(riskScore),
      emoji: this.getRiskEmoji(riskScore),
      breakdown: {
        st_weight: 40,
        z_score_weight: 20,
        f_score_weight: 15,
        fraud_weight: 15,
        trend_weight: 10
      }
    };
  }
  
  private getRiskLevel(score: number): string {
    if (score < 30) return '✅ 低风险';
    if (score < 50) return '⚠️ 中低风险';
    if (score < 70) return '🔶 中高风险';
    return '🔴 高风险';
  }
}
```

---

## 用户体验流程

### 对话式分析示例

```
用户: 帮我分析贵州茅台（600519）过去5年的财务风险

AI: 🔍 正在启动A股深度分析...

[调用 AKShare 获取数据]
✅ 已获取 600519 贵州茅台 2020-2024 年度财报数据

📊 基础指标统计中...
- 2024年营收: 1,506.7亿元 (+3.2% YoY)
- 2024年净利润: 747.4亿元 (+10.2% YoY)
- 2024年扣非净利润: 744.1亿元 ✅（占比99.6%）

🔍 风险评估中...

### ⚠️ ST风险检测
- ST概率: 0.02% ✅（极低）
- 净资产: 2,234亿元 ✅
- 连续盈利: 20年+ ✅
- 结论: **无ST风险**

### 📈 Z-Score分析
- Z-Score: 5.28 ✅（安全区 > 2.6）
- 破产风险: 极低
- 财务稳健性: 优秀

### 💎 Piotroski F-Score
- F-Score: 8/9 ✅（财务强健）
- 盈利能力: ✅✅✅✅（4/4）
- 杠杆/流动性: ✅✅✅（3/3）
- 运营效率: ✅✅（2/2）

### 🔍 造假风险检测
- 造假风险: 5/100 ✅（极低）
- 扣非净利润占比: 99.6% ✅（利润质量高）
- 现金流 / 净利润: 1.12 ✅（盈利质量优秀）

---

## 综合评估

**风险等级**: ✅ 低风险 (18/100)

贵州茅台财务状况极为优秀，盈利能力强，现金流充沛，
无任何ST或退市风险。是A股市场中**财务最健康**的公司之一。

---

## 5年趋势分析 (2020-2024)

### 📈 营收与利润
- 营收CAGR: +11.2%（稳定增长）
- 净利润CAGR: +14.8%（超过营收增速 ✅）
- 毛利率: 91.3%（行业最高）

### 💰 盈利能力
- ROE: 33.5% ✅（持续高位）
- 净利率: 49.6% ✅（A股最高之一）

### 💵 现金流
- 经营现金流: 835亿元
- 现金流/净利润: 1.12 ✅（盈利质量极高）
- 货币资金: 1,659亿元 ✅

### ⚖️ 资产负债
- 资产负债率: 22.1% ✅（极低）
- 流动比率: 5.21 ✅（流动性充足）

---

## 📊 详细数据（最近3年）

| 指标 | 2024 | 2023 | 2022 |
|-----|------|------|------|
| 营业收入(亿) | 1,506.7 | 1,460.2 | 1,240.3 |
| 净利润(亿) | 747.4 | 678.1 | 627.2 |
| 扣非净利润(亿) | 744.1 | 675.8 | 624.9 |
| ROE | 33.5% | 32.8% | 34.2% |
| 资产负债率 | 22.1% | 23.4% | 24.8% |
| 经营现金流(亿) | 835.2 | 763.4 | 698.5 |

---

## ⚠️ 风险提示

虽然财务极为健康，但仍需关注：

1. **行业政策风险** ⚠️
   - 白酒行业受政策监管影响较大
   
2. **市场估值风险** ⚠️
   - PE(TTM): 35倍，处于历史中位
   
3. **增速放缓** ⚠️
   - 营收增速从两位数降至个位数

---

## 🎯 投资建议

### 优势
1. ✅ 品牌护城河：茅台品牌价值无可替代
2. ✅ 定价权：产品供不应求，主动涨价能力强
3. ✅ 现金奶牛：每年分红率50%+
4. ✅ 无债务压力：资产负债率仅22%

### 结论
贵州茅台是**极低风险、高质量**的价值投资标的，
适合稳健型长期投资者。财务风险几乎为零。

**建议持有或逢低买入** ✅

---

📎 数据来源: AKShare (新浪财经/东方财富)
📅 分析时间: 2025-01-XX
⚠️ 免责声明: 本分析仅供参考，不构成投资建议
```

---

## 实施路线图

### Phase 1: 基础设施 (Week 1-2)

- [ ] **Supabase配置**
  - [ ] 创建Supabase项目
  - [ ] 执行A股schema迁移脚本
  - [ ] 配置RLS策略
  - [ ] 测试数据库连接

- [ ] **AKShare集成**
  - [ ] 安装AKShare库
  - [ ] 封装数据获取API
  - [ ] 测试财报数据获取
  - [ ] 实现数据缓存逻辑

- [ ] **开发MCP服务器（可选）**
  - [ ] 创建akshare-mcp-server
  - [ ] 封装常用接口为MCP工具
  - [ ] 测试与AI对话集成

### Phase 2: 数据层 (Week 3-4)

- [ ] **数据采集器**
  ```typescript
  class AShareDataFetcher {
    - fetchStockList()
    - fetchFinancials(stockCode, years)
    - fetchSTList()
    - fetchAuditOpinions()
    - cacheToSupabase()
  }
  ```

- [ ] **数据清洗与标准化**
  - [ ] 统一字段命名
  - [ ] 处理缺失值
  - [ ] 单位转换（元 → 亿元）
  - [ ] 日期格式标准化

### Phase 3: 分析引擎 (Week 5-6)

- [ ] **ST风险预测器**
  ```typescript
  class STRiskPredictor {
    - ruleBasedSTCheck()
    - calculateSTrProbability()
    - identifySTRiskFactors()
  }
  ```

- [ ] **Z-Score计算器（A股版）**
  ```typescript
  class ChinaZScoreCalculator {
    - calculateZScore()
    - interpretZScore()
  }
  ```

- [ ] **造假风险检测器**
  ```typescript
  class FraudDetector {
    - detectFraudRisk()
    - checkEarningsQuality()
    - analyzeReceivables()
  }
  ```

- [ ] **综合风险评分器**
  ```typescript
  class ComprehensiveRiskScorer {
    - calculateOverallRisk()
    - generateRiskReport()
  }
  ```

### Phase 4: API与后台任务 (Week 7-8)

- [ ] **API端点**
  - [ ] POST /api/a-share/analysis
  - [ ] GET /api/a-share/analysis/:id
  - [ ] GET /api/a-share/st-list
  - [ ] GET /api/a-share/stock/search

- [ ] **Supabase Edge Functions**
  - [ ] analyze-multi-year (后台分析)
  - [ ] update-st-list (定时更新ST列表)
  - [ ] cache-financials (批量缓存财报)

### Phase 5: UI集成 (Week 9-10)

- [ ] **对话流集成**
  - [ ] 意图识别（"分析贵州茅台"）
  - [ ] 股票代码解析（600519 / 贵州茅台）
  - [ ] 流式展示分析进度
  - [ ] 格式化风险报告

- [ ] **H5移动优化**
  - [ ] 风险指标卡片
  - [ ] 数据表格横向滚动
  - [ ] 趋势图表（可选：ECharts）

### Phase 6: 测试与上线 (Week 11-12)

- [ ] **功能测试**
  - [ ] 测试10+个代表性公司（茅台、平安、*ST股等）
  - [ ] ST预测准确率验证
  - [ ] 边界情况测试

- [ ] **性能优化**
  - [ ] 缓存命中率优化
  - [ ] 批量数据获取优化
  - [ ] 响应时间优化（< 5秒）

- [ ] **部署上线**
  - [ ] Vercel生产部署
  - [ ] Supabase生产配置
  - [ ] 监控告警设置

---

## 附录

### A. AKShare主要接口速查

```python
import akshare as ak

# 1. 股票列表
stock_list = ak.stock_info_a_code_name()

# 2. 财务报表（新浪源）
income = ak.stock_financial_report_sina(stock="600519", symbol="利润表")
balance = ak.stock_financial_report_sina(stock="600519", symbol="资产负债表")
cashflow = ak.stock_financial_report_sina(stock="600519", symbol="现金流量表")

# 3. 财务指标（东方财富源）
indicators = ak.stock_financial_analysis_indicator(
    symbol="600519", 
    start_year="2019"
)

# 4. ST股票
st_stocks = ak.stock_zh_a_st_em()

# 5. 业绩预告
performance = ak.stock_yjyg_em(date="2024-12-31")

# 6. 实时行情
realtime = ak.stock_zh_a_spot_em()

# 7. 历史行情
hist = ak.stock_zh_a_hist(
    symbol="600519",
    period="daily",
    start_date="20200101",
    end_date="20241231",
    adjust="qfq"  # 前复权
)
```

### B. 环境变量

```bash
# .env.local

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# AKShare（无需API Key）
# 无需配置

# AI Providers（现有）
GROQ_API_KEY=gsk_xxx...
XAI_API_KEY=xai_xxx...
```

### C. 数据库迁移脚本

见附件：`migrations/001_create_a_share_tables.sql`

### D. 测试股票清单

| 类型 | 股票代码 | 股票名称 | 测试目的 |
|-----|---------|---------|---------|
| 优质股 | 600519 | 贵州茅台 | 低风险基准 |
| 优质股 | 000858 | 五粮液 | 行业对比 |
| 成长股 | 300750 | 宁德时代 | 新能源行业 |
| 金融股 | 601318 | 中国平安 | 金融行业特征 |
| ST股 | 600634 | *ST富控 | 高风险测试 |
| 退市股 | 002680 | *ST长生 | 极端情况 |
| 周期股 | 600028 | 中国石化 | 周期性分析 |

---

## 参考资料

### 开源工具
- [AKShare文档](https://akshare.akfamily.xyz/)
- [Tushare Pro文档](https://tushare.pro/document/2)
- [Supabase文档](https://supabase.com/docs)

### 研究论文
- [基于XGBoost的股票ST风险预警模型 - BigQuant](https://bigquant.com/square/paper/a7596f3c-983d-4fad-97a6-17b918471520)
- [基于XGBoost算法的上市公司财务风险预警研究](https://pdf.hanspub.org/fin2025152_121141239.pdf)
- [基于Aalen可加模型的中国上市公司ST预测](https://xtglxb.sjtu.edu.cn/CN/abstract/abstract824.shtml)

### 法规文件
- [上交所退市新规（2023）](http://www.sse.com.cn/)
- [深交所退市新规（2023）](http://www.szse.cn/)
- [中国会计准则](http://www.casc.org.cn/)

---

**文档维护者**: Droid (Factory AI)  
**最后更新**: 2025-01-XX  
**版本**: 1.0.0 (A股专版)
