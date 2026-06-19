import React from 'react'
import type { Folder } from '../../types'
import './FolderList.css'

interface FolderListProps {
  folders: Folder[]
  selectedFolder: string | null
  onFolderSelect: (folderId: string) => void
}

const FolderList: React.FC<FolderListProps> = ({ folders, selectedFolder, onFolderSelect }) => {
  return (
    <div className="folder-list">
      <h3>アカウント別フォルダ</h3>
      <div className="folder-grid">
        {folders.map((folder) => (
          <button
            key={folder.id}
            className={`folder-item ${selectedFolder === folder.id ? 'selected' : ''}`}
            onClick={() => onFolderSelect(folder.id)}
          >
            <div className="folder-icon">📁</div>
            <div className="folder-name">{folder.name}</div>
            <div className="folder-email">{folder.email}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default FolderList