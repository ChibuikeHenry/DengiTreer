import {
  PED,
  PED_LINE_COLOR,
  buildLinePaths,
  dedupePedSegs,
  type PedigreeLayout,
} from './pedigreeLayout'

const SCALE = 2
const MARGIN = 40
const BACKGROUND = '#eef5e8'
const LINE_COLOR = PED_LINE_COLOR
const MAX_CANVAS_EDGE = 8192

const TONE = {
  male: { fill: '#ebf3fa', ring: '#5b8fd4', icon: '#3b74b8' },
  female: { fill: '#fdf2f7', ring: '#e879a9', icon: '#d15189' },
  you: { fill: '#254019', ring: '#254019', icon: '#ffffff' },
  neutral: { fill: '#e2eadc', ring: '#b8c9a8', icon: '#5a7350' },
} as const

type ToneKey = keyof typeof TONE

function loadImageFromUrl(src: string, crossOrigin: boolean): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function loadImageViaFetch(src: string): Promise<HTMLImageElement | null> {
  try {
    const res = await fetch(src, { mode: 'cors', credentials: 'omit', cache: 'force-cache' })
    if (!res.ok) return null
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    try {
      return await loadImageFromUrl(objectUrl, false)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  } catch {
    return null
  }
}

/** CORS-safe photo only — never draw a non-CORS image (taints canvas / blank PNG). */
async function loadPhotoSafe(src: string | null): Promise<HTMLImageElement | null> {
  const url = (src || '').trim()
  if (!url) return null
  if (
    url.startsWith('blob:') ||
    url.startsWith('data:') ||
    (typeof window !== 'undefined' && url.startsWith(window.location.origin))
  ) {
    return loadImageFromUrl(url, false)
  }
  const fetched = await loadImageViaFetch(url)
  if (fetched) return fetched
  return loadImageFromUrl(url, true)
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let out = text
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1)
  return `${out.trimEnd()}…`
}

/** Same silhouette as ProfileAvatar tree SVG. */
function drawPersonIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
) {
  const s = (r * 2) / 24
  ctx.save()
  ctx.translate(cx - 12 * s, cy - 12 * s)
  ctx.scale(s, s)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.arc(12, 7, 4, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(5, 21)
  ctx.bezierCurveTo(5, 17.5, 8, 15, 12, 15)
  ctx.bezierCurveTo(16, 15, 19, 17.5, 19, 21)
  ctx.stroke()
  ctx.restore()
}

function toneFromAvatar(avatar: HTMLElement): ToneKey {
  if (
    avatar.classList.contains('profile-avatar-you-tone') ||
    avatar.classList.contains('tree-person-avatar-you') ||
    avatar.classList.contains('pedigree-you-badge')
  ) {
    return 'you'
  }
  if (avatar.classList.contains('profile-avatar-female')) return 'female'
  if (avatar.classList.contains('profile-avatar-male')) return 'male'
  return 'neutral'
}

type PersonDraw = {
  cx: number
  top: number
  tone: ToneKey
  photo: string | null
  initials: string | null
  name: string
  role: string
  years: string
  nameFont: string
  roleFont: string
  yearsFont: string
  textColor: string
  mutedColor: string
}

function readPerson(nodeEl: HTMLElement, cx: number, top: number): PersonDraw | null {
  const card = nodeEl.querySelector<HTMLElement>('.tree-person-card')
  const avatar = nodeEl.querySelector<HTMLElement>('.tree-person-avatar')
  if (!card || !avatar) return null
  const nameEl = card.querySelector<HTMLElement>('.tree-person-name')
  const roleEl = card.querySelector<HTMLElement>('.tree-person-role')
  const yearsEl = card.querySelector<HTMLElement>('.tree-person-years')
  const nameStyle = nameEl ? getComputedStyle(nameEl) : null
  const roleStyle = roleEl ? getComputedStyle(roleEl) : null
  const yearsStyle = yearsEl ? getComputedStyle(yearsEl) : null
  const family = nameStyle?.fontFamily ?? 'system-ui, sans-serif'
  const img = avatar.querySelector('img')
  const initialsEl = avatar.querySelector<HTMLElement>('.profile-avatar-initials')
  const badgeText = avatar.classList.contains('pedigree-you-badge')
    ? avatar.textContent?.trim()
    : null
  return {
    cx,
    top,
    tone: toneFromAvatar(avatar),
    photo: img?.currentSrc || img?.src || null,
    initials: initialsEl?.textContent?.trim() || badgeText || null,
    name: nameEl?.textContent?.trim() ?? '',
    role: roleEl?.textContent?.trim() ?? '',
    years: yearsEl?.textContent?.trim() ?? '',
    nameFont: `${nameStyle?.fontWeight ?? 700} ${nameStyle?.fontSize ?? '13px'} ${family}`,
    roleFont: `${roleStyle?.fontWeight ?? 400} ${roleStyle?.fontSize ?? '11px'} ${family}`,
    yearsFont: `${yearsStyle?.fontWeight ?? 400} ${yearsStyle?.fontSize ?? '10.5px'} ${family}`,
    textColor: nameStyle?.color ?? '#1a1f16',
    mutedColor: roleStyle?.color ?? '#5a7350',
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not create the image.'))),
        'image/png',
      )
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Could not create the image.'))
    }
  })
}

