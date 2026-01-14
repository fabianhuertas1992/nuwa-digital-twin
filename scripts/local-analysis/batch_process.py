#!/usr/bin/env python3
"""
Procesamiento por lotes de múltiples fincas

Uso:
    python scripts/local-analysis/batch_process.py data/farms/input/
    
Opciones:
    --output-dir PATH    Directorio de salida (default: data/farms/output/)
    --summary-csv PATH   Archivo CSV resumen (default: data/farms/output/summary.csv)
    --summary-json PATH  Archivo JSON resumen (default: data/farms/output/summary.json)
    --start-date DATE    Fecha inicio NDVI (default: 2024-01-01)
    --end-date DATE      Fecha fin NDVI (default: 2024-12-31)
    --continue-on-error  Continuar si falla el procesamiento de una finca
"""

import json
import sys
import os
import csv
import argparse
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

try:
    import ee
except ImportError:
    print("Error: earthengine-api not installed. Run: pip install earthengine-api")
    sys.exit(1)

# Import functions from analyze_farm.py
# Add parent directory to path to import analyze_farm
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

from analyze_farm import (
    load_farm_json,
    calculate_ndvi,
    analyze_deforestation,
    calculate_carbon_baseline,
    PROJECT_ID
)

# Initialize Earth Engine
try:
    ee.Initialize(project=PROJECT_ID)
except Exception as e:
    print(f"❌ Error inicializando Earth Engine: {e}")
    print("   Ejecuta: earthengine authenticate --project=nuwa-digital-twin")
    sys.exit(1)

def find_farm_files(input_dir: str) -> List[Path]:
    """Encuentra todos los archivos JSON/GeoJSON en el directorio"""
    input_path = Path(input_dir)
    
    if not input_path.exists():
        raise FileNotFoundError(f"Directorio no encontrado: {input_dir}")
    
    # Find all .json and .geojson files
    json_files = list(input_path.glob('*.json'))
    geojson_files = list(input_path.glob('*.geojson'))
    
    all_files = json_files + geojson_files
    
    return sorted(all_files)

def process_farm(
    json_path: Path,
    output_dir: str,
    start_date: str,
    end_date: str
) -> Dict[str, Any]:
    """Procesa una finca y retorna resumen"""
    
    result = {
        'filename': json_path.name,
        'success': False,
        'error': None,
        'name': None,
        'farmId': None,
        'areaHa': None,
        'ndvi': None,
        'eudrCompliant': None,
        'deforestationPercent': None,
        'carbonTCO2e': None
    }
    
    try:
        # Load farm data
        farm_data = load_farm_json(str(json_path))
        polygon = farm_data['polygon']
        
        result['name'] = farm_data.get('name', 'N/A')
        result['farmId'] = farm_data.get('farmId', 'N/A')
        
        # Calculate area
        # Handle both Feature and Polygon formats
        if polygon.get('type') == 'Feature':
            coords = polygon['geometry']['coordinates']
        else:
            coords = polygon['coordinates']
        
        aoi = ee.Geometry.Polygon(coords[0] if isinstance(coords[0][0], list) else coords)
        area_m2 = aoi.area().getInfo()
        area_ha = area_m2 / 10000
        result['areaHa'] = round(area_ha, 2)
        
        analysis_results = {}
        
        # NDVI
        try:
            ndvi_result = calculate_ndvi(polygon, start_date, end_date)
            analysis_results['ndvi'] = ndvi_result
            if 'error' not in ndvi_result:
                result['ndvi'] = ndvi_result.get('mean', None)
        except Exception as e:
            print(f"      ⚠️  Error en NDVI: {e}")
            analysis_results['ndvi'] = {'error': str(e)}
        
        # Deforestation
        try:
            deforest_result = analyze_deforestation(polygon, farm_data.get('farmId', 'unknown'))
            analysis_results['deforestation'] = deforest_result
            if 'error' not in deforest_result:
                result['eudrCompliant'] = deforest_result.get('compliant', None)
                result['deforestationPercent'] = deforest_result.get('deforestationPercent', None)
        except Exception as e:
            print(f"      ⚠️  Error en deforestación: {e}")
            analysis_results['deforestation'] = {'error': str(e)}
        
        # Carbon
        try:
            tree_inventory = farm_data.get('treeInventory', None)
            carbon_result = calculate_carbon_baseline(
                polygon,
                farm_data.get('farmId', 'unknown'),
                tree_inventory
            )
            analysis_results['carbon'] = carbon_result
            if 'error' not in carbon_result:
                result['carbonTCO2e'] = carbon_result.get('baselineCarbonTCO2e', None)
        except Exception as e:
            print(f"      ⚠️  Error en carbono: {e}")
            analysis_results['carbon'] = {'error': str(e)}
        
        # Save individual results
        output = {
            'farmInfo': {
                'name': farm_data.get('name', 'N/A'),
                'farmId': farm_data.get('farmId', 'N/A'),
                'owner': farm_data.get('owner', 'N/A'),
                'location': farm_data.get('location', {})
            },
            'polygon': farm_data['polygon'],
            'metadata': farm_data.get('metadata', {}),
            'analysis': analysis_results,
            'generatedAt': datetime.now().isoformat()
        }
        
        output_filename = json_path.stem + '_analysis.json'
        output_path = Path(output_dir) / output_filename
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        result['success'] = True
        result['outputFile'] = str(output_path)
        
    except Exception as e:
        result['error'] = str(e)
    
    return result

