from flask import Flask, request, jsonify
from flask_cors import CORS
import transliterate
import epitran
import re
import unicodedata
import langid
from langdetect import detect, DetectorFactory
import sys
import os
import pkg_resources

# Karakter kodlama hatalarını önlemek için
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Tutarlılık için
DetectorFactory.seed = 0

app = Flask(__name__)
CORS(app)  # CORS etkinleştirme (tarayıcıdan API çağrıları için)

# Epitran paketinin kurulu dil paketlerini kontrol et
def get_available_epitran_language_packs():
    try:
        # Epitran'ın veri yolu
        epitran_dir = os.path.dirname(pkg_resources.resource_filename('epitran', '__init__.py'))
        map_dir = os.path.join(epitran_dir, 'data', 'map')
        
        available_packs = set()
        if os.path.exists(map_dir):
            for filename in os.listdir(map_dir):
                if filename.endswith('.csv'):
                    # 'tur-Latn.csv' formatından 'tur-Latn' kod elde et
                    code = filename.replace('.csv', '')
                    available_packs.add(code)
        
        print(f"Kullanılabilir IPA dil paketleri: {available_packs}")
        return available_packs
    except Exception as e:
        print(f"Epitran dil paketleri kontrol edilirken hata: {str(e)}")
        return set()

# Başlangıçta kullanılabilir dil paketlerini kontrol et
AVAILABLE_IPA_PACKS = get_available_epitran_language_packs()

# Transliterasyon için dil haritaları
TRANSLITERATION_LANGS = {
    'ar': 'ar',  # Arapça
    'ru': 'ru',  # Rusça
    'el': 'el',  # Yunanca
    'hi': 'hi',  # Hintçe
    'zh': 'zh',  # Çince
    'ja': 'ja',  # Japonca
    'ko': 'ko',  # Korece
    'tr': 'tr',  # Türkçe
    'en': 'en',  # İngilizce
    'fa': 'fa',  # Farsça
    'uk': 'uk',  # Ukraynaca
    'de': 'de',  # Almanca
    'fr': 'fr',  # Fransızca
    'es': 'es',  # İspanyolca
    'it': 'it',  # İtalyanca
    'pt': 'pt',  # Portekizce
    'nl': 'nl',  # Hollandaca
    'sv': 'sv',  # İsveççe
    'pl': 'pl',  # Lehçe
    'cs': 'cs',  # Çekçe
    'hu': 'hu',  # Macarca
    'ro': 'ro',  # Romence
    'bg': 'bg',  # Bulgarca
    'he': 'he',  # İbranice
    'th': 'th',  # Tayca
    'vi': 'vi'   # Vietnamca
}

# IPA dönüşümü için epitran dil haritaları
IPA_LANGS = {
    'ar': 'ara-Arab',
    'ru': 'rus-Cyrl',
    'el': 'ell-Grek',
    'hi': 'hin-Deva',
    'tr': 'tur-Latn',
    'en': 'eng-Latn',
    'fa': 'fas-Arab', # Farsça
    'uk': 'ukr-Cyrl',  # Ukraynaca
    'de': 'deu-Latn',  # Almanca
    'fr': 'fra-Latn',  # Fransızca 
    'es': 'spa-Latn',  # İspanyolca
    'it': 'ita-Latn',  # İtalyanca
    'pt': 'por-Latn',  # Portekizce
}

# IPA için alternatif temel haritalar (epitran paketi eksikse)
BASIC_IPA_MAP = {
    # Türkçe için IPA mapping
    'tr': {
        'a': 'a', 'e': 'e', 'i': 'i', 'ı': 'ɯ', 'o': 'o', 'ö': 'ø', 
        'u': 'u', 'ü': 'y', 'c': 'dʒ', 'ç': 'tʃ', 'ğ': 'ː', 'ş': 'ʃ'
    },
    # İngilizce için IPA mapping
    'en': {
        'a': 'æ', 'e': 'ɛ', 'i': 'ɪ', 'o': 'ɒ', 'u': 'ʌ',
        'ah': 'ɑ', 'ee': 'i', 'oo': 'u', 'th': 'θ', 'sh': 'ʃ',
        'ch': 'tʃ', 'j': 'dʒ', 'ng': 'ŋ', 'zh': 'ʒ'
    },
    # Rusça için IPA mapping
    'ru': {
        'а': 'a', 'е': 'je', 'и': 'i', 'о': 'o', 'у': 'u', 'ы': 'ɨ',
        'э': 'e', 'ю': 'ju', 'я': 'ja', 'б': 'b', 'в': 'v', 'г': 'g',
        'д': 'd', 'ж': 'ʐ', 'з': 'z', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'ф': 'f',
        'х': 'x', 'ц': 'ts', 'ч': 'tɕ', 'ш': 'ʂ', 'щ': 'ɕɕ'
    },
}

