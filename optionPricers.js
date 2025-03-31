class OptionPricers {
    // 工具函数
    static normalCDF(x) {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;

        let sign = 1;
        if (x < 0) {
            sign = -1;
            x = -x;
        }

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);

        return 0.5 * (1.0 + sign * y);
    }

    static normalPDF(x) {
        return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    }

    static generateCorrelatedNormals(rho) {
        const u1 = Math.random();
        const u2 = Math.random();
        
        const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const z2 = rho * z1 + Math.sqrt(1 - rho * rho) * Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
        
        return [z1, z2];
    }

    // Black-Scholes模型
    static blackScholes(type, S, K, T, r, sigma, q) {
        try {
            r = r / 100;
            sigma = sigma / 100;
            q = q / 100;

            const d1 = (Math.log(S / K) + (r - q + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
            const d2 = d1 - sigma * Math.sqrt(T);

            if (type === 'call') {
                return S * Math.exp(-q * T) * this.normalCDF(d1) - K * Math.exp(-r * T) * this.normalCDF(d2);
            } else {
                return K * Math.exp(-r * T) * this.normalCDF(-d2) - S * Math.exp(-q * T) * this.normalCDF(-d1);
            }
        } catch (error) {
            console.error('Black-Scholes calculation error:', error);
            throw new Error('Black-Scholes计算错误: ' + error.message);
        }
    }

    // 几何亚式期权定价
    static geometricAsianOption(type, S, K, T, r, sigma, q, n) {
        try {
            const sigmaAdj = sigma * Math.sqrt((n + 1) * (2 * n + 1) / (6 * n * n));
            const muAdj = (r - q - 0.5 * sigma * sigma) * (n + 1) / (2 * n) + (r - q);
            
            const d1 = (Math.log(S/K) + (muAdj + 0.5 * sigmaAdj * sigmaAdj) * T) / (sigmaAdj * Math.sqrt(T));
            const d2 = d1 - sigmaAdj * Math.sqrt(T);

            if (type === 'call') {
                return Math.exp(-r * T) * (S * Math.exp(muAdj * T) * this.normalCDF(d1) - K * this.normalCDF(d2));
            } else {
                return Math.exp(-r * T) * (K * this.normalCDF(-d2) - S * Math.exp(muAdj * T) * this.normalCDF(-d1));
            }
        } catch (error) {
            throw new Error('几何亚式期权计算错误: ' + error.message);
        }
    }

    // 算术亚式期权蒙特卡洛定价
    static arithmeticAsianOption(type, S, K, T, r, sigma, q, n, numPaths, useControlVariate = true) {
        try {
            const dt = T / n;
            let sumPayoffs = 0;
            let sumPayoffsSquared = 0;
            let controlVariateSum = 0;

            const geometricPrice = useControlVariate ? 
                this.geometricAsianOption(type, S, K, T, r, sigma, q, n) : 0;

            for (let i = 0; i < numPaths; i++) {
                let St = S;
                let arithmeticSum = St;
                let geometricSum = Math.log(St);

                for (let j = 1; j < n; j++) {
                    const z = Math.random();
                    St *= Math.exp((r - q - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
                    arithmeticSum += St;
                    geometricSum += Math.log(St);
                }

                const arithmeticMean = arithmeticSum / n;
                const geometricMean = Math.exp(geometricSum / n);

                let payoff;
                if (type === 'call') {
                    payoff = Math.max(arithmeticMean - K, 0);
                } else {
                    payoff = Math.max(K - arithmeticMean, 0);
                }

                sumPayoffs += payoff;
                sumPayoffsSquared += payoff * payoff;

                if (useControlVariate) {
                    let controlPayoff;
                    if (type === 'call') {
                        controlPayoff = Math.max(geometricMean - K, 0);
                    } else {
                        controlPayoff = Math.max(K - geometricMean, 0);
                    }
                    controlVariateSum += controlPayoff;
                }
            }

            const price = Math.exp(-r * T) * sumPayoffs / numPaths;
            const standardError = Math.sqrt(
                (sumPayoffsSquared / numPaths - Math.pow(sumPayoffs / numPaths, 2)) / (numPaths - 1)
            );

            if (useControlVariate) {
                const controlVarMean = Math.exp(-r * T) * controlVariateSum / numPaths;
                const adjustment = controlVarMean - geometricPrice;
                return {
                    price: price - adjustment,
                    standardError: standardError * 1.96
                };
            }

            return {
                price: price,
                standardError: standardError * 1.96
            };
        } catch (error) {
            throw new Error('算术亚式期权计算错误: ' + error.message);
        }
    }

    // 几何篮子期权定价
    static geometricBasketOption(type, S1, S2, K, T, r, sigma1, sigma2, rho, q1, q2) {
        try {
            const sigmaB = Math.sqrt(sigma1 * sigma1 + sigma2 * sigma2 + 2 * rho * sigma1 * sigma2) / 2;
            const muB = r - (q1 + q2) / 2 - sigmaB * sigmaB;
            const B0 = Math.sqrt(S1 * S2);

            const d1 = (Math.log(B0/K) + (muB + sigmaB * sigmaB) * T) / (sigmaB * Math.sqrt(T));
            const d2 = d1 - sigmaB * Math.sqrt(T);

            if (type === 'call') {
                return Math.exp(-r * T) * (B0 * Math.exp(muB * T) * this.normalCDF(d1) - K * this.normalCDF(d2));
            } else {
                return Math.exp(-r * T) * (K * this.normalCDF(-d2) - B0 * Math.exp(muB * T) * this.normalCDF(-d1));
            }
        } catch (error) {
            throw new Error('几何篮子期权计算错误: ' + error.message);
        }
    }

    // 算术篮子期权蒙特卡洛定价
    static arithmeticBasketOption(type, S1, S2, K, T, r, sigma1, sigma2, rho, q1, q2, numPaths, useControlVariate = true) {
        try {
            let sumPayoffs = 0;
            let sumPayoffsSquared = 0;
            let controlVariateSum = 0;

            const geometricPrice = useControlVariate ? 
                this.geometricBasketOption(type, S1, S2, K, T, r, sigma1, sigma2, rho, q1, q2) : 0;

            for (let i = 0; i < numPaths; i++) {
                const [z1, z2] = this.generateCorrelatedNormals(rho);
                
                const S1T = S1 * Math.exp((r - q1 - 0.5 * sigma1 * sigma1) * T + sigma1 * Math.sqrt(T) * z1);
                const S2T = S2 * Math.exp((r - q2 - 0.5 * sigma2 * sigma2) * T + sigma2 * Math.sqrt(T) * z2);

                const arithmeticMean = (S1T + S2T) / 2;
                const geometricMean = Math.sqrt(S1T * S2T);

                let payoff;
                if (type === 'call') {
                    payoff = Math.max(arithmeticMean - K, 0);
                } else {
                    payoff = Math.max(K - arithmeticMean, 0);
                }

                sumPayoffs += payoff;
                sumPayoffsSquared += payoff * payoff;

                if (useControlVariate) {
                    let controlPayoff;
                    if (type === 'call') {
                        controlPayoff = Math.max(geometricMean - K, 0);
                    } else {
                        controlPayoff = Math.max(K - geometricMean, 0);
                    }
                    controlVariateSum += controlPayoff;
                }
            }

            const price = Math.exp(-r * T) * sumPayoffs / numPaths;
            const standardError = Math.sqrt(
                (sumPayoffsSquared / numPaths - Math.pow(sumPayoffs / numPaths, 2)) / (numPaths - 1)
            );

            if (useControlVariate) {
                const controlVarMean = Math.exp(-r * T) * controlVariateSum / numPaths;
                const adjustment = controlVarMean - geometricPrice;
                return {
                    price: price - adjustment,
                    standardError: standardError * 1.96
                };
            }

            return {
                price: price,
                standardError: standardError * 1.96
            };
        } catch (error) {
            throw new Error('算术篮子期权计算错误: ' + error.message);
        }
    }

    // 美式期权二叉树定价
    static americanOption(type, S, K, T, r, sigma, q, N) {
        try {
            const dt = T / N;
            const u = Math.exp(sigma * Math.sqrt(dt));
            const d = 1 / u;
            const p = (Math.exp((r - q) * dt) - d) / (u - d);
            
            // 初始化价格树和期权价值树
            const stockTree = new Array(N + 1);
            const optionTree = new Array(N + 1);
            
            // 构建最终节点的期权价值
            for (let i = 0; i <= N; i++) {
                stockTree[i] = S * Math.pow(u, i) * Math.pow(d, N - i);
                if (type === 'call') {
                    optionTree[i] = Math.max(0, stockTree[i] - K);
                } else {
                    optionTree[i] = Math.max(0, K - stockTree[i]);
                }
            }
            
            // 反向递推
            for (let j = N - 1; j >= 0; j--) {
                for (let i = 0; i <= j; i++) {
                    const S_ij = S * Math.pow(u, i) * Math.pow(d, j - i);
                    // 持有价值
                    const continuation = Math.exp(-r * dt) * (p * optionTree[i + 1] + (1 - p) * optionTree[i]);
                    // 执行价值
                    const exercise = type === 'call' ? Math.max(0, S_ij - K) : Math.max(0, K - S_ij);
                    // 美式期权价值为两者最大值
                    optionTree[i] = Math.max(continuation, exercise);
                }
            }
            
            return optionTree[0];
        } catch (error) {
            throw new Error('美式期权计算错误: ' + error.message);
        }
    }
}

// 将方法暴露给全局作用域
window.blackScholes = OptionPricers.blackScholes.bind(OptionPricers);
window.geometricAsianOption = OptionPricers.geometricAsianOption.bind(OptionPricers);
window.arithmeticAsianOption = OptionPricers.arithmeticAsianOption.bind(OptionPricers);
window.geometricBasketOption = OptionPricers.geometricBasketOption.bind(OptionPricers);
window.arithmeticBasketOption = OptionPricers.arithmeticBasketOption.bind(OptionPricers);
window.americanOption = OptionPricers.americanOption.bind(OptionPricers);