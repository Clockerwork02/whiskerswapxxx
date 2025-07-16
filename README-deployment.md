# WhiskerSwap - HyperEVM DEX

A decentralized exchange interface for HyperEVM blockchain with token swapping and liquidity provision capabilities.

## Features

- **Token Swapping**: Exchange tokens on HyperEVM network
- **Liquidity Provision**: Add liquidity to earn rewards  
- **Direct Wallet Connection**: MetaMask, OKX, Trust Wallet support
- **Real-time Pricing**: Live token prices and market data
- **Points System**: Earn points for trading activities

## Quick GitHub Upload

### Files to Upload to GitHub:

1. **Copy** the `src/` folder
2. **Copy** the `public/` folder  
3. **Copy** `index.html`
4. **Rename** `package-clean.json` → `package.json`
5. **Rename** `vite-clean.config.ts` → `vite.config.ts`
6. **Copy** `tailwind.config.ts`
7. **Copy** `postcss.config.js`
8. **Copy** `vercel.json`
9. **Copy** `.gitignore`
10. **Copy** this `README-deployment.md` as `README.md`

### DO NOT Upload:
- `node_modules/` folder
- `dist/` folder
- `.replit` file
- `package-lock.json`
- Server-related files

## Deployment on Vercel

1. Upload files to GitHub repository
2. Connect repository to Vercel
3. Use these settings:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy immediately

## Wallet Connection

The app connects directly to browser wallets:
- MetaMask
- OKX Wallet
- Trust Wallet
- Other EVM-compatible wallets

No WalletConnect configuration needed.

## Network

- **Chain**: HyperEVM (Chain ID: 999)
- **RPC**: https://rpc.hyperliquid.xyz/evm
- **Native Token**: HYPE

The app automatically adds the HyperEVM network to your wallet.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The built files will be in the `dist` directory.