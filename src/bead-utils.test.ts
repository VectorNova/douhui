import { describe, expect, it } from 'vitest'
import { chooseNextRegion, createPattern, getConnectedRegions, isColorSelected, nearestPaletteColor } from './bead-utils'

describe('拼豆图纸生成', () => {
  it('将每个像素映射为有效色卡颜色并统计数量', () => {
    const pattern = createPattern([{ r: 252, g: 250, b: 246 }, { r: 30, g: 33, b: 32 }, { r: 250, g: 249, b: 245 }, { r: 30, g: 33, b: 32 }], 2, 2)
    expect(pattern.cells).toHaveLength(4)
    expect(pattern.colors.reduce((sum, color) => sum + color.count, 0)).toBe(4)
    expect(pattern.cells[0].id).toBe('W01')
    expect(pattern.cells[1].id).toBe('B01')
  })
  it('正确找出最近色卡颜色并支持高亮筛选', () => {
    expect(nearestPaletteColor({ r: 230, g: 80, b: 60 }).id).toBe('R01')
    const cell = createPattern([{ r: 230, g: 80, b: 60 }], 1, 1).cells[0]
    expect(isColorSelected(cell, 'R01')).toBe(true)
    expect(isColorSelected(cell, 'B01')).toBe(false)
  })
  it('拒绝不合理尺寸与错误像素数量', () => {
    expect(() => createPattern([], 0, 1)).toThrow()
    expect(() => createPattern([], 2, 2)).toThrow()
  })
  it('按同色连通区域计算施工顺序，并跳过已完成区域', () => {
    const pattern = createPattern([
      { r: 30, g: 33, b: 32 }, { r: 30, g: 33, b: 32 }, { r: 250, g: 249, b: 245 },
      { r: 30, g: 33, b: 32 }, { r: 250, g: 249, b: 245 }, { r: 30, g: 33, b: 32 },
    ], 2, 3)
    const regions = getConnectedRegions(pattern, 'B01')
    expect(regions.map((region) => region.length).sort()).toEqual([1, 3])
    const done = new Set(regions[0].map(({ row, col }) => `${row},${col}`))
    const next = chooseNextRegion(regions, done, 2, 3, 'largest')
    expect(next).toHaveLength(1)
  })
})
