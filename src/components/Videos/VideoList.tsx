import React, { useState, useRef, useEffect } from 'react'
import { useDatabase } from '../../hooks/useDatabase'
import SwingAnalyzer from './SwingAnalyzer'
import './VideoList.css'

interface Video {
  id: string
  title: string
  file_path: string
  file_size: number
  folder: string
  user_email: string
  created_at: string
  updated_at: string
}

interface VideoListProps {
  selectedFolder: string
}

interface VideoThumbnailProps {
  video: Video
  videoUrl: string
  onPlay: () => void
  failedThumbnails: Set<string>
  setFailedThumbnails: React.Dispatch<React.SetStateAction<Set<string>>>
}

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({ 
  video, 
  videoUrl, 
  onPlay, 
  failedThumbnails, 
  setFailedThumbnails 
}) => {
  const [canvasThumbnail, setCanvasThumbnail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const handleThumbnailGeneration = async () => {
      try {
        const thumbnailUrl = await generateThumbnail(videoUrl)
        setCanvasThumbnail(thumbnailUrl)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to generate thumbnail:', error)
        setFailedThumbnails(prev => new Set(prev).add(video.id))
        setIsLoading(false)
      }
    }

    // モバイルデバイスまたはサムネイル生成に失敗した場合はCanvas版を使用
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    if (isMobile || failedThumbnails.has(video.id)) {
      handleThumbnailGeneration()
    } else {
      setIsLoading(false)
    }
  }, [video.id, videoUrl, failedThumbnails, setFailedThumbnails])

  const generateThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true
      
      video.onloadedmetadata = () => {
        video.currentTime = 1
      }
      
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0)
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8)
            resolve(thumbnailUrl)
          } else {
            reject(new Error('Canvas context not available'))
          }
        } catch (error) {
          reject(error)
        }
      }
      
      video.onerror = (error) => {
        reject(error)
      }
      
      video.src = videoUrl
    })
  }

  const handleVideoError = () => {
    setFailedThumbnails(prev => new Set(prev).add(video.id))
    setIsLoading(false)
  }

  const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoElement = e.target as HTMLVideoElement
    if (videoElement.duration > 0) {
      videoElement.currentTime = 1
    }
    setIsLoading(false)
  }

  return (
    <div className="video-thumbnail" onClick={onPlay}>
      {canvasThumbnail ? (
        <img 
          src={canvasThumbnail} 
          alt={video.title}
          className="thumbnail-image"
        />
      ) : (
        <video
          ref={videoRef}
          src={videoUrl}
          preload="metadata"
          className="thumbnail-video"
          muted
          playsInline
          poster=""
          crossOrigin="anonymous"
          onLoadedMetadata={handleVideoLoad}
          onError={handleVideoError}
        />
      )}
      {isLoading && (
        <div className="thumbnail-loading">
          <div className="loading-spinner"></div>
        </div>
      )}
      <div className="play-overlay">
        <div className="play-button">▶</div>
      </div>
    </div>
  )
}

const VideoList: React.FC<VideoListProps> = ({ selectedFolder }) => {
  const { videos, folders, deleteVideo, getVideoUrl, refetchVideos } = useDatabase()
  
  // コンポーネントがマウントされた時とselectedFolderが変更された時にデータを取得
  useEffect(() => {
    refetchVideos()
  }, [selectedFolder, refetchVideos])
  
  const filteredVideos = videos.filter(video => video.folder === selectedFolder)
  const currentFolder = folders.find(f => f.id === selectedFolder)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(new Set())
  const currentIndex = selectedVideo ? filteredVideos.findIndex(v => v.id === selectedVideo.id) : -1

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedVideo(filteredVideos[currentIndex - 1])
    }
  }

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < filteredVideos.length - 1) {
      setSelectedVideo(filteredVideos[currentIndex + 1])
    }
  }

  const handleDeleteVideo = async (video: Video) => {
    if (!confirm(`「${video.title}」を削除しますか？`)) return

    setDeleting(video.id)
    try {
      await deleteVideo(video.id, video.file_path)
      await refetchVideos()
      if (selectedVideo?.id === video.id) {
        setSelectedVideo(null)
      }
    } catch (error) {
      console.error('Failed to delete video:', error)
      alert('動画の削除に失敗しました')
    } finally {
      setDeleting(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (selectedVideo) {
    return (
      <SwingAnalyzer
        video={selectedVideo}
        videoUrl={getVideoUrl(selectedVideo.file_path)}
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={currentIndex > 0}
        hasNext={currentIndex >= 0 && currentIndex < filteredVideos.length - 1}
        onClose={() => setSelectedVideo(null)}
      />
    )
  }

  return (
    <div className="video-list">
      <div className="video-list-header">
        <h2>{currentFolder?.name || selectedFolder} の動画</h2>
        <p>{filteredVideos.length} 個の動画</p>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="empty-state">
          <p>まだ動画がアップロードされていません</p>
        </div>
      ) : (
        <div className="videos-grid">
          {filteredVideos.map((video) => (
            <div key={video.id} className="video-card">
              <VideoThumbnail
                video={video}
                videoUrl={getVideoUrl(video.file_path)}
                onPlay={() => setSelectedVideo(video)}
                failedThumbnails={failedThumbnails}
                setFailedThumbnails={setFailedThumbnails}
              />
              
              <div className="video-info">
                <h3 className="video-title" title={video.title}>{video.title}</h3>
                <div className="video-meta">
                  <span className="video-size">{formatFileSize(video.file_size)}</span>
                  <span className="video-date">{formatDate(video.created_at)}</span>
                </div>
                
                <div className="video-actions">
                  <button
                    className="play-btn"
                    onClick={() => setSelectedVideo(video)}
                  >
                    再生
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteVideo(video)}
                    disabled={deleting === video.id}
                  >
                    {deleting === video.id ? '削除中...' : '削除'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default VideoList