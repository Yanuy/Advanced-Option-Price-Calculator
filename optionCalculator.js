document.addEventListener('DOMContentLoaded', function() {
    // 更新模型说明
    // 立即显示使用说明
    document.getElementById('modelExplanation').innerHTML = `
        <h3>期权计算器使用说明</h3>
        <p>欢迎使用期权定价计算器。本计算器支持以下类型的期权定价：</p>
        <ul>
            <li>欧式期权（Black-Scholes模型）</li>
            <li>美式期权（二叉树模型）</li>
            <li>亚式期权（几何/算术平均）</li>
            <li>篮式期权（多资产组合）</li>
            <li>KIKO期权（障碍货币期权）</li>
        </ul>
        <p>请在左上方选择期权类型开始计算。选择后将显示详细说明。</p>
    `;
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
        const S = parseFloat(document.getElementById('stockPrice').value);
        const K = parseFloat(document.getElementById('strikePrice').value);
        const T = parseFloat(document.getElementById('timeToExpiry').value);
        const r = parseFloat(document.getElementById('riskFreeRate').value);
        const sigma = parseFloat(document.getElementById('volatility').value);
        const q = parseFloat(document.getElementById('dividend').value);

        // 预先获取共享变量
        const paths = type.includes('arithmetic') ? parseInt(document.getElementById('numPaths').value) : null;
        const n = type.includes('Asian') ? parseInt(document.getElementById('observationTimes').value) : null;
        const S2 = type.includes('Basket') ? parseFloat(document.getElementById('spot2').value) : null;
        const controlVariate = type.includes('arithmetic') ? document.getElementById('controlVariate').value : null;

        let result;
        document.getElementById('monteCarloResults').style.display = 'none';

        try {
            switch(type) {
                case 'europeanCall':
                case 'europeanPut':
                    result = blackScholes(type.replace('european', '').toLowerCase(), S, K, T, r, sigma, q);
                    updateResults(result, type);
                    break;

                case 'americanCall':
                case 'americanPut':
                    const N = parseInt(document.getElementById('steps').value);
                    result = americanOption(type.replace('american', '').toLowerCase(), S, K, T, r, sigma, N, q);
                    updateResults(result, type);
                    break;

                case 'geometricAsianCall':
                case 'geometricAsianPut':
                    if (!n) {
                        throw new Error('缺少观察次数参数');
                    }
                    result = geometricAsianOption(type.replace('geometricAsian', '').toLowerCase(),
                        S, K, T, r, sigma, n, q);
                    updateResults(result, type);
                    break;

                case 'arithmeticAsianCall':
                case 'arithmeticAsianPut':
                    if (!paths || !n) {
                        throw new Error('缺少蒙特卡洛模拟所需参数');
                    }
                    result = arithmeticAsianOption(type.replace('arithmeticAsian', '').toLowerCase(),
                        S, K, T, r, sigma, n, paths, controlVariate, q);
                    updateMonteCarloResults(result, type);
                    break;

                case 'geometricBasketCall':
                case 'geometricBasketPut':
                    if (!S2) {
                        throw new Error('缺少第二个资产价格');
                    }
                    const sigma2 = parseFloat(document.getElementById('vol2').value);
                    const rho = parseFloat(document.getElementById('correlation').value);
                    result = geometricBasketOption(type.replace('geometricBasket', '').toLowerCase(),
                        S, S2, K, T, r, sigma, sigma2, rho, q);
                    updateResults(result, type);
                    break;

                case 'arithmeticBasketCall':
                case 'arithmeticBasketPut':
                    if (!paths || !S2) {
                        throw new Error('缺少蒙特卡洛模拟或篮式期权所需参数');
                    }
                    const sigma2Arith = parseFloat(document.getElementById('vol2').value);
                    const rhoArith = parseFloat(document.getElementById('correlation').value);
                    result = arithmeticBasketOption(type.replace('arithmeticBasket', '').toLowerCase(),
                        S, S2, K, T, r, sigma, sigma2Arith, rhoArith, paths, controlVariate, q);
                    updateMonteCarloResults(result, type);
                    break;

                case 'kikoPut':
                    const L = parseFloat(document.getElementById('lowerBarrier').value);
                    const U = parseFloat(document.getElementById('upperBarrier').value);
                    const n1 = parseFloat(document.getElementById('observationTime').value);
                    const R = parseFloat(document.getElementById('rebate').value);
                    result = kikoOption(S, K, T, r, sigma, L, U, n1, R, q);
                    updateResults(result, 'kikoPut');
                    break;

                case 'impliedVol':
                    const marketPrice = parseFloat(document.getElementById('marketPrice').value);
                    const optiontype = document.getElementById('impliedVolType').value;
                    result = impliedVolatility(optiontype, marketPrice, S, K, T, r, q);
                    document.getElementById('volatility').value = result !== null ? result.toFixed(2) : 'N/A';
                    break;
                default:
                    break;
            }
        } catch(error) {
            alert('计算过程中发生错误：' + error.message);
        }
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
            // document.getElementById('modelExplanation').innerHTML = `
            //         <h3>期权计算器使用说明</h3>
            //         <p>欢迎使用期权定价计算器。本计算器支持以下类型的期权定价：</p>
            //         <ul>
            //             <li>欧式期权（Black-Scholes模型）</li>
            //             <li>美式期权（二叉树模型）</li>
            //             <li>亚式期权（几何/算术平均）</li>
            //             <li>篮式期权（多资产组合）</li>
            //             <li>KIKO期权（障碍期权）</li>
            //         </ul>
            //         <p>请在上方选择期权类型开始计算。选择后将显示详细说明。</p>
            //     `;

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