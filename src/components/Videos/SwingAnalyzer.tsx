import React, { useRef, useState, useEffect, useCallback } from 'react'
import './SwingAnalyzer.css'

interface Video {
  id: string
  title: string
  file_path: string
  file_size: number
  created_at: string
  updated_at: string
}

interface SwingAnalyzerProps {
  video: Video
  videoUrl: string
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

interface Line {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  color: string
}

type DrawMode = 'none' | 'line' | 'freehand'

interface FreehandPath {
  id: string
  points: { x: number; y: number }[]
  color: string
}

const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff']

const SwingAnalyzer: React.FC<SwingAnalyzerProps> = ({
  video,
  videoUrl,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  
  // Drawing state
  const [drawMode, setDrawMode] = useState<DrawMode>('none')
  const [lines, setLines] = useState<Line[]>([])
  const [freehandPaths, setFreehandPaths] = useState<FreehandPath[]>([])
  const [currentColor, setCurrentColor] = useState('#ff0000')
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentFreehand, setCurrentFreehand] = useState<{ x: number; y: number }[]>([])
  
  // Video dimensions (used by setVideoDimensions in updateCanvasSize)
  const [, setVideoDimensions] = useState({ width: 0, height: 0 })
  
  // UI state
  const [showPlaybackControls, setShowPlaybackControls] = useState(true)

  const touchStartYRef = useRef<number | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const swipeHandledRef = useRef(false)
  const analyzerRef = useRef<HTMLDivElement>(null)

  // Swipe detection using native event listeners for iOS compatibility
  useEffect(() => {
    const el = analyzerRef.current
    if (!el) return

    const shouldIgnore = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false
      return Boolean(
        target.closest('.playback-panel') ||
        target.closest('.drawing-panel') ||
        target.closest('.overlay-header') ||
        target.closest('.toggle-playback-btn') ||
        target.closest('.drawing-canvas.active')
      )
    }

    const onTouchStart = (e: TouchEvent) => {
      if (drawMode !== 'none') return
      if (e.touches.length !== 1) return
      if (shouldIgnore(e.target)) return
      swipeHandledRef.current = false
      touchStartYRef.current = e.touches[0].clientY
      touchStartXRef.current = e.touches[0].clientX
    }

    const onTouchMove = (e: TouchEvent) => {
      if (drawMode !== 'none') return
      if (touchStartYRef.current == null || touchStartXRef.current == null) return
      if (e.touches.length !== 1) return
      if (shouldIgnore(e.target)) return

      const currentY = e.touches[0].clientY
      const currentX = e.touches[0].clientX
      const deltaY = currentY - touchStartYRef.current
      const deltaX = currentX - touchStartXRef.current
      const absY = Math.abs(deltaY)
      const absX = Math.abs(deltaX)

      // Prevent default scroll if vertical swipe detected
      if (absY > 10 && absY > absX) {
        e.preventDefault()
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (drawMode !== 'none') return
      const startY = touchStartYRef.current
      const startX = touchStartXRef.current
      touchStartYRef.current = null
      touchStartXRef.current = null
      if (startY == null || startX == null) return
      if (e.changedTouches.length !== 1) return

      const endY = e.changedTouches[0].clientY
      const endX = e.changedTouches[0].clientX
      const deltaY = endY - startY
      const deltaX = endX - startX
      const absY = Math.abs(deltaY)
      const absX = Math.abs(deltaX)

      // Require 50px vertical swipe and vertical > horizontal
      if (absY < 50 || absY < absX) return

      swipeHandledRef.current = true
      if (deltaY < 0) {
        // Swipe up -> next video
        if (hasNext && onNext) {
          console.log('Swipe up: next video')
          onNext()
        }
      } else {
        // Swipe down -> prev video
        if (hasPrev && onPrev) {
          console.log('Swipe down: prev video')
          onPrev()
        }
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [drawMode, hasNext, hasPrev, onNext, onPrev])

  // Initialize video events
  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return

    const updateTime = () => setCurrentTime(videoEl.currentTime)
    const updateDuration = () => {
      setDuration(videoEl.duration)
      updateCanvasSize()
    }
    const handleEnded = () => setIsPlaying(false)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    videoEl.addEventListener('timeupdate', updateTime)
    videoEl.addEventListener('loadedmetadata', updateDuration)
    videoEl.addEventListener('ended', handleEnded)
    videoEl.addEventListener('play', handlePlay)
    videoEl.addEventListener('pause', handlePause)

    return () => {
      videoEl.removeEventListener('timeupdate', updateTime)
      videoEl.removeEventListener('loadedmetadata', updateDuration)
      videoEl.removeEventListener('ended', handleEnded)
      videoEl.removeEventListener('play', handlePlay)
      videoEl.removeEventListener('pause', handlePause)
    }
  }, [])

  // Preload video to reduce start delay on mobile
  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return
    videoEl.preload = 'auto'
    videoEl.load()
  }, [videoUrl])

