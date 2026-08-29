export type Rgb = { r: number; g: number; b: number }

export type PaletteColor = Rgb & { id: string; name: string }

export type BeadCell = PaletteColor & { row: number; col: number; blank?: boolean }

export type ColorCount = PaletteColor & { count: number }

export type Pattern = {
  rows: number
  cols: number
  cells: BeadCell[]
  colors: ColorCount[]
}

export type PatternOptions = {
  maxColors?: number
  merge?: number
  mode?: 'outline' | 'natural' | 'blocks'
  removeBackground?: boolean
  rotation?: 0 | 90 | 180 | 270
  flipX?: boolean
  flipY?: boolean
}
