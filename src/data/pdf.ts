export async function downloadHtmlPdf(html: string, filename: string, format: 'a4' | 'card' | 'a4-landscape' = 'a4') {
  const { jsPDF } = await import('jspdf')
  const isCard = format === 'card'
  const isLandscape = isCard || format === 'a4-landscape'
  const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format: isCard ? [85.6, 54] : 'a4' })
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1120px;height:1584px;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(frame)
  try {
    const frameDocument = frame.contentDocument
    if (!frameDocument) throw new Error('PDF preview could not be created')
    frameDocument.open(); frameDocument.write(html); frameDocument.close()
    await Promise.all([...frameDocument.images].map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => { image.onload = () => resolve(); image.onerror = () => resolve() })))
    await new Promise<void>((resolve, reject) => {
      pdf.html(frameDocument.body, { x: 0, y: 0, width: isCard ? 85.6 : isLandscape ? 277 : 190, windowWidth: isCard ? 420 : 1120, autoPaging: 'text', margin: isCard ? 0 : [10, 10, 10, 10], callback: () => resolve(), html2canvas: { scale: isCard ? 2 : 1, useCORS: true } }).catch(reject)
    })
    pdf.save(filename)
  } finally { frame.remove() }
}
