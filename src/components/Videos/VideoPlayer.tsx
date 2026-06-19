import React, { useRef, useState, useEffect } from 'react'
import './VideoPlayer.css'

interface Video {
  id: string
  title: string
  file_path: string
  file_size: number
  created_at: string
  updated_at: string
}

interface VideoPlayerProps {
  video: Video
  videoUrl: string
  onClose: () => void
  onNext?: () => void
  onPrev?: () => void
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, videoUrl, onClose, onNext, onPrev }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
  const [playbackRate, setPlaybackRate] = useState(1)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const swipingRef = useRef(false)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)
    const handleEnded = () => {
      // 自動で次動画やループはしない
      setIsPlaying(false)
      try {
        if (wakeLock && typeof wakeLock.release === 'function') {
          wakeLock.release().catch(() => { /* ignore */ })
        }
      } catch { /* ignore */ }
      setWakeLock(null)
    }

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('ended', handleEnded)
    }
  }, [wakeLock])

  useEffect(() => {
    // 再生位置のレジューム
    const key = `progress:${video.id}`
    const saved = localStorage.getItem(key)
    const v = videoRef.current
    if (v && saved) {
      const resume = parseFloat(saved)
      if (!isNaN(resume)) {
        v.currentTime = resume
      }
    }
    return () => {
      const current = v?.currentTime
      if (typeof current === 'number') localStorage.setItem(key, String(current))
    }
  }, [video.id])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
      try {
        if (wakeLock && typeof wakeLock.release === 'function') {
          wakeLock.release().catch(() => { /* ignore */ })
          setWakeLock(null)
        }
      } catch { /* ignore */ }
    } else {
      video.play()
      // Wake Lock API（対応ブラウザのみ）
      if ('wakeLock' in navigator && !wakeLock) {
        navigator.wakeLock.request('screen').then((lock) => setWakeLock(lock)).catch(() => { /* ignore */ })
      }
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newTime = parseFloat(e.target.value)
    video.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = parseFloat(e.target.value)
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (isMuted) {
      video.volume = volume
      setIsMuted(false)
    } else {
      video.volume = 0
      setIsMuted(true)
    }
  }

  // 全画面機能は削除

  const handleChangeRate = (rate: number) => {
    const v = videoRef.current
    if (!v) return
    v.playbackRate = rate
    setPlaybackRate(rate)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0]
    touchStartXRef.current = t.clientX
    touchStartYRef.current = t.clientY
    swipingRef.current = false
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current == null || touchStartYRef.current == null) return
    const t = e.touches[0]
    const dx = t.clientX - touchStartXRef.current
    const dy = t.clientY - touchStartYRef.current
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      swipingRef.current = true
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current == null || touchStartYRef.current == null) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartXRef.current
    const dy = t.clientY - touchStartYRef.current
    const threshold = 60
    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
      suppressClickRef.current = true
      if (dx < 0 && onNext) onNext()
      if (dx > 0 && onPrev) onPrev()
    }
    touchStartXRef.current = null
    touchStartYRef.current = null
    swipingRef.current = false
  }

  // PiP機能は削除済み

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="video-player-container" style={{paddingBottom: 'calc(20px + env(safe-area-inset-bottom))'}}>
      <div className="video-player">
        <div className="video-header">
          <h3>{video.title}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div 
          className="video-wrapper"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="video-element"
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false
                return
              }
              togglePlay()
            }}
            playsInline
          />
        </div>

        <div className="video-controls">
          {onPrev && (
            <button className="control-btn" onClick={onPrev}>⟨ 前</button>
          )}
          <button className="control-btn" onClick={togglePlay}>
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div className="progress-container">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="progress-bar"
            />
            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="volume-container">
            <button className="control-btn" onClick={toggleMute}>
              {isMuted || volume === 0 ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="volume-bar"
            />
          </div>

          {/* 全画面ボタン削除 */}
          <div className="rate-box">
            <button className="control-btn" onClick={() => handleChangeRate(0.5)} style={{opacity: playbackRate===0.5?1:0.6}}>0.5x</button>
            <button className="control-btn" onClick={() => handleChangeRate(0.75)} style={{opacity: playbackRate===0.75?1:0.6}}>0.75x</button>
            <button className="control-btn" onClick={() => handleChangeRate(1)} style={{opacity: playbackRate===1?1:0.6}}>1x</button>
          </div>
          
          {onNext && (
            <button className="control-btn" onClick={onNext}>次 ⟩</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer