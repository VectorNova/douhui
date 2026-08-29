import { PALETTE } from './palette'
import type { BeadCell, ColorCount, PaletteColor, Pattern, PatternOptions, Rgb } from './types'

export function nearestPaletteColor(rgb: Rgb, palette: PaletteColor[] = PALETTE): PaletteColor {
  return palette.reduce((best, candidate) => {
    const bestDistance = (rgb.r - best.r) ** 2 + (rgb.g - best.g) ** 2 + (rgb.b - best.b) ** 2
    const distance = (rgb.r - candidate.r) ** 2 + (rgb.g - candidate.g) ** 2 + (rgb.b - candidate.b) ** 2
    return distance < bestDistance ? candidate : best
  })
}

export function createPattern(pixels: Rgb[], rows: number, cols: number, palette = PALETTE, options: PatternOptions = {}): Pattern {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 120 || cols > 120) throw new Error('网格尺寸需为 1–120。')
  if (pixels.length !== rows * cols) throw new Error('像素数量与网格尺寸不匹配。')
  const simplification = Math.floor((options.merge ?? 0) / 6)
  const sourcePixels = pixels.map((pixel) => options.mode === 'blocks'
    ? { r: Math.round(pixel.r / 32) * 32, g: Math.round(pixel.g / 32) * 32, b: Math.round(pixel.b / 32) * 32 }
    : options.mode === 'outline'
      ? { r: Math.min(255, Math.max(0, Math.round(pixel.r * 1.06 - 7))), g: Math.min(255, Math.max(0, Math.round(pixel.g * 1.06 - 7))), b: Math.min(255, Math.max(0, Math.round(pixel.b * 1.06 - 7))) }
      : pixel)
  const raw = sourcePixels.map((pixel) => nearestPaletteColor(pixel, palette))
  const frequencies = new Map<string, number>()
  raw.forEach((color) => frequencies.set(color.id, (frequencies.get(color.id) ?? 0) + 1))
  const maxColors = Math.max(1, Math.min((options.maxColors ?? palette.length) - simplification, palette.length))
  const allowed = new Set([...frequencies.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxColors).map(([id]) => id))
  const simplified = raw.map((color, index) => {
    if (allowed.has(color.id)) return color
    const candidates = palette.filter((candidate) => allowed.has(candidate.id))
    return nearestPaletteColor(color, candidates)
  })
  const cells: BeadCell[] = simplified.map((color, index) => ({ ...color, row: Math.floor(index / cols), col: index % cols }))
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

export type Region = Array<{ row: number; col: number }>

export function getConnectedRegions(pattern: Pattern, colorId: string): Region[] {
  const visited = new Set<string>(); const regions: Region[] = []
  const key = (row: number, col: number) => `${row},${col}`
  pattern.cells.forEach((cell) => {
    if (cell.id !== colorId || visited.has(key(cell.row, cell.col))) return
    const region: Region = []; const queue = [{ row: cell.row, col: cell.col }]; visited.add(key(cell.row, cell.col))
    while (queue.length) {
      const point = queue.shift()!; region.push(point)
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const row = point.row + dr; const col = point.col + dc; const nextKey = key(row, col)
        if (row >= 0 && row < pattern.rows && col >= 0 && col < pattern.cols && !visited.has(nextKey) && pattern.cells[row * pattern.cols + col].id === colorId) { visited.add(nextKey); queue.push({ row, col }) }
      }
    }
    regions.push(region)
  })
  return regions
}

export function chooseNextRegion(regions: Region[], completed: Set<string>, rows: number, cols: number, strategy: 'nearest' | 'largest' | 'edge'): Region | null {
  const pending = regions.filter((region) => !region.every(({ row, col }) => completed.has(`${row},${col}`)))
  if (!pending.length) return null
  if (strategy === 'largest') return pending.slice().sort((a, b) => b.length - a.length)[0]
  if (strategy === 'edge') return pending.find((region) => region.some(({ row, col }) => row === 0 || col === 0 || row === rows - 1 || col === cols - 1)) ?? pending[0]
  const done = [...completed].map((value) => value.split(',').map(Number)).filter(([row, col]) => Number.isFinite(row) && Number.isFinite(col))
  const ref = done.length ? done[done.length - 1] : [Math.floor(rows / 2), Math.floor(cols / 2)]
  return pending.slice().sort((a, b) => Math.min(...a.map((p) => Math.abs(p.row - ref[0]) + Math.abs(p.col - ref[1]))) - Math.min(...b.map((p) => Math.abs(p.row - ref[0]) + Math.abs(p.col - ref[1]))))[0]
}

export function renderImageToPattern(image: HTMLImageElement, rows: number, cols: number, options: PatternOptions = {}): Pattern {
  const canvas = document.createElement('canvas')
  canvas.width = cols; canvas.height = rows
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('无法读取图片。')
  context.save()
  if (options.flipX || options.flipY || options.rotation) {
    context.translate(cols / 2, rows / 2)
    context.rotate(((options.rotation ?? 0) * Math.PI) / 180)
    context.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1)
    context.translate(-cols / 2, -rows / 2)
  }
  context.drawImage(image, 0, 0, cols, rows)
  context.restore()
  const data = context.getImageData(0, 0, cols, rows).data
  const pixels = Array.from({ length: rows * cols }, (_, i) => ({ r: data[i * 4], g: data[i * 4 + 1], b: data[i * 4 + 2] }))
  if (options.removeBackground) {
    const edge = pixels[0]
    pixels.forEach((pixel, index) => {
      const distance = Math.abs(pixel.r - edge.r) + Math.abs(pixel.g - edge.g) + Math.abs(pixel.b - edge.b)
      if (distance < 35) pixels[index] = { r: 250, g: 249, b: 244 }
    })
  }
  return createPattern(pixels, rows, cols, PALETTE, options)
}
