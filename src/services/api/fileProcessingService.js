import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

class FileProcessingService {
  async validateFile(file) {
    await delay(200)
    
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    
    const validExtensions = ['.xlsx', '.xls']
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      throw new Error('Please upload a valid Excel file (.xlsx or .xls)')
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('File size must be less than 50MB')
    }
    
    return true
  }

  async validateMultipleFiles(files) {
    await delay(300)
    
    const errors = []
    
    for (let i = 0; i < files.length; i++) {
      try {
        await this.validateFile(files[i])
      } catch (error) {
        errors.push(`${files[i].name}: ${error.message}`)
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Validation failed for ${errors.length} file(s):\n${errors.join('\n')}`)
    }
    
    return true
  }

  async analyzeWorkbook(file) {
    await delay(300)
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          
          const worksheets = workbook.SheetNames.map((name, index) => {
            const sheet = workbook.Sheets[name]
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1')
            
            return {
              name,
              index,
              rowCount: range.e.r + 1,
              columnCount: range.e.c + 1,
              hasData: !!sheet['!ref']
            }
          })
          
          resolve({
            file: {
              Id: Date.now(),
              name: file.name,
              size: file.size,
              uploadTime: new Date().toISOString(),
              status: 'analyzed'
            },
            worksheets,
            workbook
          })
        } catch (error) {
          reject(new Error('Failed to read Excel file. Please ensure it is not corrupted.'))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsArrayBuffer(file)
    })
}

  async analyzeMultipleWorkbooks(files) {
    await delay(500)
    
    const results = []
    
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex]
      
      try {
        const analysis = await this.analyzeWorkbook(file)
        // Update the file Id to ensure uniqueness across multiple files
        analysis.file.Id = Date.now() + fileIndex
        results.push(analysis)
      } catch (error) {
        throw new Error(`Failed to analyze ${file.name}: ${error.message}`)
      }
    }
    
    return results
  }

  async combineAllSheets(workbookAnalyses, onProgress) {
    await delay(500)
    
    // Create new workbook
    const combinedWorkbook = XLSX.utils.book_new()
    let totalSheets = 0
    let processedSheets = 0
    
    // Count total sheets
    workbookAnalyses.forEach(analysis => {
      totalSheets += analysis.worksheets.length
    })
    
    // Combine all worksheets
    for (let analysisIndex = 0; analysisIndex < workbookAnalyses.length; analysisIndex++) {
      const analysis = workbookAnalyses[analysisIndex]
      const fileBaseName = analysis.file.name.replace(/\.[^/.]+$/, '')
      
      for (let sheetIndex = 0; sheetIndex < analysis.worksheets.length; sheetIndex++) {
        const worksheet = analysis.worksheets[sheetIndex]
        const originalSheet = analysis.workbook.Sheets[worksheet.name]
        
        // Create unique sheet name to avoid conflicts
        let newSheetName = `${fileBaseName}_${worksheet.name}`
        
        // Ensure sheet name doesn't exceed Excel's 31 character limit
        if (newSheetName.length > 31) {
          const maxFileNameLength = 31 - worksheet.name.length - 1
          const truncatedFileName = fileBaseName.substring(0, maxFileNameLength)
          newSheetName = `${truncatedFileName}_${worksheet.name}`
        }
        
        // Ensure unique name (handle duplicates)
        let counter = 1
        let finalSheetName = newSheetName
        while (combinedWorkbook.Sheets[finalSheetName]) {
          const suffix = `_${counter}`
          const maxBaseLength = 31 - suffix.length
          finalSheetName = newSheetName.substring(0, maxBaseLength) + suffix
          counter++
        }
        
        // Add sheet to combined workbook
        combinedWorkbook.Sheets[finalSheetName] = originalSheet
        combinedWorkbook.SheetNames.push(finalSheetName)
        
        processedSheets++
        
        // Update progress
        const progress = Math.round((processedSheets / totalSheets) * 100)
        if (onProgress) {
          onProgress(progress)
        }
        
        await delay(50) // Small delay for progress visualization
      }
    }
    
    return combinedWorkbook
  }

  async generateCombinedExcel(combinedWorkbook, baseFileName) {
    await delay(300)
    
    // Generate Excel file
    const excelBuffer = XLSX.write(combinedWorkbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    })
    
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    const fileName = `${baseFileName}_combined.xlsx`
    
    return {
      blob,
      fileName,
      size: blob.size,
      sheetCount: combinedWorkbook.SheetNames.length
    }
  }

async processWorksheets(workbook, selectedWorksheets, onProgress) {
    await delay(500)
    
    const zip = new JSZip()
    const totalSheets = selectedWorksheets.length
    
    for (let i = 0; i < selectedWorksheets.length; i++) {
      const worksheet = selectedWorksheets[i]
      
      // Get worksheet data
      const sheet = workbook.Sheets[worksheet.name]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const lineHeight = 6
      let yPosition = margin + 10
      
      // Add title
      pdf.setFontSize(16)
      pdf.text(worksheet.name, margin, yPosition)
      yPosition += lineHeight * 2
      
      // Add data
      pdf.setFontSize(10)
      for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
        const row = jsonData[rowIndex]
        let xPosition = margin
        
        // Check if we need a new page
        if (yPosition > pageHeight - margin - lineHeight) {
          pdf.addPage()
          yPosition = margin + 10
        }
        
        // Add row data
        for (let colIndex = 0; colIndex < row.length && colIndex < 8; colIndex++) {
          const cellValue = String(row[colIndex] || '')
          const maxWidth = (pageWidth - 2 * margin) / Math.min(row.length, 8)
          
          if (cellValue.length > 15) {
            pdf.text(cellValue.substring(0, 15) + '...', xPosition, yPosition)
          } else {
            pdf.text(cellValue, xPosition, yPosition)
          }
          
          xPosition += maxWidth
        }
        
        yPosition += lineHeight
      }
      
      // Generate PDF buffer
      const pdfBuffer = pdf.output('arraybuffer')
      
      // Add to zip with clean filename
      const fileName = `${worksheet.name.replace(/[\/\\:*?"<>|]/g, '_')}.pdf`
      zip.file(fileName, pdfBuffer)
      
      // Update progress
      const progress = Math.round(((i + 1) / totalSheets) * 100)
      if (onProgress) {
        onProgress(progress)
      }
      
      await delay(100) // Small delay for progress visualization
    }
    
    return zip
  }

async generateDownload(zip, originalFileName) {
    await delay(300)
    
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const baseName = originalFileName.replace(/\.[^/.]+$/, '')
    const zipFileName = `${baseName}_split_PDFs.zip`
    
    return {
      blob: zipBlob,
      fileName: zipFileName,
      size: zipBlob.size
    }
  }

  downloadFile(blob, fileName) {
    saveAs(blob, fileName)
  }
}

export default new FileProcessingService()