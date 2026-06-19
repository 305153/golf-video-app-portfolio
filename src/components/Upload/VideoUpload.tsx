import React, { useRef, useState } from 'react'
import { useDatabase } from '../../hooks/useDatabase'
import './VideoUpload.css'

interface VideoUploadProps {
  selectedFolder: string
  onUploadComplete: () => void
}

const VideoUpload: React.FC<VideoUploadProps> = ({ selectedFolder, onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const { uploadVideo } = useDatabase()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

  const validateAndSet = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const valid: File[] = []
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_SIZE) {
        setError(`「${f.name}」が上限(${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)を超えています`)
        continue
      }
      valid.push(f)
    }
    if (valid.length > 0) {
      setError('')
      setFiles(valid)
      setFile(valid[0])
      setTitle(valid[0].name.split('.')[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSet(e.target.files)
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    validateAndSet(e.dataTransfer.files)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length > 1) {
      setUploading(true)
      setError('')
      try {
        for (const f of files) {
          const name = f.name.split('.')[0]
          await uploadVideo(f, name, selectedFolder)
        }
        setFiles([])
        setFile(null)
        setTitle('')
        onUploadComplete()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'アップロードに失敗しました')
      } finally {
        setUploading(false)
      }
      return
    }

    const targetFile = file || files[0]
    if (!targetFile || !title.trim()) return

    setUploading(true)
    setError('')

    try {
      await uploadVideo(targetFile, title.trim(), selectedFolder)
      setFile(null)
      setTitle('')
      onUploadComplete()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="upload-container">
      <h3>動画アップロード</h3>
      <form onSubmit={handleSubmit} className="upload-form">
        <div
          className="drop-zone"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={() => inputRef.current?.click()}
        >
          <p>ここにファイルをドラッグ＆ドロップ、またはタップして選択</p>
        </div>
        <div className="form-group">
          <label htmlFor="video-file">動画ファイル</label>
          <input
            type="file"
            id="video-file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={uploading}
            multiple
            ref={inputRef}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="video-title">タイトル</label>
          <input
            type="text"
            id="video-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="動画のタイトルを入力"
            disabled={uploading}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          disabled={(files.length === 0 && (!file || !title.trim())) || uploading}
          className="upload-button"
        >
          {uploading ? 'アップロード中...' : files.length > 1 ? `一括アップロード(${files.length})` : 'アップロード'}
        </button>
      </form>
    </div>
  )
}

export default VideoUpload