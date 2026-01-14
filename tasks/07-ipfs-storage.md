# Task: Implement IPFS Storage for Farm Analysis

## Context
Upload farm analysis results, satellite imagery URLs, and metadata to IPFS (via Pinata) for immutable storage. Generate CIDs (Content Identifiers) that will be used in NFT metadata.

## Technical Requirements

### Python IPFS Upload Script (scripts/ipfs/upload_to_ipfs.py)
- Accept analysis JSON file or directory
- Upload to IPFS via Pinata API
- Generate CIDs for each farm
- Create NFT-ready metadata
- Track all CIDs in manifest file
- Support batch upload

### Script Implementation
```python
#!/usr/bin/env python3
"""
Sube análisis de fincas a IPFS (Pinata)

Uso:
    # Subir análisis individual
    python scripts/ipfs/upload_to_ipfs.py data/farms/output/PoligonoFedar_analysis.json
    
    # Subir batch completo
    python scripts/ipfs/upload_to_ipfs.py data/farms/output/ --batch
    
    # Solo generar metadata sin subir
    python scripts/ipfs/upload_to_ipfs.py data/farms/output/summary.json --dry-run
"""

import os
import sys
import json
import requests
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

PINATA_API_KEY = os.getenv('PINATA_API_KEY')
PINATA_API_SECRET = os.getenv('PINATA_API_SECRET')
PINATA_JWT = os.getenv('PINATA_JWT')

if not PINATA_API_KEY and not PINATA_JWT:
    print("❌ Error: PINATA_API_KEY o PINATA_JWT no configurado en .env")
    print("   Crea una cuenta en https://pinata.cloud y agrega las keys")
    sys.exit(1)

PINATA_API_URL = "https://api.pinata.cloud"

def upload_json_to_ipfs(data: Dict[str, Any], filename: str) -> str:
    """Sube JSON a IPFS vía Pinata"""
    
    url = f"{PINATA_API_URL}/pinning/pinJSONToIPFS"
    
    payload = {
        "pinataContent": data,
        "pinataMetadata": {
            "name": filename
        }
    }
    
    # Headers con autenticación
    if PINATA_JWT:
        headers = {
            "Authorization": f"Bearer {PINATA_JWT}",
            "Content-Type": "application/json"
        }
    else:
        headers = {
            "pinata_api_key": PINATA_API_KEY,
            "pinata_secret_api_key": PINATA_API_SECRET,
            "Content-Type": "application/json"
        }
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code != 200:
        raise Exception(f"Error subiendo a IPFS: {response.status_code} - {response.text}")
    
    result = response.json()
    ipfs_hash = result['IpfsHash']
    
    return ipfs_hash

def create_nft_metadata(farm_analysis: Dict[str, Any], ipfs_hash: str) -> Dict[str, Any]:
    """Crea metadata compatible con estándares NFT (Cardano NFT Metadata Standard)"""
    
    farm_info = farm_analysis.get('farmInfo', {})
    analysis = farm_analysis.get('analysis', {})
    
    # Extract key metrics
    ndvi = analysis.get('ndvi', {})
    deforestation = analysis.get('deforestation', {})
    carbon = analysis.get('carbon', {})
    
    # Cardano NFT Metadata Standard (CIP-25)
    metadata = {
        "721": {
            "policy_id_placeholder": {
                farm_info.get('farmId', 'unknown'): {
                    "name": f"Digital Twin - {farm_info.get('name', 'Unknown Farm')}",
                    "description": f"Verified carbon baseline and EUDR compliance certificate for {farm_info.get('name')}",
                    "image": f"ipfs://{ipfs_hash}",
                    "mediaType": "application/json",
                    "files": [
                        {
                            "name": "Farm Analysis Data",
                            "mediaType": "application/json",
                            "src": f"ipfs://{ipfs_hash}"
                        }
                    ],
                    "attributes": {
                        "Farm ID": farm_info.get('farmId', 'N/A'),
                        "Owner": farm_info.get('owner', 'N/A'),
                        "Location": json.dumps(farm_info.get('location', {})),
                        "Baseline Carbon (tCO2e)": carbon.get('baselineCarbonTCO2e', 0),
                        "NDVI Mean": ndvi.get('mean', 0),
                        "EUDR Compliant": "Yes" if deforestation.get('compliant') else "No",
                        "Deforestation %": deforestation.get('deforestationPercent', 0),
                        "Area (ha)": carbon.get('areaHa', 0),
                        "Methodology": carbon.get('verraMethodology', 'VM0042'),
                        "Analysis Date": analysis.get('carbon', {}).get('calculationDate', ''),
                        "IPFS Hash": ipfs_hash
                    }
                }
            }
        }
    }
    
    # También crear metadata simplificada para referencia
    simple_metadata = {
        "type": "FarmDigitalTwin",
        "version": "1.0",
        "farmId": farm_info.get('farmId', 'unknown'),
        "name": farm_info.get('name', 'Unknown'),
        "owner": farm_info.get('owner', 'N/A'),
        "location": farm_info.get('location', {}),
        "metrics": {
            "baselineCarbonTCO2e": carbon.get('baselineCarbonTCO2e', 0),
            "ndviMean": ndvi.get('mean', 0),
            "eudrCompliant": deforestation.get('compliant', False),
            "deforestationPercent": deforestation.get('deforestationPercent', 0),
            "areaHa": carbon.get('areaHa', 0)
        },
        "ipfs": {
            "analysisHash": ipfs_hash,
            "analysisUrl": f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
        },
        "verificationDate": datetime.now().isoformat(),
        "methodology": "Verra VM0042"
    }
    
    return {
        "cardanoNFT": metadata,
        "simple": simple_metadata
    }

def process_farm_analysis(analysis_file: Path, dry_run: bool = False) -> Dict[str, Any]:
    """Procesa un archivo de análisis y lo sube a IPFS"""
    
    print(f"\n📄 Procesando: {analysis_file.name}")
    
    # Load analysis
    with open(analysis_file, 'r', encoding='utf-8') as f:
        analysis_data = json.load(f)
    
    farm_name = analysis_data.get('farmInfo', {}).get('name', analysis_file.stem)
    
    if dry_run:
        print(f"   🔍 Modo dry-run (no se subirá a IPFS)")
        ipfs_hash = "QmDRY_RUN_HASH_" + analysis_file.stem
    else:
        # Upload analysis to IPFS
        print(f"   ⬆️  Subiendo análisis a IPFS...")
        ipfs_hash = upload_json_to_ipfs(analysis_data, analysis_file.name)
        print(f"   ✅ IPFS Hash: {ipfs_hash}")
        print(f"   🔗 URL: https://gateway.pinata.cloud/ipfs/{ipfs_hash}")
    
    # Create NFT metadata
    print(f"   📝 Generando metadata NFT...")
    nft_metadata = create_nft_metadata(analysis_data, ipfs_hash)
    
    # Save metadata locally
    metadata_file = analysis_file.parent / f"{analysis_file.stem}_metadata.json"
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(nft_metadata, f, indent=2, ensure_ascii=False)
    
    print(f"   💾 Metadata guardada en: {metadata_file.name}")
    
    return {
        'filename': analysis_file.name,
        'farmName': farm_name,
        'ipfsHash': ipfs_hash,
        'ipfsUrl': f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}",
        'metadataFile': str(metadata_file),
        'eudrCompliant': analysis_data.get('analysis', {}).get('deforestation', {}).get('compliant', False),
        'carbonTCO2e': analysis_data.get('analysis', {}).get('carbon', {}).get('baselineCarbonTCO2e', 0)
    }

def create_manifest(results: List[Dict[str, Any]], output_dir: Path):
    """Crea manifest con todos los CIDs"""
    
    manifest = {
        "version": "1.0",
        "createdAt": datetime.now().isoformat(),
        "totalFarms": len(results),
        "eligibleFarms": len([r for r in results if r['eudrCompliant']]),
        "totalCarbonTCO2e": sum(r['carbonTCO2e'] for r in results),
        "farms": results
    }
    
    manifest_file = output_dir / "ipfs_manifest.json"
    with open(manifest_file, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    
    print(f"\n📋 Manifest creado: {manifest_file}")
    
    return manifest_file

def main():
    parser = argparse.ArgumentParser(
        description='Sube análisis de fincas a IPFS',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('path', help='Archivo o directorio de análisis')
    parser.add_argument('--batch', action='store_true', help='Procesar directorio completo')
    parser.add_argument('--dry-run', action='store_true', help='No subir, solo generar metadata')
    parser.add_argument('--only-eligible', action='store_true', help='Solo fincas EUDR compliant')
    
    args = parser.parse_args()
    
    try:
        print("\n" + "=" * 80)
        print("  UPLOAD TO IPFS - NUWA DIGITAL TWIN")
        print("=" * 80)
        
        if args.dry_run:
            print("\n⚠️  Modo DRY-RUN: No se subirá nada a IPFS\n")
        
        path = Path(args.path)
        
        if not path.exists():
            print(f"❌ Path no encontrado: {args.path}")
            sys.exit(1)
        
        results = []
        
        # Process single file
        if path.is_file():
            if not path.name.endswith('_analysis.json'):
                print(f"❌ Archivo debe terminar en '_analysis.json'")
                sys.exit(1)
            
            result = process_farm_analysis(path, args.dry_run)
            results.append(result)
        
        # Process directory (batch)
        elif path.is_dir():
            if not args.batch:
                print(f"❌ Use --batch para procesar directorios")
                sys.exit(1)
            
            analysis_files = list(path.glob('*_analysis.json'))
            
            if not analysis_files:
                print(f"❌ No se encontraron archivos *_analysis.json en {path}")
                sys.exit(1)
            
            print(f"\n📂 Encontrados {len(analysis_files)} archivos de análisis\n")
            
            for analysis_file in analysis_files:
                # Skip summary files
                if 'summary' in analysis_file.name:
                    continue
                
                try:
                    result = process_farm_analysis(analysis_file, args.dry_run)
                    
                    # Filter by EUDR if requested
                    if args.only_eligible and not result['eudrCompliant']:
                        print(f"   ⏭️  Saltando (no cumple EUDR)")
                        continue
                    
                    results.append(result)
                    
                except Exception as e:
                    print(f"   ❌ Error: {e}")
                    continue
        
        # Create manifest
        if results:
            manifest_file = create_manifest(results, path if path.is_dir() else path.parent)
            
            print("\n" + "=" * 80)
            print("  RESUMEN")
            print("=" * 80)
            print(f"\n✅ Fincas procesadas: {len(results)}")
            print(f"✅ Elegibles EUDR: {len([r for r in results if r['eudrCompliant']])}")
            print(f"✅ Carbono total: {sum(r['carbonTCO2e'] for r in results):.2f} tCO2e")
            print(f"\n📋 Manifest: {manifest_file}")
            
            if not args.dry_run:
                print(f"\n🔗 Verifica tus archivos en Pinata: https://app.pinata.cloud/pinmanager")
            
            print()
        else:
            print("\n⚠️  No se procesaron archivos")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
```

