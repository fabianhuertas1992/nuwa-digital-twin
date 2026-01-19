import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Providers from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NUWA - Digital Twin para Fincas',
  description: 'Plataforma de analisis ambiental y creditos de carbono para fincas agricolas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <footer className="bg-white border-t py-6">
              <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
                <p>NUWA Digital Twin - Tokenizacion de Activos Ambientales</p>
                <p className="mt-1">Powered by Cardano Blockchain</p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}
