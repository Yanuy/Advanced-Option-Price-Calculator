// 确保类在全局作用域中可用
window.OptionValidation = class OptionValidation {
    static validateInputs(params) {
        const errors = [];

        // 基础参数验证
        try {
            this.validateBasicParameters(params, errors);
            this.validateOptionSpecificParameters(params, errors);
            this.validatePricingMethodParameters(params, errors);
        } catch (error) {
            errors.push('验证过程发生错误: ' + error.message);
        }

        return errors;
    }

    static validateBasicParameters(params, errors) {
        // 检查必需参数是否存在
        const requiredParams = ['S', 'K', 'T', 'r', 'sigma', 'q'];
        for (const param of requiredParams) {
            if (params[param] === undefined || params[param] === null || isNaN(params[param])) {
                errors.push(`缺少必需参数或参数无效: ${param}`);
                continue;
            }
        }

        // 数值范围验证
        if (params.S <= 0) errors.push("标的资产价格必须大于0");
        if (params.K <= 0) errors.push("行权价格必须大于0");
        if (params.T <= 0) errors.push("到期时间必须大于0");
        if (params.T > 100) errors.push("到期时间不能超过100年");
        if (params.sigma <= 0) errors.push("波动率必须大于0");
        if (params.sigma > 2) errors.push("波动率不能超过200%");
        if (params.r < -0.1) errors.push("无风险利率不能低于-10%");
        if (params.r > 0.5) errors.push("无风险利率不能超过50%");
        if (params.q < 0) errors.push("股息率不能为负");
        if (params.q > 1) errors.push("股息率不能超过100%");
    }

    static validateOptionSpecificParameters(params, errors) {
        // 添加对optionType参数的检查
        if (!params.optionType) {
            errors.push("未指定期权类型");
            return;
        }

        switch(params.optionType) {
            case 'asian':
            case 'arithmetic_asian':
            case 'geometric_asian':
                this.validateAsianOptionParams(params, errors);
                break;

            case 'basket':
            case 'arithmetic_basket':
            case 'geometric_basket':
                this.validateBasketOptionParams(params, errors);
                break;

            case 'american':
                this.validateAmericanOptionParams(params, errors);
                break;

            case 'european':
                // 欧式期权不需要额外参数验证
                break;

            default:
                errors.push(`不支持的期权类型: ${params.optionType}`);
        }
    }

    static validateAsianOptionParams(params, errors) {
        if (!Number.isInteger(params.n)) {
            errors.push("观察点数量必须为整数");
        }
        if (params.n < 2) {
            errors.push("观察点数量必须大于等于2");
        }
        if (params.n > 52) {
            errors.push("观察点数量不建议超过52");
        }
    }

    static validateBasketOptionParams(params, errors) {
        if (!params.S2) errors.push("未指定第二个资产价格");
        if (!params.sigma2) errors.push("未指定第二个资产波动率");
        if (!params.q2) errors.push("未指定第二个资产股息率");
        if (params.rho === undefined) errors.push("未指定资产相关系数");

        if (params.S2 <= 0) errors.push("第二个资产价格必须大于0");
        if (params.sigma2 <= 0) errors.push("第二个资产波动率必须大于0");
        if (params.sigma2 > 2) errors.push("第二个资产波动率不能超过200%");
        if (params.q2 < 0) errors.push("第二个资产股息率不能为负");
        if (params.q2 > 1) errors.push("第二个资产股息率不能超过100%");
        if (params.rho < -1 || params.rho > 1) errors.push("相关系数必须在-1和1之间");
    }

    static validateAmericanOptionParams(params, errors) {
        if (params.steps !== undefined) {
            if (!Number.isInteger(params.steps)) {
                errors.push("二叉树步数必须为整数");
            }
            if (params.steps < 10) {
                errors.push("二叉树步数必须大于等于10");
            }
            if (params.steps > 10000) {
                errors.push("二叉树步数不建议超过10000");
            }
        }
    }

    static validatePricingMethodParameters(params, errors) {
        // 检查定价方法是否指定
        if (!params.pricingMethod) {
            errors.push("未指定定价方法");
            return;
        }

        switch(params.pricingMethod) {
            case 'monte_carlo':
                this.validateMonteCarloParams(params, errors);
                break;
            case 'black_scholes':
                // Black-Scholes方法不需要额外参数
                break;
            case 'binomial_tree':
                this.validateBinomialTreeParams(params, errors);
                break;
            default:
                errors.push(`不支持的定价方法: ${params.pricingMethod}`);
        }
    }

    static validateMonteCarloParams(params, errors) {
        if (!Number.isInteger(params.numPaths)) {
            errors.push("蒙特卡洛模拟路径数量必须为整数");
        }
        if (params.numPaths < 1000) {
            errors.push("蒙特卡洛模拟路径数量必须大于等于1000");
        }
        if (params.numPaths > 1000000) {
            errors.push("蒙特卡洛模拟路径数量不建议超过1000000");
        }
    }

    static validateBinomialTreeParams(params, errors) {
        if (!Number.isInteger(params.steps)) {
            errors.push("二叉树步数必须为整数");
        }
        if (params.steps < 10) {
            errors.push("二叉树步数必须大于等于10");
        }
        if (params.steps > 10000) {
            errors.push("二叉树步数不建议超过10000");
        }
    }
}

// 确保OptionValidation在全局作用域中可用
if (typeof window !== 'undefined') {
    window.OptionValidation = OptionValidation;
}