## Additional Requirements

Create helper script: `scripts/ipfs/verify_ipfs.py`
```python
#!/usr/bin/env python3
"""
Verifica que los archivos en IPFS sean accesibles

Uso:
    python scripts/ipfs/verify_ipfs.py data/farms/output/ipfs_manifest.json
"""

import json
import sys
import requests
from pathlib import Path

def verify_ipfs_hash(ipfs_hash: str, gateway: str = "https://gateway.pinata.cloud") -> bool:
    """Verifica que un hash IPFS sea accesible"""
    url = f"{gateway}/ipfs/{ipfs_hash}"
    
    try:
        response = requests.head(url, timeout=10)
        return response.status_code == 200
    except:
        return False

def main():
    if len(sys.argv) < 2:
        print("Uso: python verify_ipfs.py <manifest.json>")
        sys.exit(1)
    
    manifest_file = Path(sys.argv[1])
    
    with open(manifest_file, 'r') as f:
        manifest = json.load(f)
    
    print(f"\n🔍 Verificando {len(manifest['farms'])} archivos en IPFS...\n")
    
    success_count = 0
    
    for farm in manifest['farms']:
        ipfs_hash = farm['ipfsHash']
        name = farm['farmName']
        
        print(f"   {name}: ", end='')
        
        if verify_ipfs_hash(ipfs_hash):
            print(f"✅ Accesible")
            success_count += 1
        else:
            print(f"❌ No accesible")
    
    print(f"\n✅ {success_count}/{len(manifest['farms'])} archivos accesibles\n")

if __name__ == '__main__':
    main()
```

