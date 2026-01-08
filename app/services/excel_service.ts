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

export default class ExcelService {
  static async generateUserExcel(users: UserData[]): Promise<Buffer> {
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Social Auth App'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Users', {
      headerFooter: { firstHeader: 'User Data Export' },
    })

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Full Name', key: 'fullName', width: 25 },
      { header: 'Email', key: 'email', width: 35 },
      { header: 'Login Type', key: 'loginType', width: 15 },
      { header: 'Provider ID', key: 'providerId', width: 25 },
      { header: 'Avatar URL', key: 'avatarUrl', width: 40 },
      { header: 'Last Login', key: 'lastLogin', width: 22 },
      { header: 'Registered At', key: 'registeredAt', width: 22 },
    ]

    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 25

    users.forEach((user) => {
      worksheet.addRow({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        loginType: user.loginType,
        providerId: user.providerId,
        avatarUrl: user.avatarUrl || 'N/A',
        lastLogin: user.lastLogin,
        registeredAt: user.registeredAt,
      })
    })

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: 'middle' }
        if (rowNumber % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' },
          }
        }
      }
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
      })
    })

    worksheet.autoFilter = {
      from: 'A1',
      to: `H${users.length + 1}`,
    }

    const buffer = await workbook.xlsx.writeBuffer()
    // return Buffer.from(buffer)
    return buffer as Buffer
  }
}