# Özel transliterasyon kuralları
CUSTOM_RULES = {
    'ar-la': {
        'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h',
        'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's',
        'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': '\'',
        'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm',
        'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ة': 'a', 'ء': '\''
    },
    # Farsça -> Latin
    'fa-la': {
        'ا': 'a', 'آ': 'ā', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's',
        'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z',
        'ر': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's',
        'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': '\'', 'غ': 'gh', 'ف': 'f',
        'ق': 'q', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n',
        'و': 'v', 'ه': 'h', 'ی': 'y', 'ء': '\'', 'ئ': '\'', 'ة': 'e'
    },
    # Ukraynaca -> Latin
    'uk-la': {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd',
        'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i',
        'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
        'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ь': '', 'ю': 'yu', 'я': 'ya', 'ʼ': ''
    }
}

def transliterate_text(text, source_lang, target_lang):
    """Metni translitere eder"""
    # Desteklenen diller kontrol edilir
    if source_lang not in TRANSLITERATION_LANGS:
        return f"Kaynak dil ({source_lang}) desteklenmiyor"
    
    # Özel kural seti var mı kontrol edilir
    lang_pair = f"{source_lang}-{target_lang}"
    if lang_pair in CUSTOM_RULES:
        return custom_transliterate(text, CUSTOM_RULES[lang_pair])
    
    # Genel transliterasyon kütüphanesi kullanılır
    try:
        if source_lang in ['ar', 'ru', 'el', 'uk']:
            try:
                # Dil paketi kontrolü
                transliterate.get_available_language_codes()
                # Transliterasyon işlemi
                return transliterate.translit(text, source_lang, reversed=True)
            except Exception as e:
                if "Language pack for code" in str(e):
                    print(f"Transliterasyon dil paketi bulunamadı: {str(e)}")
                    # Özel kural var mı kontrol et
                    if f"{source_lang}-la" in CUSTOM_RULES:
                        return custom_transliterate(text, CUSTOM_RULES[f"{source_lang}-la"])
                    else:
                        # Basit transliterasyon kullan
                        return ''.join([c for c in unicodedata.normalize('NFKD', text) if not unicodedata.combining(c)])
                else:
                    raise e
        elif source_lang == 'fa':
            # Farsça için özel transliterasyon
            return custom_transliterate(text, CUSTOM_RULES['fa-la'])
        else:
            # Genel transliterasyon
            return ''.join([c for c in unicodedata.normalize('NFKD', text) if not unicodedata.combining(c)])
    except Exception as e:
        print(f"Transliterasyon hatası: {str(e)}")
        # Basit transliterasyon kullan
        return ''.join([c for c in unicodedata.normalize('NFKD', text) if not unicodedata.combining(c)])

def text_to_ipa(text, language):
    """Metni IPA formatına dönüştürür"""
    if language not in IPA_LANGS:
        return f"Bu dil ({language}) için IPA desteği henüz eklenmedi"
    
    ipa_code = IPA_LANGS[language]
    
    # Dil paketi kullanılabilir mi kontrol et
    if ipa_code not in AVAILABLE_IPA_PACKS:
        print(f"'{ipa_code}' için epitran dil paketi bulunamadı. Basit IPA kullanılacak.")
        return simple_text_to_ipa(text, language)
    
    try:
        # Epitran ile IPA dönüşümü dene
        epi = epitran.Epitran(ipa_code)
        
        # charmap codec hatalarını önlemek için karakter karakter dönüştür
        result = []
        for char in text:
            try:
                if char.strip():  # Boş olmayan karakterler
                    ipa_char = epi.transliterate(char)
                    result.append(ipa_char)
                else:
                    result.append(char)  # Boşluk ve diğer whitespace karakterleri
            except UnicodeEncodeError:
                # Problematik karakteri atla
                result.append(char)
            except Exception as e:
                # Diğer hatalar için orijinal karakteri kullan
                result.append(char)
                print(f"IPA dönüşüm hatası (karakter: '{char}'): {str(e)}")
        
        return ''.join(result)
    except Exception as e:
        print(f"Epitran ile IPA dönüşüm hatası: {str(e)}")
        return simple_text_to_ipa(text, language)

def simple_text_to_ipa(text, language):
    """Basit IPA dönüşümü - epitran kullanılamadığında"""
    if language in BASIC_IPA_MAP:
        # Basit karakter eşleştirme kullan
        result = text.lower()
        for char, ipa in sorted(BASIC_IPA_MAP[language].items(), key=lambda x: len(x[0]), reverse=True):
            result = result.replace(char, ipa)
        return result
    else:
        return f"Bu dil ({language}) için basit IPA desteği bulunmuyor"

