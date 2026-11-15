/**
 * 자주 쓰는(특히 다이빙샵 대여용) 다이빙 컴퓨터 목록과 블루투스 여부 (대략적인 정보, 모델·연식에 따라 다를 수 있음)
 * ble: true 블루투스 있음 · false 전용 케이블만
 */
export const COMPUTERS: { name: string; ble: boolean }[] = [
  { name: 'Suunto Zoop Novo', ble: false },
  { name: 'Suunto Vyper Novo', ble: false },
  { name: 'Suunto D5', ble: true },
  { name: 'Suunto EON Core', ble: true },
  { name: 'Suunto EON Steel', ble: true },
  { name: 'Suunto Ocean', ble: true },
  { name: 'Cressi Leonardo', ble: false },
  { name: 'Cressi Giotto', ble: false },
  { name: 'Mares Puck Pro', ble: false },
  { name: 'Mares Puck Pro+', ble: true },
  { name: 'Mares Smart', ble: false },
  { name: 'Aqualung i200C', ble: true },
  { name: 'Aqualung i300C', ble: true },
  { name: 'Oceanic Geo 4.0', ble: true },
  { name: 'Shearwater Peregrine', ble: true },
  { name: 'Shearwater Perdix 2', ble: true },
  { name: 'Shearwater Teric', ble: true },
  { name: 'Garmin Descent Mk2', ble: true },
  { name: 'Garmin Descent G1', ble: true },
]

export const computerInfo = (name?: string) => COMPUTERS.find((c) => c.name.toLowerCase() === name?.trim().toLowerCase())
