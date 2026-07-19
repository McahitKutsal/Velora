// Web Speech API tabanlı seslendirme yardımcısı.
// Tarayıcı built-in; ek maliyet/backend yok. Rusça için 'ru-RU' sesi seçilir.

// Tarayıcı sesleri async yüklenir; bir kez hazırlayıp önbelleğe alıyoruz.
let voicesReady = false;

function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) voicesReady = true;
  return voices;
}

// Sayfa açılır açılmaz sesleri ısıt (ilk tıklamada gecikme olmasın).
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

function pickVoice(lang) {
  const voices = loadVoices();
  if (!voices.length) return null;
  const base = lang.split('-')[0].toLowerCase();
  // Önce tam eşleşme (ru-RU), sonra dil kökü (ru), sonra ilk ses.
  return (
    voices.find((v) => v.lang?.toLowerCase() === lang.toLowerCase()) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(base)) ||
    null
  );
}

// Tarayıcının seslendirmeyi desteklediğini döndürür.
export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Verilen metni seslendirir. Devam eden konuşmayı iptal eder.
export function speak(text, lang = 'ru-RU') {
  if (!isSpeechSupported() || !text?.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel(); // önceki seslendirmeyi durdur
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.9; // öğrenme için biraz yavaş
  const voice = pickVoice(lang);
  if (voice) utter.voice = voice;
  synth.speak(utter);
}
