import React from 'react'
import playVideo from '../lib/video'
import EventedComponent from '../lib/evented-component'
const debug = require('debug')('torrent-video-player:VideoPlayer')

const INITIAL_STATE = {
  torrent: null,
  progress: 0,
  numPeers: 0,
  downloadSpeed: 0,
  downloaded: 0
}

export default class VideoPlayer extends EventedComponent {

  state = INITIAL_STATE

  constructor(props) {
    super(props)
    this.videoRef = this.videoRef.bind(this)
    this.loadingRef = this.loadingRef.bind(this)
    this.removeVideoPlayer = this.removeVideoPlayer.bind(this)
  }

  removeVideoPlayer(event) {
    event.preventDefault()
    event.stopPropagation()
    const videoEl = this.videoEl
    this.pauseVideo(videoEl)
    videoEl.load()
    this.deleteVideo(videoEl)
    setImmediate(() => this.props.removeVideo())
  }

  setInitialState() {
    this.setState(INITIAL_STATE)
  }

  playVideo() {
    const video = this.props.video
    if (video) {
      debug('playing video', video)
      this.setInitialState()
      setImmediate(() => {
        this.torrent = playVideo(video.magnetUri, video.infoHash, this.videoEl, video.torrentUrl, (torrent) => {
          this.emit('ready', torrent)
          this.monitorTorrentStats(torrent)
          this.videoEl.load()
        })
        this.addVideoPlayerEvents(this.videoEl)
        this.emit('play', [this])
        this.emit('torrent', this.torrent)
      })
    } else {
      console.warn('Cannot play video, no torrents found')
    }
  }

  monitorTorrentStats(torrent) {
    if (!torrent) {
      debug('Monitored torrent is invalid', torrent)
      return
    }
    clearInterval(this.torrentStatsUpdateInterval)
    this.torrentStatsUpdateInterval = setInterval(() => {
      this.setState({
        torrent: torrent,
        progress: (100 * torrent.progress).toFixed(1),
        numPeers: torrent.numPeers,
        downloadSpeed: torrent.downloadSpeed,
        downloaded: torrent.downloaded
      })
      this.emit('state', this.state)
    }, 1000)
  }

  isVideoDisplayed() {
    return !!this.videoEl
  }

  isVideoPlaying(video) {
    return !!(!video.paused && !video.ended && video.currentTime > 0 && video.readyState > 2)
  }

  pauseVideo(videoEl) {
    videoEl && videoEl.pause()
  }

  deleteVideo(videoEl) {
    videoEl && videoEl.parentNode.removeChild(videoEl)
    videoEl = null
  }

  addVideoPlayerEvents(videoEl) {
    var loadTimer, 
      loadInterval = 200,
      hasBeenAutoPlayed = false

    videoEl.addEventListener('timeupdate', () => {
      this.loadingEl.style.display = 'none'
      this.buffering = false

      if (!hasBeenAutoPlayed && !videoEl.paused) {
        try {
          videoEl.play() // fix ff autoplay not working
          hasBeenAutoPlayed = true
        } catch(e) {
          hasBeenAutoPlayed = false
        }
      }

      clearInterval(loadTimer)
      loadTimer = setInterval(() => {
        if (this.isVideoLoading(videoEl)) {
          this.loadingEl.style.display = 'block'
          this.monitorTorrentStats(this.state.torrent)
        }
      }, loadInterval)
    })
  }

  isVideoLoading(videoEl) {
    return !this.isVideoPlaying(videoEl) && !videoEl.paused
  }

  loadingRef(ref) {
    this.loadingEl = ref
  }

  videoRef(ref) {
    this.videoEl = ref
  }

  render() {
    const video = this.props.video
    return (<div id="video-player-chrome">
        {video.title && (<h2>{video.title}</h2>)}
        <div className="meta">
          <div className="synopsis">{video.synopsis}</div>
          {video.rating && video.rating > 0 ? (<div className="rating"><i className="fa fa-thumbs-up" /> {video.rating}</div>) : null}
          <div className="mpa_rating">{video.mpa_rating}</div>
          <div className="year">{video.year}</div>
          {video.runtime && video.runtime > 0 ? (<div className="runtime">{video.runtime} mins</div>) : null}
        </div>
        <div id="video-player">
          <div className="loading" ref={this.loadingRef}>
            <p><i className="fa fa-circle-o-notch spin" /></p> 
            <p>Loading Video... </p>
            <p>Connected {this.state.numPeers} peers</p>
            <p>Buffered {this.state.progress}%</p>
          </div>
          <video ref={this.videoRef} autoPlay controls />
        </div>
        <a href="#close" className="close" onClick={this.removeVideoPlayer}><i className="fa fa-close" /></a>
      </div>)
  }
}
