#!/usr/bin/env python3
"""
Sube analisis de fincas a IPFS (Pinata)

Uso:
    # Subir analisis individual
    python scripts/ipfs/upload_to_ipfs.py data/farms/output/PoligonoFedar_analysis.json

    # Subir batch completo
    python scripts/ipfs/upload_to_ipfs.py data/farms/output/ --batch

    # Solo generar metadata sin subir
    python scripts/ipfs/upload_to_ipfs.py data/farms/output/summary.json --dry-run
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

try:
    import requests
except ImportError:
    print("Error: requests not installed. Run: pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # dotenv is optional, environment variables can be set directly
    pass

# Pinata API configuration
PINATA_API_KEY = os.getenv('PINATA_API_KEY')
PINATA_API_SECRET = os.getenv('PINATA_API_SECRET')
PINATA_JWT = os.getenv('PINATA_JWT')
PINATA_API_URL = "https://api.pinata.cloud"


def check_pinata_config():
    """Check if Pinata credentials are configured"""
    if not PINATA_API_KEY and not PINATA_JWT:
        print("=" * 70)
        print("  CONFIGURACION PINATA REQUERIDA")
        print("=" * 70)
        print("\nPara subir archivos a IPFS necesitas configurar Pinata:")
        print("\n1. Crea una cuenta gratuita en: https://pinata.cloud")
        print("2. Ve a API Keys y genera una nueva key")
        print("3. Agrega las siguientes variables a tu archivo .env:")
        print("\n   PINATA_API_KEY=tu_api_key")
        print("   PINATA_API_SECRET=tu_api_secret")
        print("   # O alternativamente:")
        print("   PINATA_JWT=tu_jwt_token")
        print("\n" + "=" * 70)
        return False
    return True


def upload_json_to_ipfs(data: Dict[str, Any], filename: str) -> str:
    """Sube JSON a IPFS via Pinata"""

    url = f"{PINATA_API_URL}/pinning/pinJSONToIPFS"

    payload = {
        "pinataContent": data,
        "pinataMetadata": {
            "name": filename,
            "keyvalues": {
                "type": "farm-analysis",
                "version": "1.0"
            }
        },
        "pinataOptions": {
            "cidVersion": 1
        }
    }

    # Headers con autenticacion
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

    response = requests.post(url, json=payload, headers=headers, timeout=60)

    if response.status_code != 200:
        raise Exception(f"Error subiendo a IPFS: {response.status_code} - {response.text}")

    result = response.json()
    ipfs_hash = result['IpfsHash']

    return ipfs_hash


def create_nft_metadata(farm_analysis: Dict[str, Any], ipfs_hash: str) -> Dict[str, Any]:
    """Crea metadata compatible con estandares NFT (Cardano NFT Metadata Standard)"""

    farm_info = farm_analysis.get('farmInfo', {})
    analysis = farm_analysis.get('analysis', {})

    # Extract key metrics
    ndvi = analysis.get('ndvi', {})
    deforestation = analysis.get('deforestation', {})
    carbon = analysis.get('carbon', {})

    farm_id = farm_info.get('farmId', 'unknown')
    farm_name = farm_info.get('name', 'Unknown Farm')

    # Cardano NFT Metadata Standard (CIP-25)
    cardano_metadata = {
        "721": {
            "POLICY_ID_PLACEHOLDER": {
                farm_id: {
                    "name": f"Digital Twin - {farm_name}",
                    "description": f"Verified carbon baseline and EUDR compliance certificate for {farm_name}",
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
                        "Farm ID": farm_id,
                        "Owner": farm_info.get('owner', 'N/A'),
                        "Location": json.dumps(farm_info.get('location', {})),
                        "Baseline Carbon (tCO2e)": carbon.get('baselineCarbonTCO2e', 0),
                        "NDVI Mean": ndvi.get('mean', 0),
                        "EUDR Compliant": "Yes" if deforestation.get('compliant') else "No",
                        "Deforestation %": deforestation.get('deforestationPercent', 0),
                        "Area (ha)": carbon.get('areaHa', 0),
                        "Methodology": carbon.get('verraMethodology', 'VM0042'),
                        "Analysis Date": carbon.get('calculationDate', ''),
                        "IPFS Hash": ipfs_hash
                    }
                }
            }
        }
    }

    # Metadata simplificada para referencia
    simple_metadata = {
        "type": "FarmDigitalTwin",
        "version": "1.0",
        "farmId": farm_id,
        "name": farm_name,
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
        "cardanoNFT": cardano_metadata,
        "simple": simple_metadata
    }


def process_farm_analysis(analysis_file: Path, dry_run: bool = False) -> Dict[str, Any]:
    """Procesa un archivo de analisis y lo sube a IPFS"""

    print(f"\n   Procesando: {analysis_file.name}")

    # Load analysis
    with open(analysis_file, 'r', encoding='utf-8') as f:
        analysis_data = json.load(f)

    farm_name = analysis_data.get('farmInfo', {}).get('name', analysis_file.stem)

    if dry_run:
        print(f"   [DRY-RUN] No se subira a IPFS")
        ipfs_hash = "QmDRY_RUN_HASH_" + analysis_file.stem[:20]
    else:
        # Upload analysis to IPFS
        print(f"   Subiendo analisis a IPFS...")
        ipfs_hash = upload_json_to_ipfs(analysis_data, analysis_file.name)
        print(f"   [OK] IPFS Hash: {ipfs_hash}")
        print(f"   [OK] URL: https://gateway.pinata.cloud/ipfs/{ipfs_hash}")

    # Create NFT metadata
    print(f"   Generando metadata NFT...")
    nft_metadata = create_nft_metadata(analysis_data, ipfs_hash)

    # Save metadata locally
    metadata_file = analysis_file.parent / f"{analysis_file.stem}_metadata.json"
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(nft_metadata, f, indent=2, ensure_ascii=False)

    print(f"   [OK] Metadata guardada: {metadata_file.name}")

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
        "totalCarbonTCO2e": round(sum(r['carbonTCO2e'] for r in results), 2),
        "farms": results
    }

    manifest_file = output_dir / "ipfs_manifest.json"
    with open(manifest_file, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"\n   Manifest creado: {manifest_file}")

    return manifest_file


def main():
    parser = argparse.ArgumentParser(
        description='Sube analisis de fincas a IPFS',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  # Subir archivo individual
  python scripts/ipfs/upload_to_ipfs.py data/farms/output/finca_analysis.json

  # Subir todos los analisis
  python scripts/ipfs/upload_to_ipfs.py data/farms/output/ --batch

  # Solo fincas EUDR compliant
  python scripts/ipfs/upload_to_ipfs.py data/farms/output/ --batch --only-eligible

  # Modo prueba (sin subir)
  python scripts/ipfs/upload_to_ipfs.py data/farms/output/ --batch --dry-run
        """
    )

    parser.add_argument('path', help='Archivo o directorio de analisis')
    parser.add_argument('--batch', action='store_true', help='Procesar directorio completo')
    parser.add_argument('--dry-run', action='store_true', help='No subir, solo generar metadata')
    parser.add_argument('--only-eligible', action='store_true', help='Solo fincas EUDR compliant')

    args = parser.parse_args()

    try:
        print("\n" + "=" * 70)
        print("  UPLOAD TO IPFS - NUWA DIGITAL TWIN")
        print("=" * 70)

        # Check Pinata config (skip if dry-run)
        if not args.dry_run and not check_pinata_config():
            print("\nUsa --dry-run para probar sin subir a IPFS")
            sys.exit(1)

        if args.dry_run:
            print("\n   [DRY-RUN] No se subira nada a IPFS\n")

        path = Path(args.path)

        if not path.exists():
            print(f"\n   [ERROR] Path no encontrado: {args.path}")
            sys.exit(1)

        results = []

        # Process single file
        if path.is_file():
            if not path.name.endswith('_analysis.json'):
                print(f"\n   [ERROR] Archivo debe terminar en '_analysis.json'")
                sys.exit(1)

            result = process_farm_analysis(path, args.dry_run)
            results.append(result)

        # Process directory (batch)
        elif path.is_dir():
            if not args.batch:
                print(f"\n   [ERROR] Use --batch para procesar directorios")
                sys.exit(1)

            analysis_files = sorted(path.glob('*_analysis.json'))

            if not analysis_files:
                print(f"\n   [ERROR] No se encontraron archivos *_analysis.json en {path}")
                sys.exit(1)

            print(f"\n   Encontrados {len(analysis_files)} archivos de analisis")

            for analysis_file in analysis_files:
                # Skip manifest and summary files
                if 'manifest' in analysis_file.name.lower() or 'summary' in analysis_file.name.lower():
                    continue

                try:
                    result = process_farm_analysis(analysis_file, args.dry_run)

                    # Filter by EUDR if requested
                    if args.only_eligible and not result['eudrCompliant']:
                        print(f"   [SKIP] No cumple EUDR")
                        continue

                    results.append(result)

                except Exception as e:
                    print(f"   [ERROR] {e}")
                    continue

        # Create manifest
        if results:
            manifest_file = create_manifest(results, path if path.is_dir() else path.parent)

            print("\n" + "=" * 70)
            print("  RESUMEN")
            print("=" * 70)
            print(f"\n   Fincas procesadas: {len(results)}")
            print(f"   Elegibles EUDR: {len([r for r in results if r['eudrCompliant']])}")
            print(f"   Carbono total: {sum(r['carbonTCO2e'] for r in results):.2f} tCO2e")
            print(f"\n   Manifest: {manifest_file}")

            if not args.dry_run:
                print(f"\n   Verifica en Pinata: https://app.pinata.cloud/pinmanager")

            print()
        else:
            print("\n   No se procesaron archivos\n")

    except Exception as e:
        print(f"\n   [ERROR]: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
