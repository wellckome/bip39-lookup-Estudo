// ========================================
// BIP39 Lookup - Main Script
// ========================================

// DOM Elements
const searchInput = document.getElementById('searchInput');
const autocomplete = document.getElementById('autocomplete');
const suggestionList = document.getElementById('suggestionList');
const suggestionCount = document.getElementById('suggestionCount');
const resultContainer = document.getElementById('resultContainer');

// State
let suggestions = [];
let selectedIndex = -1;

// ========================================
// Utility Functions
// ========================================

// Normalize string (remove spaces, accents, lowercase)
function normalizeString(str) {
    return str
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Calculate Levenshtein distance for suggestions
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    
    return dp[m][n];
}

// ========================================
// Validation Functions
// ========================================

function validateNumber(num) {
    const parsed = parseInt(num, 10);
    
    if (isNaN(parsed)) {
        return { valid: false, error: 'Valor inválido', hint: 'Digite um número inteiro' };
    }
    
    if (parsed < 1) {
        return { 
            valid: false, 
            error: `Número muito baixo: ${parsed}`,
            hint: 'O número mínimo é 1'
        };
    }
    
    if (parsed > 2048) {
        return { 
            valid: false, 
            error: `Número muito alto: ${parsed}`,
            hint: `O número máximo é 2048. Você digitou ${parsed - 2048} a mais.`
        };
    }
    
    return { valid: true, number: parsed };
}

// ========================================
// Search Functions
// ========================================

function getWordByNumber(num) {
    const validation = validateNumber(num);
    
    if (!validation.valid) {
        return { error: validation };
    }
    
    const index = validation.number - 1;
    return { 
        success: true,
        word: BIP39_WORDS[index], 
        number: validation.number 
    };
}

function getNumberByWord(word) {
    const normalizedInput = normalizeString(word);
    const originalInput = word.trim();
    
    if (!normalizedInput) {
        return { 
            error: { 
                error: 'Entrada vazia',
                hint: 'Digite uma palavra para pesquisar'
            }
        };
    }
    
    // Exact match (normalized)
    const exactIndex = BIP39_WORDS.findIndex(w => normalizeString(w) === normalizedInput);
    
    if (exactIndex !== -1) {
        const foundWord = BIP39_WORDS[exactIndex];
        const wasNormalized = foundWord !== originalInput.toLowerCase();
        
        return { 
            success: true,
            word: foundWord, 
            number: exactIndex + 1,
            originalQuery: wasNormalized ? originalInput : null,
            normalized: wasNormalized
        };
    }
    
    // Find similar words for suggestions
    const similarWords = BIP39_WORDS.filter(w => {
        const normalizedWord = normalizeString(w);
        if (normalizedWord.startsWith(normalizedInput)) return true;
        if (normalizedInput.startsWith(normalizedWord)) return true;
        if (Math.abs(normalizedWord.length - normalizedInput.length) <= 2) {
            const distance = levenshteinDistance(normalizedWord, normalizedInput);
            return distance <= 2;
        }
        return false;
    }).slice(0, 5);
    
    return { 
        error: { 
            error: `Palavra não encontrada: "${originalInput}"`,
            hint: similarWords.length > 0 
                ? `Você quis dizer: ${similarWords.join(', ')}?`
                : 'Verifique a ortografia ou digite um número de 1 a 2048'
        }
    };
}

function searchBip39(query) {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
        return { 
            error: { 
                error: 'Campo vazio',
                hint: 'Digite um número (1-2048) ou uma palavra BIP39'
            }
        };
    }
    
    // Check if it's a number
    const cleanNumber = trimmedQuery.replace(/\s/g, '');
    if (/^\d+$/.test(cleanNumber)) {
        return getWordByNumber(cleanNumber);
    }
    
    // Check for mixed input
    if (/^\d+/.test(trimmedQuery) && /[a-zA-Z]/.test(trimmedQuery)) {
        return {
            error: {
                error: 'Formato inválido',
                hint: 'Digite apenas um número OU apenas uma palavra, não misture'
            }
        };
    }
    
    // Search as word
    return getNumberByWord(trimmedQuery);
}

// ========================================
// Autocomplete Functions
// ========================================

function generateSuggestions(value) {
    const trimmedValue = value.trim().toLowerCase();
    
    if (!trimmedValue || /^\d+$/.test(trimmedValue) || trimmedValue.length < 1) {
        return [];
    }
    
    // Words starting with input
    const startsWithMatches = BIP39_WORDS.filter(word => 
        word.startsWith(trimmedValue)
    );
    
    // Words containing input
    const containsMatches = BIP39_WORDS.filter(word => 
        !word.startsWith(trimmedValue) && word.includes(trimmedValue)
    );
    
    return [...startsWithMatches, ...containsMatches].slice(0, 8);
}

function highlightMatch(word, query) {
    const lowerWord = word.toLowerCase();
    const lowerQuery = query.trim().toLowerCase();
    const index = lowerWord.indexOf(lowerQuery);
    
    if (index === -1) return word;
    
    return word.slice(0, index) + 
           '<span class="highlight">' + word.slice(index, index + lowerQuery.length) + '</span>' + 
           word.slice(index + lowerQuery.length);
}

