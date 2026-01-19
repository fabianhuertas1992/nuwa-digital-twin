'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

export type WalletType = 'eternl' | 'nami' | 'flint' | null

export interface WalletState {
  connected: boolean
  address: string | null
  walletType: WalletType
  balance: string | null
  networkId: number | null
}

interface WalletContextType extends WalletState {
  connect: (walletType: WalletType) => Promise<boolean>
  disconnect: () => void
  isConnecting: boolean
  error: string | null
  availableWallets: WalletType[]
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

interface CardanoApi {
  enable: () => Promise<CardanoApiEnabled>
  isEnabled: () => Promise<boolean>
  name: string
  icon: string
  apiVersion: string
}

interface CardanoApiEnabled {
  getUsedAddresses: () => Promise<string[]>
  getUnusedAddresses: () => Promise<string[]>
  getBalance: () => Promise<string>
  getNetworkId: () => Promise<number>
  signTx: (tx: string, partialSign?: boolean) => Promise<string>
  submitTx: (tx: string) => Promise<string>
}

declare global {
  interface Window {
    cardano?: {
      eternl?: CardanoApi
      nami?: CardanoApi
      flint?: CardanoApi
    }
  }
}

const WALLET_KEY = 'nuwa_connected_wallet'

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    walletType: null,
    balance: null,
    networkId: null,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableWallets, setAvailableWallets] = useState<WalletType[]>([])

  // Check available wallets on mount
  useEffect(() => {
    const checkWallets = () => {
      const wallets: WalletType[] = []
      if (typeof window !== 'undefined' && window.cardano) {
        if (window.cardano.eternl) wallets.push('eternl')
        if (window.cardano.nami) wallets.push('nami')
        if (window.cardano.flint) wallets.push('flint')
      }
      setAvailableWallets(wallets)
    }

    // Check immediately and after a short delay (wallets may inject later)
    checkWallets()
    const timeout = setTimeout(checkWallets, 1000)
    return () => clearTimeout(timeout)
  }, [])

  // Auto-reconnect on page load
  useEffect(() => {
    const savedWallet = localStorage.getItem(WALLET_KEY) as WalletType
    if (savedWallet && availableWallets.includes(savedWallet)) {
      connect(savedWallet)
    }
  }, [availableWallets])

  const getWalletApi = (walletType: WalletType): CardanoApi | null => {
    if (!window.cardano || !walletType) return null
    return window.cardano[walletType] || null
  }

  const hexToAddress = (hex: string): string => {
    // Convert hex to bech32 address (simplified - in production use @emurgo/cardano-serialization-lib)
    // For now, just truncate for display
    if (hex.length > 20) {
      return `addr1...${hex.slice(-12)}`
    }
    return hex
  }

  const lovelaceToAda = (lovelace: string): string => {
    const ada = parseInt(lovelace) / 1_000_000
    return ada.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const connect = useCallback(async (walletType: WalletType): Promise<boolean> => {
    if (!walletType) return false

    setIsConnecting(true)
    setError(null)

    try {
      const walletApi = getWalletApi(walletType)

      if (!walletApi) {
        throw new Error(`${walletType} wallet not found. Please install the extension.`)
      }

      const api = await walletApi.enable()

      // Get address
      const addresses = await api.getUsedAddresses()
      const address = addresses[0] || (await api.getUnusedAddresses())[0]

      // Get balance
      const balanceHex = await api.getBalance()
      const balance = lovelaceToAda(balanceHex)

      // Get network
      const networkId = await api.getNetworkId()

      setState({
        connected: true,
        address: hexToAddress(address),
        walletType,
        balance,
        networkId,
      })

      // Save to localStorage
      localStorage.setItem(WALLET_KEY, walletType)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet'
      setError(message)
      console.error('Wallet connection error:', err)
      return false
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      address: null,
      walletType: null,
      balance: null,
      networkId: null,
    })
    localStorage.removeItem(WALLET_KEY)
    setError(null)
  }, [])

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        isConnecting,
        error,
        availableWallets,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
