interface UserData {
  id: number
  fullName: string
  email: string
  loginType: string
  providerId: string
  avatarUrl: string | null
  lastLogin: string
  registeredAt: string
}

export default class PdfService {

  static async generateUserPdf(users: UserData[]): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
      })

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      doc.fontSize(20).font('Helvetica-Bold').text('User Data Export Report', { align: 'center' })
      doc.moveDown(0.5)

      const now = new Date()
      doc.fontSize(10).font('Helvetica')
        .text(`Generated: ${now.toLocaleString()}`, { align: 'center' })
        .text(`Total Users: ${users.length}`, { align: 'center' })
      doc.moveDown(1)

      const tableTop = doc.y
      const tableLeft = 30
      const colWidths = [35, 100, 150, 70, 100, 90, 90]
      const headers = ['ID', 'Full Name', 'Email', 'Login Type', 'Provider ID', 'Last Login', 'Registered']
      const rowHeight = 25

      this.drawTableRow(doc, tableLeft, tableTop, colWidths, headers, true)

      let currentY = tableTop + rowHeight
      const pageHeight = doc.page.height - 50
 
      users.forEach((user, index) => {
        if (currentY + rowHeight > pageHeight) {
          doc.addPage()
          currentY = 30
          this.drawTableRow(doc, tableLeft, currentY, colWidths, headers, true)
          currentY += rowHeight
        }

        const rowData = [
          String(user.id),
          this.truncate(user.fullName, 18),
          this.truncate(user.email, 28),
          user.loginType,
          this.truncate(user.providerId, 18),
          user.lastLogin.split(' ')[0] || 'N/A',
          user.registeredAt.split(' ')[0] || 'N/A',
        ]

        const isAlternate = index % 2 === 1
        this.drawTableRow(doc, tableLeft, currentY, colWidths, rowData, false, isAlternate)
        currentY += rowHeight
      })

      doc.fontSize(8).font('Helvetica')
        .text('Social Auth App - User Management System', 30, doc.page.height - 30, { align: 'center' })

      doc.end()
    })
  }

  private static drawTableRow(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    colWidths: number[],
    data: string[],
    isHeader: boolean,
    isAlternate: boolean = false
  ) {
    const rowHeight = 25
    let currentX = x

    if (isHeader) {
      doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#4472C4')
    } else if (isAlternate) {
      doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#F2F2F2')
    }

    data.forEach((text, i) => {
      doc.rect(currentX, y, colWidths[i], rowHeight).stroke('#CCCCCC')

      doc.fillColor(isHeader ? '#FFFFFF' : '#333333')
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(isHeader ? 9 : 8)
        .text(text, currentX + 4, y + 8, {
          width: colWidths[i] - 8,
          height: rowHeight - 8,
          ellipsis: true,
        })

      currentX += colWidths[i]
    })
    doc.fillColor('#000000') 
  }

  private static truncate(str: string, maxLength: number): string {
    if (!str || str === 'N/A') return 'N/A'
    return str.length > maxLength ? str.substring(0, maxLength - 2) + '..' : str
  }
}
