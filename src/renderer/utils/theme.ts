export function hexToHsl(hex: string) {
  // Strip # if present
  hex = hex.replace(/^#/, '')
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }

  let r = parseInt(hex.substring(0, 2), 16) || 0
  let g = parseInt(hex.substring(2, 4), 16) || 0
  let b = parseInt(hex.substring(4, 6), 16) || 0

  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  let l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

export function applyThemeColor(hex: string) {
  const { h, s, l } = hexToHsl(hex)

  const root = document.documentElement
  root.style.setProperty('--color-snack-50', `hsl(${h}, ${s}%, 97%)`)
  root.style.setProperty('--color-snack-100', `hsl(${h}, ${s}%, 92%)`)
  root.style.setProperty('--color-snack-500', `hsl(${h}, ${s}%, ${Math.min(95, l + 5)}%)`)
  root.style.setProperty('--color-snack-600', `hsl(${h}, ${s}%, ${l}%)`)
  root.style.setProperty('--color-snack-700', `hsl(${h}, ${s}%, ${Math.max(5, l - 10)}%)`)
  root.style.setProperty('--color-snack-900', `hsl(${h}, ${s}%, ${Math.max(5, l - 30)}%)`)
}
