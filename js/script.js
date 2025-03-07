"use strict";

let speechSynth = window.speechSynthesis;
    let utterance = null;
    let isPaused = false;
    let lastReadPosition = 0;
    const TEXT_STORAGE_KEY = 'ttsReaderText';
    const POSITION_STORAGE_KEY = 'ttsReaderPosition';
    const VOICE_STORAGE_KEY = 'ttsReaderVoice';
    const SPEED_STORAGE_KEY = 'ttsReaderSpeed';
    const PAUSED_STORAGE_KEY = 'ttsReaderPaused';

    // Fonction pour sauvegarder l'état actuel
    function saveCurrentState() {
        const textArea = document.getElementById('text-area');
        const voiceSelect = document.getElementById('voice-select');
        const speedSelect = document.getElementById('speed');

        // Sauvegarder le texte actuel
        localStorage.setItem(TEXT_STORAGE_KEY, textArea.value);

        // Sauvegarder la position approximative
        localStorage.setItem(POSITION_STORAGE_KEY, lastReadPosition.toString());

        // Sauvegarder l'état de pause
        localStorage.setItem(PAUSED_STORAGE_KEY, isPaused.toString());

        // Sauvegarder les préférences utilisateur
        if (voiceSelect.value) {
            localStorage.setItem(VOICE_STORAGE_KEY, voiceSelect.value);
        }

        if (speedSelect.value) {
            localStorage.setItem(SPEED_STORAGE_KEY, speedSelect.value);
        }
    }

    function isMobileDevice() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    function populateVoiceList() {
        const voiceSelect = document.getElementById('voice-select');
        voiceSelect.innerHTML = '';
        const voices = speechSynth.getVoices();

        // Déterminer si nous sommes sur un appareil mobile
        const isMobile = isMobileDevice();

        // Voix spécifiques pour smartphone
        const specificVoices = {
            french: "Thomas", // Voix française
            english: "Daniel", // Voix anglaise
            dutch: "Xander"   // Voix néerlandaise
        };

        if (isMobile) {
            // Sur smartphone, uniquement les 3 voix spécifiques
            const priorityVoicesMap = new Map();
            
            // Chercher les voix spécifiques
            voices.forEach(voice => {
                // Recherche de Thomas (français)
                if (voice.name.includes(specificVoices.french) && voice.lang.includes('fr')) {
                    priorityVoicesMap.set(voice.name, {
                        voice: voice,
                        priority: 1,
                        label: `${voice.name} (FR)`
                    });
                }
                // Recherche de Daniel (anglais)
                else if (voice.name.includes(specificVoices.english) && voice.lang.includes('en')) {
                    priorityVoicesMap.set(voice.name, {
                        voice: voice,
                        priority: 2,
                        label: `${voice.name} (GB)`
                    });
                }
                // Recherche de Xander (néerlandais)
                else if (voice.name.includes(specificVoices.dutch) && voice.lang.includes('nl')) {
                    priorityVoicesMap.set(voice.name, {
                        voice: voice,
                        priority: 3,
                        label: `${voice.name} (NL)`
                    });
                }
            });

            // Convertir la Map en array et trier par priorité
            const priorityVoices = Array.from(priorityVoicesMap.values())
                .sort((a, b) => a.priority - b.priority);

            // Ajouter les voix au sélecteur
            priorityVoices.forEach((voiceInfo) => {
                const option = document.createElement('option');
                option.textContent = voiceInfo.label;
                option.value = voices.indexOf(voiceInfo.voice);
                voiceSelect.appendChild(option);
            });

            // Si aucune des voix spécifiques n'a été trouvée, ajouter un message
            if (voiceSelect.options.length === 0) {
                const option = document.createElement('option');
                option.textContent = "Aucune voix spécifique disponible";
                option.value = -1;
                voiceSelect.appendChild(option);
                console.warn("Aucune des voix spécifiques n'a été trouvée");
            }
        } else {
            // Pour PC et tablette, garder le comportement original
            // Filtrer les voix par langue d'intérêt
            const frenchVoices = voices.filter(voice => voice.lang.includes('fr'));
            const dutchVoices = voices.filter(voice => 
                voice.lang.includes('nl-NL') || 
                voice.lang.startsWith('nl')
            );
            const flemishVoices = voices.filter(voice => voice.lang.includes('nl-BE'));

            // Combiner toutes les voix d'intérêt, en évitant les doublons
            const priorityVoicesMap = new Map();

            // Fonction pour simplifier les noms de voix
            function simplifyVoiceName(name, lang) {
                // Supprimer "Microsoft" et autres préfixes de fournisseurs
                let simplified = name.replace("Microsoft ", "");
                // Supprimer les suffixes spécifiques à la langue
                simplified = simplified.replace(/ - French.*$/, "");
                simplified = simplified.replace(/ - English.*$/, "");
                simplified = simplified.replace(/ - Dutch.*$/, "");
                simplified = simplified.replace(/ - Flemish.*$/, "");
                // Pour les autres langues, juste supprimer tout après un tiret
                simplified = simplified.replace(/ -.*$/, "");
                
                return simplified;
            }

            // Fonction pour obtenir le code de langue court
            function getShortLangCode(langCode) {
                if (langCode.includes('fr')) return "FR";
                if (langCode.includes('nl-BE')) return "BE";
                if (langCode.includes('nl')) return "NL";
                if (langCode.includes('en')) return "EN";
                // Retourner les deux premiers caractères en majuscule pour les autres langues
                return langCode.substring(0, 2).toUpperCase();
            }

            // Ajouter les voix françaises d'abord
            frenchVoices.forEach(voice => {
                if (!priorityVoicesMap.has(voice.name)) {
                    priorityVoicesMap.set(voice.name, {
                        voice: voice,
                        priority: 1,
                        label: `${simplifyVoiceName(voice.name, voice.lang)} (${getShortLangCode(voice.lang)})`
                    });
                }
            });

            // Ajouter les voix flamandes ensuite
            flemishVoices.forEach(voice => {
                if (!priorityVoicesMap.has(voice.name)) {
                    priorityVoicesMap.set(voice.name, {
                        voice: voice,
                        priority: 2,
                        label: `${simplifyVoiceName(voice.name, voice.lang)} (${getShortLangCode(voice.lang)})`
                    });
                }
            });

            // Ajouter les voix néerlandaises ensuite
            dutchVoices.forEach(voice => {
                // Éviter de dupliquer les voix flamandes qui sont déjà dans la liste
                if (!priorityVoicesMap.has(voice.name)) {
                    priorityVoicesMap.set(voice.name, {
                        voice: voice,
                        priority: 3,
                        label: `${simplifyVoiceName(voice.name, voice.lang)} (${getShortLangCode(voice.lang)})`
                    });
                }
            });

            // Ajouter les autres voix ensuite
            voices.forEach(voice => {
                // Ne pas inclure les voix Google et éviter les duplications
                if (!voice.name.includes('Google') && !priorityVoicesMap.has(voice.name)) {
                    priorityVoicesMap.set(voice.name, {
                        voice: voice,
                        priority: 4,
                        label: `${simplifyVoiceName(voice.name, voice.lang)} (${getShortLangCode(voice.lang)})`
                    });
                }
            });

            // Convertir la Map en array, trier par priorité et ajouter au sélecteur
            const priorityVoices = Array.from(priorityVoicesMap.values())
                .sort((a, b) => a.priority - b.priority);

            // Ajouter les voix au sélecteur
            priorityVoices.forEach((voiceInfo) => {
                const option = document.createElement('option');
                option.textContent = voiceInfo.label;
                option.value = voices.indexOf(voiceInfo.voice);
                voiceSelect.appendChild(option);
            });

            // S'il n'y a aucune voix dans la liste, ajouter un message
            if (voiceSelect.options.length === 0) {
                const option = document.createElement('option');
                option.textContent = "Aucune voix disponible";
                option.value = -1;
                voiceSelect.appendChild(option);
                console.warn("Aucune voix n'a été trouvée dans le navigateur");
            }
        }

        // Restaurer la voix précédemment sélectionnée si disponible
        const savedVoice = localStorage.getItem(VOICE_STORAGE_KEY);
        if (savedVoice && voiceSelect.options.length > 0) {
            // Vérifier si la voix sauvegardée existe toujours
            for (let i = 0; i < voiceSelect.options.length; i++) {
                if (voiceSelect.options[i].value === savedVoice) {
                    voiceSelect.selectedIndex = i;
                    break;
                }
            }
            
            // Si la voix n'a pas été trouvée, sélectionner la première option
            if (!voiceSelect.selectedIndex && voiceSelect.options.length > 0) {
                voiceSelect.selectedIndex = 0;
            }
        } else if (voiceSelect.options.length > 0) {
            voiceSelect.selectedIndex = 0;
        }
    }

    // Initialiser la liste des voix dès que possible
    if (speechSynth.onvoiceschanged !== undefined) {
        speechSynth.onvoiceschanged = populateVoiceList;
    } else {
        // Fallback pour certains navigateurs
        setTimeout(populateVoiceList, 500);
    }

    // Gestion du fichier
    const fileButton = document.getElementById('file-button');
    const fileInput = document.getElementById('fileInput');
    const textArea = document.getElementById('text-area');

    fileButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', handleFileSelect);

    function handleFileSelect(e) {
        const file = e.target.files[0];
        readFile(file);
    }

    function readFile(file) {
        if (file && file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                textArea.value = e.target.result;
                // Réinitialiser la position car c'est un nouveau texte
                lastReadPosition = 0;
                isPaused = false;
                saveCurrentState();
                updatePlayButton();
            };
            reader.readAsText(file);
        } else {
            alert('Veuillez sélectionner un fichier texte (.txt)');
        }
    }

    // Fonction pour effacer le contenu
    document.getElementById('clear-button').addEventListener('click', () => {
        textArea.value = '';
        stopSpeech();
        lastReadPosition = 0;
        isPaused = false;
        saveCurrentState();
        updatePlayButton();
    });

    // Fonction pour coller le contenu du presse-papiers
    document.getElementById('paste-button').addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            textArea.value = text;
            // Réinitialiser la position car c'est un nouveau texte
            lastReadPosition = 0;
            isPaused = false;
            saveCurrentState();
            updatePlayButton();
        } catch (err) {
            alert('Impossible d\'accéder au presse-papiers. Veuillez vérifier les permissions de votre navigateur.');
            console.error('Erreur lors de la lecture du presse-papiers:', err);
        }
    });

    // Fonction pour arrêter complètement la synthèse vocale
    function stopSpeech() {
        if (speechSynth.speaking) {
            speechSynth.cancel();
        }
        isPaused = false;
        updatePlayButton();
    }

    // Mettre à jour le libellé du bouton Play
    function updatePlayButton() {
        const playBtn = document.getElementById('play-button');

        if (isPaused) {
            playBtn.innerHTML = '▶ Reprendre';
        } else if (lastReadPosition > 0) {
            playBtn.innerHTML = '▶ Continuer';
        } else {
            playBtn.innerHTML = '▶ Lire';
        }
    }

    // Contrôles de lecture
    document.getElementById('play-button').addEventListener('click', () => {
        // Si on est en pause après rechargement de la page, traiter spécialement
        if (isPaused && !speechSynth.speaking) {
            // Créer une nouvelle utterance à partir de la position sauvegardée
            const text = document.getElementById('text-area').value.trim();
            if (text && lastReadPosition > 0 && lastReadPosition < text.length) {
                const textToRead = text.substring(lastReadPosition);
                utterance = new SpeechSynthesisUtterance(textToRead);
                
                const selectedVoice = document.getElementById('voice-select').value;
                const voices = speechSynth.getVoices();
                if (selectedVoice >= 0 && selectedVoice < voices.length) {
                    utterance.voice = voices[selectedVoice];
                }
                utterance.rate = parseFloat(document.getElementById('speed').value);
                
                // Définir la langue en fonction de la voix sélectionnée
                if (utterance.voice) {
                    utterance.lang = utterance.voice.lang;
                } else {
                    utterance.lang = 'fr-FR';
                }
                
                // Utiliser l'événement onboundary pour suivre la position
                utterance.onboundary = function(event) {
                    if (event.name === 'word' || event.name === 'sentence') {
                        lastReadPosition += event.charIndex;
                        if (event.name === 'sentence') {
                            saveCurrentState();
                        }
                    }
                };
                
                // Gérer la fin de la lecture
                utterance.onend = function() {
                    isPaused = false;
                    lastReadPosition = 0;
                    saveCurrentState();
                    updatePlayButton();
                };
                
                speechSynth.speak(utterance);
                isPaused = false;
                updatePlayButton();
                return;
            }
        }

        // Si on est en pause pendant la session actuelle, on reprend la lecture
        if (speechSynth.speaking && speechSynth.paused) {
            speechSynth.resume();
            isPaused = false;
            updatePlayButton();
            return;
        }

        // Si une lecture est déjà en cours (et pas en pause), on l'arrête
        if (speechSynth.speaking && !speechSynth.paused) {
            speechSynth.cancel();
        }

        // On commence une nouvelle lecture
        const text = document.getElementById('text-area').value.trim();
        if (text) {
            // Vérifier si c'est le même texte que celui sauvegardé et s'il y a une position
            if (lastReadPosition > 0 && lastReadPosition < text.length) {
                const textToRead = text.substring(lastReadPosition);
                utterance = new SpeechSynthesisUtterance(textToRead);
            } else {
                // Sinon, commencer depuis le début
                utterance = new SpeechSynthesisUtterance(text);
                lastReadPosition = 0;
            }
            
            const selectedVoice = document.getElementById('voice-select').value;
            const voices = speechSynth.getVoices();
            if (selectedVoice >= 0 && selectedVoice < voices.length) {
                utterance.voice = voices[selectedVoice];
            }
            utterance.rate = parseFloat(document.getElementById('speed').value);
            
            // Définir la langue en fonction de la voix sélectionnée
            if (utterance.voice) {
                utterance.lang = utterance.voice.lang;
            } else {
                utterance.lang = 'fr-FR';
            }
            
            // Utiliser l'événement onboundary pour suivre la position
            utterance.onboundary = function(event) {
                if (event.name === 'word' || event.name === 'sentence') {
                    lastReadPosition += event.charIndex;
                    // Limiter la fréquence des sauvegardes
                    if (event.name === 'sentence') {
                        saveCurrentState();
                    }
                }
            };
            
            // Gérer la fin de la lecture
            utterance.onend = function() {
                isPaused = false;
                // Si on arrive à la fin, réinitialiser la position
                lastReadPosition = 0;
                saveCurrentState();
                updatePlayButton();
            };
            
            speechSynth.speak(utterance);
            isPaused = false;
            updatePlayButton();
        }
    });

    document.getElementById('pause-button').addEventListener('click', () => {
        if (speechSynth.speaking) {
            if (speechSynth.paused) {
                speechSynth.resume();
                isPaused = false;
            } else {
                speechSynth.pause();
                isPaused = true;
                // Sauvegarder l'état lors de la mise en pause
                saveCurrentState();
            }
            updatePlayButton();
        }
    });

    document.getElementById('restart-button').addEventListener('click', () => {
        // Arrêter la lecture en cours
        stopSpeech();

        // Réinitialiser la position
        lastReadPosition = 0;
        isPaused = false;
        saveCurrentState();
        updatePlayButton();

        // Commencer une nouvelle lecture depuis le début
        const text = document.getElementById('text-area').value.trim();
        if (text) {
            utterance = new SpeechSynthesisUtterance(text);
            
            const selectedVoice = document.getElementById('voice-select').value;
            const voices = speechSynth.getVoices();
            if (selectedVoice >= 0 && selectedVoice < voices.length) {
                utterance.voice = voices[selectedVoice];
            }
            utterance.rate = parseFloat(document.getElementById('speed').value);
            
            // Définir la langue en fonction de la voix sélectionnée
            if (utterance.voice) {
                utterance.lang = utterance.voice.lang;
            } else {
                utterance.lang = 'fr-FR';
            }
            
            // Même gestionnaires d'événements que pour la lecture normale
            utterance.onboundary = function(event) {
                if (event.name === 'word' || event.name === 'sentence') {
                    lastReadPosition += event.charIndex;
                    if (event.name === 'sentence') {
                        saveCurrentState();
                    }
                }
            };
            
            utterance.onend = function() {
                isPaused = false;
                lastReadPosition = 0;
                saveCurrentState();
                updatePlayButton();
            };
            
            speechSynth.speak(utterance);
        }
    });

    // Charger le texte sauvegardé au démarrage
    function loadSavedContent() {
        // Restaurer le texte
        const savedText = localStorage.getItem(TEXT_STORAGE_KEY);
        if (savedText) {
            textArea.value = savedText;
        }

        // Restaurer la vitesse
        const savedSpeed = localStorage.getItem(SPEED_STORAGE_KEY);
        if (savedSpeed) {
            const speedSelect = document.getElementById('speed');
            for (let i = 0; i < speedSelect.options.length; i++) {
                if (speedSelect.options[i].value === savedSpeed) {
                    speedSelect.selectedIndex = i;
                    break;
                }
            }
        }

        // Récupérer la position
        lastReadPosition = parseInt(localStorage.getItem(POSITION_STORAGE_KEY) || '0');

        // Restaurer l'état de pause
        isPaused = localStorage.getItem(PAUSED_STORAGE_KEY) === 'true';

        updatePlayButton();
    }

    // Sauvegarder les modifications du texte
    textArea.addEventListener('input', function() {
        // Si le texte change, réinitialiser la position
        if (textArea.value !== localStorage.getItem(TEXT_STORAGE_KEY)) {
            lastReadPosition = 0;
            isPaused = false;
        }
        saveCurrentState();
        updatePlayButton();
    });

    // Sauvegarder les changements de voix et de vitesse
    document.getElementById('voice-select').addEventListener('change', saveCurrentState);
    document.getElementById('speed').addEventListener('change', saveCurrentState);

    // Initialisation
    window.addEventListener('DOMContentLoaded', () => {
        populateVoiceList();
        loadSavedContent();

        // Forcer un chargement initial des voix si nécessaire
        if (speechSynth.getVoices().length === 0) {
            console.log("Chargement initial des voix...");
            // Tentatives multiples pour s'assurer que les voix sont chargées
            const checkVoices = setInterval(() => {
                if (speechSynth.getVoices().length > 0) {
                    console.log(`${speechSynth.getVoices().length} voix trouvées`);
                    populateVoiceList();
                    clearInterval(checkVoices);
                }
            }, 500);
            
            // Abandonner après 5 secondes si aucune voix n'est trouvée
            setTimeout(() => {
                if (speechSynth.getVoices().length === 0) {
                    console.warn("Impossible de charger les voix après 5 secondes");
                    clearInterval(checkVoices);
                }
            }, 5000);
        }
    });

    // Sauvegarder l'état avant de quitter la page
    window.addEventListener('beforeunload', function() {
        saveCurrentState();
    }); 