  // Update canvas size when video loads
  const updateCanvasSize = useCallback(() => {
    const videoEl = videoRef.current
    const canvas = canvasRef.current
    if (!videoEl || !canvas) return

    const rect = videoEl.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    setVideoDimensions({ width: rect.width, height: rect.height })
    redrawCanvas()
  }, [])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateCanvasSize])

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw lines
    lines.forEach(line => {
      ctx.beginPath()
      ctx.strokeStyle = line.color
      ctx.lineWidth = 3
      ctx.moveTo(line.startX, line.startY)
      ctx.lineTo(line.endX, line.endY)
      ctx.stroke()
    })

    // Draw freehand paths
    freehandPaths.forEach(path => {
      if (path.points.length < 2) return
      ctx.beginPath()
      ctx.strokeStyle = path.color
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(path.points[0].x, path.points[0].y)
      path.points.forEach((point, i) => {
        if (i > 0) ctx.lineTo(point.x, point.y)
      })
      ctx.stroke()
    })

    // Draw current freehand
    if (currentFreehand.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = currentColor
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(currentFreehand[0].x, currentFreehand[0].y)
      currentFreehand.forEach((point, i) => {
        if (i > 0) ctx.lineTo(point.x, point.y)
      })
      ctx.stroke()
    }

    // Draw current line preview
    if (drawMode === 'line' && drawStart && isDrawing) {
      // Preview will be drawn in mouse move
    }
  }, [lines, freehandPaths, currentFreehand, currentColor, drawMode, drawStart, isDrawing])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  // Get canvas coordinates from event
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number
    
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0
      clientY = e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  // Drawing handlers
  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (drawMode === 'none') return
    e.preventDefault()
    
    const coords = getCanvasCoords(e)
    setIsDrawing(true)
    setDrawStart(coords)
    
    if (drawMode === 'freehand') {
      setCurrentFreehand([coords])
    }
  }

  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || drawMode === 'none') return
    e.preventDefault()
    
    const coords = getCanvasCoords(e)
    
    if (drawMode === 'freehand') {
      setCurrentFreehand(prev => [...prev, coords])
    } else if (drawMode === 'line' && drawStart) {
      // Draw preview line
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      redrawCanvas()
      ctx.beginPath()
      ctx.strokeStyle = currentColor
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])
      ctx.moveTo(drawStart.x, drawStart.y)
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  const handleDrawEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || drawMode === 'none') return
    e.preventDefault()
    
    const coords = getCanvasCoords(e)
    
    if (drawMode === 'line' && drawStart) {
      const newLine: Line = {
        id: Date.now().toString(),
        startX: drawStart.x,
        startY: drawStart.y,
        endX: coords.x,
        endY: coords.y,
        color: currentColor
      }
      setLines(prev => [...prev, newLine])
    } else if (drawMode === 'freehand' && currentFreehand.length > 1) {
      const newPath: FreehandPath = {
        id: Date.now().toString(),
        points: [...currentFreehand, coords],
        color: currentColor
      }
      setFreehandPaths(prev => [...prev, newPath])
    }
    
    setIsDrawing(false)
    setDrawStart(null)
    setCurrentFreehand([])
  }

  // Video controls
  const togglePlay = () => {
    const videoEl = videoRef.current
    if (!videoEl) return
    
    if (isPlaying) {
      videoEl.pause()
    } else {
      videoEl.play()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const videoEl = videoRef.current
    if (!videoEl) return
    
    const newTime = parseFloat(e.target.value)
    videoEl.currentTime = newTime
    setCurrentTime(newTime)
  }

  const stepFrame = (direction: 'forward' | 'backward') => {
    const videoEl = videoRef.current
    if (!videoEl) return
    
    // Assume 30fps, step ~1 frame
    const frameTime = 1 / 30
    if (direction === 'forward') {
      videoEl.currentTime = Math.min(videoEl.currentTime + frameTime, duration)
    } else {
      videoEl.currentTime = Math.max(videoEl.currentTime - frameTime, 0)
    }
  }

  const changePlaybackRate = (rate: number) => {
    const videoEl = videoRef.current
    if (!videoEl) return
    
    videoEl.playbackRate = rate
    setPlaybackRate(rate)
  }

  const clearDrawings = () => {
    setLines([])
    setFreehandPaths([])
    redrawCanvas()
  }

  const undoLast = () => {
    if (freehandPaths.length > 0) {
      setFreehandPaths(prev => prev.slice(0, -1))
    } else if (lines.length > 0) {
      setLines(prev => prev.slice(0, -1))
    }
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    const ms = Math.floor((time % 1) * 100)
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  // Handle video tap to toggle play
  const handleVideoTap = () => {
    if (drawMode === 'none') {
      if (swipeHandledRef.current) {
        swipeHandledRef.current = false
        return
      }
      togglePlay()
    }
  }

  return (
    <div
      ref={analyzerRef}
      className="swing-analyzer"
    >
      {/* Full screen video container */}
      <div 
        className="video-canvas-container"
        ref={containerRef} 
        onClick={handleVideoTap}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className="analyzer-video"
          preload="auto"
          playsInline
          onLoadedMetadata={updateCanvasSize}
        />
        <canvas
          ref={canvasRef}
          className={`drawing-canvas ${drawMode === 'none' ? 'inactive' : 'active'}`}
          onMouseDown={handleDrawStart}
          onMouseMove={handleDrawMove}
          onMouseUp={handleDrawEnd}
          onMouseLeave={handleDrawEnd}
          onTouchStart={handleDrawStart}
          onTouchMove={handleDrawMove}
          onTouchEnd={handleDrawEnd}
        />

        {/* Overlay Header */}
        <div className="overlay-header">
          <span className="video-title">{video.title}</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Drawing Tools - Right Side */}
        <div className="drawing-panel">
          <button 
            className={`draw-btn ${drawMode === 'line' ? 'active' : ''}`}
            onClick={() => setDrawMode(drawMode === 'line' ? 'none' : 'line')}
          >
            線
          </button>
          <button 
            className={`draw-btn ${drawMode === 'freehand' ? 'active' : ''}`}
            onClick={() => setDrawMode(drawMode === 'freehand' ? 'none' : 'freehand')}
          >
            ペン
          </button>
          
          <div className="color-palette">
            {COLORS.map(color => (
              <button
                key={color}
                className={`color-dot ${currentColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
              />
            ))}
          </div>
          
          <button className="draw-btn" onClick={undoLast}>↩</button>
          <button className="draw-btn" onClick={clearDrawings}>🗑</button>
        </div>

        {/* Playback Controls - Bottom */}
        <div className={`playback-panel ${showPlaybackControls ? '' : 'hidden'}`}>
          <div className="playback-row">
            <button className="ctrl-btn" onClick={() => stepFrame('backward')}>◀◀</button>
            <button className="ctrl-btn play" onClick={togglePlay}>
              {isPlaying ? '❚❚' : '▶'}
            </button>
            <button className="ctrl-btn" onClick={() => stepFrame('forward')}>▶▶</button>
            
            <div className="speed-row">
              {[0.25, 0.5, 0.75, 1].map(rate => (
                <button
                  key={rate}
                  className={`speed-btn-mini ${playbackRate === rate ? 'active' : ''}`}
                  onClick={() => changePlaybackRate(rate)}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
          
          <div className="progress-row">
            <span className="time-mini">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.01"
              value={currentTime}
              onChange={handleSeek}
              className="progress-slider-mini"
            />
            <span className="time-mini">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Toggle Playback Controls Button */}
        <button 
          className={`toggle-playback-btn ${showPlaybackControls ? '' : 'controls-hidden'}`}
          onClick={() => setShowPlaybackControls(!showPlaybackControls)}
        >
          {showPlaybackControls ? '▼' : '▲'}
        </button>
      </div>
    </div>
  )
}

export default SwingAnalyzer
