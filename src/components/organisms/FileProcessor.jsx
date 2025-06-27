import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import fileProcessingService from "@/services/api/fileProcessingService";
import ApperIcon from "@/components/ApperIcon";
import FileUploadZone from "@/components/molecules/FileUploadZone";
import WorksheetCard from "@/components/molecules/WorksheetCard";
import ProcessingStatus from "@/components/molecules/ProcessingStatus";
import FileIcon from "@/components/atoms/FileIcon";
import Button from "@/components/atoms/Button";

const FileProcessor = () => {
  const [files, setFiles] = useState([])
  const [workbookAnalyses, setWorkbookAnalyses] = useState([])
  const [totalWorksheets, setTotalWorksheets] = useState(0)
  const [stage, setStage] = useState('idle') // idle, upload, analyze, combine, download, complete
  const [progress, setProgress] = useState(0)
  const [currentWorksheet, setCurrentWorksheet] = useState('')
  const [downloadReady, setDownloadReady] = useState(null)
  const [error, setError] = useState(null)

  const resetState = () => {
    setFiles([])
    setWorkbookAnalyses([])
    setTotalWorksheets(0)
    setStage('idle')
    setProgress(0)
    setCurrentWorksheet('')
    setDownloadReady(null)
    setError(null)
  }

const handleFileSelect = async (selectedFiles) => {
    try {
      setError(null)
      setStage('upload')
      setProgress(0)

      // Validate files
      await fileProcessingService.validateMultipleFiles(selectedFiles)
      setProgress(50)

      setStage('analyze')
      setProgress(0)

      // Analyze all workbooks
      const analyses = await fileProcessingService.analyzeMultipleWorkbooks(selectedFiles)
      
      const totalWorksheetCount = analyses.reduce((total, analysis) => total + analysis.worksheets.length, 0)
      
      setFiles(analyses.map(a => a.file))
      setWorkbookAnalyses(analyses)
      setTotalWorksheets(totalWorksheetCount)
      setStage('idle')
      setProgress(100)

      toast.success(`Found ${totalWorksheetCount} worksheets across ${selectedFiles.length} files`)
    } catch (err) {
      setError(err.message)
      setStage('idle')
      toast.error(err.message)
    }
  }

  const handleAddMoreFiles = async (additionalFiles) => {
    try {
      setError(null)
      setStage('upload')
      setProgress(0)

      // Validate additional files
      await fileProcessingService.validateMultipleFiles(additionalFiles)
      setProgress(50)

      setStage('analyze')
      setProgress(0)

      // Analyze additional workbooks
      const newAnalyses = await fileProcessingService.analyzeMultipleWorkbooks(additionalFiles)
      
      const newWorksheetCount = newAnalyses.reduce((total, analysis) => total + analysis.worksheets.length, 0)
      
      // Combine with existing
      const allAnalyses = [...workbookAnalyses, ...newAnalyses]
      const allFiles = [...files, ...newAnalyses.map(a => a.file)]
      const newTotalWorksheets = totalWorksheets + newWorksheetCount
      
      setFiles(allFiles)
      setWorkbookAnalyses(allAnalyses)
      setTotalWorksheets(newTotalWorksheets)
      setStage('idle')
      setProgress(100)

      toast.success(`Added ${newWorksheetCount} more worksheets. Total: ${newTotalWorksheets} worksheets`)
    } catch (err) {
      setError(err.message)
      setStage('idle')
      toast.error(err.message)
    }
  }

const handleCombineFiles = async () => {
    if (!workbookAnalyses.length || totalWorksheets === 0) return

    try {
      setError(null)
      setStage('combine')
      setProgress(0)

      // Combine all worksheets
      const combinedWorkbook = await fileProcessingService.combineAllSheets(
        workbookAnalyses,
        (progressValue) => {
          setProgress(progressValue)
          if (progressValue < 100) {
            const totalSheets = workbookAnalyses.reduce((total, analysis) => total + analysis.worksheets.length, 0)
            const currentSheetIndex = Math.floor((progressValue / 100) * totalSheets)
            let currentSheet = null
            let runningIndex = 0
            
            for (const analysis of workbookAnalyses) {
              for (const worksheet of analysis.worksheets) {
                if (runningIndex === currentSheetIndex) {
                  currentSheet = worksheet.name
                  break
                }
                runningIndex++
              }
              if (currentSheet) break
            }
            
            if (currentSheet) {
              setCurrentWorksheet(currentSheet)
            }
          }
        }
      )

      setStage('download')
      setProgress(0)

      // Generate combined Excel file
      const baseFileName = files.length > 0 ? files[0].name.replace(/\.[^/.]+$/, '') : 'combined'
      const download = await fileProcessingService.generateCombinedExcel(combinedWorkbook, baseFileName)
      
      setDownloadReady(download)
      setStage('complete')
      setProgress(100)

      toast.success(`${totalWorksheets} worksheets combined successfully! Ready for download.`)
    } catch (err) {
      setError(err.message)
      setStage('idle')
      toast.error('Failed to combine files')
    }
  }

  const handleDownload = () => {
    if (downloadReady) {
      fileProcessingService.downloadFile(downloadReady.blob, downloadReady.fileName)
      toast.success('Download started!')
    }
  }

  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${(bytes / 1024).toFixed(0)}KB` : `${mb.toFixed(1)}MB`
}

const handleRemoveFile = (fileId) => {
    const updatedAnalyses = workbookAnalyses.filter(analysis => analysis.file.Id !== fileId)
    const updatedFiles = files.filter(file => file.Id !== fileId)
    const newTotalWorksheets = updatedAnalyses.reduce((total, analysis) => total + analysis.worksheets.length, 0)
    
    setWorkbookAnalyses(updatedAnalyses)
    setFiles(updatedFiles)
    setTotalWorksheets(newTotalWorksheets)
    
    if (updatedFiles.length === 0) {
      resetState()
    }
    
    toast.info('File removed')
  }

return (
    <div className="space-y-8">
      {/* Upload Section */}
      <AnimatePresence mode="wait">
        {stage === 'idle' && files.length === 0 && (
          <motion.div
            key="upload-zone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <FileUploadZone 
              onFileSelect={handleFileSelect}
              disabled={stage !== 'idle'}
            />
          </motion.div>
        )}
        {(stage === 'upload' || stage === 'analyze' || stage === 'combine' || stage === 'download') && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ProcessingStatus
              stage={stage}
              progress={progress}
              worksheetCount={totalWorksheets}
              currentWorksheet={currentWorksheet}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-start space-x-3">
            <ApperIcon name="AlertCircle" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Error Processing File</h4>
              <p className="text-red-700 mt-1">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-red-700 hover:bg-red-100"
                onClick={resetState}
              >
                Try Again
              </Button>
            </div>
          </div>
        </motion.div>
)}

      {/* Files Info & Upload Additional */}
      {files.length > 0 && stage !== 'combine' && stage !== 'download' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Files Summary */}
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <FileIcon type="excel" size="lg" animated />
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-surface-900">
                    {files.length} Excel {files.length === 1 ? 'File' : 'Files'} Selected
                  </h3>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-surface-600">
                    <span>{formatFileSize(files.reduce((total, file) => total + file.size, 0))}</span>
                    <span>•</span>
                    <span>{totalWorksheets} total worksheets</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon="Plus"
                  onClick={() => document.getElementById('additional-file-input').click()}
                  disabled={stage !== 'idle'}
                >
                  Add More Files
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="X"
                  onClick={resetState}
                >
                  Clear All
                </Button>
              </div>
            </div>
            
            {/* Individual File List */}
            <div className="mt-4 space-y-2">
              {files.map((file, index) => {
                const analysis = workbookAnalyses[index]
                const worksheetCount = analysis ? analysis.worksheets.length : 0
                
                return (
                  <div key={file.Id} className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <ApperIcon name="FileSpreadsheet" size={16} className="text-surface-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-surface-900 truncate">{file.name}</div>
                        <div className="text-xs text-surface-600">
                          {formatFileSize(file.size)} • {worksheetCount} worksheets
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="xs"
                      icon="X"
                      onClick={() => handleRemoveFile(file.Id)}
                      className="text-surface-400 hover:text-surface-600"
                    />
                  </div>
                )
              })}
            </div>
</div>

          {/* Combine Action */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-surface-900">
                Ready to Combine ({totalWorksheets} worksheets)
              </h3>
              
              {stage === 'complete' && downloadReady ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-x-3"
                >
                  <Button
                    variant="success"
                    icon="Download"
                    onClick={handleDownload}
                    className="animate-pulse-success"
                  >
                    Download Combined File ({formatFileSize(downloadReady.size)})
                  </Button>
                  <Button
                    variant="ghost"
                    icon="RotateCcw"
                    onClick={resetState}
                  >
                    Process More Files
                  </Button>
                </motion.div>
              ) : (
                <Button
                  variant="primary"
                  icon="Merge"
                  onClick={handleCombineFiles}
                  disabled={stage !== 'idle' || totalWorksheets === 0}
                >
                  Combine All Files
                </Button>
              )}
</div>

            {/* Files Preview */}
            {stage !== 'complete' && (
              <div className="bg-surface-50 rounded-lg p-4">
                <div className="text-sm text-surface-600 mb-3">
                  All worksheets from the following files will be combined:
                </div>
                <div className="space-y-2">
                  {workbookAnalyses.map((analysis, index) => (
                    <div key={analysis.file.Id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <ApperIcon name="FileSpreadsheet" size={14} className="text-surface-400" />
                        <span className="font-medium text-surface-700 truncate max-w-xs">
                          {analysis.file.name}
                        </span>
                      </div>
                      <span className="text-surface-500">
                        {analysis.worksheets.length} worksheets
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
</div>
        </div>
      </motion.div>
      )}

      {/* Success State */}
      {stage === 'complete' && downloadReady && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 rounded-xl p-6 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <motion.div
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <ApperIcon name="Check" size={32} className="text-green-600" />
            </motion.div>
          </motion.div>
          
          <h3 className="text-lg font-medium text-green-800 mb-2">
Processing Complete!
          </h3>
          <p className="text-green-700 mb-4">
            Your {totalWorksheets} worksheets from {files.length} {files.length === 1 ? 'file' : 'files'} have been combined into a single Excel file.
          </p>
          <div className="flex justify-center flex-wrap gap-3">
            {downloadReady && (
              <Button
                variant="success"
                icon="Download"
                onClick={handleDownload}
                size="lg"
              >
                Download Combined Excel ({formatFileSize(downloadReady.size)})
              </Button>
            )}
          </div>
        </motion.div>
      )}
      
      {/* Hidden input for additional files */}
      <input
        id="additional-file-input"
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={(e) => {
          const newFiles = Array.from(e.target.files)
          if (newFiles.length > 0) {
            handleAddMoreFiles(newFiles)
          }
          e.target.value = ''
        }}
        className="hidden"
multiple
      />
    </div>
  )
}

export default FileProcessor