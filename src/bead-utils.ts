import { PALETTE } from './palette'
import type { BeadCell, ColorCount, PaletteColor, Pattern, Rgb } from './types'

export function nearestPaletteColor(rgb: Rgb, palette: PaletteColor[] = PALETTE): PaletteColor {
  return palette.reduce((best, candidate) => {
    const bestDistance = (rgb.r - best.r) ** 2 + (rgb.g - best.g) ** 2 + (rgb.b - best.b) ** 2
    const distance = (rgb.r - candidate.r) ** 2 + (rgb.g - candidate.g) ** 2 + (rgb.b - candidate.b) ** 2
    return distance < bestDistance ? candidate : best
  })
}

export function createPattern(pixels: Rgb[], rows: number, cols: number, palette = PALETTE): Pattern {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 120 || cols > 120) throw new Error('网格尺寸需为 1–120。')
  if (pixels.length !== rows * cols) throw new Error('像素数量与网格尺寸不匹配。')
  const cells: BeadCell[] = pixels.map((pixel, index) => ({ ...nearestPaletteColor(pixel, palette), row: Math.floor(index / cols), col: index % cols }))
  const counts = new Map<string, ColorCount>()
  cells.forEach(({ row: _row, col: _col, ...color }) => {
    const old = counts.get(color.id)
    counts.set(color.id, old ? { ...old, count: old.count + 1 } : { ...color, count: 1 })
  })
  return { rows, cols, cells, colors: [...counts.values()].sort((a, b) => b.count - a.count) }
}

export function isColorSelected(cell: BeadCell, selectedColor: string | null) {
  return selectedColor === null || cell.id === selectedColor
}

export function renderImageToPattern(image: HTMLImageElement, rows: number, cols: number): Pattern {
  const canvas = document.createElement('canvas')
  canvas.width = cols; canvas.height = rows
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('无法读取图片。')
  context.drawImage(image, 0, 0, cols, rows)
  const data = context.getImageData(0, 0, cols, rows).data
  const pixels = Array.from({ length: rows * cols }, (_, i) => ({ r: data[i * 4], g: data[i * 4 + 1], b: data[i * 4 + 2] }))
  return createPattern(pixels, rows, cols)
}
