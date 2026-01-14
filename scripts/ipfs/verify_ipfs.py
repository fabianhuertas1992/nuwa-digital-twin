#!/usr/bin/env python3
"""
Verifica que los archivos en IPFS sean accesibles

Uso:
    python scripts/ipfs/verify_ipfs.py data/farms/output/ipfs_manifest.json
"""

import json
import sys
import argparse
from pathlib import Path

try:
    import requests
except ImportError:
    print("Error: requests not installed. Run: pip install requests")
    sys.exit(1)

# IPFS gateways to try
GATEWAYS = [
    "https://gateway.pinata.cloud",
    "https://ipfs.io",
    "https://cloudflare-ipfs.com",
    "https://dweb.link"
]


def verify_ipfs_hash(ipfs_hash: str, timeout: int = 10) -> dict:
    """Verifica que un hash IPFS sea accesible en multiples gateways"""

    results = {
        'hash': ipfs_hash,
        'accessible': False,
        'gateway': None,
        'status_code': None,
        'content_type': None
    }

    for gateway in GATEWAYS:
        url = f"{gateway}/ipfs/{ipfs_hash}"

        try:
            response = requests.head(url, timeout=timeout, allow_redirects=True)

            if response.status_code == 200:
                results['accessible'] = True
                results['gateway'] = gateway
                results['status_code'] = response.status_code
                results['content_type'] = response.headers.get('Content-Type', 'unknown')
                return results

        except requests.exceptions.Timeout:
            continue
        except requests.exceptions.RequestException:
            continue

    return results


def verify_manifest(manifest_file: Path, verbose: bool = False) -> dict:
    """Verifica todos los archivos en un manifest"""

    with open(manifest_file, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    farms = manifest.get('farms', [])
    total = len(farms)
    accessible = 0
    failed = []

    print(f"\n   Verificando {total} archivos en IPFS...\n")

    for farm in farms:
        ipfs_hash = farm.get('ipfsHash', '')
        name = farm.get('farmName', 'Unknown')

        # Skip dry-run hashes
        if ipfs_hash.startswith('QmDRY_RUN'):
            print(f"   {name}: [SKIP] Hash de dry-run")
            continue

        print(f"   {name}: ", end='', flush=True)

        result = verify_ipfs_hash(ipfs_hash)

        if result['accessible']:
            print(f"[OK] Accesible via {result['gateway']}")
            accessible += 1
            if verbose:
                print(f"      Content-Type: {result['content_type']}")
        else:
            print(f"[ERROR] No accesible")
            failed.append({
                'name': name,
                'hash': ipfs_hash
            })

    return {
        'total': total,
        'accessible': accessible,
        'failed': failed
    }


def main():
    parser = argparse.ArgumentParser(
        description='Verifica archivos en IPFS',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  # Verificar manifest
  python scripts/ipfs/verify_ipfs.py data/farms/output/ipfs_manifest.json

  # Verificar con detalles
  python scripts/ipfs/verify_ipfs.py data/farms/output/ipfs_manifest.json --verbose

  # Verificar hash individual
  python scripts/ipfs/verify_ipfs.py --hash QmXyZ123abc
        """
    )

    parser.add_argument('manifest', nargs='?', help='Archivo manifest JSON')
    parser.add_argument('--hash', help='Verificar hash individual')
    parser.add_argument('--verbose', '-v', action='store_true', help='Mostrar detalles')

    args = parser.parse_args()

    print("\n" + "=" * 70)
    print("  VERIFY IPFS - NUWA DIGITAL TWIN")
    print("=" * 70)

    # Verify single hash
    if args.hash:
        print(f"\n   Verificando hash: {args.hash}\n")

        result = verify_ipfs_hash(args.hash)

        if result['accessible']:
            print(f"   [OK] Hash accesible")
            print(f"   Gateway: {result['gateway']}")
            print(f"   Content-Type: {result['content_type']}")
            print(f"   URL: {result['gateway']}/ipfs/{args.hash}")
        else:
            print(f"   [ERROR] Hash no accesible en ninguna gateway")
            print(f"   Gateways probadas: {', '.join(GATEWAYS)}")

        print()
        return

    # Verify manifest
    if not args.manifest:
        parser.print_help()
        sys.exit(1)

    manifest_file = Path(args.manifest)

    if not manifest_file.exists():
        print(f"\n   [ERROR] Archivo no encontrado: {args.manifest}")
        sys.exit(1)

    try:
        result = verify_manifest(manifest_file, args.verbose)

        print("\n" + "=" * 70)
        print("  RESUMEN")
        print("=" * 70)
        print(f"\n   Total archivos: {result['total']}")
        print(f"   Accesibles: {result['accessible']}")
        print(f"   Fallidos: {len(result['failed'])}")

        if result['failed']:
            print("\n   Archivos no accesibles:")
            for item in result['failed']:
                print(f"   - {item['name']}: {item['hash']}")

        print()

    except Exception as e:
        print(f"\n   [ERROR]: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