def custom_transliterate(text, rules):
    """Özel kurallar ile transliterasyon yapar"""
    result = []
    for char in text:
        lower_char = char.lower()
        if lower_char in rules:
            # Büyük-küçük harf korunur
            if char != lower_char:
                result.append(rules[lower_char].capitalize())
            else:
                result.append(rules[lower_char])
        else:
            result.append(char)
    return ''.join(result)

@app.route('/api/transliterate', methods=['POST'])
def transliterate_api():
    """Transliterasyon API endpoint'i"""
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({'error': 'Eksik parametreler'}), 400
    
    text = data['text']
    
    # Kaynak ve hedef dil bilgisi kontrolü
    source_lang = data.get('sourceLang', '')
    target_lang = data.get('targetLang', 'la')  # Varsayılan hedef: Latin
    
    # Eğer kaynak dil belirtilmemişse otomatik algıla
    if not source_lang:
        source_lang = detect_language_text(text)
    
    result = transliterate_text(text, source_lang, target_lang)
    
    return jsonify({
        'transliteratedText': result,
        'detectedLanguage': source_lang
    })

@app.route('/api/ipa', methods=['POST'])
def ipa_api():
    """IPA dönüşüm API endpoint'i"""
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({'error': 'Eksik parametreler'}), 400
    
    text = data['text']
    
    # Dil bilgisi kontrolü
    language = data.get('language', '')
    
    # Eğer dil belirtilmemişse otomatik algıla
    if not language:
        language = detect_language_text(text)
    
    result = text_to_ipa(text, language)
    
    return jsonify({
        'ipaText': result,
        'detectedLanguage': language
    })

def detect_language_text(text):
    """Metin dilini tespit etme (gelişmiş)"""
    # Metnin uzunluğunu kontrol et
    if not text or len(text) < 3:
        return 'en'  # Varsayılan olarak İngilizce
    
    detected_lang = 'en'  # Varsayılan dil
    
    # Karakter tabanlı tespitle başla
    # Arapça/Farsça karakterler kontrol edilir
    if re.search(r'[\u0600-\u06FF]', text):
        # Farsça özel karakterleri kontrol et (پ چ ژ گ)
        if re.search(r'[پچژگ]', text):
            detected_lang = 'fa'  # Farsça
        else:
            detected_lang = 'ar'  # Arapça
    # Kiril karakterler kontrol edilir
    elif re.search(r'[\u0400-\u04FF]', text):
        # Ukraynaca özel karakterleri kontrol et (є і ї ґ)
        if re.search(r'[єіїґ]', text):
            detected_lang = 'uk'  # Ukraynaca
        else:
            detected_lang = 'ru'  # Rusça
    # Yunanca karakterler kontrol edilir
    elif re.search(r'[\u0370-\u03FF]', text):
        detected_lang = 'el'
    # Türkçe karakterler kontrol edilir
    elif re.search(r'[ğüşıöçĞÜŞİÖÇ]', text):
        detected_lang = 'tr'
    else:
        # İstatistiksel dil tespiti kullan
        try:
            # langid.py ve langdetect'i kullanarak dil tespiti
            langid_result = langid.classify(text)[0]
            langdetect_result = detect(text)
            
            # İki sonucu karşılaştır
            if langid_result == langdetect_result and langid_result in TRANSLITERATION_LANGS:
                detected_lang = langid_result
            elif langid_result in TRANSLITERATION_LANGS:
                detected_lang = langid_result
            elif langdetect_result in TRANSLITERATION_LANGS:
                detected_lang = langdetect_result
        except Exception:
            # Hata durumunda karakter bazlı tespite dön
            pass
    
    # Desteklenen dil listesinde kontrol et
    if detected_lang not in TRANSLITERATION_LANGS:
        detected_lang = 'en'  # Desteklenmiyorsa İngilizce'ye dön
    
    return detected_lang

@app.route('/api/detect-language', methods=['POST'])
def detect_language():
    """Metin dilini tespit etme API endpoint'i"""
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({'error': 'Eksik parametreler'}), 400
    
    text = data['text']
    detected_lang = detect_language_text(text)
    
    return jsonify({
        'detectedLanguage': detected_lang
    })

@app.route('/api/supported-languages', methods=['GET'])
def supported_languages():
    """Desteklenen dilleri döndüren API endpoint'i"""
    return jsonify({
        'transliterationLanguages': list(TRANSLITERATION_LANGS.keys()),
        'ipaLanguages': list(IPA_LANGS.keys())
    })

if __name__ == '__main__':
    app.run(debug=True) 