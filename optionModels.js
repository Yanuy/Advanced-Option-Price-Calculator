
// 正态累积分布函数
function cdf(x) {
    return jStat.normal.cdf(x, 0, 1);
}



// Black-Scholes欧式期权定价模型
function blackScholes(type, S, K, T, r, sigma, q = 0) {
    r = r / 100;
    sigma = sigma / 100;
    q = q / 100;
    
    const d1 = (Math.log(S / K) + (r - q + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    
    if (type === 'call') {
        return S * Math.exp(-q * T) * cdf(d1) - 
               K * Math.exp(-r * T) * cdf(d2);
    } else {
        return K * Math.exp(-r * T) * cdf(-d2) - 
               S * Math.exp(-q * T) * cdf(-d1);
    }
}

// 美式期权二叉树定价
function americanOption(type, S, K, T, r, sigma, N, q = 0) {
    r = r / 100;
    sigma = sigma / 100;
    q = q / 100;
    
    const dt = T / N;
    const u = Math.exp(sigma * Math.sqrt(dt));
    const d = 1 / u;
    const p = (Math.exp((r - q) * dt) - d) / (u - d);
    
    let stockTree = Array(N + 1).fill().map(() => Array(N + 1).fill(0));
    let optionTree = Array(N + 1).fill().map(() => Array(N + 1).fill(0));
    
    // 初始化股票价格树
    for(let i = 0; i <= N; i++) {
        for(let j = 0; j <= i; j++) {
            stockTree[i][j] = S * Math.pow(u, j) * Math.pow(d, i - j);
        }
    }
    
    // 初始化期权到期值
    for(let j = 0; j <= N; j++) {
        optionTree[N][j] = type === 'call' ? 
            Math.max(0, stockTree[N][j] - K) :
            Math.max(0, K - stockTree[N][j]);
    }
    
    // 向后递归计算期权价值
    for(let i = N - 1; i >= 0; i--) {
        for(let j = 0; j <= i; j++) {
            let hold = Math.exp(-r * dt) * (p * optionTree[i + 1][j + 1] + (1 - p) * optionTree[i + 1][j]);
            let exercise = type === 'call' ? 
                Math.max(0, stockTree[i][j] - K) :
                Math.max(0, K - stockTree[i][j]);
            optionTree[i][j] = Math.max(hold, exercise);
        }
    }
    
    return optionTree[0][0];
}

function geometricAsianOption(type, S, K, T, r, sigma, n, q = 0) {
    r = r / 100;
    sigma = sigma / 100;
    q = q / 100;

    const sigmaAdj = sigma * Math.sqrt((n + 1) * (2 * n + 1) / (6 * n * n));
    const muAdj = (r - q - 0.5 * sigma * sigma) * (n + 1) / (2 * n) + 0.5 * sigmaAdj * sigmaAdj;

    const d1 = (Math.log(S / K) + (muAdj + 0.5 * sigmaAdj * sigmaAdj) * T) / (sigmaAdj * Math.sqrt(T));
    const d2 = d1 - sigmaAdj * Math.sqrt(T);

    if(type === 'call') {
        return Math.exp(-r * T) * (S * Math.exp(muAdj * T) * cdf(d1) -
            K * cdf(d2));
    } else {
        return Math.exp(-r * T) * (K * cdf(-d2) -
            S * Math.exp(muAdj * T) * cdf(-d1));
    }
}
function arithmeticAsianOption(type, S, K, T, r, sigma, n, paths, controlVariate = false, q = 0) {
    r = r / 100;
    sigma = sigma / 100;
    q = q / 100;

    const dt = T / n;
    let sumArith = 0;
    let sumSquaredArith = 0;

    // 如果使用控制变量法
    if (controlVariate) {
        const geoValue = geometricAsianOption(type, S, K, T, r * 100, sigma * 100, n, q * 100);
        let sumCov = 0;
        let sumGeo = 0;
        let sumSquaredGeo = 0;

        for(let i = 0; i < paths; i++) {
            let path = Array(n + 1).fill(S);
            let arithmetic = S;
            let logSum = Math.log(S);

            for(let j = 1; j <= n; j++) {
                const z = normalRandom();
                path[j] = path[j-1] * Math.exp((r - q - 0.5 * Math.pow(sigma, 2)) * dt +
                    sigma * Math.sqrt(dt) * z);
                arithmetic += path[j];
                logSum += Math.log(path[j]);
            }

            arithmetic = arithmetic / (n + 1);
            const geometric = Math.exp(logSum / (n + 1));

            let arithPayoff = type === 'call' ?
                Math.max(0, arithmetic - K) :
                Math.max(0, K - arithmetic);

            let geoPayoff = type === 'call' ?
                Math.max(0, geometric - K) :
                Math.max(0, K - geometric);

            arithPayoff *= Math.exp(-r * T);
            geoPayoff *= Math.exp(-r * T);

            sumArith += arithPayoff;
            sumSquaredArith += arithPayoff * arithPayoff;
            sumGeo += geoPayoff;
            sumSquaredGeo += geoPayoff * geoPayoff;
            sumCov += arithPayoff * geoPayoff;
        }

        const meanArith = sumArith / paths;
        const meanGeo = sumGeo / paths;
        const covariance = sumCov / paths - meanArith * meanGeo;
        const varGeo = sumSquaredGeo / paths - meanGeo * meanGeo;
        const theta = covariance / varGeo;

        const controlVariateEstimator = meanArith + theta * (geoValue - meanGeo);
        const stdDev = Math.sqrt((sumSquaredArith / paths - meanArith * meanArith) / (paths - 1));
        const confInterval = 1.96 * stdDev / Math.sqrt(paths);

        return {
            price: controlVariateEstimator,
            confidence: confInterval
        };
    } else {
        // 蒙特卡洛模拟
        for(let i = 0; i < paths; i++) {
            let path = Array(n + 1).fill(S);
            let arithmetic = S;

            for(let j = 1; j <= n; j++) {
                const z = normalRandom();
                path[j] = path[j-1] * Math.exp((r - q - 0.5 * Math.pow(sigma, 2)) * dt +
                    sigma * Math.sqrt(dt) * z);
                arithmetic += path[j];
            }

            arithmetic = arithmetic / (n + 1);
            let payoff = type === 'call' ?
                Math.max(0, arithmetic - K) :
                Math.max(0, K - arithmetic);

            payoff *= Math.exp(-r * T);

            sumArith += payoff;
            sumSquaredArith += payoff * payoff;
        }

        const mean = sumArith / paths;
        const stdDev = Math.sqrt((sumSquaredArith / paths - mean * mean) / (paths - 1));
        const confInterval = 1.96 * stdDev / Math.sqrt(paths);

        return {
            price: mean,
            confidence: confInterval
        };
    }
}

// 生成标准正态分布随机数
function normalRandom() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
// 几何篮式期权
function geometricBasketOption(type, S1, S2, K, T, r, sigma1, sigma2, rho, q = 0) {
    sigma1 = sigma1 / 100;
    sigma2 = sigma2 / 100;
    r = r / 100;


    const sigmaB = Math.sqrt(Math.pow(sigma1, 2) + 2 * rho * sigma1 * sigma2 + Math.pow(sigma2, 2)) / 2;
    const muB = r - 0.5 * (Math.pow(sigma1, 2) + Math.pow(sigma2, 2)) / 2 + 0.5 * Math.pow(sigmaB, 2);
    const B0 = Math.sqrt(S1 * S2);

    const d1 = (Math.log(B0 / K) + (muB + 0.5 * Math.pow(sigmaB, 2)) * T) / (sigmaB * Math.sqrt(T));
    const d2 = d1 - sigmaB * Math.sqrt(T);

    if(type.toLowerCase() === 'call') {
        return Math.exp(-r * T) * (B0 * Math.exp(muB * T) * cdf(d1) - K * cdf(d2));
    } else {
        return Math.exp(-r * T) * (K * cdf(-d2) - B0 * Math.exp(muB * T) * cdf(-d1));
    }
}

// 算术篮式期权（蒙特卡洛模拟）
function arithmeticBasketOption(type, S1, S2, K, T, r, sigma1, sigma2, rho, paths, controlVariate, q = 0) {
    sigma1 = sigma1 / 100;
    sigma2 = sigma2 / 100;
    r = r / 100;
    q = q / 100;

    let sum = 0;
    let sumSquared = 0;

    for(let i = 0; i < paths; i++) {
        const z1 = normalRandom();
        const z2 = rho * z1 + Math.sqrt(1 - Math.pow(rho, 2)) * normalRandom();

        const ST1 = S1 * Math.exp((r - q - 0.5 * Math.pow(sigma1, 2)) * T + sigma1 * Math.sqrt(T) * z1);
        const ST2 = S2 * Math.exp((r - q - 0.5 * Math.pow(sigma2, 2)) * T + sigma2 * Math.sqrt(T) * z2);

        const arithmetic = (ST1 + ST2) / 2;
        let payoff = type === 'call' ?
            Math.max(0, arithmetic - K) :
            Math.max(0, K - arithmetic);

        sum += payoff;
        sumSquared += payoff * payoff;
    }

    const mean = sum / paths;
    const stdDev = Math.sqrt((sumSquared / paths - mean * mean) / (paths - 1));
    const confInterval = 1.96 * stdDev / Math.sqrt(paths);

    return {
        price: mean * Math.exp(-r * T),
        confidence: confInterval * Math.exp(-r * T)
    };
}

// KIKO看跌期权-QMC
function kikoOption(S, K, T, r, sigma, L, U, n, R, q = 0) {
    r = r / 100;
    sigma = sigma / 100;
    q = q / 100;

    const dt = T / n;
    const paths = 100000;

    function calculatePrice(currentS) {
        let localSum = 0;
        let localSumSquared = 0;

        for(let i = 0; i < paths; i++) {
            let St = currentS;
            let pathKnockIn = false;
            let pathKnockOut = false;

            for(let j = 1; j <= n; j++) {
                const z = normalRandom();
                St = St * Math.exp((r - q - 0.5 * Math.pow(sigma, 2)) * dt + sigma * Math.sqrt(dt) * z);

                if(St <= L) pathKnockIn = true;
                if(St >= U) pathKnockOut = true;
            }

            let payoff = 0;
            if(pathKnockOut) {
                payoff = R;
            } else if(pathKnockIn) {
                payoff = Math.max(0, K - St);
            }

            payoff *= Math.exp(-r * T);  // Discount the payoff
            localSum += payoff;
            localSumSquared += payoff * payoff;
        }

        const localMean = localSum / paths;
        const localStdDev = Math.sqrt((localSumSquared / paths - localMean * localMean) / (paths - 1));
        const localConfInterval = 1.96 * localStdDev / Math.sqrt(paths);

        return {
            price: localMean,
            confidence: localConfInterval
        };
    }

    // Calculate price at S
    const resultAtS = calculatePrice(S);

    // Calculate price at S + dS
    const dS = 0.01 * S;  // Small change in S (1% of S)
    const resultAtSPlusdS = calculatePrice(S + dS);

    // Calculate delta
    const delta = (resultAtSPlusdS.price - resultAtS.price) / dS;

    // Create result object
    const result = {
        price: resultAtS.price,
        confidence: resultAtS.confidence,
        delta: delta
    };

    // Show all results in alert
    alert(`
价格 (Price): ${result.price.toFixed(4)}
Delta: ${delta.toFixed(6)}
    `);

    return result;
}

function impliedVolatility(type, marketPrice, S, K, T, r, q = 0) {
    r = r / 100;
    q = q / 100;

    let low = 0;           // 0%
    let high = 100;        // 10000%
    let sigma = 1;         // 从100%开始
    let tolerance = 0.0001;
    let maxIter = 1000;     // 二分法迭代次数

    for(let i = 0; i < maxIter; i++) {
        const price = blackScholes(type, S, K, T, r * 100, sigma * 100, q * 100);
        const diff = marketPrice - price;

        if(Math.abs(diff) < tolerance) {
            return sigma * 100;
        }

        if(diff > 0) {
            low = sigma;
        } else {
            high = sigma;
        }

        sigma = (low + high) / 2;
    }

    return null;
}

// 计算希腊字母
function calculateGreeks(type, S, K, T, r, sigma, q = 0) {
    r = r / 100;
    sigma = sigma / 100;
    q = q / 100;
    
    const d1 = (Math.log(S / K) + (r - q + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    
    const nd1 = Math.exp(-Math.pow(d1, 2) / 2) / Math.sqrt(2 * Math.PI);
    
    let delta, gamma, theta, vega, rho;
    
    // Delta
    if (type === 'call') {
        delta = Math.exp(-q * T) * cdf(d1);
    } else {
        delta = Math.exp(-q * T) * (cdf(d1) - 1);
    }
    
    // Gamma
    gamma = Math.exp(-q * T) * nd1 / (S * sigma * Math.sqrt(T));
    
    // Vega
    vega = S * Math.exp(-q * T) * nd1 * Math.sqrt(T) * 0.01;
    
    // Theta
    if (type === 'call') {
        theta = (-S * sigma * Math.exp(-q * T) * nd1 / (2 * Math.sqrt(T)) 
                - r * K * Math.exp(-r * T) * cdf(d2)
                + q * S * Math.exp(-q * T) * cdf(d1)) / 365;
    } else {
        theta = (-S * sigma * Math.exp(-q * T) * nd1 / (2 * Math.sqrt(T)) 
                + r * K * Math.exp(-r * T) * cdf(-d2)
                - q * S * Math.exp(-q * T) * cdf(-d1)) / 365;
    }
    
    // Rho
    if (type === 'call') {
        rho = K * T * Math.exp(-r * T) * cdf(d2) * 0.01;
    } else {
        rho = -K * T * Math.exp(-r * T) * cdf(-d2) * 0.01;
    }
    
    return { delta, gamma, theta, vega, rho };
}

