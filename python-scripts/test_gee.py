import ee

# Reemplaza 'YOUR-PROJECT-ID' con tu project ID real
# Ejemplo: 'nuwa-digital-twin-12345'
PROJECT_ID = 'nuwa-digital-twin'  # ← CAMBIA ESTO

try:
    # Inicializar con el project ID
    ee.Initialize(project=PROJECT_ID)
    print(f"✅ Google Earth Engine inicializado correctamente!")
    print(f"✅ Proyecto: {PROJECT_ID}")
    
    # Hacer una consulta simple
    image = ee.Image('USGS/SRTMGL1_003')
    print(f"✅ Consulta de prueba exitosa: {image.getInfo()['type']}")
    
    # Probar Sentinel-2 (lo que usaremos para NDVI)
    sentinel = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    count = sentinel.filterDate('2024-01-01', '2024-12-31').size().getInfo()
    print(f"✅ Sentinel-2 accesible: {count} imágenes en 2024")
    
except Exception as e:
    print(f"❌ Error: {e}")