const MAX_SIZE = 480
const QUALITY = 0.7
const MAX_LOGO_BYTES = 512 * 1024
const MAX_LOGO_EDGE = 1024

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
      img.onload = () => {
        const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height))
        const width = Math.round(img.width * scale)
        const height = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('No se pudo comprimir la imagen'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', QUALITY))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

/** Reduce a logo until it fits the API 512 KB limit. SVG is left as-is. */
export async function prepareLogoFile(file: File): Promise<File> {
  const type = file.type.toLowerCase()
  if (type === 'image/svg+xml') {
    if (file.size > MAX_LOGO_BYTES) {
      throw new Error('El logo SVG debe pesar 512 KB o menos')
    }
    return file
  }
  if (!type.startsWith('image/')) {
    throw new Error('El logo debe ser PNG, JPEG, WebP o SVG')
  }
  if (file.size <= MAX_LOGO_BYTES) return file
  return compressLogoToJpeg(file, MAX_LOGO_EDGE, 0.82)
}

function compressLogoToJpeg(file: File, maxEdge: number, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el logo'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('No se pudo cargar el logo'))
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('No se pudo comprimir el logo'))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('No se pudo comprimir el logo'))
              return
            }
            if (blob.size > MAX_LOGO_BYTES) {
              if (maxEdge > 480) {
                void compressLogoToJpeg(file, 480, 0.7).then(resolve, reject)
                return
              }
              reject(new Error('El logo debe pesar 512 KB o menos'))
              return
            }
            resolve(
              new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }),
            )
          },
          'image/jpeg',
          quality,
        )
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function imageSrcToPngBlob(src: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo copiar la ficha'))
        return
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('No se pudo copiar la ficha'))
        else resolve(blob)
      }, 'image/png')
    }
    img.onerror = () => reject(new Error('No se pudo cargar la ficha'))
    img.src = src
  })
}

export async function copyImageToClipboard(src: string): Promise<void> {
  const png = await imageSrcToPngBlob(src)
  if (typeof ClipboardItem === 'undefined') {
    throw new Error('Este navegador no permite copiar imágenes')
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
}
