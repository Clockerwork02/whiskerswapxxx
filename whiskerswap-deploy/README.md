# WhiskerSwap - HyperEVM DEX Aggregator

A sophisticated decentralized exchange aggregator built for the HyperEVM ecosystem with comprehensive token swapping and airdrop verification system.

## Features

- **Token Swapping**: Seamless token exchange with real-time price data
- **Airdrop System**: WHISKER token airdrop with tiered eligibility verification
- **Multi-Token Support**: Native HYPE and comprehensive ERC20 token support
- **Real-time Data**: Live liquidity and market data integration
- **Mobile Optimized**: Responsive design for all devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Express.js, TypeScript
- **Blockchain**: ethers.js v6, HyperEVM (Chain ID 999)
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: Vite, ESBuild

## Deployment

This project is optimized for Vercel deployment with automatic build configuration.

### Environment Variables Required:

- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - production/development

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Project Structure

- `/src` - React frontend application
- `/server` - Express backend API
- `/shared` - Shared TypeScript schemas and types
- `/public` - Static assets

## Network Configuration

- **HyperEVM Chain ID**: 999
- **RPC Endpoints**: Multiple redundant endpoints for reliability
- **Native Token**: HYPE
- **Wrapped Token**: WHYPE (0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E)

## License

MIT License