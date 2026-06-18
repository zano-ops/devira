import { createCanvas, Image, ImageData, loadImage } from 'canvas'

globalThis.Image = Image
globalThis.ImageData = ImageData

// Force worker to run in main thread
import * as pdfjsWorker from '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
import * as pdfjsLib from '../node_modules/pdfjs-dist/legacy/build/pdf.mjs'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pdfPath = join(__dirname, '../public/devis-exemple.pdf')
const outPath = join(__dirname, '../public/devis-apercu.jpg')

globalThis.pdfjsWorker = pdfjsWorker

const data = new Uint8Array(readFileSync(pdfPath))
const doc = await pdfjsLib.getDocument({ data, disableFontFace: true, verbosity: 0 }).promise
console.log(`PDF loaded, pages: ${doc.numPages}`)

const page = await doc.getPage(1)
const viewport = page.getViewport({ scale: 2.0 })
console.log(`Page ${Math.floor(viewport.width)} x ${Math.floor(viewport.height)}`)

const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height))
const ctx = canvas.getContext('2d')
ctx.fillStyle = 'white'
ctx.fillRect(0, 0, canvas.width, canvas.height)

// Patch drawImage on all canvases created by canvasFactory to handle imgData objects
function makeCtx(c) {
  const ctx = c.getContext('2d')
  const orig = ctx.drawImage.bind(ctx)
  ctx.drawImage = function (src, ...args) {
    if (src && typeof src === 'object' && !(src instanceof Image)) {
      // Check if it's a native ImageBitmap (Node 22+)
      if (src.constructor && src.constructor.name === 'ImageBitmap') {
        // Can't easily convert, skip this draw (image will be missing but no crash)
        console.warn('Skipping native ImageBitmap draw')
        return
      }
      // Check if it's a raw imgData with pixel data
      if (src.width && src.height) {
        const rawData = src.data
        const byteLen = rawData?.byteLength ?? rawData?.length ?? 0
        if (byteLen > 0) {
          const tmp = createCanvas(src.width, src.height)
          tmp.getContext('2d').putImageData(
            new ImageData(new Uint8ClampedArray(rawData), src.width, src.height), 0, 0
          )
          return orig(tmp, ...args)
        }
        // zero-length or missing data — draw transparent square
        console.warn(`Skipping zero-data image ${src.width}x${src.height}`)
        return
      }
    }
    return orig(src, ...args)
  }
  return ctx
}

// Patch main context
const origDrawImage = ctx.drawImage.bind(ctx)
ctx.drawImage = function (src, ...args) {
  if (src && typeof src === 'object' && !(src instanceof Image)) {
    const name = src.constructor?.name
    if (name === 'ImageBitmap') {
      console.warn('Skipping native ImageBitmap on main ctx')
      return
    }
    if (src.width && src.height) {
      const rawData = src.data
      const byteLen = rawData?.byteLength ?? rawData?.length ?? 0
      if (byteLen > 0) {
        const tmp = createCanvas(src.width, src.height)
        tmp.getContext('2d').putImageData(
          new ImageData(new Uint8ClampedArray(rawData), src.width, src.height), 0, 0
        )
        return origDrawImage(tmp, ...args)
      }
      console.warn(`Skipping zero-data image ${src.width}x${src.height}`)
      return
    }
  }
  return origDrawImage(src, ...args)
}

const canvasFactory = {
  create(w, h) {
    const c = createCanvas(w, h)
    return { canvas: c, context: makeCtx(c) }
  },
  reset(e, w, h) { e.canvas.width = w; e.canvas.height = h },
  destroy(e) { e.canvas.width = 0; e.canvas.height = 0 },
}

await page.render({ canvasContext: ctx, viewport, canvasFactory }).promise

console.log('Rendered! Saving...')
const jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.90 })
writeFileSync(outPath, jpegBuffer)
console.log(`Saved: ${outPath} (${Math.round(jpegBuffer.length / 1024)} KB)`)
