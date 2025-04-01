// DOM Elementlerini Seçme
document.addEventListener('DOMContentLoaded', function() {
    const sourceText = document.getElementById('sourceText');
    const sourceLanguage = document.getElementById('sourceLanguage');
    const targetLanguage = document.getElementById('targetLanguage');
    const convertBtn = document.getElementById('convertBtn');
    const transliteratedOutput = document.getElementById('transliteratedOutput');
    const ipaOutput = document.getElementById('ipaOutput');
    const copyTransliterated = document.getElementById('copyTransliterated');
    const copyIpa = document.getElementById('copyIpa');
    const swapLanguagesBtn = document.getElementById('swapLanguages');
    const speakTransliterated = document.getElementById('speakTransliterated');
    const speakIpa = document.getElementById('speakIpa');
    const speakSource = document.getElementById('speakSource');
    const audioSource = document.getElementById('audioSource');
    
    // API Ayarları için DOM Elementleri
    const googleApiKey = document.getElementById('googleApiKey');
    const geminiApiKey = document.getElementById('geminiApiKey');
    const saveGoogleApi = document.getElementById('saveGoogleApi');
    const saveGeminiApi = document.getElementById('saveGeminiApi');
    const useLocalApi = document.getElementById('useLocalApi');
    const useGoogleApi = document.getElementById('useGoogleApi');
    const useGeminiApi = document.getElementById('useGeminiApi');

    // API URL'leri
    const API_URL = 'http://localhost:5000'; // Python backend URL'si
    const USE_API = true; // API yerine JavaScript kullanmak için false yapın
    const USE_GOOGLE_TRANSLATE_FALLBACK = true; // Google Translate yedek olarak kullanılacak
    
    // API Seçenekleri
    let currentApiType = 'gemini'; // Varsayılan olarak Gemini API
    let googleApiKeyValue = localStorage.getItem('googleApiKey') || '';
    let geminiApiKeyValue = localStorage.getItem('geminiApiKey') || '';
    
    // Sayfa yüklendiğinde API anahtarlarını yükle
    if (googleApiKeyValue) {
        googleApiKey.value = googleApiKeyValue;
    }
    if (geminiApiKeyValue) {
        geminiApiKey.value = geminiApiKeyValue;
    }
    
    // API seçimini yerel depodan al
    const savedApiType = localStorage.getItem('apiType');
    if (savedApiType) {
        currentApiType = savedApiType;
    }
    
    // Radyo düğmelerini güncelle
    if (currentApiType === 'local') useLocalApi.checked = true;
    else if (currentApiType === 'google') useGoogleApi.checked = true;
    else if (currentApiType === 'gemini') useGeminiApi.checked = true;

    // Transliterasyon kütüphanesi (transliteration.js) - API kullanılmadığında
    let transliterate;
    if (window.transliterate) {
        // Direkt olarak global fonksiyon olarak tanımlanmış
        transliterate = window.transliterate;
    } else if (window.Transliteration && window.Transliteration.transliterate) {
        // Nesne içinde tanımlanmış
        transliterate = window.Transliteration.transliterate;
    } else {
        // Kütüphane yüklenemezse basit bir fonksiyon tanımla
        console.warn("Transliteration.js kütüphanesi yüklenemedi. Basit transliterasyon kullanılacak.");
        transliterate = function(text) {
            // Basit transliterasyon - aksan işaretlerini kaldır
            return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };
    }

    // Dil kodlarını Google TTS için düzgün formata çevirme
    const googleTtsLangMap = {
        'ar': 'ar-SA',
        'ru': 'ru-RU',
        'el': 'el-GR',
        'hi': 'hi-IN',
        'zh': 'zh-CN',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'tr': 'tr-TR',
        'en': 'en-US',
        'fa': 'fa-IR', // Farsça (İran)
        'uk': 'uk-UA', // Ukraynaca (Ukrayna)
        'la': 'it-IT' // Latin için İtalyanca kullanıyoruz (en yakın dil)
    };

    // IPA Dönüşümü için Temel Haritalar (API kullanılmadığında)
    const ipaMap = {
        // İngilizce için IPA mapping (basitleştirilmiş)
        'en': {
            'a': 'æ', 'e': 'ɛ', 'i': 'ɪ', 'o': 'ɒ', 'u': 'ʌ',
            'ah': 'ɑ', 'ee': 'i', 'oo': 'u', 'th': 'θ', 'sh': 'ʃ',
            'ch': 'tʃ', 'j': 'dʒ', 'ng': 'ŋ', 'zh': 'ʒ'
        },
        // Türkçe için IPA mapping
        'tr': {
            'a': 'a', 'e': 'e', 'i': 'i', 'ı': 'ɯ', 'o': 'o', 'ö': 'ø', 
            'u': 'u', 'ü': 'y', 'c': 'dʒ', 'ç': 'tʃ', 'ğ': 'ː', 'ş': 'ʃ'
        },
        // Rusça için IPA mapping (basitleştirilmiş)
        'ru': {
            'а': 'a', 'е': 'je', 'и': 'i', 'о': 'o', 'у': 'u', 'ы': 'ɨ',
            'э': 'e', 'ю': 'ju', 'я': 'ja', 'б': 'b', 'в': 'v', 'г': 'g',
            'д': 'd', 'ж': 'ʐ', 'з': 'z', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'ф': 'f',
            'х': 'x', 'ц': 'ts', 'ч': 'tɕ', 'ш': 'ʂ', 'щ': 'ɕɕ'
        },
        // Arapça için IPA mapping (basitleştirilmiş)
        'ar': {
            'ا': 'aː', 'ب': 'b', 'ت': 't', 'ث': 'θ', 'ج': 'dʒ', 'ح': 'ħ',
            'خ': 'x', 'د': 'd', 'ذ': 'ð', 'ر': 'r', 'ز': 'z', 'س': 's',
            'ش': 'ʃ', 'ص': 'sˤ', 'ض': 'dˤ', 'ط': 'tˤ', 'ظ': 'ðˤ', 'ع': 'ʕ',
            'غ': 'ɣ', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm',
            'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'j'
        },
        // Farsça için IPA mapping (basitleştirilmiş)
        'fa': {
            'ا': 'ɒː', 'آ': 'ɒː', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's',
            'ج': 'dʒ', 'چ': 'tʃ', 'ح': 'h', 'خ': 'x', 'د': 'd', 'ذ': 'z',
            'ر': 'r', 'ز': 'z', 'ژ': 'ʒ', 'س': 's', 'ش': 'ʃ', 'ص': 's',
            'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'ʔ', 'غ': 'ɣ', 'ف': 'f',
            'ق': 'ɢ', 'ک': 'k', 'گ': 'ɡ', 'ل': 'l', 'م': 'm', 'ن': 'n',
            'و': 'v', 'ه': 'h', 'ی': 'j', 'ء': 'ʔ'
        },
        // Ukraynaca için IPA mapping (basitleştirilmiş)
        'uk': {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'ɦ', 'ґ': 'g', 'д': 'd',
            'е': 'ɛ', 'є': 'jɛ', 'ж': 'ʒ', 'з': 'z', 'и': 'ɪ', 'і': 'i',
            'ї': 'ji', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
            'о': 'ɔ', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'tʃ', 'ш': 'ʃ', 'щ': 'ʃtʃ',
            'ь': 'ʲ', 'ю': 'ju', 'я': 'ja'
        }
    };

    // Dil Çiftleri için Özel Transliterasyon Kuralları (API kullanılmadığında)
    const transliterationRules = {
        // Rusça -> Latin
        'ru-la': {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e',
            'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k',
            'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
            'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
            'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '',
            'э': 'e', 'ю': 'yu', 'я': 'ya'
        },
        // Arapça -> Latin
        'ar-la': {
            'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h',
            'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's',
            'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': '\'',
            'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm',
            'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ة': 'a', 'ء': '\''
        },
        // Yunanca -> Latin
        'el-la': {
            'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z',
            'η': 'i', 'θ': 'th', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm',
            'ν': 'n', 'ξ': 'x', 'ο': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's',
            'τ': 't', 'υ': 'y', 'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o'
        },
        // Farsça -> Latin
        'fa-la': {
            'ا': 'a', 'آ': 'ā', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's',
            'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z',
            'ر': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's',
            'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': '\'', 'غ': 'gh', 'ف': 'f',
            'ق': 'q', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n',
            'و': 'v', 'ه': 'h', 'ی': 'y', 'ء': '\'', 'ئ': '\'', 'ة': 'e'
        },
        // Ukraynaca -> Latin
        'uk-la': {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd',
            'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i',
            'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
            'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
            'ь': '', 'ю': 'yu', 'я': 'ya', 'ʼ': ''
        }
    };

    // API'den desteklenen dilleri al
    async function fetchSupportedLanguages() {
        try {
            const response = await fetch(`${API_URL}/api/supported-languages`);
            if (response.ok) {
                const data = await response.json();
                console.log("Desteklenen diller:", data);
                return data;
            }
        } catch (error) {
            console.error("Desteklenen diller alınamadı:", error);
        }
        return null;
    }

    // Metin Dönüşümü için Ana Fonksiyon
    async function convertText() {
        console.log("Dönüştür fonksiyonu çalıştı"); // Debug için log
        // Girdi metni ve seçilen diller
        const text = sourceText.value;
        const sourceLang = sourceLanguage.value;
        const targetLang = targetLanguage.value;

        if (!text.trim()) {
            showMessage('Lütfen dönüştürülecek bir metin girin.');
            return;
        }

        // Yükleniyor göstergesi
        transliteratedOutput.textContent = 'Dönüştürülüyor...';
        ipaOutput.textContent = 'Dönüştürülüyor...';
        
        let transliteratedText = '';
        let ipaText = '';
        let detectedLang = '';
        
        try {
            // API tipine göre işlem yap
            if (currentApiType === 'google') {
                // Google API ile işlem
                if (!googleApiKeyValue) {
                    showMessage('Google API anahtarı gerekli. Lütfen Google API anahtarınızı girin ve kaydedin.', 'error');
                    transliteratedOutput.textContent = 'API anahtarı gerekli...';
                    ipaOutput.textContent = 'API anahtarı gerekli...';
                    return;
                }
                
                try {
                    // Dil otomatik algılama
                    if (text && sourceLang === '') {
                        detectedLang = await detectLanguageWithGoogleApi(text);
                        showMessage(`Dil otomatik olarak algılandı: ${getLanguageName(detectedLang)}`);
                    } else {
                        detectedLang = sourceLang;
                    }
                    
                    // Google API ile transliterasyon ve IPA
                    const googleResults = await fetchGoogleTranslationApi(text, detectedLang, targetLang);
                    transliteratedText = googleResults.transliteration || '';
                    ipaText = googleResults.ipa || '';
                    
                    if (!transliteratedText) {
                        transliteratedText = 'Google API transliterasyon sonucu döndürmedi.';
                    }
                    if (!ipaText) {
                        ipaText = 'Google API IPA sonucu döndürmedi.';
                    }
                    
                    // Algılanan dili UI'da göster
                    updateSourceLanguageUI(detectedLang);
                } catch (error) {
                    console.error("Google API hatası:", error);
                    showMessage("Google API hatası oluştu. Yerel API'ye dönülüyor...", 'error');
                    throw error; // Yerel API'ye geçiş için hata fırlat
                }
            } else if (currentApiType === 'gemini') {
                // Gemini API ile işlem
                if (!geminiApiKeyValue) {
                    showMessage('Gemini API anahtarı gerekli. Google AI Studio\'dan almanız gereken Gemini API anahtarını girin ve kaydedin.', 'error');
                    transliteratedOutput.innerHTML = '<div class="alert alert-warning">Gemini API anahtarı gerekli...<br><small>Google AI Studio\'dan API anahtarı almanız gerekiyor: <a href="https://aistudio.google.com/" target="_blank">AI Studio</a></small></div>';
                    ipaOutput.textContent = 'API anahtarı gerekli...';
                    return;
                }
                
                try {
                    // API modelini ayarla
                    let apiModel = 'gemini-pro';
                    
                    // Dil otomatik algılama
                    if (text && sourceLang === '') {
                        try {
                            detectedLang = await detectLanguageWithGeminiApi(text, apiModel);
                            showMessage(`Dil otomatik olarak algılandı: ${getLanguageName(detectedLang)}`);
                        } catch (langError) {
                            console.error("Gemini dil algılama hatası:", langError);
                            // Yerel API dil algılamayı kullan
                            detectedLang = await detectLanguage(text);
                            showMessage(`Yerel API ile dil algılandı: ${getLanguageName(detectedLang)}`);
                        }
                    } else {
                        detectedLang = sourceLang;
                    }
                    
                    console.log("Algılanan dil:", detectedLang);
                    
                    // Gemini API ile transliterasyon ve IPA
                    try {
                        const geminiResults = await fetchGeminiApi(text, detectedLang, targetLang, apiModel);
                        transliteratedText = geminiResults.transliteration || '';
                        ipaText = geminiResults.ipa || '';
                        
                        if (!transliteratedText) {
                            throw new Error('Boş transliterasyon sonucu');
                        }
                    } catch (translitError) {
                        console.error("Gemini API transliterasyon hatası:", translitError);
                        // Direkt olarak Google Translate'in gayri resmi API'sine geç
                        showMessage("Gemini API kullanılamıyor. Google Translate API'ye geçiliyor...", 'warning');
                        
                        // Google Translate'in gayri resmi API'si ile doğrudan transliterasyon yap
                        try {
                            const googleTransResult = await fetchGoogleTransliteration(text, detectedLang);
                            if (googleTransResult && googleTransResult.text) {
                                transliteratedText = googleTransResult.text;
                                ipaText = jsTextToIPA(text, detectedLang);
                            } else {
                                throw new Error('Google Translate API sonuç döndürmedi');
                            }
                        } catch (gTransError) {
                            // Her iki dış API de başarısız oldu, yerel API'ye dön
                            console.error("Google Translate API hatası:", gTransError);
                            throw gTransError; // Yerel API'ye geçiş için hata fırlat
                        }
                    }
                    
                    // Algılanan dili UI'da göster
                    updateSourceLanguageUI(detectedLang);
                } catch (error) {
                    console.error("API hatası, yerel API'ye dönülüyor:", error);
                    showMessage("API hatası oluştu. Yerel API'ye dönülüyor...", 'error');
                    throw error; // Yerel API'ye geçiş için hata fırlat
                }
            } else {
                // Yerel API kullanılıyorsa
                const localResults = await useLocalApiForConversion(text, sourceLang, targetLang);
                transliteratedText = localResults.transliteratedText;
                ipaText = localResults.ipaText;
            }
        } catch (error) {
            // Herhangi bir API hatası durumunda yerel API'ye dön
            console.log("Tüm API'ler başarısız oldu, yerel dönüşüm kullanılıyor...");
            const localResults = await useLocalApiForConversion(text, sourceLang, targetLang);
            transliteratedText = localResults.transliteratedText;
            ipaText = localResults.ipaText;
        }
        
        // Sonuçları göster
        transliteratedOutput.textContent = transliteratedText || 'Dönüşüm sırasında bir hata oluştu.';
        transliteratedOutput.classList.add('fade-in');
        
        ipaOutput.textContent = ipaText || 'IPA oluşturulamadı.';
        ipaOutput.classList.add('fade-in');
        ipaOutput.classList.add('ipa-text');

        // Konuşma butonlarını etkinleştir
        speakTransliterated.disabled = false;
        speakIpa.disabled = false;
    }
    
    // Yerel API ile dönüşüm işlemi
    async function useLocalApiForConversion(text, sourceLang, targetLang) {
        let transliteratedText = '';
        let ipaText = '';
        let detectedLang = '';
        
        // API kullanılıyorsa
        if (USE_API) {
            try {
                // Dil otomatik algılama (eğer kullanıcı metin girmiş ama dil seçmemişse)
                if (text && sourceLang === '') {
                    try {
                        detectedLang = await detectLanguage(text);
                        console.log("Algılanan dil:", detectedLang);
                        showMessage(`Dil otomatik olarak algılandı: ${getLanguageName(detectedLang)}`);
                    } catch (error) {
                        console.error("Dil algılama hatası:", error);
                        detectedLang = 'en'; // Varsayılan olarak İngilizce
                    }
                } else {
                    detectedLang = sourceLang;
                }
                
                // Transliterasyon ve IPA için paralel API çağrıları
                try {
                    const [transliterationResult, ipaResult] = await Promise.all([
                        fetchTransliteration(text, detectedLang, targetLang),
                        fetchIPA(text, detectedLang)
                    ]);
                    
                    transliteratedText = transliterationResult.transliteratedText;
                    ipaText = ipaResult.ipaText;
                    
                    // Transliterasyon API başarısız oldu veya sonuç hata içeriyorsa Google Translate kullan
                    if (USE_GOOGLE_TRANSLATE_FALLBACK && 
                        (transliteratedText.includes("hatası") || 
                         transliteratedText.includes("bulunamadı") || 
                         transliteratedText.includes("desteklenmiyor"))) {
                        console.log("Transliterasyon API başarısız oldu, Google Translate deneniyor...");
                        try {
                            const googleTransliterationResult = await fetchGoogleTransliteration(text, detectedLang);
                            if (googleTransliterationResult && googleTransliterationResult.text) {
                                transliteratedText = googleTransliterationResult.text;
                                showMessage("Google Translate transliterasyonu kullanıldı.");
                            }
                        } catch (googleError) {
                            console.error("Google Translate hatası:", googleError);
                        }
                    }
                } catch (apiError) {
                    console.error("API çağrı hatası:", apiError);
                    if (USE_GOOGLE_TRANSLATE_FALLBACK) {
                        try {
                            const googleTransliterationResult = await fetchGoogleTransliteration(text, detectedLang);
                            if (googleTransliterationResult && googleTransliterationResult.text) {
                                transliteratedText = googleTransliterationResult.text;
                                showMessage("Google Translate transliterasyonu kullanıldı.");
                            } else {
                                transliteratedText = jsTransliterate(text, detectedLang, targetLang);
                            }
                        } catch (googleError) {
                            console.error("Google Translate hatası:", googleError);
                            transliteratedText = jsTransliterate(text, detectedLang, targetLang);
                        }
                        
                        // IPA için JavaScript'i kullan
                        ipaText = jsTextToIPA(text, detectedLang);
                    } else {
                        // Google Translate fallback kapalıysa JavaScript'e dön
                        transliteratedText = jsTransliterate(text, detectedLang, targetLang);
                        ipaText = jsTextToIPA(text, detectedLang);
                    }
                }
                
                // Algılanan dili UI'da göster
                updateSourceLanguageUI(detectedLang);
            } catch (error) {
                console.error("API hatası:", error);
                showMessage("API bağlantısı sırasında bir hata oluştu. JavaScript kullanılıyor.");
                
                // API başarısız olursa JavaScript'e dön
                transliteratedText = jsTransliterate(text, sourceLang || 'en', targetLang);
                ipaText = jsTextToIPA(text, sourceLang || 'en');
            }
        } else {
            // JavaScript kullanılıyorsa
            transliteratedText = jsTransliterate(text, sourceLang || 'en', targetLang);
            ipaText = jsTextToIPA(text, sourceLang || 'en');
        }
        
        // Sonuçları döndür
        return { 
            transliteratedText: transliteratedText, 
            ipaText: ipaText 
        };
    }
    
    // Algılanan dili UI'da göster
    function updateSourceLanguageUI(detectedLang) {
        if (detectedLang) {
            const options = sourceLanguage.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value === detectedLang) {
                    sourceLanguage.selectedIndex = i;
                    break;
                }
            }
        }
    }
    
    // Google Translate API ile dil algılama
    async function detectLanguageWithGoogleApi(text) {
        try {
            const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${googleApiKeyValue}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    q: text
                })
            });
            
            if (!response.ok) {
                throw new Error(`Google API hatası: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.data && data.data.detections && data.data.detections.length > 0) {
                return data.data.detections[0][0].language;
            }
            
            return 'en'; // Varsayılan olarak İngilizce
        } catch (error) {
            console.error("Google API dil algılama hatası:", error);
            return 'en'; // Hata durumunda İngilizce
        }
    }
    
    // Google Translate API ile transliterasyon ve IPA
    async function fetchGoogleTranslationApi(text, sourceLang, targetLang) {
        try {
            // Google Translation API için URL
            const url = `https://translation.googleapis.com/language/translate/v2?key=${googleApiKeyValue}`;
            
            // Translation API isteği
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang,
                    target: targetLang,
                    format: 'text'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Google Translation API hatası: ${response.status}`);
            }
            
            const translationData = await response.json();
            
            // Transliteration API URL ve isteği (resmi olmayan, basit kullanım)
            const translitUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${sourceLang}&hl=en&dt=t&dt=bd&dj=1&source=input&q=${encodeURIComponent(text)}`;
            const translitResponse = await fetch(translitUrl);
            
            if (!translitResponse.ok) {
                throw new Error('Google Transliteration API yanıt vermedi');
            }
            
            const translitData = await translitResponse.json();
            
            // Sonuçları işle
            let transliteration = '';
            
            // Google API'den transliterasyonu çıkar
            if (translitData.sentences && translitData.sentences.length > 0) {
                // Genellikle trans veya translit alanında olur
                for (const sentence of translitData.sentences) {
                    if (sentence.translit) {
                        transliteration += sentence.translit + ' ';
                    }
                }
            }
            
            // Eğer transliterasyon yoksa çeviriyi kullan
            if (!transliteration && translationData.data && 
                translationData.data.translations && 
                translationData.data.translations.length > 0) {
                transliteration = translationData.data.translations[0].translatedText;
            }
            
            // IPA için özel bir endpoint olmadığından, JavaScript'i kullan
            const ipaText = jsTextToIPA(text, sourceLang);
            
            return {
                transliteration: transliteration.trim(),
                ipa: ipaText
            };
        } catch (error) {
            console.error('Google API hatası:', error);
            throw error;
        }
    }
    
    // Gemini API ile dil algılama
    async function detectLanguageWithGeminiApi(text, apiModel = 'gemini-pro') {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent`;
            const response = await fetch(`${url}?key=${geminiApiKeyValue}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Detect the language of the following text and respond with ONLY the 2-letter language code (en, fr, de, ja, tr, etc.). Nothing else. Text: "${text}"`
                        }]
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`Gemini API hatası: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.candidates && data.candidates.length > 0 && 
                data.candidates[0].content && data.candidates[0].content.parts && 
                data.candidates[0].content.parts.length > 0) {
                
                // Temizle ve sadece dil kodunu çıkar
                const langCode = data.candidates[0].content.parts[0].text.trim().toLowerCase();
                // İki karakterli bir dil kodu olduğundan emin ol
                if (langCode.length === 2) {
                    return langCode;
                }
            }
            
            return 'en'; // Varsayılan olarak İngilizce
        } catch (error) {
            console.error("Gemini API dil algılama hatası:", error);
            throw error; // Dışarıda yakalamak için hatayı fırlat
        }
    }
    
    // Gemini API ile transliterasyon ve IPA
    async function fetchGeminiApi(text, sourceLang, targetLang, apiModel = 'gemini-pro') {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent`;
            
            // Transliterasyon promptunu geliştirme
            let translitPrompt = "";
            
            if (sourceLang === 'fa') {
                // Farsça için özel prompt
                translitPrompt = `You are a Persian language expert specialized in transliteration.
                
I need you to transliterate the following Persian text to Latin script (as if reading/pronouncing it in Persian):
"${text}"

Rules:
1. Use only standard Latin characters with common diacritics
2. Preserve the pronunciation faithfully - vowels should be properly represented
3. Use 'aa' for long 'alef', 'ee' for long 'ye', and 'oo' for long 'vāv'
4. Do not include any explanations or notes
5. Provide only the transliterated text, nothing else
6. Make sure to match exactly how Google Translate would transliterate this text

Response:`;
            } else {
                // Diğer diller için genel prompt
                translitPrompt = `Transliterate the following ${getLanguageName(sourceLang)} text into Latin alphabet exactly as Google Translate would do it. 

Input: "${text}"

Rules:
1. Output ONLY the transliteration in Latin script
2. Follow standard transliteration conventions for ${getLanguageName(sourceLang)}
3. Preserve phonetic sounds as accurately as possible
4. Include all necessary diacritical marks
5. Do not add any explanations or comments

Transliteration:`;
            }
            
            // Transliterasyon için Gemini isteği
            const translitResponse = await fetch(`${url}?key=${geminiApiKeyValue}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: translitPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        topP: 0.8,
                        topK: 40
                    }
                })
            });
            
            if (!translitResponse.ok) {
                throw new Error(`Gemini API hatası: ${translitResponse.status}`);
            }
            
            const translitData = await translitResponse.json();
            
            // IPA prompt iyileştirmesi
            const ipaPrompt = `Convert the following ${getLanguageName(sourceLang)} text to accurate IPA (International Phonetic Alphabet) pronunciation.

Text: "${text}"

Rules:
1. Use proper IPA symbols
2. Respond with ONLY the IPA transcription
3. Use narrow transcription with appropriate diacritics
4. Be precise with phonemes specific to ${getLanguageName(sourceLang)}
5. Do not include any explanations or notes

IPA:`;
            
            // IPA için Gemini isteği
            const ipaResponse = await fetch(`${url}?key=${geminiApiKeyValue}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: ipaPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        topP: 0.8,
                        topK: 40
                    }
                })
            });
            
            if (!ipaResponse.ok) {
                throw new Error(`Gemini API IPA hatası: ${ipaResponse.status}`);
            }
            
            const ipaData = await ipaResponse.json();
            
            // Sonuçları işle
            let transliteration = '';
            let ipa = '';
            
            if (translitData.candidates && translitData.candidates.length > 0 && 
                translitData.candidates[0].content && translitData.candidates[0].content.parts && 
                translitData.candidates[0].content.parts.length > 0) {
                transliteration = translitData.candidates[0].content.parts[0].text.trim();
            }
            
            if (ipaData.candidates && ipaData.candidates.length > 0 && 
                ipaData.candidates[0].content && ipaData.candidates[0].content.parts && 
                ipaData.candidates[0].content.parts.length > 0) {
                ipa = ipaData.candidates[0].content.parts[0].text.trim();
            }
            
            return {
                transliteration: transliteration,
                ipa: ipa
            };
        } catch (error) {
            console.error('Gemini API hatası:', error);
            throw error;
        }
    }

    // API'den transliterasyon sonucu al
    async function fetchTransliteration(text, sourceLang, targetLang) {
        try {
            const response = await fetch(`${API_URL}/api/transliterate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    sourceLang: sourceLang,
                    targetLang: targetLang
                })
            });
            
            if (!response.ok) {
                throw new Error(`API hatası: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Transliterasyon API hatası:", error);
            throw error;
        }
    }
    
    // API'den IPA sonucu al
    async function fetchIPA(text, language) {
        try {
            const response = await fetch(`${API_URL}/api/ipa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    language: language
                })
            });
            
            if (!response.ok) {
                throw new Error(`API hatası: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("IPA API hatası:", error);
            throw error;
        }
    }
    
    // API'den dil tespiti yap
    async function detectLanguage(text) {
        try {
            const response = await fetch(`${API_URL}/api/detect-language`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text
                })
            });
            
            if (!response.ok) {
                throw new Error(`API hatası: ${response.status}`);
            }
            
            const data = await response.json();
            return data.detectedLanguage;
        } catch (error) {
            console.error("Dil algılama API hatası:", error);
            return 'en'; // Varsayılan olarak İngilizce
        }
    }

    // JavaScript ile transliterasyon (API kullanılmadığında)
    function jsTransliterate(text, sourceLang, targetLang) {
        // Özel dil çifti kontrolü
        const langPair = `${sourceLang}-${targetLang}`;
        
        if (transliterationRules[langPair]) {
            // Özel kural seti varsa kullan
            return customTransliterate(text, transliterationRules[langPair]);
        } else {
            // Kütüphane kullan (genel durumlar için)
            try {
                return transliterate(text);
            } catch (e) {
                console.error('Transliterasyon hatası:', e);
                return 'Dönüşüm sırasında hata oluştu. Lütfen farklı bir dil kombinasyonu deneyin.';
            }
        }
    }
    
    // JavaScript ile IPA dönüşümü (API kullanılmadığında)
    function jsTextToIPA(text, language) {
        if (ipaMap[language]) {
            return textToIPA(text, language);
        } else {
            // Varsayılan olarak basit transliterasyonu göster
            return "Bu dil için IPA desteği henüz eklenmedi.";
        }
    }

    // Özel transliterasyon fonksiyonu
    function customTransliterate(text, rules) {
        return text.split('').map(char => {
            const lower = char.toLowerCase();
            const isUpper = char !== lower;
            
            if (rules[lower]) {
                const result = rules[lower];
                // Büyük/küçük harf koruma
                return isUpper ? result.charAt(0).toUpperCase() + result.slice(1) : result;
            }
            
            return char;
        }).join('');
    }

    // Metin -> IPA dönüşüm fonksiyonu
    function textToIPA(text, language) {
        const map = ipaMap[language];
        let result = text.toLowerCase();
        
        // Çok karakterli transliterasyon için uzundan kısaya sırala
        const keys = Object.keys(map).sort((a, b) => b.length - a.length);
        
        for (const key of keys) {
            const regex = new RegExp(key, 'g');
            result = result.replace(regex, map[key]);
        }
        
        return result;
    }

    // Google Text-to-Speech API kullanarak metni seslendir
    function speakText(text, language) {
        // Parametreleri kontrol et
        if (!text || !language) {
            showMessage('Seslendirilecek metin veya dil bulunamadı.');
            return;
        }

        try {
            // TTS için dil kodunu uygun formata dönüştür
            const langCode = googleTtsLangMap[language] || language;
            
            // Google Translate TTS API URL'si
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(text)}`;
            
            // Ses kaynağını ayarla ve oynat
            audioSource.src = ttsUrl;
            audioSource.load();
            
            // Ses oynatmaya başla
            audioSource.play().then(() => {
                showMessage(`"${language}" dilinde sesli telaffuz oynatılıyor...`);
            }).catch(error => {
                console.error('Ses oynatma hatası:', error);
                showMessage('Ses oynatılırken bir hata oluştu.');
            });
        } catch (error) {
            console.error('TTS hatası:', error);
            showMessage('Sesli okuma sırasında bir hata oluştu.');
        }
    }

    // Metni Web Speech API ile seslendir (alternatif yöntem)
    function speakTextWithWebSpeech(text, language) {
        // Web Speech API desteğini kontrol et
        if (!('speechSynthesis' in window)) {
            showMessage('Tarayıcınız sesli okuma özelliğini desteklemiyor.');
            return;
        }

        // Seslendirme işlemi
        try {
            // Önceki seslendirmeleri durdur
            speechSynthesis.cancel();
            
            // Dil kodu dönüşümü
            const langCode = googleTtsLangMap[language] || language;
            
            // Yeni seslendirme oluştur
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = langCode;
            utterance.rate = 1; // Konuşma hızı
            utterance.pitch = 1; // Ses tonu
            
            // Seslendirmeyi başlat
            speechSynthesis.speak(utterance);
            
            // İşlem başladığında bildirim göster
            utterance.onstart = () => {
                showMessage(`"${language}" dilinde sesli telaffuz oynatılıyor...`);
            };
            
            // Hata durumunda
            utterance.onerror = (event) => {
                console.error('Seslendirme hatası:', event);
                showMessage('Seslendirme sırasında bir hata oluştu.');
            };
        } catch (error) {
            console.error('Web Speech API hatası:', error);
            showMessage('Sesli okuma sırasında bir hata oluştu.');
        }
    }

    // Kopyalama fonksiyonları
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        showMessage('Metin panoya kopyalandı!');
    }

    // Bildirim göster
    function showMessage(message, type = 'info') {
        // Varsa eski bildirimi kaldır
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Yeni bildirim oluştur
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.maxWidth = '350px';
        alertDiv.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.15)';
        
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Kapat"></button>
        `;
        
        // Sayfaya ekle
        document.body.appendChild(alertDiv);
        
        // Otomatik kapanma
        setTimeout(() => {
            if (alertDiv.parentNode) {
                // Bootstrap dismiss kullanarak kapat
                const bsAlert = new bootstrap.Alert(alertDiv);
                bsAlert.close();
            }
        }, 5000);
    }

    // Dilleri değiştir
    function swapLanguages() {
        const tempLang = sourceLanguage.value;
        sourceLanguage.value = targetLanguage.value;
        targetLanguage.value = tempLang;
    }

    // Event Listeners
    convertBtn.addEventListener('click', function() {
        console.log("Dönüştür butonuna tıklandı"); // Debug için log
        convertText();
    });
    
    copyTransliterated.addEventListener('click', function() {
        copyToClipboard(transliteratedOutput.textContent);
    });
    
    copyIpa.addEventListener('click', function() {
        copyToClipboard(ipaOutput.textContent);
    });
    
    swapLanguagesBtn.addEventListener('click', swapLanguages);
    
    // Enter tuşu ile dönüştürme
    sourceText.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            convertText();
        }
    });

    // Sesli okuma butonları
    speakTransliterated.addEventListener('click', function() {
        // İlk olarak Google TTS API'yi dene, başarısız olursa Web Speech API'yi kullan
        try {
            speakText(transliteratedOutput.textContent, targetLanguage.value);
        } catch (error) {
            console.warn('Google TTS API başarısız, Web Speech API kullanılıyor', error);
            speakTextWithWebSpeech(transliteratedOutput.textContent, targetLanguage.value);
        }
    });
    
    speakIpa.addEventListener('click', function() {
        try {
            // IPA metni seslendirilirken kaynak dili kullan
            speakText(sourceText.value, sourceLanguage.value);
        } catch (error) {
            console.warn('Google TTS API başarısız, Web Speech API kullanılıyor', error);
            speakTextWithWebSpeech(sourceText.value, sourceLanguage.value);
        }
    });

    // Kaynak metni seslendirme butonu
    speakSource.addEventListener('click', function() {
        const text = sourceText.value;
        if (!text.trim()) {
            showMessage('Lütfen seslendirilecek bir metin girin.');
            return;
        }
        
        // Dil seçilmemişse ve API kullanılıyorsa, dili tespit etmeye çalış
        if (!sourceLanguage.value && USE_API) {
            detectLanguage(text).then(detectedLang => {
                try {
                    speakText(text, detectedLang);
                    showMessage(`"${getLanguageName(detectedLang)}" dilinde sesli telaffuz oynatılıyor...`);
                } catch (error) {
                    console.warn('Google TTS API başarısız, Web Speech API kullanılıyor', error);
                    speakTextWithWebSpeech(text, detectedLang);
                }
            }).catch(error => {
                console.error('Dil tespiti başarısız:', error);
                speakText(text, 'en'); // Varsayılan olarak İngilizce
            });
        } else {
            // Dil seçilmişse doğrudan seslendir
            try {
                speakText(text, sourceLanguage.value || 'en');
            } catch (error) {
                console.warn('Google TTS API başarısız, Web Speech API kullanılıyor', error);
                speakTextWithWebSpeech(text, sourceLanguage.value || 'en');
            }
        }
    });

    // Başlangıçta dinleme butonlarını devre dışı bırak
    speakTransliterated.disabled = true;
    speakIpa.disabled = true;

    // API durumunu kontrol et
    if (USE_API) {
        checkApiStatus();
    }

    // API durumunu kontrol et
    async function checkApiStatus() {
        try {
            const response = await fetch(`${API_URL}/api/detect-language`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: 'test'
                })
            });
            
            if (response.ok) {
                console.log('Python API bağlantısı başarılı');
                showMessage('Python backend bağlantısı başarılı! Gelişmiş özellikler etkinleştirildi.');
                
                // Desteklenen dilleri al ve yazdır
                fetchSupportedLanguages();
            } else {
                console.warn('Python API yanıt döndü ama durumu başarısız:', response.status);
                showMessage('Python backend bağlantısı başarısız. JavaScript moduna geçiliyor...');
                // JavaScript moduna geç
                window.USE_API = false;
            }
        } catch (error) {
            console.error('Python API bağlantı hatası:', error);
            showMessage('Python backend bağlantısı başarısız. JavaScript moduna geçiliyor...');
            // JavaScript moduna geç
            window.USE_API = false;
        }
    }

    // Dil adını kod değerinden al
    function getLanguageName(langCode) {
        const languageNames = {
            'ar': 'Arapça',
            'ru': 'Rusça',
            'uk': 'Ukraynaca',
            'el': 'Yunanca',
            'fa': 'Farsça',
            'hi': 'Hintçe',
            'zh': 'Çince',
            'ja': 'Japonca',
            'ko': 'Korece',
            'tr': 'Türkçe',
            'en': 'İngilizce',
            'la': 'Latin'
        };
        
        return languageNames[langCode] || langCode;
    }

    // Google Translate kullanarak transliterasyon
    async function fetchGoogleTransliteration(text, sourceLang) {
        try {
            // Kaynak dili destekleyen Google API kodu
            const googleSourceLang = convertToGoogleLang(sourceLang);
            
            // Google Translate API URL - Resmi olmayan endpoint
            // Transliterasyon için özel bir parametre ekliyoruz: dt=rm (roman)
            const translitUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${googleSourceLang}&tl=en&dt=t&dt=rm&q=${encodeURIComponent(text)}`;
            
            const response = await fetch(translitUrl);
            if (!response.ok) {
                throw new Error('Google Translate API yanıt vermedi');
            }
            
            const data = await response.json();
            
            // Google transliteration sonucunu işle
            let transliteratedText = '';
            
            // Google Translate romanization formatı: 
            // data[0] çeviri sonuçlarını içerir, data[2] transliterasyon sonuçlarını içerir
            if (data && data[0] && Array.isArray(data[0])) {
                for (let i = 0; i < data[0].length; i++) {
                    if (data[0][i] && data[0][i][3]) {
                        transliteratedText += data[0][i][3] + ' ';
                    }
                }
                transliteratedText = transliteratedText.trim();
            }
            
            // Alternatif format kontrolü - API değişirse
            if (!transliteratedText && data && data[2]) {
                transliteratedText = data[2];
            }
            
            // Hala sonuç yoksa JSON verisiyle bir hata fırlat (debug için)
            if (!transliteratedText) {
                console.log("Google Translate API yanıtı:", data);
                // Çevirisini dönelim hiç değilse
                if (data && data[0] && Array.isArray(data[0])) {
                    for (let i = 0; i < data[0].length; i++) {
                        if (data[0][i] && data[0][i][0]) {
                            transliteratedText += data[0][i][0] + ' ';
                        }
                    }
                    transliteratedText = transliteratedText.trim();
                } else {
                    throw new Error('Transliterasyon verisi bulunamadı');
                }
            }
            
            return { text: transliteratedText };
        } catch (error) {
            console.error('Google Translate API hatası:', error);
            throw error;
        }
    }
    
    // Google Translate için dil kodunu dönüştür
    function convertToGoogleLang(langCode) {
        const langMap = {
            'ar': 'ar', // Arapça
            'ru': 'ru', // Rusça
            'el': 'el', // Yunanca
            'hi': 'hi', // Hintçe
            'zh': 'zh-CN', // Çince (Sadeleştirilmiş)
            'ja': 'ja', // Japonca
            'ko': 'ko', // Korece
            'tr': 'tr', // Türkçe
            'en': 'en', // İngilizce
            'fa': 'fa', // Farsça
            'uk': 'uk', // Ukraynaca
            'de': 'de', // Almanca
            'fr': 'fr', // Fransızca
            'es': 'es', // İspanyolca
            'it': 'it', // İtalyanca
            'pt': 'pt', // Portekizce
            'nl': 'nl', // Hollandaca
            'sv': 'sv', // İsveççe
            'pl': 'pl', // Lehçe
            'cs': 'cs', // Çekçe
            'hu': 'hu', // Macarca
            'ro': 'ro', // Romence
            'bg': 'bg', // Bulgarca
            'he': 'iw', // İbranice (Google'da 'iw' olarak geçer)
            'th': 'th', // Tayca
            'vi': 'vi',  // Vietnamca
            'la': 'la'   // Latince
        };
        
        return langMap[langCode] || 'en';
    }
    
    // Google Translate API için token oluştur (basit versiyon)
    function generateTk(text, lang) {
        // Basit bir tk değeri (gerçek Google API'si daha karmaşık bir algoritma kullanır)
        const now = Date.now();
        return Math.floor(now / 3600000) + Math.floor(text.length * 7);
    }

    // API anahtarı ve seçim işlemleri için event dinleyicileri
    
    // Google API anahtarını kaydet
    saveGoogleApi.addEventListener('click', function() {
        const apiKey = googleApiKey.value.trim();
        if (apiKey) {
            localStorage.setItem('googleApiKey', apiKey);
            googleApiKeyValue = apiKey;
            showMessage('Google API anahtarı kaydedildi.');
        } else {
            showMessage('Lütfen geçerli bir API anahtarı girin.');
        }
    });
    
    // Gemini API anahtarını kaydet
    saveGeminiApi.addEventListener('click', function() {
        const apiKey = geminiApiKey.value.trim();
        if (apiKey) {
            localStorage.setItem('geminiApiKey', apiKey);
            geminiApiKeyValue = apiKey;
            showMessage('Gemini API anahtarı kaydedildi.');
        } else {
            showMessage('Lütfen geçerli bir API anahtarı girin.');
        }
    });
    
    // API seçim değişikliğini dinle
    document.querySelectorAll('input[name="apiSelection"]').forEach(function(radio) {
        radio.addEventListener('change', function() {
            currentApiType = this.value;
            localStorage.setItem('apiType', currentApiType);
            
            // API tipine göre kontroller
            if (currentApiType === 'google' && !googleApiKeyValue) {
                showMessage('Google API seçildi, lütfen API anahtarınızı girin.');
            } else if (currentApiType === 'gemini' && !geminiApiKeyValue) {
                showMessage('Gemini API seçildi, lütfen API anahtarınızı girin.');
            } else {
                showMessage(`${getApiTypeName(currentApiType)} kullanılıyor.`);
            }
        });
    });
    
    // API tipini insan dostu formatta göster
    function getApiTypeName(apiType) {
        const apiTypeNames = {
            'local': 'Yerel API',
            'google': 'Google API',
            'gemini': 'Gemini API'
        };
        
        return apiTypeNames[apiType] || apiType;
    }
}); 
