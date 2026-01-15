import Link from 'next/link'
import { TreePine, Leaf, Shield, Coins, ArrowRight, CheckCircle } from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: Leaf,
      title: 'Analisis NDVI',
      description: 'Monitoreo de salud vegetal mediante imagenes satelitales de Google Earth Engine',
    },
    {
      icon: Shield,
      title: 'Cumplimiento EUDR',
      description: 'Verificacion automatica de deforestacion segun la regulacion europea',
    },
    {
      icon: TreePine,
      title: 'Linea Base de Carbono',
      description: 'Calculo de captura de carbono usando metodologia Verra VM0042',
    },
    {
      icon: Coins,
      title: 'Tokenizacion NFT',
      description: 'Certificacion de activos ambientales en blockchain Cardano',
    },
  ]

  const steps = [
    { step: 1, title: 'Sube tu Poligono', description: 'Carga el archivo GeoJSON de tu finca' },
    { step: 2, title: 'Analisis Automatico', description: 'Procesamos NDVI, EUDR y carbono' },
    { step: 3, title: 'Genera Certificado', description: 'Obtiene tu NFT verificable en blockchain' },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-600 to-emerald-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Gemelos Digitales para Fincas Sostenibles
              </h1>
              <p className="mt-6 text-lg text-green-100">
                Transforma tu finca en un activo ambiental verificable. Analiza,
                certifica y tokeniza tu captura de carbono con tecnologia satelital
                y blockchain.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/farm/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-green-700 rounded-lg font-semibold hover:bg-green-50 transition-colors"
                >
                  Comenzar Analisis
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  Ver Dashboard
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold">500+</p>
                    <p className="text-sm text-green-100">Hectareas Analizadas</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold">50+</p>
                    <p className="text-sm text-green-100">Fincas Certificadas</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold">10K+</p>
                    <p className="text-sm text-green-100">tCO2e Calculadas</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold">95%</p>
                    <p className="text-sm text-green-100">Cumplimiento EUDR</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Analisis Ambiental Completo
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Utilizamos datos satelitales y algoritmos avanzados para generar
              reportes precisos sobre el estado ambiental de tu finca.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="p-3 bg-green-100 rounded-lg w-fit">
                    <Icon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-gray-600 text-sm">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Como Funciona
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Tres simples pasos para certificar tu finca
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-600 text-white text-xl font-bold mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-gray-600">
                    {item.description}
                  </p>
                </div>
                {item.step < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-8 w-8 text-green-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white">
            Comienza a Certificar tu Finca Hoy
          </h2>
          <p className="mt-4 text-lg text-green-100">
            Unete a la revolucion de los activos ambientales digitales
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/farm/new"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-700 rounded-lg font-semibold hover:bg-green-50 transition-colors"
            >
              <CheckCircle className="h-5 w-5" />
              Analizar Mi Finca
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
