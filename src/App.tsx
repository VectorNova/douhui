import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { renderImageToPattern } from './bead-utils'
import type { Pattern } from './types'
import './App.css'

const PRESETS = [16, 29, 32]
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const rgb = (r: number, g: number, b: number) => `rgb(${r}, ${g}, ${b})`

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [rows, setRows] = useState(29)
  const [cols, setCols] = useState(29)
  const [pattern, setPattern] = useState<Pattern | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const selectedName = useMemo(() => pattern?.colors.find((color) => color.id === selectedColor)?.name, [pattern, selectedColor])

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) { setError('请选择 PNG、JPEG 或 WebP 图片。'); return }
    setError(null); setPattern(null); setSelectedColor(null)
    const url = URL.createObjectURL(file)
    const element = new Image()
    element.onload = () => { setImage(element); setImageUrl(url) }
    element.onerror = () => { URL.revokeObjectURL(url); setError('图片无法读取，请换一张试试。') }
    element.src = url
  }

  function generatePattern() {
    if (!image) { setError('请先上传一张图片。'); return }
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 120 || cols > 120) { setError('行数和列数需为 1 到 120 的整数。'); return }
    try { setPattern(renderImageToPattern(image, rows, cols)); setSelectedColor(null); setZoom(1); setError(null) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '图纸生成失败。') }
  }

  function exportPng() {
    if (!pattern || !canvasRef.current) return
    const cellSize = Math.max(18, Math.min(42, Math.floor(1200 / Math.max(pattern.rows, pattern.cols))))
    const padding = 48; const legendWidth = 250
    const width = pattern.cols * cellSize + padding * 2 + legendWidth
    const height = Math.max(pattern.rows * cellSize + padding * 2, pattern.colors.length * 28 + 120)
    const canvas = canvasRef.current; canvas.width = width; canvas.height = height
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#342d2b'; ctx.font = 'bold 22px system-ui'; ctx.fillText('豆绘 · 拼豆图纸', padding, 30)
    pattern.cells.forEach((cell) => {
      const x = padding + cell.col * cellSize; const y = padding + cell.row * cellSize
      ctx.globalAlpha = selectedColor && cell.id !== selectedColor ? 0.18 : 1
      ctx.fillStyle = rgb(cell.r, cell.g, cell.b); ctx.fillRect(x, y, cellSize, cellSize)
      ctx.strokeStyle = '#ffffff99'; ctx.lineWidth = 1; ctx.strokeRect(x, y, cellSize, cellSize)
      if (cellSize >= 25) { ctx.globalAlpha = 1; ctx.fillStyle = '#332d2b'; ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.fillText(cell.id, x + cellSize / 2, y + cellSize / 2 + 3) }
    })
    ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.fillStyle = '#342d2b'; ctx.font = 'bold 16px system-ui'
    ctx.fillText(`色号清单 · ${pattern.rows} × ${pattern.cols}`, padding + pattern.cols * cellSize + 26, 46)
    ctx.font = '13px system-ui'
    pattern.colors.forEach((color, index) => {
      const y = 72 + index * 28; ctx.fillStyle = rgb(color.r, color.g, color.b); ctx.fillRect(padding + pattern.cols * cellSize + 26, y - 14, 16, 16)
      ctx.fillStyle = '#342d2b'; ctx.fillText(`${color.id} ${color.name}  × ${color.count}`, padding + pattern.cols * cellSize + 50, y)
    })
    const link = document.createElement('a'); link.download = 'douhui-pattern.png'; link.href = canvas.toDataURL('image/png'); link.click()
  }

  return <main>
    <canvas ref={canvasRef} className="export-canvas" aria-hidden="true" />
    <header><a className="brand" href="#top"><span>豆</span>绘</a><p>把喜欢的画面，变成一颗颗可以触摸的颜色。</p><a className="github" href="https://github.com/VectorNova/douhui" target="_blank" rel="noreferrer">GitHub ↗</a></header>
    <section className="hero" id="top"><div><p className="eyebrow">PERLER BEAD PATTERN MAKER</p><h1>让每一种颜色<br />都有落点。</h1><p className="intro">上传一张图片，豆绘会在你的浏览器中生成拼豆图纸。无需登录，图片不会离开设备。</p></div><div className="bead-art" aria-hidden="true">{Array.from({ length: 36 }, (_, index) => <i key={index} style={{ backgroundColor: ['#f7cc45', '#e54e3d', '#60b5d5', '#8bbe5d', '#f79fa4', '#342a2b'][index % 6] }} />)}</div></section>
    <section className="setup" aria-labelledby="setup-title"><div className="section-title"><p className="eyebrow">01 · 开始创作</p><h2 id="setup-title">准备你的图纸</h2></div><div className="controls">
      <label className="upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} /><span className="upload-icon">↥</span><strong>{imageUrl ? '换一张图片' : '上传图片'}</strong><small>PNG、JPEG、WebP</small></label>
      {imageUrl && <img className="preview" src={imageUrl} alt="待转换的拼豆图片预览" />}
      <div className="dimension"><p>成品网格</p><div className="preset-buttons">{PRESETS.map((size) => <button className={rows === size && cols === size ? 'active' : ''} key={size} onClick={() => { setRows(size); setCols(size) }}>{size} × {size}</button>)}</div><div className="custom-size"><label>行 <input type="number" min="1" max="120" value={rows} onChange={(e) => setRows(Number(e.target.value))} /></label><span>×</span><label>列 <input type="number" min="1" max="120" value={cols} onChange={(e) => setCols(Number(e.target.value))} /></label></div><button className="primary" onClick={generatePattern}>生成拼豆图纸 <span>→</span></button></div>
    </div>{error && <p className="error" role="alert">{error}</p>}</section>
    {pattern && <section className="workspace" aria-labelledby="pattern-title"><div className="workspace-heading"><div><p className="eyebrow">02 · 制作图纸</p><h2 id="pattern-title">{pattern.rows} × {pattern.cols} 拼豆图纸</h2><p>{selectedName ? `正在高亮：${selectedName}` : '点击豆子或色卡，专注查看同一种颜色。'}</p></div><div className="toolbar"><button onClick={() => setZoom(Math.max(.5, zoom - .25))}>－</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(Math.min(2.5, zoom + .25))}>＋</button><button className="export" onClick={exportPng}>导出 PNG ↓</button></div></div><div className="pattern-layout"><div className="pattern-stage"><div className="grid" style={{ gridTemplateColumns: `repeat(${pattern.cols}, minmax(0, 1fr))`, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>{pattern.cells.map((cell) => <button title={`${cell.id} ${cell.name} · 第 ${cell.row + 1} 行，第 ${cell.col + 1} 列`} aria-label={`${cell.id} ${cell.name}`} className={selectedColor && cell.id !== selectedColor ? 'dimmed' : ''} onClick={() => setSelectedColor(selectedColor === cell.id ? null : cell.id)} key={`${cell.row}-${cell.col}`} style={{ backgroundColor: rgb(cell.r, cell.g, cell.b) }}>{zoom >= 1.15 && <span>{cell.id}</span>}</button>)}</div></div><aside><div className="aside-top"><h3>颜色清单</h3><span>{pattern.colors.length} 色 / {pattern.cells.length} 颗</span></div><button className={!selectedColor ? 'color-row selected' : 'color-row'} onClick={() => setSelectedColor(null)}><span className="swatch all" />全部颜色</button>{pattern.colors.map((color) => <button key={color.id} className={selectedColor === color.id ? 'color-row selected' : 'color-row'} onClick={() => setSelectedColor(selectedColor === color.id ? null : color.id)}><span className="swatch" style={{ backgroundColor: rgb(color.r, color.g, color.b) }} /><span><b>{color.id}</b> {color.name}</span><em>× {color.count}</em></button>)}</aside></div></section>}
    <footer><b>豆绘</b><span>在浏览器本地处理图片 · 开源且免费</span></footer>
  </main>
}

export default App
