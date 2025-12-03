export function playBeep() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.connect(g)
  g.connect(ctx.destination)
  o.type = 'triangle'
  o.frequency.value = 880
  g.gain.setValueAtTime(0.001, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.05)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8)
  o.start()
  o.stop(ctx.currentTime + 0.85)
}

export function playCoins() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const master = ctx.createGain()
  master.gain.value = 0.4
  master.connect(ctx.destination)

  function ping(freq: number, time: number) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.value = freq
    o.connect(g)
    g.connect(master)
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(0.5, time + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.25)
    o.start(time)
    o.stop(time + 0.26)
  }

  function noise(time: number) {
    const bufferSize = 0.3 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(0.3, time + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.25)
    src.connect(g)
    g.connect(master)
    src.start(time)
    src.stop(time + 0.26)
  }

  const t0 = ctx.currentTime
  for (let i = 0; i < 5; i++) {
    const t = t0 + i * 0.07
    ping(900 - i * 40, t)
    noise(t)
  }
}

export function playLevelUp() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const master = ctx.createGain()
  master.gain.value = 0.35
  master.connect(ctx.destination)

  function tone(freq: number, t: number, dur = 0.25) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sawtooth'
    o.frequency.value = freq
    o.connect(g)
    g.connect(master)
    g.gain.setValueAtTime(0.001, t)
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  function shimmer(t: number) {
    const bufferSize = 0.2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
    src.connect(g)
    g.connect(master)
    src.start(t)
    src.stop(t + 0.24)
  }

  const t0 = ctx.currentTime
  const seq = [660, 740, 880, 990, 1180] // 上升音阶
  seq.forEach((f, i) => tone(f, t0 + i * 0.12, 0.2))
  shimmer(t0 + 0.45)
}

let ambienceInterval: number | null = null
let ambienceCtx: AudioContext | null = null
let ambienceMaster: GainNode | null = null
let stopFns: (() => void)[] = []

export function startAmbience(mode: 'magic' | 'heartbeat' = 'magic', speed = 1): () => void {
  ambienceCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const master = ambienceCtx.createGain()
  master.gain.value = 0.25
  master.connect(ambienceCtx.destination)
  ambienceMaster = master
  const scale = 1 / Math.max(0.1, speed)

  function scheduleHeartbeat() {
    const osc = ambienceCtx!.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 50
    const g = ambienceCtx!.createGain()
    g.gain.value = 0.0001
    osc.connect(g)
    g.connect(master)
    osc.start()
    ambienceInterval = window.setInterval(() => {
      const t = ambienceCtx!.currentTime
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.8, t + 0.05 * scale)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2 * scale)
      const t2 = t + 0.3 * scale
      g.gain.setValueAtTime(0.0001, t2)
      g.gain.exponentialRampToValueAtTime(0.6, t2 + 0.05 * scale)
      g.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.2 * scale)
    }, 800 * scale)
    stopFns.push(() => { try { osc.stop() } catch {} })
  }

  function scheduleMagic() {
    ambienceInterval = window.setInterval(() => {
      const t = ambienceCtx!.currentTime
      // whoosh noise with sweeping bandpass
      const bufferSize = 0.35 * ambienceCtx!.sampleRate * scale
      const buffer = ambienceCtx!.createBuffer(1, bufferSize, ambienceCtx!.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
      const src = ambienceCtx!.createBufferSource()
      src.buffer = buffer
      const band = ambienceCtx!.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.setValueAtTime(400, t)
      band.frequency.linearRampToValueAtTime(1800, t + 0.35 * scale)
      band.Q.value = 0.9
      const g = ambienceCtx!.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.05 * scale)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5 * scale)
      src.connect(band)
      band.connect(g)
      g.connect(master)
      src.start(t)
      src.stop(t + 0.52 * scale)

      // soft chime
      const o = ambienceCtx!.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(880, t)
      const cg = ambienceCtx!.createGain()
      cg.gain.setValueAtTime(0.0001, t)
      cg.gain.exponentialRampToValueAtTime(0.2, t + 0.02 * scale)
      cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25 * scale)
      o.connect(cg)
      cg.connect(master)
      o.start(t)
      o.stop(t + 0.27 * scale)
      stopFns.push(() => { try { o.stop() } catch {} })
    }, 700 * scale)
  }

  if (mode === 'heartbeat') scheduleHeartbeat()
  else scheduleMagic()

  return () => {
    if (ambienceInterval) { clearInterval(ambienceInterval); ambienceInterval = null }
    stopFns.forEach(fn => { try { fn() } catch {} })
    stopFns = []
    try {
      if (ambienceCtx && ambienceMaster) {
        const t = ambienceCtx.currentTime
        ambienceMaster.gain.cancelScheduledValues(t)
        ambienceMaster.gain.setValueAtTime(ambienceMaster.gain.value, t)
        ambienceMaster.gain.exponentialRampToValueAtTime(0.0001, t + 1.3)
      }
    } catch {}
    setTimeout(() => { try { ambienceCtx?.close() } catch {} ambienceCtx = null; ambienceMaster = null }, 1300)
    ambienceCtx = null
  }
}
export function sprayConfetti() {
  const colors = ['#32F08C', '#ffffff', '#e6e6e6', '#00d878']
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div')
    el.className = 'confetti'
    const size = 6 + Math.random() * 8
    el.style.left = `${Math.random() * 100}vw`
    el.style.background = colors[Math.floor(Math.random() * colors.length)]
    el.style.borderRadius = `${Math.random() > 0.5 ? 2 : 50}%`
    el.style.width = `${size}px`
    el.style.height = `${size}px`
    el.style.animationDelay = `${Math.random() * 0.3}s`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 2200)
  }
}