def create_summary_table(results: List[Dict[str, Any]]) -> str:
    """Crea tabla ASCII resumen"""
    
    # Header
    lines = []
    lines.append("=" * 100)
    lines.append("  RESUMEN DE ANÁLISIS - MÚLTIPLES FINCAS")
    lines.append("=" * 100)
    lines.append("")
    
    # Table header
    header = f"{'Finca':<25} {'Área (ha)':<12} {'NDVI':<8} {'EUDR':<20} {'Carbono (tCO2e)':<18}"
    lines.append(header)
    lines.append("-" * 100)
    
    # Rows
    total_area = 0
    total_carbon = 0
    compliant_count = 0
    total_count = len([r for r in results if r['success']])
    
    for result in results:
        if not result['success']:
            name = result['filename']
            error_msg = result['error'][:40] if result['error'] else 'Error desconocido'
            lines.append(f"{name:<25} {'ERROR':<12} {'-':<8} {error_msg:<20} {'-':<18}")
            continue
        
        name = result['name'][:24] if result['name'] and result['name'] != 'N/A' else result['filename'][:24]
        area = f"{result['areaHa']:.2f}" if result['areaHa'] is not None else "N/A"
        ndvi = f"{result['ndvi']:.3f}" if result['ndvi'] is not None else "N/A"
        
        # EUDR status
        if result['eudrCompliant'] is not None:
            if result['eudrCompliant']:
                eudr_status = f"✅ CUMPLE ({result['deforestationPercent']:.1f}%)"
                compliant_count += 1
            else:
                eudr_status = f"❌ NO CUMPLE ({result['deforestationPercent']:.1f}%)"
        else:
            eudr_status = "N/A"
        
        carbon = f"{result['carbonTCO2e']:.2f}" if result['carbonTCO2e'] is not None else "N/A"
        
        lines.append(f"{name:<25} {area:<12} {ndvi:<8} {eudr_status:<20} {carbon:<18}")
        
        # Accumulate totals
        if result['areaHa']:
            total_area += result['areaHa']
        if result['carbonTCO2e']:
            total_carbon += result['carbonTCO2e']
    
    # Footer
    lines.append("-" * 100)
    lines.append(f"{'TOTAL':<25} {total_area:<12.2f} {'':<8} {compliant_count}/{total_count} cumplen EUDR {total_carbon:<18.2f}")
    lines.append("=" * 100)
    lines.append("")
    
    return "\n".join(lines)

def export_csv(results: List[Dict[str, Any]], output_path: str):
    """Exporta resumen a CSV"""
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        fieldnames = [
            'filename',
            'name',
            'farmId',
            'areaHa',
            'ndvi',
            'eudrCompliant',
            'deforestationPercent',
            'carbonTCO2e',
            'success',
            'error'
        ]
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for result in results:
            writer.writerow({
                'filename': result['filename'],
                'name': result['name'] or '',
                'farmId': result['farmId'] or '',
                'areaHa': result['areaHa'] if result['areaHa'] is not None else '',
                'ndvi': result['ndvi'] if result['ndvi'] is not None else '',
                'eudrCompliant': 'Sí' if result['eudrCompliant'] else 'No' if result['eudrCompliant'] is not None else '',
                'deforestationPercent': result['deforestationPercent'] if result['deforestationPercent'] is not None else '',
                'carbonTCO2e': result['carbonTCO2e'] if result['carbonTCO2e'] is not None else '',
                'success': 'Sí' if result['success'] else 'No',
                'error': result['error'] or ''
            })

