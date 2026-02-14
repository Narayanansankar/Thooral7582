document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const btnMic = document.getElementById('btn-mic');
    const transcriptBox = document.getElementById('transcript');
    const canvas = document.getElementById('waveform');
    const ctx = canvas.getContext('2d');

    let isListening = false;
    let mediaRecorder;
    let audioContext;
    let analyser;
    let canvasWidth, canvasHeight;

    // --- Audio Visualization ---
    function initVisualizer(stream) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        canvasWidth = canvas.width = canvas.offsetWidth;
        canvasHeight = canvas.height = canvas.offsetHeight;
        drawVisualizer();
    }

    function drawVisualizer() {
        if (!isListening) return;
        requestAnimationFrame(drawVisualizer);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const barWidth = (canvasWidth / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;
            ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`; // Red-ish bars
            ctx.fillRect(x, canvasHeight - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    // --- Microphone Streaming (Real-time Chunks with VAD) ---
    let audioChunks = [];
    let streamingInterval = null;
    let audioContextForVAD = null;
    let analyserForVAD = null;

    // Voice Activity Detection - Check if audio has actual voice
    function hasVoiceActivity(audioBlob, callback) {
        const reader = new FileReader();
        reader.readAsArrayBuffer(audioBlob);
        reader.onloadend = async () => {
            try {
                if (!audioContextForVAD) {
                    audioContextForVAD = new (window.AudioContext || window.webkitAudioContext)();
                }

                const audioBuffer = await audioContextForVAD.decodeAudioData(reader.result);
                const channelData = audioBuffer.getChannelData(0);

                // Calculate RMS (Root Mean Square) volume
                let sum = 0;
                for (let i = 0; i < channelData.length; i++) {
                    sum += channelData[i] * channelData[i];
                }
                const rms = Math.sqrt(sum / channelData.length);
                const volume = rms * 100; // Scale to 0-100

                // Threshold: Only send if volume > 0.5 (adjust as needed)
                const hasVoice = volume > 0.5;
                console.log(`Audio volume: ${volume.toFixed(2)} - ${hasVoice ? 'SENDING' : 'SKIPPING (silence)'}`);
                callback(hasVoice);
            } catch (err) {
                console.error('VAD error:', err);
                callback(true); // Send anyway if VAD fails
            }
        };
    }

    btnMic.addEventListener('click', async () => {
        if (!isListening) {
            try {
                // Request mic access
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                isListening = true;
                btnMic.innerHTML = '<i class="fas fa-stop"></i> Stop Listening';
                btnMic.classList.add('listening');
                transcriptBox.innerHTML = '<em>[LIVE] Listening and analyzing in real-time...</em>';

                initVisualizer(stream);

                // Setup MediaRecorder with timeslice for chunked recording
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                audioChunks = [];

                // --- LOOP RECORDING (To ensure headers in every chunk) ---
                let audioContext = new (window.AudioContext || window.webkitAudioContext)();
                let analyser = audioContext.createAnalyser();
                let source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                analyser.fftSize = 256;
                // --- SINGLE SESSION RECORDING (Walkie-Talkie Mode) ---
                function startRecordingSession() {
                    if (!isListening) return;

                    audioChunks = [];
                    mediaRecorder.start();
                    console.log("Recorder started (Session)...");
                }

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

                    // Send if large enough (Simple size check, no volume gate)
                    if (audioBlob.size > 3000) { // > 3KB
                        const reader = new FileReader();
                        reader.readAsDataURL(audioBlob);
                        reader.onloadend = () => {
                            const base64data = reader.result.split(',')[1];
                            if (socket.connected) {
                                console.log(`Sending chunk: ${(audioBlob.size / 1024).toFixed(2)} KB`);
                                socket.emit('audio_stream', { audio: base64data });
                            }
                        };
                    } else {
                        console.log("Skipping small chunk (silence)");
                    }

                    // Restart loop if still listening (Removed for Walkie-Talkie)
                    /*
                    if (isListening) {
                        startRecordingLoop();
                    }
                    */
                };

                // Trigger first start
                startRecordingSession();

            } catch (err) {
                alert("Microphone access denied or error: " + err);
                stopListening();
            }
        } else {
            stopListening();
        }
    });

    function stopListening() {
        if (!isListening) return;
        isListening = false;
        btnMic.innerHTML = '<i class="fas fa-microphone"></i> Start Listening';
        btnMic.classList.remove('listening');

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }

        // Stop all tracks to release mic
        // Use the 'stream' variable from the closure if available, or try to get it from recorder
        if (typeof stream !== 'undefined' && stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // Clear visualizer
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // --- Simulation Logic ---
    window.simulateCall = function (scenario) {
        let mockData = {};
        if (scenario === 'standard') {
            mockData = {
                transcription: "Hello? There is a huge fire at the Anna Nagar main market! Please come fast!",
                intent_english: "Fire outbreak at Anna Nagar Main Market",
                priority: "P1",
                type: "Fire Accident",
                subtype: "Structure Fire",
                location_raw: "Anna Nagar main market",
                landmark: "Anna Nagar Arch, Main Market",
                sentiment: "Panic",
                background_audio: "Screaming, Sirens",
                suggested_response: "Stay calm. Fire engines are being dispatched to Anna Nagar Main Market. Evacuate to a safe open area immediately.",
                police_alert: true,
                dispatch_recommendation: "IMMEDIATE DISPATCH: Fire Brigade + Ambulance + Police Control."
            };
        } else if (scenario === 'complex') {
            mockData = {
                transcription: "Ayya! Vandi crash aayiduchu! Blood romba varudhu! Near that NEC College junction.",
                intent_english: "Serious Road Accident with heavy bleeding near NEC College junction",
                priority: "P1",
                type: "Road Accident",
                subtype: "Serious Injury",
                location_raw: "Near NEC College junction",
                landmark: "NEC College Junction",
                sentiment: "High Panic / Crying",
                background_audio: "Traffic, Horns, Crowd",
                suggested_response: "Ambulance is on the way to NEC College. Please apply pressure on the wound if possible. Do not move the victim.",
                police_alert: true,
                dispatch_recommendation: "IMMEDIATE DISPATCH: Ambulance (Advanced Life Support) + Traffic Police."
            };
        } else if (scenario === 'noisy') {
            mockData = {
                transcription: "Someone is... (static)... breaking into... (static)... house... 5th street...",
                intent_english: "Home Invasion / Burglary in progress (Unclear audio)",
                priority: "P2",
                type: "Theft / Robbery",
                subtype: "Burglary",
                location_raw: "5th Street (Incomplete)",
                landmark: "Unknown",
                sentiment: "Whispering / Fear",
                background_audio: "Silence / Glass Breaking",
                suggested_response: "I can hear you. Please stay hidden and silent. Police are tracking your location. Stay on the line.",
                police_alert: true,
                dispatch_recommendation: "Dispatch Patrol Vehicle for checking. Attempt to trace call location."
            };
        }

        // Simulate "Processing" delay then show result
        transcriptBox.innerHTML = "<em>[System] Analyzing simulated audio stream...</em>";
        setTimeout(() => {
            handleAnalysisResult(mockData);
        }, 1500);
    };

    // --- TTS Logic ---
    // Store latest AI response data for TTS
    let latestAIResponse = null;

    window.speakResponse = function () {
        // Try to use native language response first, fallback to English
        let text = '';
        let detectedLang = 'en-IN'; // Default to Indian English

        if (latestAIResponse && latestAIResponse.suggested_response_native) {
            text = latestAIResponse.suggested_response_native;

            // Map detected language to voice language code
            const langMap = {
                'Tamil': 'ta-IN',
                'Hindi': 'hi-IN',
                'Tanglish': 'ta-IN', // Use Tamil voice for Tanglish
                'Hinglish': 'hi-IN', // Use Hindi voice for Hinglish
                'English': 'en-IN'
            };

            detectedLang = langMap[latestAIResponse.detected_language] || 'en-IN';
        } else {
            // Fallback to English response from UI
            text = document.getElementById('script-text').textContent;
        }

        if (!text || text === '...') return;

        const utterance = new SpeechSynthesisUtterance(text);

        // Select voice based on detected language
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.lang === detectedLang);

        // Fallback: try to find any Indian voice
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.includes('IN') || v.name.includes('India'));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = detectedLang;
        }

        console.log(`TTS: Speaking in ${detectedLang} - "${text.substring(0, 50)}..."`);

        window.speechSynthesis.cancel(); // Stop previous
        window.speechSynthesis.speak(utterance);
    };

    // --- UI Updates from AI (Progressive Streaming) ---
    function handleAnalysisResult(data) {
        console.log("AI Result:", data);

        // Store for TTS usage
        latestAIResponse = data;

        if (data.error) {
            // Suppress 400/404 errors (likely silence/noise) for cleaner demo
            if (data.error.includes('400') || data.error.includes('404')) {
                console.warn("Suppressed API Error (Silence/Noise):", data.error);
                return;
            }
            transcriptBox.innerHTML += `<div style="color:red; margin-bottom: 5px;">[Error: ${data.error}]</div>`;
            return;
        }

        // Append to Transcript (Chat Style) - Progressive Updates
        if (data.transcription) {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const langBadge = data.detected_language ? `<span style="background: #00f2ff; color: #000; padding: 2px 6px; border-radius: 3px; font-size: 0.7em; margin-left: 5px;">${data.detected_language}</span>` : '';

            // Remove the "[LIVE]" placeholder if it exists
            const livePlaceholder = transcriptBox.querySelector('em');
            if (livePlaceholder && livePlaceholder.textContent.includes('[LIVE]')) {
                livePlaceholder.remove();
            }

            transcriptBox.innerHTML += `<div style="margin-bottom: 8px; border-left: 3px solid #00f2ff; padding-left: 8px;">
                <span style="font-size: 0.8em; opacity: 0.6;">${timestamp}</span>${langBadge}<br>
                ${data.transcription}
            </div>`;
            transcriptBox.scrollTop = transcriptBox.scrollHeight; // Auto-scroll
        }


        // --- MERGE LOGIC: Only update fields if new data is valid/stronger ---

        // Priority: Upgrade or Keep. Downgrade only if current is empty.
        const currentP = document.getElementById('val-priority').textContent;
        const newP = data.priority || 'P4';

        // Simple priority weight
        const pWeight = { 'P1': 4, 'P2': 3, 'P3': 2, 'P4': 1, '-': 0 };
        // Update if new Priority is higher (lower number?) No, P1 > P4.
        // Actually P1 is "Critical". P4 is "Low".
        if (pWeight[newP] >= pWeight[currentP] || currentP === '-') {
            const pCard = document.getElementById('card-priority');
            const pVal = document.getElementById('val-priority');
            pVal.textContent = newP;
            pCard.classList.remove('priority-p1', 'priority-p2', 'priority-p3', 'priority-p4');
            pCard.classList.add(`priority-${newP.toLowerCase()}`);
        }

        // Police Alert: Once True, stays True (until manual reset - not implemented yet)
        const alertBanner = document.getElementById('police-alert-banner');
        if (data.police_alert || newP === 'P1') {
            alertBanner.style.display = 'block';
        }

        // Type: Update if valid
        if (data.type && data.type !== 'Unknown') {
            document.getElementById('val-type').textContent = data.type;
        }

        // Location: Update if valid (Prefer Landmark)
        if (data.landmark || data.location_raw) {
            const locDisplay = data.landmark ? `${data.landmark} <br><span style="font-size:0.8em; opacity:0.7">(${data.location_raw})</span>` : (data.location_raw || "Unknown");
            document.getElementById('val-location').innerHTML = locDisplay;
        }

        // Suggested Response: Always update to latest context
        if (data.suggested_response) {
            document.getElementById('response-script-container').style.display = 'block';
            document.getElementById('script-text').textContent = data.suggested_response;

            // Auto-speak the response using Backend TTS (Cloud API)
            if (data.audio_response) {
                console.log("Received audio response from backend. Length:", data.audio_response.length);
                try {
                    const audioSrc = "data:audio/mp3;base64," + data.audio_response;
                    const audio = new Audio(audioSrc);
                    audio.play().then(() => {
                        console.log("Audio started playing successfully.");
                    }).catch(e => {
                        console.error("Audio play failed (Autoplay policy?):", e);
                        alert("Audio playback blocked by browser. Please interact with the page first.");
                    });
                } catch (e) {
                    console.error("Error creating audio object:", e);
                }
            } else {
                console.log("No audio response from backend.");
            }

            // speakResponse(); // Disabled browser TTS in favor of Cloud TTS
        }

        // Recommendation: Always update
        if (data.dispatch_recommendation) {
            document.getElementById('ai-suggestion').style.display = 'block';
            document.getElementById('suggestion-text').textContent = data.dispatch_recommendation;
        }
    }

    socket.on('analysis_result', (data) => {
        handleAnalysisResult(data);
    });

    socket.on('connect', () => {
        console.log("Connected to server via WebSocket");
    });

    // --- Dispatch Confirmation Logic ---
    const btnDispatch = document.getElementById('btn-dispatch');
    if (btnDispatch) {
        btnDispatch.addEventListener('click', () => {
            if (!latestAIResponse) {
                alert("No active incident to dispatch!");
                return;
            }

            // Visual feedback
            const originalText = btnDispatch.innerHTML;
            btnDispatch.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dispatching...';
            btnDispatch.disabled = true;

            // Send data to backend
            fetch('/submit_dispatch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(latestAIResponse),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        alert(`✅ DISPATCH SUCCESSFUL!\nLocation: ${data.latitude}, ${data.longitude}\nID: ${data.dispatch_id || 'N/A'}`);
                    } else {
                        alert("⚠️ DISPATCH WARNING: Saved locally but backend reported error: " + (data.error || "Unknown"));
                    }
                })
                .catch((error) => {
                    console.error('Error:', error);
                    alert("❌ DISPATCH ERROR: Check network connection.");
                })
                .finally(() => {
                    // Reset UI for next call regardless of success (to clear state)
                    btnDispatch.innerHTML = originalText;
                    btnDispatch.disabled = false;

                    // Clear Triage Cards
                    document.getElementById('val-priority').textContent = '-';
                    document.getElementById('val-type').textContent = '-';
                    document.getElementById('val-location').innerHTML = '-';
                    document.getElementById('val-sentiment').textContent = '-';
                    document.getElementById('card-priority').className = 'triage-card'; // Reset colors

                    // Hide Alerts
                    document.getElementById('police-alert-banner').style.display = 'none';
                    document.getElementById('response-script-container').style.display = 'none';
                    document.getElementById('ai-suggestion').style.display = 'none';
                    document.getElementById('transcript').innerHTML = '<span style="opacity: 0.5;">Waiting for audio stream...</span>';

                    latestAIResponse = null; // Clear current data
                });
        });
    }
});
