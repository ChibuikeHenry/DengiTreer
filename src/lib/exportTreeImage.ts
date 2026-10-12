import { PED, type PedigreeLayout } from './pedigreeLayout'

const SCALE = 2
const MARGIN = 40
const BACKGROUND = '#eef6e8'
const LINE_COLOR = '#3f5f2a'

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** shorten text with an ellipsis so it fits `maxWidth` */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let out = text
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1)
  return `${out.trimEnd()}…`
}

function drawPersonGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy - r * 0.2, r * 0.22, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy + r * 0.62, r * 0.42, Math.PI * 1.1, Math.PI * 1.9)
  ctx.stroke()
  ctx.restore()
}

type PersonDraw = {
  cx: number
  top: number
  ringColor: string
  fill: string
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
  const avatarStyle = getComputedStyle(avatar)
  const nameEl = card.querySelector<HTMLElement>('.tree-person-name')
  const roleEl = card.querySelector<HTMLElement>('.tree-person-role')
  const yearsEl = card.querySelector<HTMLElement>('.tree-person-years')
  const nameStyle = nameEl ? getComputedStyle(nameEl) : null
  const roleStyle = roleEl ? getComputedStyle(roleEl) : null
  const yearsStyle = yearsEl ? getComputedStyle(yearsEl) : null
  const family = nameStyle?.fontFamily ?? 'sans-serif'
  const img = avatar.querySelector('img')
  const initialsEl = avatar.querySelector<HTMLElement>('.profile-avatar-initials')
  const badgeText = avatar.classList.contains('pedigree-you-badge') ? avatar.textContent?.trim() : null
  return {
    cx,
    top,
    ringColor: avatarStyle.borderTopColor,
    fill: avatarStyle.backgroundColor,
    photo: img?.src ?? null,
    initials: initialsEl?.textContent?.trim() || badgeText || null,
    name: nameEl?.textContent?.trim() ?? '',
    role: roleEl?.textContent?.trim() ?? '',
    years: yearsEl?.textContent?.trim() ?? '',
    nameFont: `${nameStyle?.fontWeight ?? 600} ${nameStyle?.fontSize ?? '13px'} ${family}`,
    roleFont: `${roleStyle?.fontWeight ?? 400} ${roleStyle?.fontSize ?? '11px'} ${family}`,
    yearsFont: `${yearsStyle?.fontWeight ?? 400} ${yearsStyle?.fontSize ?? '10.5px'} ${family}`,
    textColor: nameStyle?.color ?? '#1a1f16',
    mutedColor: roleStyle?.color ?? '#5a7350',
  }
}

/**
 * Renders the visible family tree (people + connecting lines, without the "add"
 * placeholders) to a PNG. `canvasEl` is the `.ped-canvas` element holding the nodes.
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
    const person = readPerson(el, left + PED.nodeW / 2, top)
    if (person) people.push(person)
  })

  const segs = layout.segs.filter((s) => !s.dashed)

  // crop to what is actually drawn
  const xs = [
    ...people.flatMap((p) => [p.cx - PED.nodeW / 2, p.cx + PED.nodeW / 2]),
    ...segs.flatMap((s) => [s.x1, s.x2]),
  ]
  const ys = [...people.flatMap((p) => [p.top, p.top + PED.nodeH]), ...segs.flatMap((s) => [s.y1, s.y2])]
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const captionH = caption ? 36 : 0
  const width = maxX - minX + MARGIN * 2
  const height = maxY - minY + MARGIN * 2 + captionH

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * SCALE)
  canvas.height = Math.ceil(height * SCALE)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported in this browser.')
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, width, height)
  ctx.translate(MARGIN - minX, MARGIN - minY)

  // lines
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = PED.line
  ctx.lineCap = 'square'
  for (const s of segs) {
    ctx.beginPath()
    ctx.moveTo(s.x1, s.y1)
    ctx.lineTo(s.x2, s.y2)
    ctx.stroke()
  }

  // people
  const photos = await Promise.all(people.map((p) => (p.photo ? loadImage(p.photo) : null)))
  const r = PED.av / 2
  people.forEach((p, i) => {
    const cy = p.top + r
    ctx.save()
    ctx.beginPath()
    ctx.arc(p.cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = p.fill
    ctx.fill()
    ctx.clip()
    const photo = photos[i]
    if (photo) {
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
    }
    ctx.restore()

    if (!photo) {
      if (p.initials) {
        ctx.fillStyle = p.ringColor
        ctx.font = `700 ${p.initials.length > 2 ? 14 : 20}px ${p.nameFont.split(' ').slice(2).join(' ')}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.initials, p.cx, cy)
      } else {
        drawPersonGlyph(ctx, p.cx, cy, r, p.ringColor)
      }
    }

    // ring
    ctx.beginPath()
    ctx.arc(p.cx, cy, r - 1.5, 0, Math.PI * 2)
    ctx.strokeStyle = p.ringColor
    ctx.lineWidth = 3
    ctx.stroke()

    // labels
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
      // role may carry "(Deceased)" – wrap onto a second line when too wide
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

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not create the image.'))),
      'image/png',
    )
  })
}