function paintTree(
  ctx: CanvasRenderingContext2D,
  people: PersonDraw[],
  photos: (HTMLImageElement | null)[],
  segs: PedigreeLayout['segs'],
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  width: number,
  height: number,
  caption: string | undefined,
  captionH: number,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, width, height)
  ctx.translate(MARGIN - minX, MARGIN - minY)

  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = PED.line
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const paths = buildLinePaths(segs)
  const linePath = `${paths.solid}${paths.dashed}`
  if (linePath) ctx.stroke(new Path2D(linePath))

  const r = PED.av / 2
  people.forEach((p, i) => {
    const cy = p.top + r
    const tone = TONE[p.tone]
    const photo = photos[i]

    ctx.beginPath()
    ctx.arc(p.cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = tone.fill
    ctx.fill()

    if (photo && photo.naturalWidth > 0 && photo.naturalHeight > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(p.cx, cy, r, 0, Math.PI * 2)
      ctx.clip()
      const side = Math.min(photo.naturalWidth, photo.naturalHeight)
      ctx.drawImage(
        photo,
        (photo.naturalWidth - side) / 2,
        (photo.naturalHeight - side) / 2,
        side,
        side,
        p.cx - r,
        cy - r,
        PED.av,
        PED.av,
      )
      ctx.restore()
    } else if (p.initials) {
      ctx.fillStyle = p.tone === 'you' ? '#fff' : tone.icon
      ctx.font = `700 ${p.initials.length > 2 ? 14 : 18}px ${p.nameFont.split(' ').slice(2).join(' ') || 'system-ui, sans-serif'}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(p.initials, p.cx, cy)
    } else {
      drawPersonIcon(ctx, p.cx, cy, r * 0.72, tone.icon)
    }

    ctx.beginPath()
    ctx.arc(p.cx, cy, r - 1.5, 0, Math.PI * 2)
    ctx.strokeStyle = tone.ring
    ctx.lineWidth = p.tone === 'neutral' ? 2 : 3
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    let y = p.top + PED.av + 9
    ctx.fillStyle = p.textColor
    ctx.font = p.nameFont
    ctx.fillText(fit(ctx, p.name, PED.nodeW), p.cx, y)
    y += 17
    if (p.role) {
      ctx.fillStyle = p.mutedColor
      ctx.font = p.roleFont
      const words = p.role.split(' ')
      let line = ''
      for (const word of words) {
        const next = line ? `${line} ${word}` : word
        if (line && ctx.measureText(next).width > PED.nodeW) {
          ctx.fillText(line, p.cx, y)
          y += 14
          line = word
        } else {
          line = next
        }
      }
      if (line) {
        ctx.fillText(line, p.cx, y)
        y += 14
      }
    }
    if (p.years) {
      ctx.fillStyle = p.mutedColor
      ctx.font = p.yearsFont
      ctx.fillText(p.years, p.cx, y)
    }
  })

  if (caption) {
    ctx.fillStyle = LINE_COLOR
    ctx.font = '600 13px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(caption, (minX + maxX) / 2, maxY + MARGIN / 2 + captionH - 8)
  }
}

/**
 * Renders the visible family tree (people + connecting lines, without the "add"
 * placeholders) to a PNG.
 */
export async function renderTreePng(
  canvasEl: HTMLElement,
  layout: PedigreeLayout,
  caption?: string,
): Promise<Blob> {
  if ('fonts' in document) await document.fonts.ready

  const people: PersonDraw[] = []
  canvasEl.querySelectorAll<HTMLElement>('.ped-node').forEach((el) => {
    if (el.querySelector('.ped-add')) return
    const left = parseFloat(el.style.left)
    const top = parseFloat(el.style.top)
    if (!Number.isFinite(left) || !Number.isFinite(top)) return
    const person = readPerson(el, left + PED.nodeW / 2, top)
    if (person) people.push(person)
  })

  if (!people.length) {
    throw new Error('Nothing to export yet. Add people to your tree first.')
  }

  const segs = dedupePedSegs(layout.segs)
  const xs = [
    ...people.flatMap((p) => [p.cx - PED.nodeW / 2, p.cx + PED.nodeW / 2]),
    ...segs.flatMap((s) => [s.x1, s.x2]),
  ]
  const ys = [
    ...people.flatMap((p) => [p.top, p.top + PED.nodeH]),
    ...segs.flatMap((s) => [s.y1, s.y2]),
  ]
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
    throw new Error('Could not measure the tree for export.')
  }

  const captionH = caption ? 36 : 0
  const cssWidth = maxX - minX + MARGIN * 2
  const cssHeight = maxY - minY + MARGIN * 2 + captionH
  const pixelW = Math.ceil(cssWidth * SCALE)
  const pixelH = Math.ceil(cssHeight * SCALE)
  if (pixelW > MAX_CANVAS_EDGE || pixelH > MAX_CANVAS_EDGE) {
    throw new Error('This tree is too large to export as one image.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, pixelW)
  canvas.height = Math.max(1, pixelH)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported in this browser.')

  const photos = await Promise.all(people.map((p) => loadPhotoSafe(p.photo)))

  const draw = (photoList: (HTMLImageElement | null)[]) =>
    paintTree(
      ctx,
      people,
      photoList,
      segs,
      minX,
      minY,
      maxX,
      maxY,
      cssWidth,
      cssHeight,
      caption,
      captionH,
    )

  draw(photos)

  try {
    return await canvasToPngBlob(canvas)
  } catch {
    const clean = document.createElement('canvas')
    clean.width = canvas.width
    clean.height = canvas.height
    const cleanCtx = clean.getContext('2d')
    if (!cleanCtx) throw new Error('Canvas is not supported in this browser.')
    paintTree(
      cleanCtx,
      people,
      people.map(() => null),
      segs,
      minX,
      minY,
      maxX,
      maxY,
      cssWidth,
      cssHeight,
      caption,
      captionH,
    )
    return canvasToPngBlob(clean)
  }
}