function renderSuggestions() {
    if (suggestions.length === 0) {
        autocomplete.classList.add('hidden');
        return;
    }
    
    suggestionCount.textContent = `${suggestions.length} sugestão${suggestions.length !== 1 ? 'ões' : ''}`;
    
    suggestionList.innerHTML = suggestions.map((word, index) => {
        const wordIndex = BIP39_WORDS.indexOf(word) + 1;
        return `
            <li class="suggestion-item ${index === selectedIndex ? 'selected' : ''}" data-index="${index}" data-word="${word}">
                <span class="suggestion-word">${highlightMatch(word, searchInput.value)}</span>
                <span class="suggestion-number">#${wordIndex}</span>
            </li>
        `;
    }).join('');
    
    autocomplete.classList.remove('hidden');
    
    // Add click handlers
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            selectSuggestion(item.dataset.word);
        });
    });
}

function selectSuggestion(word) {
    const result = searchBip39(word);
    if (result.success) {
        renderResult(result);
    }
    searchInput.value = '';
    suggestions = [];
    selectedIndex = -1;
    autocomplete.classList.add('hidden');
    searchInput.focus();
}

function hideSuggestions() {
    autocomplete.classList.add('hidden');
    selectedIndex = -1;
}

// ========================================
// Render Functions
// ========================================

function renderResult(result, warning = null) {
    let html = '';
    
    if (warning) {
        html += `
            <div class="warning-display">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <path d="M12 9v4"/>
                    <path d="M12 17h.01"/>
                </svg>
                <p>${warning}</p>
            </div>
        `;
    }
    
    html += `
        <div class="result-display">
            <div class="result-glow"></div>
            <div class="result-card">
                <div class="result-grid">
                    <div class="result-item">
                        <div class="result-label">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
                                <path d="M20 15v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4"/>
                                <path d="M12 3v18"/>
                            </svg>
                            <span>Número</span>
                        </div>
                        <div class="result-value">
                            <span class="result-number">${result.number}</span>
                        </div>
                        <p class="result-meta">de 2048</p>
                    </div>
                    <div class="result-item">
                        <div class="result-label">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="4 7 4 4 20 4 20 7"/>
                                <line x1="9" x2="15" y1="20" y2="20"/>
                                <line x1="12" x2="12" y1="4" y2="20"/>
                            </svg>
                            <span>Palavra</span>
                        </div>
                        <div class="result-value">
                            <span class="result-word">${result.word}</span>
                        </div>
                        <p class="result-meta">${result.word.length} caracteres</p>
                    </div>
                </div>
                ${result.originalQuery && result.originalQuery !== result.word ? `
                    <div class="result-normalized">
                        <p>
                            Pesquisado: <span class="original">"${result.originalQuery}"</span>
                            <span style="margin: 0 0.5rem;">→</span>
                            Encontrado: <span class="found">${result.word}</span>
                        </p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    resultContainer.innerHTML = html;
}

function renderError(error) {
    resultContainer.innerHTML = `
        <div class="error-display">
            <div class="error-content">
                <div class="error-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" x2="12" y1="8" y2="12"/>
                        <line x1="12" x2="12.01" y1="16" y2="16"/>
                    </svg>
                </div>
                <div class="error-text">
                    <h3>Erro na pesquisa</h3>
                    <p>${error.error}</p>
                    ${error.hint ? `
                        <p class="error-hint">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 16v-4"/>
                                <path d="M12 8h.01"/>
                            </svg>
                            ${error.hint}
                        </p>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// ========================================
// Event Handlers
// ========================================

function handleSearch() {
    const query = searchInput.value;
    const result = searchBip39(query);
    
    if (result.error) {
        renderError(result.error);
    } else if (result.success) {
        const warning = result.normalized 
            ? `Entrada normalizada: "${result.originalQuery}" → "${result.word}"`
            : null;
        renderResult(result, warning);
    }
    
    searchInput.value = '';
    hideSuggestions();
    searchInput.focus();
}

function handleInput() {
    const value = searchInput.value;
    suggestions = generateSuggestions(value);
    selectedIndex = -1;
    renderSuggestions();
}

function handleKeyDown(e) {
    if (suggestions.length > 0 && !autocomplete.classList.contains('hidden')) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0;
                renderSuggestions();
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1;
                renderSuggestions();
                break;
            case 'Tab':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    selectSuggestion(suggestions[selectedIndex]);
                } else if (suggestions.length > 0) {
                    selectSuggestion(suggestions[0]);
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    selectSuggestion(suggestions[selectedIndex]);
                } else {
                    hideSuggestions();
                    handleSearch();
                }
                break;
            case 'Escape':
                hideSuggestions();
                break;
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
    }
}

// ========================================
// Initialize
// ========================================

searchInput.addEventListener('input', handleInput);
searchInput.addEventListener('keydown', handleKeyDown);
searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim() && suggestions.length > 0) {
        renderSuggestions();
    }
});

document.addEventListener('click', (e) => {
    if (!autocomplete.contains(e.target) && e.target !== searchInput) {
        hideSuggestions();
    }
});

// Focus on load
searchInput.focus();