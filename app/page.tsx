'use client'

import React, { useState, useEffect, useRef } from 'react'

interface SemesterData {
  sgpa: number | ''
}

/* ─── tiny hook: count up animation ─────────────────────────── */
function useCountUp(target: number | null, duration = 1200) {
  const [display, setDisplay] = useState('—')
  useEffect(() => {
    if (target === null) { setDisplay('—'); return }
    let start = 0
    const step = 16
    const steps = Math.ceil(duration / step)
    let count = 0
    const timer = setInterval(() => {
      count++
      const progress = count / steps
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay((target * eased).toFixed(2))
      if (count >= steps) { setDisplay(target.toFixed(2)); clearInterval(timer) }
    }, step)
    return () => clearInterval(timer)
  }, [target, duration])
  return display
}

/* ─── Particle field ─────────────────────────────────────────── */
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const PARTICLE_COUNT = 80
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(100,220,255,${p.alpha})`
        ctx.fill()
      })

      // draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 110) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(100,220,255,${0.12 * (1 - dist / 110)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none', opacity: 0.55,
      }}
    />
  )
}

/* ─── Radial gauge ───────────────────────────────────────────── */
function CGPAGauge({ value }: { value: number }) {
  const max = 10
  const pct = value / max
  const r = 72
  const circ = 2 * Math.PI * r
  const dash = pct * circ * 0.75   // 270° arc
  const gap  = circ - dash

  const hue = Math.round(160 + (1 - pct) * (-130)) // green → red
  const color = `hsl(${hue},90%,60%)`

  return (
    <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
      <svg width="200" height="200" style={{ transform: 'rotate(135deg)' }}>
        {/* track */}
        <circle
          cx="100" cy="100" r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="14"
          strokeDasharray={`${circ * 0.75} ${circ}`}
          strokeLinecap="round"
        />
        {/* value */}
        <circle
          cx="100" cy="100" r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeDasharray={`${dash} ${gap + circ * 0.25}`}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
            transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)',
          }}
        />
      </svg>
      {/* centre text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: '2.6rem', fontWeight: 800, color,
          lineHeight: 1, letterSpacing: '-0.04em',
          textShadow: `0 0 20px ${color}`,
        }}>{value.toFixed(2)}</span>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: '0.15em' }}>
          OUT OF 10
        </span>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────── */
const Page = () => {
  const [numSemesters, setNumSemesters] = useState<number | ''>('')
  const [semesters, setSemesters] = useState<SemesterData[]>([])
  const [cgpa, setCGPA] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (typeof numSemesters === 'number' && numSemesters > 0) {
      setSemesters(Array(numSemesters).fill({ sgpa: '' }))
      setCGPA(null)
      setShowResult(false)
    }
  }, [numSemesters])

  const handleSemesterChange = (index: number, value: string) => {
    const updated = [...semesters]
    updated[index] = { sgpa: value === '' ? '' : parseFloat(value) }
    setSemesters(updated)
  }

  const calculateCGPA = () => {
    const valid = semesters.map(s => s.sgpa).filter(v => v !== '' && !isNaN(v as number))
    if (valid.length === 0) { alert('Please enter at least one SGPA value'); return }
    const total = valid.reduce((s, v) => s + Number(v), 0)
    setCGPA(parseFloat((total / valid.length).toFixed(2)))
    setShowResult(true)
  }

  const resetCalculator = () => {
    setNumSemesters('')
    setSemesters([])
    setCGPA(null)
    setShowResult(false)
  }

  /* grade badge */
  const getGrade = (c: number) => {
    if (c >= 9.5) return { label: 'Outstanding', color: '#22d3ee' }
    if (c >= 9)   return { label: 'Excellent', color: '#a78bfa' }
    if (c >= 8)   return { label: 'Very Good', color: '#34d399' }
    if (c >= 7)   return { label: 'Good', color: '#facc15' }
    if (c >= 6)   return { label: 'Average', color: '#fb923c' }
    return             { label: 'Needs Work', color: '#f87171' }
  }

  const grade = cgpa !== null ? getGrade(cgpa) : null

  return (
    <>
      {/* ── global styles ───────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&family=Space+Grotesk:wght@300;400;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #030712;
          color: #e2e8f0;
          font-family: 'Space Grotesk', 'Inter', sans-serif;
          overflow-x: hidden;
        }

        /* scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(100,220,255,0.25); border-radius: 4px; }

        /* grid bg */
        .grid-bg {
          position: fixed; inset: 0; z-index: 0;
          background-image:
            linear-gradient(rgba(100,220,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100,220,255,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
        }

        /* glow orbs */
        .orb {
          position: fixed; border-radius: 50%; pointer-events: none; filter: blur(80px);
          animation: orbFloat 12s ease-in-out infinite;
        }
        .orb1 { width:500px; height:500px; background:rgba(99,102,241,0.18); top:-100px; left:-150px; animation-delay:0s; }
        .orb2 { width:400px; height:400px; background:rgba(6,182,212,0.15); bottom:-80px; right:-100px; animation-delay:-6s; }
        .orb3 { width:300px; height:300px; background:rgba(168,85,247,0.12); top:40%; left:60%; animation-delay:-3s; }

        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          33%  { transform: translate(30px,-40px) scale(1.05); }
          66%  { transform: translate(-20px,30px) scale(0.95); }
        }

        /* card */
        .card {
          position: relative; z-index: 10;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(100,220,255,0.12);
          border-radius: 24px;
          padding: 2.5rem;
          box-shadow:
            0 0 0 1px rgba(100,220,255,0.06) inset,
            0 24px 80px rgba(0,0,0,0.6),
            0 0 40px rgba(99,102,241,0.08);
          transition: box-shadow 0.4s ease;
        }
        .card:hover {
          box-shadow:
            0 0 0 1px rgba(100,220,255,0.14) inset,
            0 24px 100px rgba(0,0,0,0.7),
            0 0 60px rgba(99,102,241,0.14);
        }

        /* neon input */
        .neon-input {
          width: 100%;
          padding: 0.75rem 1.2rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #e2e8f0;
          font-family: inherit; font-size: 0.95rem;
          outline: none;
          transition: border-color 0.3s, box-shadow 0.3s, background 0.3s;
          -moz-appearance: textfield;
        }
        .neon-input::-webkit-inner-spin-button,
        .neon-input::-webkit-outer-spin-button { -webkit-appearance: none; }
        .neon-input::placeholder { color: rgba(255,255,255,0.2); }
        .neon-input:focus {
          border-color: rgba(100,220,255,0.5);
          background: rgba(100,220,255,0.05);
          box-shadow: 0 0 0 3px rgba(100,220,255,0.08), 0 0 20px rgba(100,220,255,0.1) inset;
        }

        /* label */
        .field-label {
          display: block;
          font-size: 0.75rem; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          margin-bottom: 0.55rem;
        }

        /* sem badge */
        .sem-badge {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; flex-shrink: 0;
          border-radius: 10px;
          background: linear-gradient(135deg,rgba(99,102,241,0.3),rgba(6,182,212,0.3));
          border: 1px solid rgba(100,220,255,0.2);
          font-weight: 700; font-size: 0.8rem; color: #93c5fd;
        }

        /* primary btn */
        .btn-primary {
          flex: 1;
          padding: 0.85rem 1.5rem;
          border: none; cursor: pointer;
          border-radius: 14px;
          font-family: inherit; font-size: 0.95rem; font-weight: 700;
          letter-spacing: 0.04em;
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          color: #fff;
          position: relative; overflow: hidden;
          transition: transform 0.2s, box-shadow 0.3s;
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
        }
        .btn-primary::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg,#818cf8,#22d3ee);
          opacity: 0; transition: opacity 0.3s;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.5); }
        .btn-primary:hover::before { opacity: 1; }
        .btn-primary:active { transform: translateY(0) scale(0.97); }
        .btn-primary span { position: relative; z-index: 1; }

        /* ghost btn */
        .btn-ghost {
          flex: 1;
          padding: 0.85rem 1.5rem;
          border: 1px solid rgba(255,255,255,0.1); cursor: pointer;
          border-radius: 14px;
          font-family: inherit; font-size: 0.95rem; font-weight: 600;
          color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.03);
          transition: border-color 0.3s, color 0.3s, background 0.3s;
        }
        .btn-ghost:hover {
          border-color: rgba(100,220,255,0.3);
          color: #e2e8f0; background: rgba(100,220,255,0.05);
        }

        /* sem row */
        .sem-row {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.5rem 0;
          animation: rowIn 0.35s ease both;
        }
        @keyframes rowIn {
          from { opacity:0; transform:translateX(-12px); }
          to   { opacity:1; transform:translateX(0); }
        }

        /* result card */
        .result-block {
          background: rgba(99,102,241,0.05);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 20px;
          padding: 2rem 1.5rem;
          text-align: center;
          position: relative; overflow: hidden;
        }
        .result-block::before {
          content:'';
          position:absolute; inset:0;
          background: radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%);
        }

        /* summary pill */
        .sum-pill {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 0.6rem 0.5rem;
          text-align: center;
          transition: transform 0.2s, border-color 0.2s;
        }
        .sum-pill:hover { transform: translateY(-3px); border-color: rgba(100,220,255,0.25); }

        /* grade badge */
        .grade-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.3rem 0.9rem; border-radius: 999px;
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em;
          border: 1px solid; margin-top: 0.8rem;
        }

        /* fade/slide animations */
        .fade-in  { animation: fadeIn 0.5s ease both; }
        .slide-up { animation: slideUp 0.5s ease both; }

        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }

        /* title gradient */
        .title-grad {
          background: linear-gradient(135deg, #e2e8f0 0%, #93c5fd 40%, #22d3ee 70%, #a78bfa 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        /* scan line overlay */
        .scan-overlay {
          position: fixed; inset: 0; z-index: 1; pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          );
        }
      `}</style>

      {/* ── backgrounds ───────────────────────────────────────── */}
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />
      <div className="grid-bg" />
      <div className="scan-overlay" />
      {mounted && <Particles />}

      {/* ── layout ────────────────────────────────────────────── */}
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1rem',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {/* ── header ──────────────────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }} className="slide-up">
            {/* icon */}
            <div style={{
              width: 56, height: 56, margin: '0 auto 1.2rem',
              borderRadius: 16,
              background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(6,182,212,0.3))',
              border: '1px solid rgba(100,220,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(99,102,241,0.25)',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6366f1"/>
                    <stop offset="100%" stopColor="#22d3ee"/>
                  </linearGradient>
                </defs>
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>

            <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em' }}
                className="title-grad">
              CGPA Calculator
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', marginTop: '0.6rem', fontSize: '0.9rem', letterSpacing: '0.03em' }}>
              Enter your semester grades and get your cumulative GPA instantly
            </p>
          </div>

          {/* ── card ────────────────────────────────────────── */}
          <div className="card fade-in">

            {!showResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>

                {/* num semesters */}
                <div>
                  <label className="field-label">Number of semesters</label>
                  <input
                    className="neon-input"
                    type="number" min="1" max="12"
                    value={numSemesters}
                    onChange={e => setNumSemesters(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="e.g. 6"
                  />
                </div>

                {/* sgpa inputs */}
                {semesters.length > 0 && (
                  <div>
                    <label className="field-label">SGPA per semester (0 – 10)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '18rem', overflowY: 'auto', paddingRight: '4px' }}>
                      {semesters.map((sem, i) => (
                        <div key={i} className="sem-row" style={{ animationDelay: `${i * 40}ms` }}>
                          <div className="sem-badge">{i + 1}</div>
                          <input
                            className="neon-input"
                            type="number" min="0" max="10" step="0.01"
                            value={sem.sgpa}
                            onChange={e => handleSemesterChange(i, e.target.value)}
                            placeholder="0.00 – 10.00"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* actions */}
                {semesters.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.4rem' }}>
                    <button className="btn-primary" onClick={calculateCGPA}>
                      <span>Calculate CGPA</span>
                    </button>
                    <button className="btn-ghost" onClick={resetCalculator}>Reset</button>
                  </div>
                )}
              </div>

            ) : (
              // ── result ──────────────────────────────────────
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }} className="fade-in">

                {/* gauge */}
                <div className="result-block">
                  {cgpa !== null && <CGPAGauge value={cgpa} />}

                  {grade && (
                    <div>
                      <div
                        className="grade-badge"
                        style={{ color: grade.color, borderColor: grade.color + '44', backgroundColor: grade.color + '11' }}
                      >
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: grade.color, display: 'inline-block',
                          boxShadow: `0 0 6px ${grade.color}`,
                        }} />
                        {grade.label}
                      </div>
                    </div>
                  )}

                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem', marginTop: '0.75rem' }}>
                    Averaged across {semesters.length} semester{semesters.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* semester grid */}
                <div>
                  <label className="field-label">Semester breakdown</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: '0.6rem' }}>
                    {semesters.map((sem, i) => {
                      const v = Number(sem.sgpa)
                      const hue = Math.round(160 + (1 - v / 10) * (-130))
                      const accent = `hsl(${hue},80%,65%)`
                      return (
                        <div key={i} className="sum-pill slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem', letterSpacing: '0.1em' }}>
                            SEM {i + 1}
                          </p>
                          <p style={{ fontSize: '1.05rem', fontWeight: 700, color: accent, textShadow: `0 0 10px ${accent}88` }}>
                            {sem.sgpa}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* re-calc */}
                <button className="btn-primary" onClick={resetCalculator} style={{ width: '100%' }}>
                  <span>Calculate Again</span>
                </button>
              </div>
            )}
          </div>

          {/* footer hint */}
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.08em' }}>
            CGPA = Σ SGPA / Number of Semesters
          </p>
        </div>
      </div>
    </>
  )
}

export default Page
