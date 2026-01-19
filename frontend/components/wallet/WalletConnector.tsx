'use client'

import { useState } from 'react'
import { useWallet, WalletType } from './WalletContext'

const WALLET_INFO: Record<string, { name: string; icon: string; downloadUrl: string }> = {
  eternl: {
    name: 'Eternl',
    icon: '/wallets/eternl.svg',
    downloadUrl: 'https://eternl.io/app/mainnet/welcome',
  },
  nami: {
    name: 'Nami',
    icon: '/wallets/nami.svg',
    downloadUrl: 'https://namiwallet.io/',
  },
  flint: {
    name: 'Flint',
    icon: '/wallets/flint.svg',
    downloadUrl: 'https://flint-wallet.com/',
  },
}

export default function WalletConnector() {
  const { connected, address, walletType, balance, networkId, connect, disconnect, isConnecting, error, availableWallets } = useWallet()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleConnect = async (wallet: WalletType) => {
    if (wallet) {
      await connect(wallet)
      setShowDropdown(false)
    }
  }

  if (connected) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
          <span className="hidden sm:inline">{address}</span>
          <span className="sm:hidden">Conectado</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {walletType && WALLET_INFO[walletType]?.name}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${networkId === 1 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {networkId === 1 ? 'Mainnet' : 'Testnet'}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono break-all">{address}</p>
              {balance && (
                <p className="text-sm text-gray-700 mt-2">
                  <span className="font-medium">{balance}</span> ADA
                </p>
              )}
            </div>
            <button
              onClick={() => {
                disconnect()
                setShowDropdown(false)
              }}
              className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors text-sm"
            >
              Desconectar Wallet
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isConnecting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
      >
        {isConnecting ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Conectando...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Conectar Wallet</span>
          </>
        )}
      </button>

      {showDropdown && !isConnecting && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Seleccionar Wallet</h3>
            <p className="text-xs text-gray-500 mt-1">Conecta tu wallet de Cardano</p>
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="p-2">
            {(['eternl', 'nami', 'flint'] as WalletType[]).map((wallet) => {
              if (!wallet) return null
              const info = WALLET_INFO[wallet]
              const isAvailable = availableWallets.includes(wallet)

              return (
                <button
                  key={wallet}
                  onClick={() => isAvailable ? handleConnect(wallet) : window.open(info.downloadUrl, '_blank')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isAvailable
                      ? 'hover:bg-gray-100'
                      : 'opacity-50 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-600">
                      {info.name[0]}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{info.name}</p>
                    <p className="text-xs text-gray-500">
                      {isAvailable ? 'Disponible' : 'Instalar extension'}
                    </p>
                  </div>
                  {isAvailable ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>

          <div className="p-4 border-t bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-500 text-center">
              Al conectar, aceptas los terminos de uso de NUWA
            </p>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}
