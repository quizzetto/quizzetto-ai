import { useState, useRef } from 'react'
import { COLORS, FONTS, btnPrimary, btnSuccess, btnPink, pressStyle } from '../lib/styles'

export default function PhotoUpload({ onGenerate, onBack }) {
  const [images, setImages] = useState([])
  const fileRef = useRef(null)
  const camRef = useRef(null)

  const handleFiles = (files) => {
    const newImgs = Array.from(files).filter(f => f.type.startsWith('image/')).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      id: Math.random().toString(36).substr(2, 9)
    }))
    setImages(prev => [...prev, ...newImgs])
  }

  const removeImage = (id) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.preview)
      return prev.filter(i => i.id !== id)
    })
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONTS.body, fontSize: '0.9rem', color: COLORS.purpleLight, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        ← Indietro
      </button>
      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📸</div>
      <h2 style={{ fontFamily: FONTS.heading, fontSize: '1.3rem', color: COLORS.dark, margin: '0 0 0.3rem' }}>Fotografa il tuo libro!</h2>
      <p style={{ fontFamily: FONTS.body, color: COLORS.gray, fontSize: '0.85rem', margin: '0 0 1.25rem' }}>Scatta una foto delle pagine da studiare</p>

      <div onClick={() => fileRef.current?.click()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        onDragOver={e => e.preventDefault()}
        style={{ border: `3px dashed ${COLORS.purpleLight}`, borderRadius: '20px', padding: '1.5rem', marginBottom: '1rem', background: 'rgba(162,155,254,0.06)', cursor: 'pointer' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>📄</div>
        <p style={{ fontFamily: FONTS.body, color: COLORS.purple, fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>Tocca per caricare</p>
      </div>

      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem' }}>
        <button onClick={() => camRef.current?.click()} {...pressStyle}
          style={{ ...btnPrimary, flex: 1, padding: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
          📷 Scatta
        </button>
        <button onClick={() => fileRef.current?.click()} {...pressStyle}
          style={{ ...btnSuccess, flex: 1, padding: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
          🖼️ Galleria
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

      {images.length > 0 && (
        <>
          <p style={{ fontFamily: FONTS.heading, color: COLORS.dark, marginBottom: '0.6rem', fontSize: '0.95rem' }}>
            {images.length} pagin{images.length === 1 ? 'a' : 'e'} · {10 + Math.max(0, (images.length - 1) * 5)} domande
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
            {images.map(img => (
              <div key={img.id} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '12px', overflow: 'hidden', border: `2px solid ${COLORS.grayBorder}` }}>
                <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => removeImage(img.id)}
                  style={{ position: 'absolute', top: '2px', right: '2px', background: COLORS.red, color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ))}
          </div>
          <button onClick={() => onGenerate(images.map(i => i.file))} {...pressStyle}
            style={{ ...btnPink, width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}>
            🚀 Crea il Quiz!
          </button>
        </>
      )}
    </div>
  )
}
