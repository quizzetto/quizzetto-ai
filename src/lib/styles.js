export const COLORS = {
  purple: '#6c5ce7',
  purpleLight: '#a29bfe',
  pink: '#fd79a8',
  pinkDark: '#e84393',
  green: '#00b894',
  greenLight: '#55efc4',
  yellow: '#fdcb6e',
  orange: '#e17055',
  red: '#ff6b6b',
  dark: '#2d3436',
  gray: '#636e72',
  grayLight: '#b2bec3',
  grayBorder: '#dfe6e9',
  white: '#ffffff',
  bgPurple: 'rgba(108,92,231,0.06)',
  bgGreen: 'rgba(0,184,148,0.06)',
  bgRed: 'rgba(255,107,107,0.06)',
  bgYellow: 'rgba(253,203,110,0.06)',
}

export const FONTS = {
  heading: "'Fredoka', sans-serif",
  body: "'Nunito', sans-serif",
}

export const correctPhrases = [
  "Perfetto! 🎉",
  "Esatto! ⭐",
  "Risposta giusta! 🧠",
  "Ottimo lavoro! 🏆",
  "Fantastico! 🌟",
  "Risposta perfetta! ✨",
  "Proprio così! 💫",
  "Eccellente! 🎯",
  "Super! 🚀",
  "Niente da dire! 👏",
]

export const wrongPhrases = [
  "Peccato! Riprova! 💙",
  "Non preoccuparti, succede! 💪",
  "La prossima volta andrà meglio! 🌈",
  "Sbagliando si impara! 📚",
  "Ci sei quasi! 🔄",
  "Dai, riprova! 💜",
  "Non era facile! 😊",
]

export const pressStyle = {
  onMouseDown: (e) => (e.currentTarget.style.transform = 'scale(0.96)'),
  onMouseUp: (e) => (e.currentTarget.style.transform = 'scale(1)'),
  onMouseLeave: (e) => (e.currentTarget.style.transform = 'scale(1)'),
}

export const btnPrimary = {
  background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.purpleLight})`,
  color: 'white',
  border: 'none',
  borderRadius: '14px',
  fontFamily: FONTS.heading,
  cursor: 'pointer',
  boxShadow: `0 4px 15px rgba(108,92,231,0.3)`,
  transition: 'transform 0.2s ease',
}

export const btnSuccess = {
  ...btnPrimary,
  background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.greenLight})`,
  boxShadow: `0 4px 15px rgba(0,184,148,0.3)`,
}

export const btnDanger = {
  ...btnPrimary,
  background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.red})`,
  boxShadow: `0 4px 15px rgba(225,112,85,0.3)`,
}

export const btnPink = {
  ...btnPrimary,
  background: `linear-gradient(135deg, ${COLORS.pink}, ${COLORS.pinkDark})`,
  boxShadow: `0 4px 15px rgba(232,67,147,0.3)`,
}

export const card = {
  background: 'white',
  borderRadius: '24px',
  padding: '1.5rem',
  boxShadow: '0 4px 25px rgba(0,0,0,0.05)',
  border: '1px solid rgba(0,0,0,0.03)',
}
