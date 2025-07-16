# WhiskerSwap - Complete Deployment Guide

## Step 1: Prepare Files for GitHub

### 1.1 Copy the WhiskerSwap Logo
First, copy the logo to the public directory:
```bash
cp attached_assets/IMG_3906_1752586079724.png public/whisker-cat.png
```

### 1.2 Create Required Files
The following files are already configured and ready:
- ✅ `package.json` - All dependencies included
- ✅ `vercel.json` - Vercel deployment configuration
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `tailwind.config.ts` - Tailwind CSS configuration
- ✅ `vite.config.ts` - Vite build configuration
- ✅ `postcss.config.js` - PostCSS configuration
- ✅ `drizzle.config.ts` - Database configuration

### 1.3 Environment Variables Required
Create a `.env` file with these variables (do NOT commit this file):
```env
# Database (optional for basic functionality)
DATABASE_URL=your_postgresql_connection_string_here

# Node Environment
NODE_ENV=production
```

## Step 2: Upload to GitHub

### 2.1 Create GitHub Repository
1. Go to [GitHub](https://github.com) and sign in
2. Click "New repository" button
3. Name: `whiskerswap-dex`
4. Description: `WhiskerSwap - HyperEVM DEX Aggregator`
5. Select "Public" or "Private" as needed
6. ✅ Do NOT initialize with README (we have files)
7. Click "Create repository"

### 2.2 Upload Files to GitHub
**Option A: Using GitHub Web Interface**
1. On your new repository page, click "uploading an existing file"
2. Select ALL files from your WhiskerSwap project EXCEPT:
   - `node_modules/` (never upload this)
   - `.env` (contains secrets)
   - `dist/` (build output)
   - `.replit` (Replit specific)
3. Drag and drop all other files
4. Commit message: "Initial WhiskerSwap deployment"
5. Click "Commit changes"

**Option B: Using Git Commands (if you have Git installed)**
```bash
git init
git add .
git commit -m "Initial WhiskerSwap deployment"
git branch -M main
git remote add origin https://github.com/yourusername/whiskerswap-dex.git
git push -u origin main
```

### 2.3 Essential Files to Include
Make sure these files are uploaded:
```
✅ package.json
✅ vercel.json
✅ tsconfig.json
✅ tailwind.config.ts
✅ vite.config.ts
✅ postcss.config.js
✅ index.html
✅ client/ (entire folder)
✅ server/ (entire folder)
✅ shared/ (entire folder)
✅ public/ (entire folder with whisker-cat.png)
✅ components.json
✅ drizzle.config.ts
```

## Step 3: Deploy to Vercel

### 3.1 Connect GitHub to Vercel
1. Go to [Vercel](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository `whiskerswap-dex`
4. Vercel will automatically detect the framework

### 3.2 Configure Build Settings
Vercel should auto-detect these settings from `vercel.json`:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3.3 Environment Variables (Optional)
In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add these if using database:
   - `DATABASE_URL` = `your_postgresql_connection_string`
   - `NODE_ENV` = `production`

### 3.4 Deploy
1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Your app will be live at: `https://whiskerswap-dex.vercel.app` (or similar)

## Step 4: Verify Deployment

### 4.1 Check These Features
- ✅ HomePage loads with WhiskerSwap branding
- ✅ Swap page functional
- ✅ Liquidity page accessible
- ✅ Airdrop Checker in menu
- ✅ Wallet connection works
- ✅ All buttons display correctly

### 4.2 Test Wallet Functions
1. Connect wallet (MetaMask, OKX, Trust Wallet)
2. Test swap functionality
3. Test airdrop checker
4. Verify transaction signatures show "WhiskerSwap - HyperEVM DEX Aggregator"

## Step 5: Custom Domain (Optional)

### 5.1 Add Custom Domain
1. In Vercel dashboard, go to Project Settings → Domains
2. Add your custom domain (e.g., `whiskerswap.com`)
3. Configure DNS settings as instructed by Vercel
4. SSL certificate will be auto-generated

## Critical Notes

### Security
- ⚠️ Never commit `.env` files to GitHub
- ⚠️ Keep collector address secure: `0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48`
- ⚠️ Database connection strings are sensitive

### Performance
- ✅ All assets are optimized for production
- ✅ Code splitting enabled via Vite
- ✅ Tailwind CSS is purged for minimal bundle size

### Troubleshooting
If deployment fails:
1. Check Vercel build logs
2. Ensure all dependencies are in `package.json`
3. Verify file paths are correct
4. Check for TypeScript errors

## Support
- GitHub repository: Store all code
- Vercel dashboard: Monitor deployments
- Build logs: Debug deployment issues

Your WhiskerSwap DEX will be live and fully functional once deployed!