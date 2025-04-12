document.addEventListener('DOMContentLoaded', function() {
    // 更新模型说明
    document.getElementById('modelExplanation').innerHTML = generateInitialExplanation(currentLanguage);
    function updateModelExplanation(type) {
        const explanations = {
            european: `
                <h3>Black-Scholes模型</h3>
                <p>Black-Scholes模型是由Fischer Black和Myron Scholes于1973年提出的期权定价模型，用于计算欧式期权的理论价格。</p>
                
                <h4>看涨期权(Call)公式:</h4>
                <p>C = S * e<sup>-q*T</sup> * N(d<sub>1</sub>) - K * e<sup>-r*T</sup> * N(d<sub>2</sub>)</p>
                
                <h4>看跌期权(Put)公式:</h4>
                <p>P = K * e<sup>-r*T</sup> * N(-d<sub>2</sub>) - S * e<sup>-q*T</sup> * N(-d<sub>1</sub>)</p>
                
                <h4>其中:</h4>
                <p>
                    d<sub>1</sub> = [ln(S/K) + (r - q + σ²/2) * T] / (σ * √T)<br>
                    d<sub>2</sub> = d<sub>1</sub> - σ * √T<br>
                    N(x) = 标准正态累积分布函数
                </p>
            `,
            american: `
                <h3>二叉树定价模型</h3>
                <p>使用二叉树模型对美式期权进行定价，考虑提前行权的可能性。</p>
                
                <h4>主要步骤:</h4>
                <p>1. 构建价格树<br>
                2. 计算到期日期权价值<br>
                3. 反向递归计算每个节点的期权价值，考虑持有和行权的最大值</p>
            `,
            asian: `
                <h3>亚式期权定价</h3>
                <p>基于标的资产价格平均值的期权。</p>
                
                <h4>几何平均:</h4>
                <p>使用修正的Black-Scholes公式计算。</p>
                
                <h4>算术平均:</h4>
                <p>使用蒙特卡洛模拟方法，可选择几何平均作为控制变量。</p>
            `,
            basket: `
                <h3>篮式期权定价</h3>
                <p>基于多个标的资产的期权。</p>
                
                <h4>几何平均篮式期权:</h4>
                <p>使用修正的Black-Scholes公式，考虑资产相关性。</p>
                
                <h4>算术平均篮式期权:</h4>
                <p>使用蒙特卡洛模拟，可选择几何平均作为控制变量。</p>
            `,
            kiko: `
                <h3>KIKO期权</h3>
                <p>带有敲入和敲出特征的障碍期权。</p>
                
                <h4>特点:</h4>
                <p>1. 如果价格触及上限障碍，获得固定返还金额<br>
                2. 如果价格触及下限障碍，激活普通看跌期权<br>
                3. 使用蒙特卡洛模拟计算价格</p>
            `,
            impliedVol: `
                <h3>隐含波动率计算</h3>
                <p>通过市场价格反推波动率参数。</p>
                
                <h4>计算方法:</h4>
                <p>使用二分法迭代求解，波动率显示在页面左侧。</p>
            `
        };

        const modelType = type.includes('european') ? 'european' :
            type.includes('american') ? 'american' :
                type.includes('Asian') ? 'asian' :
                    type.includes('Basket') ? 'basket' :
                        type.includes('kiko') ? 'kiko' :
                            type === 'impliedVol' ? 'impliedVol' : 'european';

        document.getElementById('modelExplanation').innerHTML = explanations[modelType];
    }

    // 显示/隐藏相关输入字段
    document.getElementById('optionType').addEventListener('change', function() {
        const type = this.value;

        // 隐藏所有特殊参数区域
        document.querySelectorAll('[id$="Params"]').forEach(el => el.style.display = 'none');
        document.getElementById('monteCarloResults').style.display = 'none';

        // 根据期权类型显示相应的参数
        if(type.startsWith('american')) {
            document.getElementById('americanParams').style.display = 'block';
        } else if(type.includes('Asian')) {
            document.getElementById('asianParams').style.display = 'block';
            if(type.startsWith('arithmetic')) {
                document.getElementById('monteCarloParams').style.display = 'block';
            }
        } else if(type.includes('Basket')) {
            document.getElementById('basketParams').style.display = 'block';
            if(type.startsWith('arithmetic')) {
                document.getElementById('monteCarloParams').style.display = 'block';
            }
        } else if(type === 'kikoPut') {
            document.getElementById('kikoParams').style.display = 'block';
        } else if(type === 'impliedVol') {
            document.getElementById('impliedVolParams').style.display = 'block';
        }

        // 更新模型说明
        updateModelExplanation(type);
    });

    // 计算按钮事件处理
    document.getElementById('calculate').addEventListener('click', function() {
        const type = document.getElementById('optionType').value;
        const direction = document.getElementById('optionDirection').value;
        const S = parseFloat(document.getElementById('stockPrice').value);
        const K = parseFloat(document.getElementById('strikePrice').value);
        const T = parseFloat(document.getElementById('timeToExpiry').value);
        const r = parseFloat(document.getElementById('riskFreeRate').value);
        const sigma = parseFloat(document.getElementById('volatility').value);
        const q = parseFloat(document.getElementById('dividend').value);

        // 预先获取共享变量
        const paths = type.includes('arithmetic') ? parseInt(document.getElementById('numPaths').value) : null;
        const n = (type.includes('Asian') || type === 'kiko') ? parseInt(document.getElementById('observationTimes').value) : null;
        const S2 = type.includes('Basket') ? parseFloat(document.getElementById('spot2').value) : null;
        const controlVariate = type.includes('arithmetic') ? document.getElementById('controlVariate').value : null;

        let result;
        document.getElementById('monteCarloResults').style.display = 'none';

        try {
            switch(type) {
                case 'european':
                    result = blackScholes(direction, S, K, T, r, sigma, q);
                    updateResults(result, type, direction);
                    break;

                case 'american':
                    const N = parseInt(document.getElementById('steps').value);
                    result = americanOption(direction, S, K, T, r, sigma, N, q);
                    updateResults(result, type, direction);
                    break;

                case 'geometricAsian':
                    if (!n) {
                        throw new Error('缺少观察次数参数');
                    }
                    result = geometricAsianOption(direction, S, K, T, r, sigma, n, q);
                    updateResults(result, type, direction);
                    break;

                case 'arithmeticAsian':
                    if (!paths || !n) {
                        throw new Error('缺少蒙特卡洛模拟所需参数');
                    }
                    result = arithmeticAsianOption(direction, S, K, T, r, sigma, n, paths, controlVariate, q);
                    updateMonteCarloResults(result, type, direction);
                    break;

                case 'geometricBasket':
                    if (!S2) {
                        throw new Error('缺少第二个资产价格');
                    }
                    const sigma2 = parseFloat(document.getElementById('vol2').value);
                    const rho = parseFloat(document.getElementById('correlation').value);
                    result = geometricBasketOption(direction, S, S2, K, T, r, sigma, sigma2, rho, q);
                    updateResults(result, type, direction);
                    break;

                case 'arithmeticBasket':
                    if (!paths || !S2) {
                        throw new Error('缺少蒙特卡洛模拟或篮式期权所需参数');
                    }
                    const sigma2Arith = parseFloat(document.getElementById('vol2').value);
                    const rhoArith = parseFloat(document.getElementById('correlation').value);
                    result = arithmeticBasketOption(direction, S, S2, K, T, r, sigma, sigma2Arith, rhoArith, paths, controlVariate, q);
                    updateMonteCarloResults(result, type, direction);
                    break;

                case 'kiko':
                    const L = parseFloat(document.getElementById('lowerBarrier').value);
                    const U = parseFloat(document.getElementById('upperBarrier').value);
                    const n1 = parseFloat(document.getElementById('observationTime').value);
                    const R = parseFloat(document.getElementById('rebate').value);
                    result = kikoOption(S, K, T, r, sigma, L, U, n1, R, q);
                    updateResults(result, 'kiko', direction);
                    break;

                case 'impliedVol':
                    const marketPrice = parseFloat(document.getElementById('marketPrice').value);
                    result = impliedVolatility(direction, marketPrice, S, K, T, r, q);
                    document.getElementById('volatility').value = result !== null ? result.toFixed(2) : 'N/A';
                    break;
                default:
                    break;
            }
        } catch(error) {
            alert('计算过程中发生错误：' + error.message);
        }
    });
    document.getElementById('optionType').addEventListener('change', function() {
        const type = this.value;

        // 隐藏所有特殊参数区域
        document.querySelectorAll('[id$="Params"]').forEach(el => el.style.display = 'none');
        document.getElementById('monteCarloResults').style.display = 'none';

        // 根据期权类型显示相应的参数
        if(type === 'american') {
            document.getElementById('americanParams').style.display = 'block';
        } else if(type.includes('Asian')) {
            document.getElementById('asianParams').style.display = 'block';
            if(type === 'arithmeticAsian') {
                document.getElementById('monteCarloParams').style.display = 'block';
            }
        } else if(type.includes('Basket')) {
            document.getElementById('basketParams').style.display = 'block';
            if(type === 'arithmeticBasket') {
                document.getElementById('monteCarloParams').style.display = 'block';
            }
        } else if(type === 'kiko') {
            document.getElementById('kikoParams').style.display = 'block';
        } else if(type === 'impliedVol') {
            document.getElementById('impliedVolParams').style.display = 'block';
        }

        // 更新模型说明
        updateModelExplanation(type);
    });
    // 更新结果
    function updateResults(price, type) {
        if (typeof price === 'number') {
            const S = parseFloat(document.getElementById('stockPrice').value);
            const K = parseFloat(document.getElementById('strikePrice').value);

            const intrinsicVal = type.includes('Put') ?
                Math.max(0, K - S) : Math.max(0, S - K);
            const timeVal = price - intrinsicVal;

            document.getElementById('optionPrice').textContent = price.toFixed(4);
            document.getElementById('intrinsicValue').textContent = intrinsicVal.toFixed(4);
            document.getElementById('timeValue').textContent = timeVal.toFixed(4);

            if (!type.includes('kiko')) {
                const r = parseFloat(document.getElementById('riskFreeRate').value);
                const sigma = parseFloat(document.getElementById('volatility').value);
                const T = parseFloat(document.getElementById('timeToExpiry').value);
                const q = parseFloat(document.getElementById('dividend').value);

                const greeks = calculateGreeks(type.includes('Put') ? 'put' : 'call',
                    S, K, T, r, sigma, q);
                // updateGreeks(greeks);
            }
        } else {
            document.getElementById('optionPrice').textContent = 'N/A';
            document.getElementById('intrinsicValue').textContent = 'N/A';
            document.getElementById('timeValue').textContent = 'N/A';
        }
    }

    // 更新蒙特卡洛结果
    function updateMonteCarloResults(result, type) {
        document.getElementById('monteCarloResults').style.display = 'block';
        document.getElementById('mcPrice').textContent = result.price.toFixed(4);
        document.getElementById('mcConfidence').textContent =
            `${(result.price - result.confidence).toFixed(4)} - ${(result.price + result.confidence).toFixed(4)}`;

        // 更新主要结果表格
        document.getElementById('optionPrice').textContent = result.price.toFixed(4);
        const S = parseFloat(document.getElementById('stockPrice').value);
        const K = parseFloat(document.getElementById('strikePrice').value);
        const intrinsicVal = type.includes('Put') ?
            Math.max(0, K - S) : Math.max(0, S - K);
        document.getElementById('intrinsicValue').textContent = intrinsicVal.toFixed(4);
        document.getElementById('timeValue').textContent = (result.price - intrinsicVal).toFixed(4);
    }

    // 更新希腊字母
    // function updateGreeks(greeks) {
    //     document.getElementById('delta').textContent = greeks.delta.toFixed(4);
    //     document.getElementById('gamma').textContent = greeks.gamma.toFixed(4);
    //     document.getElementById('theta').textContent = greeks.theta.toFixed(4);
    //     document.getElementById('vega').textContent = greeks.vega.toFixed(4);
    //     document.getElementById('rho').textContent = greeks.rho.toFixed(4);
    // }

    // 标签切换
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            // if (!document.getElementById('optionType').value) {
            //     document.getElementById('modelExplanation').innerHTML = generateInitialExplanation(currentLanguage);
            // }

            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
        });
    });

    // 初始化 - 触发欧式看涨期权的计算
    document.getElementById('modelExplanation').innerHTML = explanations['european'];
    document.getElementById('calculate').click();
    updateModelExplanation(type);
    // document.getElementById('calculate').click();
});


