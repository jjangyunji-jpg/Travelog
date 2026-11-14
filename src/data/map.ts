import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, Geometry } from 'geojson'
import world from 'world-atlas/countries-50m.json'
import { numericToAlpha2 } from './countries'

/** id가 없는 지역을 어느 나라로 볼지 */
const UNNAMED: Record<string, string> = {
  Kosovo: 'XK',
  Somaliland: 'SO',
  'N. Cyprus': 'CY',
  'Indian Ocean Ter.': 'AU',
  'Siachen Glacier': 'IN',
}

export type MapFeature = Feature<Geometry, { name: string }> & { code: string }

const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>
const fc = feature(topo, topo.objects.countries)

export const MAP_FEATURES: MapFeature[] = fc.features
  .map((f) => {
    const code = f.id ? numericToAlpha2(String(f.id)) : UNNAMED[f.properties.name]
    return { ...f, code: code ?? '' } as MapFeature
  })
  .filter((f) => f.code && f.code !== 'AQ')