## Directory Structure
```
scripts/
└── ipfs/
    ├── upload_to_ipfs.py
    └── verify_ipfs.py
```

## Dependencies
Add to python-scripts/requirements.txt:
```
requests>=2.31.0
python-dotenv>=1.0.0
```

## Files to Create
1. `scripts/ipfs/upload_to_ipfs.py` - Main upload script
2. `scripts/ipfs/verify_ipfs.py` - Verification script

## Usage Examples

### Upload single farm
```bash
python scripts/ipfs/upload_to_ipfs.py data/farms/output/PoligonoFedar_analysis.json
```

### Upload all farms (batch)
```bash
python scripts/ipfs/upload_to_ipfs.py data/farms/output/ --batch
```

### Upload only EUDR compliant farms
```bash
python scripts/ipfs/upload_to_ipfs.py data/farms/output/ --batch --only-eligible
```

### Dry run (test without uploading)
```bash
python scripts/ipfs/upload_to_ipfs.py data/farms/output/ --batch --dry-run
```

### Verify uploads
```bash
python scripts/ipfs/verify_ipfs.py data/farms/output/ipfs_manifest.json
```

## Expected Output

### Console
```
================================================================================
  UPLOAD TO IPFS - NUWA DIGITAL TWIN
================================================================================

📂 Encontrados 5 archivos de análisis

📄 Procesando: PoligonoFedar_analysis.json
   ⬆️  Subiendo análisis a IPFS...
   ✅ IPFS Hash: QmXyZ123...
   🔗 URL: https://gateway.pinata.cloud/ipfs/QmXyZ123...
   📝 Generando metadata NFT...
   💾 Metadata guardada en: PoligonoFedar_analysis_metadata.json

📋 Manifest creado: data/farms/output/ipfs_manifest.json

================================================================================
  RESUMEN
================================================================================

✅ Fincas procesadas: 5
✅ Elegibles EUDR: 3
✅ Carbono total: 15751.54 tCO2e

📋 Manifest: data/farms/output/ipfs_manifest.json

🔗 Verifica tus archivos en Pinata: https://app.pinata.cloud/pinmanager
```

### ipfs_manifest.json
```json
{
  "version": "1.0",
  "createdAt": "2026-01-13T...",
  "totalFarms": 5,
  "eligibleFarms": 3,
  "totalCarbonTCO2e": 15751.54,
  "farms": [
    {
      "filename": "PoligonoFedar_analysis.json",
      "farmName": "PoligonoFedar",
      "ipfsHash": "QmXyZ123...",
      "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmXyZ123...",
      "metadataFile": "PoligonoFedar_analysis_metadata.json",
      "eudrCompliant": true,
      "carbonTCO2e": 6061.03
    },
    ...
  ]
}
```

## Acceptance Criteria
- [ ] Script uploads JSON to IPFS via Pinata
- [ ] Generates CID for each farm
- [ ] Creates NFT-ready metadata (Cardano CIP-25 standard)
- [ ] Supports batch upload
- [ ] Creates manifest with all CIDs
- [ ] Handles API errors gracefully
- [ ] Verification script works
- [ ] Metadata files are created locally