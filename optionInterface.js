class OptionCalculator {
    constructor() {
        this.priceChart = null;
        this.greeksChart = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('optionType').addEventListener('change', () => this.updateInterface());
        document.getElementById('pricingMethod').addEventListener('change', () => this.updateInterface());
        document.getElementById('calculate').addEventListener('click', () => this.calculateOption());
        
        // 初始化界面
        this.updateInterface();
    }

    updateInterface() {
        const optionType = document.getElementById('optionType').value;
        const pricingMethod = document.getElementById('pricingMethod').value;

        // 隐藏所有可选部分
        document.querySelectorAll('.optional-section').forEach(section => {
            section.style.display = 'none';
        });

        // 根据期权类型显示相关部分
        if (optionType.includes('asian')) {
            document.getElementById('asian-params').style.display = 'block';
        }
        if (optionType.includes('basket')) {
            document.getElementById('basket-params').style.display = 'block';
        }

        // 根据定价方法显示相关部分
        if (pricingMethod === 'monte_carlo') {
            document.getElementById('monte-carlo-params').style.display = 'block';
        }
        if (pricingMethod === 'binomial_tree') {
            document.getElementById('binomial-params').style.display = 'block';
        }

        // 更新定价方法说明
        this.updatePricingExplanation();
    }

    updatePricingExplanation() {
        const optionType = document.getElementById('optionType').value;
        const pricingMethod = document.getElementById('pricingMethod').value;
        const explanationDiv = document.getElementById('pricing-explanation');
        let explanation = '';
        
        switch(optionType) {
            case 'european':
                explanation = `欧式期权是最基本的期权类型，只能在到期日行权。`;
                if (pricingMethod === 'black_scholes') {
                    explanation += `\n使用Black-Scholes公式进行解析定价，适用于欧式看涨和看跌期权。`;
                }
                break;
            case 'arithmetic_asian':
                explanation = `算术平均亚式期权的收益取决于标的资产价格在观察期内的算术平均值。`;
                if (pricingMethod === 'monte_carlo') {
                    explanation += `\n由于没有解析解，使用蒙特卡洛模拟进行定价。可选择使用控制变量技术提高精度。`;
                }
                break;
            // ... 其他期权类型的说明
        }
        
        explanationDiv.innerHTML = explanation.replace(/\n/g, '<br>');
    }

    getInputParameters() {
        const params = {
            optionType: document.getElementById('optionType').value,
            pricingMethod: document.getElementById('pricingMethod').value,
            S: parseFloat(document.getElementById('stockPrice').value),
            K: parseFloat(document.getElementById('strikePrice').value),
            T: parseFloat(document.getElementById('timeToExpiry').value),
            r: parseFloat(document.getElementById('riskFreeRate').value) / 100,
            sigma: parseFloat(document.getElementById('volatility').value) / 100,
            q: parseFloat(document.getElementById('dividend').value) / 100
        };

        // 根据期权类型添加额外参数
        if (params.optionType.includes('asian')) {
            params.n = parseInt(document.getElementById('observationPoints').value);
        }

        if (params.optionType.includes('basket')) {
            params.S2 = parseFloat(document.getElementById('stockPrice2').value);
            params.sigma2 = parseFloat(document.getElementById('volatility2').value) / 100;
            params.q2 = parseFloat(document.getElementById('dividend2').value) / 100;
            params.rho = parseFloat(document.getElementById('correlation').value);
        }

        if (params.pricingMethod === 'monte_carlo') {
            params.numPaths = parseInt(document.getElementById('numPaths').value);
            params.useControlVariate = document.getElementById('useControlVariate').checked;
        }

        if (params.pricingMethod === 'binomial_tree') {
            params.steps = parseInt(document.getElementById('numSteps').value);
        }

        return params;
    }
    calculateOption() {
        try {
            const params = this.getInputParameters();
            let result;

            // 获取期权类型（看涨或看跌）
            const optionType = document.querySelector('input[name="optionDirection"]:checked')?.value || 'call';

            switch(params.optionType) {
                case 'european':
                    if (params.pricingMethod === 'black_scholes') {
                        result = window.blackScholes(
                            optionType,
                            params.S,
                            params.K,
                            params.T,
                            params.r * 100,
                            params.sigma * 100,
                            params.q * 100
                        );
                    }
                    break;

                case 'arithmetic_asian':
                    result = window.arithmeticAsianOption(
                        optionType,
                        params.S,
                        params.K,
                        params.T,
                        params.r,
                        params.sigma,
                        params.q,
                        params.n,
                        params.numPaths,
                        params.useControlVariate
                    );
                    break;

                case 'geometric_asian':
                    result = window.geometricAsianOption(
                        optionType,
                        params.S,
                        params.K,
                        params.T,
                        params.r,
                        params.sigma,
                        params.q,
                        params.n
                    );
                    break;

                case 'arithmetic_basket':
                    result = window.arithmeticBasketOption(
                        optionType,
                        params.S,
                        params.S2,
                        params.K,
                        params.T,
                        params.r,
                        params.sigma,
                        params.sigma2,
                        params.rho,
                        params.q,
                        params.q2,
                        params.numPaths,
                        params.useControlVariate
                    );
                    break;

                case 'geometric_basket':
                    result = window.geometricBasketOption(
                        optionType,
                        params.S,
                        params.S2,
                        params.K,
                        params.T,
                        params.r,
                        params.sigma,
                        params.sigma2,
                        params.rho,
                        params.q,
                        params.q2
                    );
                    break;

                case 'american':
                    result = window.americanOption(
                        optionType,
                        params.S,
                        params.K,
                        params.T,
                        params.r,
                        params.sigma,
                        params.q,
                        params.steps
                    );
                    break;
            }

            // 显示结果并更新图表
            if (result !== undefined && result !== null) {
                this.displayResults(result);
                this.createPriceChart(params.S, params.K);
                this.createGreeksChart(params.S);
            } else {
                console.error('计算结果无效');
                alert('计算结果无效，请检查输入参数');
            }

        } catch (error) {
            console.error('Error calculating option:', error);
            alert('计算期权价格时出错：\n' + error.message);
        }
    }

    displayResults(result) {
        // 显示期权价格
        document.getElementById('optionPrice').textContent = 
            typeof result === 'object' ? result.price.toFixed(4) : result.toFixed(4);

        // 显示置信区间（如果使用蒙特卡洛方法）
        if (typeof result === 'object' && result.standardError !== undefined) {
            document.getElementById('confidenceInterval').textContent = 
                `±${result.standardError.toFixed(4)}`;
        } else {
            document.getElementById('confidenceInterval').textContent = '';
        }

        // 计算并显示内在价值和时间价值
        const params = this.getInputParameters();
        const optionType = document.querySelector('input[name="optionDirection"]:checked')?.value || 'call';
        const intrinsicValue = optionType === 'call' ? 
            Math.max(0, params.S - params.K) : 
            Math.max(0, params.K - params.S);
        const timeValue = (typeof result === 'object' ? result.price : result) - intrinsicValue;

        document.getElementById('intrinsicValue').textContent = intrinsicValue.toFixed(4);
        document.getElementById('timeValue').textContent = timeValue.toFixed(4);

        // 计算并显示希腊字母
        const greeks = this.calculateGreeks(params.S);
        document.getElementById('delta').textContent = greeks.delta.toFixed(4);
        document.getElementById('gamma').textContent = greeks.gamma.toFixed(4);
        document.getElementById('vega').textContent = greeks.vega.toFixed(4);
    }

    calculateGreeks(stockPrice) {
        const params = this.getInputParameters();
        const h = stockPrice * 0.001;
        const optionType = document.querySelector('input[name="optionDirection"]:checked')?.value || 'call';

        // 计算Delta
        const deltaUp = this.calculateOptionPrice(stockPrice + h);
        const deltaDown = this.calculateOptionPrice(stockPrice - h);
        const delta = (deltaUp - deltaDown) / (2 * h);

        // 计算Gamma
        const gamma = (deltaUp - 2 * this.calculateOptionPrice(stockPrice) + deltaDown) / (h * h);

        // 计算Vega
        const origVol = params.sigma;
        params.sigma += 0.01;
        const vegaUp = this.calculateOptionPrice(stockPrice);
        params.sigma = origVol;
        const vega = (vegaUp - this.calculateOptionPrice(stockPrice)) / 0.01;

        return { delta, gamma, vega };
    }

    calculateOptionPrice(stockPrice) {
        const params = this.getInputParameters();
        params.S = stockPrice;
        const optionType = document.querySelector('input[name="optionDirection"]:checked')?.value || 'call';

        try {
            switch(params.optionType) {
                case 'european':
                    return window.blackScholes(
                        optionType,
                        params.S,
                        params.K,
                        params.T,
                        params.r * 100,
                        params.sigma * 100,
                        params.q * 100
                    );
                // 其他期权类型的处理...
                default:
                    return 0;
            }
        } catch (error) {
            console.error('Error in calculateOptionPrice:', error);
            return 0;
        }
    }

    createPriceChart(S, K) {
        const ctx = document.getElementById('priceChart').getContext('2d');
        const prices = [];
        const values = [];

        const minPrice = S * 0.7;
        const maxPrice = S * 1.3;
        const step = (maxPrice - minPrice) / 50;

        for (let price = minPrice; price <= maxPrice; price += step) {
            prices.push(price.toFixed(2));
            values.push(this.calculateOptionPrice(price));
        }

        if (this.priceChart) {
            this.priceChart.destroy();
        }

        this.priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: prices,
                datasets: [{
                    label: '期权价值',
                    data: values,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '期权价值与标的价格关系'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '标的资产价格'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '期权价值'
                        }
                    }
                }
            }
        });
    }

    createGreeksChart(S) {
        const ctx = document.getElementById('greeksChart').getContext('2d');
        const prices = [];
        const deltas = [];
        const gammas = [];
        const vegas = [];

        const minPrice = S * 0.7;
        const maxPrice = S * 1.3;
        const step = (maxPrice - minPrice) / 50;

        for (let price = minPrice; price <= maxPrice; price += step) {
            prices.push(price.toFixed(2));
            const greeks = this.calculateGreeks(price);
            deltas.push(greeks.delta);
            gammas.push(greeks.gamma);
            vegas.push(greeks.vega);
        }

        if (this.greeksChart) {
            this.greeksChart.destroy();
        }

        this.greeksChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: prices,
                datasets: [
                    {
                        label: 'Delta',
                        data: deltas,
                        borderColor: '#3498db',
                        tension: 0.4
                    },
                    {
                        label: 'Gamma',
                        data: gammas,
                        borderColor: '#e74c3c',
                        tension: 0.4
                    },
                    {
                        label: 'Vega',
                        data: vegas,
                        borderColor: '#2ecc71',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '期权希腊字母敏感性分析'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '标的资产价格'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '希腊字母值'
                        }
                    }
                }
            }
        });
    }
}