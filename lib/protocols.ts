const KNOWN_PROTOCOLS: Record<string, string> = {
  // Uniswap
  "0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap V3 Router",
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": "Uniswap V3 Router 2",
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap V2 Router",
  "0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b": "Uniswap Universal Router",
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": "Uniswap Universal Router v2",

  // OpenSea
  "0x00000000000000adc04c56bf30ac9d3c0aaf14dc": "OpenSea Seaport 1.5",
  "0x0000000000000068f116a894984e2db1123eb395": "OpenSea Seaport 1.6",

  // AAVE
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": "Aave V3 Pool",
  "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9": "Aave V2 Lending Pool",

  // Compound
  "0xc3d688b66703497daa19211eedff47f25384cdc3": "Compound V3 (cUSDCv3)",
  "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b": "Compound V2 Comptroller",

  // Curve
  "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7": "Curve 3Pool",
  "0xd51a44d3fae010294c616388b506acda1bfaae46": "Curve Tricrypto2",

  // 1inch
  "0x1111111254eeb25477b68fb85ed929f73a960582": "1inch Aggregation Router V5",
  "0x111111125421ca6dc452d289314280a0f8842a65": "1inch Aggregation Router V6",

  // Lido
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": "Lido stETH",
  "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0": "Lido wstETH",

  // ENS
  "0x283af0b28c62c092c9727f1ee09c02ca627eb7f5": "ENS Registrar Controller",
  "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85": "ENS Base Registrar",

  // Blur
  "0x000000000000ad05ccc4f10045630fb830b95127": "Blur Exchange",

  // Balancer
  "0xba12222222228d8ba445958a75a0704d566bf2c8": "Balancer V2 Vault",

  // Safe (Gnosis)
  "0xa9b34a4b568e640d5e5d1b694e6db5f0b45dc3e9": "Safe Multisig",

  // Across Bridge
  "0x5c7bcd6e7de5423a257d81b442095a1a6ced35c5": "Across V2 SpokePool",

  // Stargate
  "0x8731d54e9d02c286767d56ac03e8037c07e01e98": "Stargate Router",

  // USDC
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC Token",

  // USDT
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT Token",

  // DAI
  "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI Token",

  // WETH
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH Token",
};

export function getProtocolName(address: string): string | null {
  return KNOWN_PROTOCOLS[address.toLowerCase()] ?? null;
}
