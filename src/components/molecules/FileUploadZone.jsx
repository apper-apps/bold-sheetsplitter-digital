import React, { useCallback, useState } from "react";
import { motion } from "framer-motion";
import ApperIcon from "@/components/ApperIcon";
import Button from "@/components/atoms/Button";

const FileUploadZone = ({ onFileSelect, disabled = false, className = '' }) => {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    if (disabled) return
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onFileSelect(files)
    }
  }, [onFileSelect, disabled])

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files && files.length > 0) {
      onFileSelect(files)
    }
// Reset input value to allow same file selection
    e.target.value = ''
  }, [onFileSelect])

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={`
          file-drop-zone border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
          ${isDragOver && !disabled
            ? 'border-primary bg-primary/5 scale-105'
            : 'border-surface-300 hover:border-surface-400 hover:bg-surface-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('file-input').click()}
      >
        <motion.div
          className="space-y-6"
          animate={isDragOver ? { scale: 1.05 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <ApperIcon 
              name={isDragOver ? "Download" : "Upload"} 
              size={32} 
              className={`text-primary transition-transform duration-200 ${isDragOver ? 'animate-bounce' : ''}`}
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-surface-900">
              {isDragOver ? 'Drop your Excel files here' : 'Upload Excel Files'}
            </h3>
<p className="text-surface-600 max-w-sm mx-auto">
              Drag and drop multiple Excel files (.xlsx, .xls) or click to browse. We'll combine all worksheets into one file.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="primary"
              icon="Upload"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation()
                document.getElementById('file-input').click()
              }}
            >
              Browse Files
            </Button>
            
            <div className="text-xs text-surface-500 space-y-1">
              <div>Supported: .xlsx, .xls files</div>
              <div>Multiple files allowed</div>
            </div>
          </div>
        </motion.div>
      </div>
      
      <input
        id="file-input"
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
        multiple
      />
    </motion.div>
)
}

export default FileUploadZone