// 添加语言配置
const translations = {
    cn: {
        pageTitle: "高级期权计算器",
        sections: {
            inputSection: "输入参数",
            resultSection: "计算结果",
            tableHeaders: {
                parameter: "参数",
                value: "值"
            }
        },
        initialExplanation: {
            title: "期权计算器使用说明",
            welcome: "欢迎使用期权定价计算器。本计算器支持以下类型的期权定价：",
            optionTypes: {
                european: "欧式期权（Black-Scholes模型）",
                american: "美式期权（二叉树模型）",
                asian: "亚式期权（几何/算术平均）",
                basket: "篮式期权（多资产组合）",
                kiko: "KIKO期权（障碍货币期权）"
            },
            instruction: "请在左上方选择期权类型开始计算。选择后将显示详细说明。"
        },
        modelTitle: "定价模型说明",
        optionType: {
            label: "期权类型",
            european: "欧式期权",
            american: "美式期权",
            geometricAsian: "几何亚式期权",
            arithmeticAsian: "算术亚式期权",
            geometricBasket: "几何篮式期权",
            arithmeticBasket: "算术篮式期权",
            kiko: "KIKO期权",
            impliedVol: "隐含波动率计算"
        },
        optionDirection: {
            label: "期权方向",
            call: "看涨",
            put: "看跌"
        },

        inputs: {
            stockPrice: "标的资产价格 (S)",
            strikePrice: "行权价格 (K)",
            timeToExpiry: "到期时间 (T，以年计)",
            riskFreeRate: "无风险利率 (r，百分比)",
            volatility: "波动率 (σ，百分比)",
            dividend: "股息率 (q，百分比)",
            steps: "时间步数 (N)",
            observationTimes: "观察次数 (n)",
            numPaths: "模拟路径数",
            controlVariate: "控制变量方法",
            controlVariateOptions: {
                none: "不使用控制变量",
                geometric: "使用几何均值作为控制变量"
            },
            spot2: "第二个资产价格 (S2)",
            vol2: "第二个资产波动率 (σ2，百分比)",
            correlation: "相关系数 (ρ)",
            lowerBarrier: "下限障碍 (L)",
            upperBarrier: "上限障碍 (U)",
            rebate: "现金返还 (R)",
            marketPrice: "期权市场价格"
        },
        resultLabels: {
            optionPrice: "期权价格",
            intrinsicValue: "内在价值",
            timeValue: "时间价值"
        },
        explanations: {
            european: {
                title: "欧式期权",
                content: "<p>使用Black-Scholes模型定价。</p><p>假设标的资产价格服从几何布朗运动。</p>"
            },
            american: {
                title: "美式期权",
                content: "<p>使用二叉树模型定价。</p><p>允许提前行权。</p>"
            },
            geometricAsian: {
                title: "几何亚式期权",
                content: "<p>基于标的资产价格的几何平均值。</p><p>有解析解。</p>"
            },
            arithmeticAsian: {
                title: "算术亚式期权",
                content: "<p>基于标的资产价格的算术平均值。</p><p>使用蒙特卡洛模拟。</p>"
            },
            geometricBasket: {
                title: "几何篮式期权",
                content: "<p>基于多个资产价格的几何平均值。</p><p>有解析解。</p>"
            },
            arithmeticBasket: {
                title: "算术篮式期权",
                content: "<p>基于多个资产价格的算术平均值。</p><p>使用蒙特卡洛模拟。</p>"
            },
            kiko: {
                title: "KIKO期权",
                content: "<p>带有敲入和敲出特征的障碍期权。</p><p>使用蒙特卡洛模拟。</p>"
            },
            impliedVol: {
                title: "隐含波动率计算",
                content: "<p>通过市场价格反推波动率参数。</p><p>使用二分法求解。</p>"
            }
        }
    },
    en: {
        pageTitle: "Advanced Option Calculator",
        sections: {
            inputSection: "Input Parameters",
            resultSection: "Calculation Results",
            tableHeaders: {
                parameter: "Parameter",
                value: "Value"
            }
        },
        initialExplanation: {
            title: "Option Calculator Instructions",
            welcome: "Welcome to the Option Pricing Calculator. This calculator supports the following types of option pricing:",
            optionTypes: {
                european: "European Options (Black-Scholes Model)",
                american: "American Options (Binomial Tree Model)",
                asian: "Asian Options (Geometric/Arithmetic Average)",
                basket: "Basket Options (Multi-Asset Portfolio)",
                kiko: "KIKO Options (Barrier Currency Options)"
            },
            instruction: "Please select an option type from the top left to begin calculation. Detailed instructions will be displayed after selection."
        },
        modelTitle: "Pricing Model Description",
        optionType: {
            label: "Option Type",
            european: "European Option",
            american: "American Option",
            geometricAsian: "Geometric Asian Option",
            arithmeticAsian: "Arithmetic Asian Option",
            geometricBasket: "Geometric Basket Option",
            arithmeticBasket: "Arithmetic Basket Option",
            kiko: "KIKO Option",
            impliedVol: "Implied Volatility Calculator"
        },
        optionDirection: {
            label: "Option Direction",
            call: "Call",
            put: "Put"
        },
        inputs: {
            stockPrice: "Stock Price (S)",
            strikePrice: "Strike Price (K)",
            timeToExpiry: "Time to Expiry (T, in years)",
            riskFreeRate: "Risk-free Rate (r, percentage)",
            volatility: "Volatility (σ, percentage)",
            dividend: "Dividend Rate (q, percentage)",
            steps: "Time Steps (N)",
            observationTimes: "Observation Times (n)",
            numPaths: "Simulation Paths",
            controlVariate: "Control Variate Method",
            controlVariateOptions: {
                none: "No Control Variate",
                geometric: "Use Geometric Average as Control"
            },
            spot2: "Second Asset Price (S2)",
            vol2: "Second Asset Volatility (σ2, percentage)",
            correlation: "Correlation (ρ)",
            lowerBarrier: "Lower Barrier (L)",
            upperBarrier: "Upper Barrier (U)",
            rebate: "Rebate Amount (R)",
            marketPrice: "Option Market Price"
        },
        resultLabels: {
            optionPrice: "Option Price",
            intrinsicValue: "Intrinsic Value",
            timeValue: "Time Value"
        },
        explanations: {
            european: {
                title: "European Option",
                content: "<p>Priced using the Black-Scholes model.</p><p>Assumes geometric Brownian motion for the underlying asset price.</p>"
            },
            american: {
                title: "American Option",
                content: "<p>Priced using binomial tree model.</p><p>Allows early exercise.</p>"
            },
            geometricAsian: {
                title: "Geometric Asian Option",
                content: "<p>Based on geometric average of underlying asset prices.</p><p>Has analytical solution.</p>"
            },
            arithmeticAsian: {
                title: "Arithmetic Asian Option",
                content: "<p>Based on arithmetic average of underlying asset prices.</p><p>Uses Monte Carlo simulation.</p>"
            },
            geometricBasket: {
                title: "Geometric Basket Option",
                content: "<p>Based on geometric average of multiple asset prices.</p><p>Has analytical solution.</p>"
            },
            arithmeticBasket: {
                title: "Arithmetic Basket Option",
                content: "<p>Based on arithmetic average of multiple asset prices.</p><p>Uses Monte Carlo simulation.</p>"
            },
            kiko: {
                title: "KIKO Option",
                content: "<p>Barrier option with knock-in and knock-out features.</p><p>Uses Monte Carlo simulation.</p>"
            },
            impliedVol: {
                title: "Implied Volatility Calculator",
                content: "<p>Derives volatility parameter from market price.</p><p>Uses bisection method.</p>"
            }
        }
    }
};

