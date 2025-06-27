import { motion } from "framer-motion";
import React from "react";
import ApperIcon from "@/components/ApperIcon";
import ProgressBar from "@/components/atoms/ProgressBar";

const ProcessingStatus = ({ 
  stage = 'idle', 
  progress = 0,
  worksheetCount = 0,
  currentWorksheet = '',
  className = '' 
}) => {
const stages = [
    { key: 'upload', label: 'Upload', icon: 'Upload' },
    { key: 'analyze', label: 'Analyze', icon: 'Search' },
    { key: 'combine', label: 'Combine', icon: 'Merge' },
    { key: 'download', label: 'Download', icon: 'Download' }
  ]
  
  const currentStageIndex = stages.findIndex(s => s.key === stage)
  
  const stageMessages = {
    upload: 'Uploading your Excel files...',
    analyze: 'Analyzing worksheets...',
    combine: `Combining worksheets into one file... ${currentWorksheet ? `(${currentWorksheet})` : ''}`,
    download: 'Preparing download...',
    complete: 'Files combined successfully!'
  }

  return (
    <motion.div
      className={`bg-white rounded-xl border border-surface-200 p-6 ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-6">
<div className="text-center">
          <h3 className="text-lg font-medium text-surface-900 mb-2">
            Combining Your Files
          </h3>
          <p className="text-surface-600">
            {stageMessages[stage] || 'Processing...'}
          </p>
        </div>
        
        <ProgressBar
          stages={stages.map(s => s.label)}
          currentStage={currentStageIndex}
          progress={progress}
        />
        
        {worksheetCount > 0 && (
          <div className="bg-surface-50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-600">Worksheets found:</span>
              <span className="font-medium text-surface-900">{worksheetCount}</span>
            </div>
          </div>
        )}
        
        <div className="flex justify-center">
          <motion.div
            className="flex items-center space-x-2 text-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
<ApperIcon 
              name="Loader2" 
              size={16} 
              className="animate-spin"
            />
            <span className="text-sm font-medium">
              {stage === 'combine' ? `${progress}% complete` : 'Please wait...'}
            </span>
          </motion.div>
        </div>
      </div>
      </div>
    </motion.div>
  )
}

export default ProcessingStatus