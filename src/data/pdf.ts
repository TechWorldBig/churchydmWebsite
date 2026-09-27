export async function downloadHtmlPdf(html: string, filename: string, format: 'a4' | 'card' | 'a4-landscape' = 'a4', pageSelector?: string) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')])
  const isCard = format === 'card'
  const isLandscape = isCard || format === 'a4-landscape'
  const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format: isCard ? [85.6, 54] : 'a4' })
  const viewportWidth = isCard ? 420 : isLandscape ? 1120 : 794
  const viewportHeight = isCard ? 265 : isLandscape ? 790 : 1122
  const contentWidth = isCard ? 85.6 : isLandscape ? 267 : 190
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${viewportWidth}px;height:${viewportHeight}px;border:0;opacity:0;pointer-events:none`
  document.body.appendChild(frame)
  try {
    const frameDocument = frame.contentDocument
    if (!frameDocument) throw new Error('PDF preview could not be created')
    frameDocument.open(); frameDocument.write(html); frameDocument.close()
    await Promise.all([...frameDocument.images].map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => { image.onload = () => resolve(); image.onerror = () => resolve() })))
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const pages = pageSelector ? [...frameDocument.querySelectorAll<HTMLElement>(pageSelector)] : [frameDocument.body]
    if (!pages.length) throw new Error('PDF page content could not be found')
    for (const [index, page] of pages.entries()) {
      if (index > 0) pdf.addPage()
      if (pageSelector) {
        const canvas = await html2canvas(page, { scale: isCard ? 2 : 1.5, useCORS: true, backgroundColor: '#ffffff', windowWidth: viewportWidth, windowHeight: viewportHeight })
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const inset = isCard ? 0 : 10
        const scale = Math.min((pageWidth - inset * 2) / canvas.width, (pageHeight - inset * 2) / canvas.height)
        const width = canvas.width * scale
        const height = canvas.height * scale
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, 'FAST')
        continue
      }
      await new Promise<void>((resolve, reject) => {
        pdf.html(page, { x: isCard ? 0 : 10, y: isCard ? 0 : 10, width: contentWidth, windowWidth: viewportWidth, autoPaging: isLandscape ? false : 'text', margin: isCard ? 0 : [0, 0, 0, 0], callback: () => resolve(), html2canvas: { scale: isCard ? 2 : 1.25, useCORS: true, backgroundColor: '#ffffff' } }).catch(reject)
      })
    }
    pdf.save(filename)
  } finally { frame.remove() }
}
