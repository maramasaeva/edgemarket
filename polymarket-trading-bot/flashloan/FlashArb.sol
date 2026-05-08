// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================================
// Minimal inline interfaces — no npm imports needed
// ============================================================================

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice SushiSwap V2 router (UniswapV2Router02-compatible)
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);
}

/// @notice QuickSwap V3 (Algebra) swap router
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 limitSqrtPrice;  // Algebra uses limitSqrtPrice instead of sqrtPriceLimitX96
    }

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);
}

// ============================================================================
// Flash Arbitrage Contract
// ============================================================================

contract FlashArb {
    address public owner;

    // Aave V3 Pool on Polygon
    IPool public constant POOL = IPool(0x794a61358D6845594F94dc1DB02A252b5b4814aD);

    // DEX routers
    ISwapRouter public constant QUICKSWAP_ROUTER =
        ISwapRouter(0xf5b509bB0909a69B1c207E495f687a596C168E12);
    IUniswapV2Router public constant SUSHI_ROUTER =
        IUniswapV2Router(0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506);

    // Tokens on Polygon
    address public constant USDC_E  = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address public constant WMATIC  = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address public constant WETH    = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f8d6;
    address public constant WBTC    = 0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6;

    // 0.05% Aave flash loan fee in basis points
    uint256 public constant AAVE_FEE_BPS = 5; // 0.05% = 5 / 10_000

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Entry point: initiate flash loan and execute arbitrage
    /// @param borrowAmount Amount of USDC.e to borrow
    /// @param intermediateToken Token to arb through (e.g. WMATIC, WETH)
    /// @param minProfit Minimum profit in USDC.e after repaying loan (slippage guard)
    /// @param buyOnSushi If true: buy intermediate on SushiSwap V2, sell on QuickSwap V3
    ///                   If false: buy on QuickSwap V3, sell on SushiSwap V2
    function executeArb(
        uint256 borrowAmount,
        address intermediateToken,
        uint256 minProfit,
        bool buyOnSushi
    ) external onlyOwner {
        bytes memory params = abi.encode(intermediateToken, minProfit, buyOnSushi);

        POOL.flashLoanSimple(
            address(this),
            USDC_E,
            borrowAmount,
            params,
            0 // referralCode
        );
    }

    /// @notice Aave V3 flash loan callback
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == address(POOL), "caller not Pool");
        require(initiator == address(this), "initiator not self");

        (address intermediateToken, uint256 minProfit, bool buyOnSushi) =
            abi.decode(params, (address, uint256, bool));

        uint256 amountOwed = amount + premium; // amount to repay Aave

        if (buyOnSushi) {
            // Step 1: Buy intermediate token on SushiSwap V2
            uint256 intermediateAmount = _swapOnSushiV2(
                USDC_E, intermediateToken, amount, 1
            );
            // Step 2: Sell intermediate token on QuickSwap V3 for USDC.e
            _swapOnQuickSwapV3(
                intermediateToken, USDC_E, intermediateAmount, amountOwed + minProfit
            );
        } else {
            // Step 1: Buy intermediate token on QuickSwap V3
            uint256 intermediateAmount = _swapOnQuickSwapV3(
                USDC_E, intermediateToken, amount, 1
            );
            // Step 2: Sell intermediate token on SushiSwap V2 for USDC.e
            _swapOnSushiV2(
                intermediateToken, USDC_E, intermediateAmount, amountOwed + minProfit
            );
        }

        // Approve Aave Pool to pull back the owed amount
        IERC20(asset).approve(address(POOL), amountOwed);

        return true;
    }

    // ========================================================================
    // Internal swap helpers
    // ========================================================================

    function _swapOnSushiV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(address(SUSHI_ROUTER), amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = SUSHI_ROUTER.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp
        );

        return amounts[amounts.length - 1];
    }

    function _swapOnQuickSwapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(address(QUICKSWAP_ROUTER), amountIn);

        ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMin,
                limitSqrtPrice: 0  // no price limit
            });

        return QUICKSWAP_ROUTER.exactInputSingle(swapParams);
    }

    // ========================================================================
    // Owner utilities
    // ========================================================================

    /// @notice Withdraw any ERC-20 token profits to owner
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "no balance");
        IERC20(token).transfer(owner, balance);
    }

    /// @notice Withdraw MATIC (if any) to owner
    function withdrawMatic() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "no balance");
        (bool ok, ) = owner.call{value: balance}("");
        require(ok, "transfer failed");
    }

    /// @notice Allow contract to receive MATIC
    receive() external payable {}
}