def export_json(results: List[Dict[str, Any]], output_path: str):
    """Exporta resumen a JSON"""
    
    summary = {
        'processedAt': datetime.now().isoformat(),
        'totalFarms': len(results),
        'successfulAnalyses': len([r for r in results if r['success']]),
        'failedAnalyses': len([r for r in results if not r['success']]),
        'totalArea': sum(r['areaHa'] for r in results if r['areaHa']),
        'totalCarbon': sum(r['carbonTCO2e'] for r in results if r['carbonTCO2e']),
        'eudrCompliant': len([r for r in results if r['eudrCompliant']]),
        'results': results
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

def main():
    parser = argparse.ArgumentParser(
        description='Procesa múltiples fincas en lote',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  # Procesamiento básico
  python scripts/local-analysis/batch_process.py data/farms/input/
  
  # Con directorio de salida personalizado
  python scripts/local-analysis/batch_process.py data/farms/input/ --output-dir resultados/batch_2026_01/
  
  # Continuar aunque falle una finca
  python scripts/local-analysis/batch_process.py data/farms/input/ --continue-on-error
  
  # Con rango de fechas personalizado
  python scripts/local-analysis/batch_process.py data/farms/input/ --start-date 2023-06-01 --end-date 2023-08-31
        """
    )
    
    parser.add_argument('input_dir', help='Directorio con archivos JSON/GeoJSON')
    parser.add_argument('--output-dir', default='data/farms/output', help='Directorio de salida')
    parser.add_argument('--summary-csv', help='Archivo CSV resumen (default: output-dir/summary.csv)')
    parser.add_argument('--summary-json', help='Archivo JSON resumen (default: output-dir/summary.json)')
    parser.add_argument('--start-date', default='2024-01-01', help='Fecha inicio NDVI')
    parser.add_argument('--end-date', default='2024-12-31', help='Fecha fin NDVI')
    parser.add_argument('--continue-on-error', action='store_true', help='Continuar si falla una finca')
    
    args = parser.parse_args()
    
    try:
        # Find files
        print("\n" + "=" * 100)
        print("  PROCESAMIENTO POR LOTES - NUWA DIGITAL TWIN")
        print("=" * 100)
        print(f"\n📂 Buscando archivos en: {args.input_dir}")
        
        farm_files = find_farm_files(args.input_dir)
        
        if not farm_files:
            print(f"❌ No se encontraron archivos JSON/GeoJSON en {args.input_dir}")
            sys.exit(1)
        
        print(f"✅ Encontrados {len(farm_files)} archivos")
        
        # Create output directory
        os.makedirs(args.output_dir, exist_ok=True)
        
        # Process each farm
        results = []
        
        for i, farm_file in enumerate(farm_files, 1):
            print(f"\n[{i}/{len(farm_files)}] 🌾 Procesando: {farm_file.name}")
            
            try:
                result = process_farm(
                    farm_file,
                    args.output_dir,
                    args.start_date,
                    args.end_date
                )
                results.append(result)
                
                if result['success']:
                    print(f"      ✅ Completado")
                else:
                    print(f"      ❌ Error: {result['error']}")
                    if not args.continue_on_error:
                        print("\n⚠️  Deteniendo procesamiento. Use --continue-on-error para continuar.")
                        break
                
            except Exception as e:
                error_result = {
                    'filename': farm_file.name,
                    'success': False,
                    'error': str(e),
                    'name': None,
                    'farmId': None,
                    'areaHa': None,
                    'ndvi': None,
                    'eudrCompliant': None,
                    'deforestationPercent': None,
                    'carbonTCO2e': None
                }
                results.append(error_result)
                print(f"      ❌ Error inesperado: {e}")
                if not args.continue_on_error:
                    print("\n⚠️  Deteniendo procesamiento. Use --continue-on-error para continuar.")
                    break
        
        # Generate summary
        print("\n" + "=" * 100)
        print("  GENERANDO RESUMEN")
        print("=" * 100)
        
        # Console table
        summary_table = create_summary_table(results)
        print("\n" + summary_table)
        
        # CSV
        csv_path = args.summary_csv or os.path.join(args.output_dir, 'summary.csv')
        export_csv(results, csv_path)
        print(f"💾 CSV guardado en: {csv_path}")
        
        # JSON
        json_path = args.summary_json or os.path.join(args.output_dir, 'summary.json')
        export_json(results, json_path)
        print(f"💾 JSON guardado en: {json_path}")
        
        print(f"\n📊 Análisis individuales en: {args.output_dir}/")
        print("\n✅ PROCESAMIENTO COMPLETADO\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