// 当前语言设置
let currentLanguage = 'cn';

// 添加语言切换功能
document.getElementById('languageSwitch').addEventListener('click', function() {
    currentLanguage = currentLanguage === 'cn' ? 'en' : 'cn';
    this.textContent = currentLanguage === 'cn' ? '中文 / English' : 'English / 中文';
    updateLanguage();
});
function updateLanguage() {
    // 更新页面主标题
    document.querySelector('h1').textContent = translations[currentLanguage].pageTitle;


    document.getElementById('modelExplanation').innerHTML = generateInitialExplanation(currentLanguage);


    // 更新section标题
    document.querySelector('.input-section h2').textContent =
        translations[currentLanguage].sections.inputSection;
    document.querySelector('.result-section h2').textContent =
        translations[currentLanguage].sections.resultSection;

    // 更新表格标题
    const tableHeaders = document.querySelectorAll('.result-table th');
    tableHeaders[0].textContent = translations[currentLanguage].sections.tableHeaders.parameter;
    tableHeaders[1].textContent = translations[currentLanguage].sections.tableHeaders.value;

    // 更新结果标签
    const resultLabels = translations[currentLanguage].resultLabels;
    document.querySelector('td:first-child').textContent = resultLabels.optionPrice;
    document.querySelectorAll('.result-table tr')[2].firstElementChild.textContent =
        resultLabels.intrinsicValue;
    document.querySelectorAll('.result-table tr')[3].firstElementChild.textContent =
        resultLabels.timeValue;

    // 更新期权类型和方向标签
    document.querySelector('label[for="optionType"]').textContent =
        translations[currentLanguage].optionType.label;
    document.querySelector('label[for="optionDirection"]').textContent =
        translations[currentLanguage].optionDirection.label;

    document.getElementById('modelTitle').textContent = translations[currentLanguage].modelTitle;

    // 更新期权类型选项
    const optionTypeSelect = document.getElementById('optionType');
    const optionDirectionSelect = document.getElementById('optionDirection');

    // 更新期权类型下拉框
    Array.from(optionTypeSelect.options).forEach(option => {
        const type = option.value;
        option.textContent = translations[currentLanguage].optionType[type];
    });

    // 更新期权方向下拉框
    Array.from(optionDirectionSelect.options).forEach(option => {
        const direction = option.value;
        option.textContent = translations[currentLanguage].optionDirection[direction];
    });

    // 更新输入标签
    Object.entries(translations[currentLanguage].inputs).forEach(([id, label]) => {
        const element = document.querySelector(`label[for="${id}"]`);
        if (element) {
            element.textContent = label;
        }
    });
    const controlVariateSelect = document.getElementById('controlVariate');
    if (controlVariateSelect) {
        Array.from(controlVariateSelect.options).forEach(option => {
            const value = option.value;
            option.textContent = translations[currentLanguage].inputs.controlVariateOptions[value];
        });
    }

    // 更新当前模型说明
    updateModelExplanation(document.getElementById('optionType').value);
}
function generateInitialExplanation(lang) {
    const text = translations[lang].initialExplanation;
    return `
        <h3>${text.title}</h3>
        <p>${text.welcome}</p>
        <ul>
            <li>${text.optionTypes.european}</li>
            <li>${text.optionTypes.american}</li>
            <li>${text.optionTypes.asian}</li>
            <li>${text.optionTypes.basket}</li>
            <li>${text.optionTypes.kiko}</li>
        </ul>
        <p>${text.instruction}</p>
    `;
}