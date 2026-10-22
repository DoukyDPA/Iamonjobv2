        // Intégré à IAMONJOB : plus de clé côté navigateur. L'accès à l'IA est
        // garanti par la session IAMONJOB, donc on considère l'IA toujours prête.
        function hasApiKey() {
            return true;
        }

        // --- COMPTEUR DE CONSOMMATION (période de test) ---
        // Tarifs INDICATIFS par million de tokens (à ajuster selon le modèle réellement utilisé).
        // Tarifs indicatifs Mistral Large (le provider réel côté IAMONJOB).
        const PRICING = { inputPerMillion: 2.00, outputPerMillion: 6.00, currency: '€' };
        let tokenUsage = { input: 0, output: 0, total: 0, calls: 0 };

        function recordUsage(meta) {
            if (!meta) return;
            const inTok = meta.promptTokenCount || 0;
            const outTok = (meta.candidatesTokenCount || 0) + (meta.thoughtsTokenCount || 0);
            tokenUsage.input += inTok;
            tokenUsage.output += outTok;
            tokenUsage.total += (meta.totalTokenCount || (inTok + outTok));
            tokenUsage.calls += 1;
            updateTokenMeter();
        }

        function estimateCost() {
            return (tokenUsage.input / 1e6) * PRICING.inputPerMillion
                 + (tokenUsage.output / 1e6) * PRICING.outputPerMillion;
        }

        function updateTokenMeter() {
            const count = document.getElementById('token-count');
            if (!count) return;
            count.textContent = tokenUsage.total.toLocaleString('fr-FR');
            const cost = estimateCost();
            document.getElementById('token-cost').textContent =
                cost.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 4 }) + ' ' + PRICING.currency;
            const meter = document.getElementById('token-meter');
            if (meter) {
                meter.title =
                    `Consommation IA depuis la dernière remise à zéro\n`
                  + `${tokenUsage.calls} appel(s) — chats + conseils + génération\n`
                  + `Entrée : ${tokenUsage.input.toLocaleString('fr-FR')} tokens\n`
                  + `Sortie : ${tokenUsage.output.toLocaleString('fr-FR')} tokens\n`
                  + `Coût estimé indicatif (tarifs modifiables dans le code).`;
            }
        }

        function resetTokenUsage() {
            tokenUsage = { input: 0, output: 0, total: 0, calls: 0 };
            updateTokenMeter();
        }

        // Erreur bloquante côté IA (session expirée, quota atteint) : on affiche
        // le message renvoyé par le serveur, sans réessayer.
        function showAiAccessError(e) {
            alert(e && e.message ? e.message : "L'assistant IA est momentanément indisponible.");
        }

        // Intégré à IAMONJOB : l'IA est toujours disponible via la session.
        function ensureApiKey() {
            return true;
        }

        // --- ÉTAT DES DONNÉES ---
        let db = {
            name: "", contact: "",
            experiences: [],
            education: [],
            interests: [],
            languages: [],
            tools: []
        };

        let cvData = {
            name: "", job: "", contact: "", profile: "",
            image: null,
            skills: [], interests: [],
            experiences: [], education: [],
            languages: [], tools: [],
            license: "Permis B", showLicense: false,
            labels: {}
        };

        let chatState = {
            active: false,
            type: null, 
            index: null,
            history: [] 
        };

        // --- GESTION DES THÈMES ---
        function changeTheme(themeName) {
            const themes = {
                iamonjob: { sidebar: '#123F39', avatar: '#1E7A6B', avatarBorder: '#2A8C79', textLight: '#8FD4C4', textLighter: '#B9E4D9', textAccent: '#F0857A', main: '#1E7A6B', sidebarText: '#ffffff', sidebarTextMuted: 'rgba(255,255,255,0.85)' },
                blue: { sidebar: '#1e3a8a', avatar: '#1e40af', avatarBorder: '#1d4ed8', textLight: '#93c5fd', textLighter: '#bfdbfe', textAccent: '#60a5fa', main: '#2563eb', sidebarText: '#ffffff', sidebarTextMuted: 'rgba(255,255,255,0.8)' },
                teal: { sidebar: '#134e4a', avatar: '#115e59', avatarBorder: '#0f766e', textLight: '#5eead4', textLighter: '#99f6e4', textAccent: '#2dd4bf', main: '#0d9488', sidebarText: '#ffffff', sidebarTextMuted: 'rgba(255,255,255,0.8)' },
                minimal: { sidebar: '#f8fafc', avatar: '#e2e8f0', avatarBorder: '#cbd5e1', textLight: '#64748b', textLighter: '#94a3b8', textAccent: '#3b82f6', main: '#1e293b', sidebarText: '#0f172a', sidebarTextMuted: '#475569' },
                purple: { sidebar: '#581c87', avatar: '#6b21a8', avatarBorder: '#7e22ce', textLight: '#d8b4fe', textLighter: '#e9d5ff', textAccent: '#c084fc', main: '#9333ea', sidebarText: '#ffffff', sidebarTextMuted: 'rgba(255,255,255,0.8)' },
                slate: { sidebar: '#0f172a', avatar: '#1e293b', avatarBorder: '#334155', textLight: '#cbd5e1', textLighter: '#e2e8f0', textAccent: '#94a3b8', main: '#475569', sidebarText: '#ffffff', sidebarTextMuted: 'rgba(255,255,255,0.8)' }
            };
            const t = themes[themeName] || themes.iamonjob;
            const root = document.documentElement;
            root.style.setProperty('--th-sidebar', t.sidebar);
            root.style.setProperty('--th-avatar', t.avatar);
            root.style.setProperty('--th-avatar-border', t.avatarBorder);
            root.style.setProperty('--th-text-light', t.textLight);
            root.style.setProperty('--th-text-lighter', t.textLighter);
            root.style.setProperty('--th-text-accent', t.textAccent);
            root.style.setProperty('--th-main', t.main);
            root.style.setProperty('--th-sidebar-text', t.sidebarText);
            root.style.setProperty('--th-sidebar-text-muted', t.sidebarTextMuted);
        }

        // --- GESTION PHOTO ---
        // Ouvre le sélecteur de fichier (réinitialise pour pouvoir re-choisir le même fichier)
        function openPhotoPicker() {
            const inp = document.getElementById('profile-upload');
            if (!inp) return;
            inp.value = '';
            inp.click();
        }

        function shrinkPhoto(dataUrl, max = 600) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const r = Math.min(1, max / Math.max(img.width, img.height));
                    const c = document.createElement('canvas');
                    c.width = Math.round(img.width * r);
                    c.height = Math.round(img.height * r);
                    const ctx = c.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, c.width, c.height);
                    ctx.drawImage(img, 0, 0, c.width, c.height);
                    try { resolve(c.toDataURL('image/jpeg', 0.85)); } catch (err) { resolve(dataUrl); }
                };
                img.onerror = () => resolve(dataUrl);
                img.src = dataUrl;
            });
        }

        function handleProfileUpload(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async function(e) {
                // Photo réduite (600 px max) : une photo de téléphone pèse plusieurs
                // Mo et ne passerait pas l'enregistrement sur le compte.
                cvData.image = await shrinkPhoto(e.target.result);
                // Nouveau cadrage par défaut : légèrement vers le haut pour ne pas couper le visage.
                cvData.imgPos = { x: 50, y: 25, zoom: 1 };
                cvData.showPhoto = true;
                const toggle = document.getElementById('toggle-photo');
                if (toggle) toggle.checked = true;
                applyPhoto();
                saveCV();
            };
            reader.onerror = function() { alert("Impossible de lire cette image. Essayez un autre fichier (JPG ou PNG)."); };
            reader.readAsDataURL(file);
        }

        // Applique image + cadrage + zoom + visibilité selon l'état du CV courant.
        function applyPhoto() {
            const block = document.getElementById('cv-avatar-block');
            const container = document.getElementById('cv-avatar-container');
            const icon = document.getElementById('cv-avatar-icon');
            const tools = document.getElementById('avatar-tools');
            const toggle = document.getElementById('toggle-photo');
            const zoomInput = document.getElementById('avatar-zoom');

            const show = cvData.showPhoto !== false;
            if (toggle) toggle.checked = show;
            if (block) block.style.display = show ? '' : 'none';
            if (!show) return;

            const pos = cvData.imgPos || (cvData.imgPos = { x: 50, y: 25, zoom: 1 });
            if (cvData.image) {
                if (container) {
                    container.style.backgroundImage = `url("${cvData.image}")`;
                    container.style.backgroundRepeat = 'no-repeat';
                    container.style.backgroundSize = (pos.zoom * 100) + '%';
                    container.style.backgroundPosition = `${pos.x}% ${pos.y}%`;
                }
                if (icon) icon.classList.add('hidden');
                if (tools) tools.classList.remove('hidden');
                if (zoomInput) zoomInput.value = pos.zoom;
            } else {
                if (container) { container.style.backgroundImage = ''; container.style.backgroundSize = ''; container.style.backgroundPosition = ''; }
                if (icon) icon.classList.remove('hidden');
                if (tools) tools.classList.add('hidden');
            }
        }

        // Bascule « avec / sans photo » pour le CV courant.
        function toggleShowPhoto(show) {
            cvData.showPhoto = !!show;
            applyPhoto();
            saveCV();
        }

        // Zoom de la photo (curseur). save=false pendant le glissement, true au relâchement.
        function setAvatarZoom(value, save) {
            const z = parseFloat(value) || 1;
            cvData.imgPos = Object.assign({ x: 50, y: 25, zoom: 1 }, cvData.imgPos, { zoom: z });
            const container = document.getElementById('cv-avatar-container');
            if (container) container.style.backgroundSize = (z * 100) + '%';
            if (save) saveCV();
        }

        // Recadrage par glissement de la photo (une seule initialisation).
        function initAvatarDrag() {
            const container = document.getElementById('cv-avatar-container');
            if (!container || container._dragInit) return;
            container._dragInit = true;
            let drag = null;
            container.addEventListener('pointerdown', function(e) {
                if (!cvData.image || cvData.showPhoto === false) return;
                const p = cvData.imgPos || { x: 50, y: 25, zoom: 1 };
                drag = { sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y };
                try { container.setPointerCapture(e.pointerId); } catch (err) {}
                container.style.cursor = 'grabbing';
                e.preventDefault();
            });
            container.addEventListener('pointermove', function(e) {
                if (!drag) return;
                // 0.35 %/px : glisser vers le bas fait remonter le cadrage (montre le haut du visage).
                let nx = drag.ox - (e.clientX - drag.sx) * 0.35;
                let ny = drag.oy - (e.clientY - drag.sy) * 0.35;
                nx = Math.max(0, Math.min(100, nx));
                ny = Math.max(0, Math.min(100, ny));
                cvData.imgPos = Object.assign({ x: 50, y: 25, zoom: 1 }, cvData.imgPos, { x: nx, y: ny });
                container.style.backgroundPosition = `${nx}% ${ny}%`;
            });
            const end = function() {
                if (!drag) return;
                drag = null;
                container.style.cursor = 'grab';
                saveCV();
            };
            container.addEventListener('pointerup', end);
            container.addEventListener('pointercancel', end);
        }

        // --- UI BASE DE DONNÉES (COLONNE GAUCHE) ---
        function updateDBInfo(field, value) { 
            db[field] = value; 
            saveDB();
        }

        function addDBItem(type) {
            if(type === 'experiences') db.experiences.push({ title: '', company: '', date: '', details: '' });
            else if(type === 'education') db.education.push({ title: '', school: '', date: '', details: '' });
            else if(type === 'interests') db.interests.push({ title: '', details: '' });
            else if(type === 'languages') db.languages.push({ title: '', level: '', details: '' });
            else if(type === 'tools') db.tools.push({ title: '' });
            saveDB();
            renderDB();
        }

        function updateDBItem(type, index, field, value) {
            db[type][index][field] = value;
            saveDB();
        }

        function removeDBItem(type, index) {
            db[type].splice(index, 1);
            saveDB();
            renderDB();
        }

        // Échappe le texte pour l'insérer sans risque dans un <textarea>
        function escapeHtml(s) {
            return (s == null ? '' : String(s))
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        // Libellé du bouton d'entretien selon l'état (neuf / en cours / déjà synthétisé)
        function detailBtnLabel(item) {
            if (item.details) return "Compléter l'entretien";
            if (item.chatHistory && item.chatHistory.length > 1) return "Reprendre l'entretien";
            return "Détailler avec IAMONCV ✨";
        }

        // Bloc modifiable affichant ce que l'IA a retenu d'un élément (résumé de l'entretien)
        function detailsBlock(type, i, details) {
            if (!details) return '';
            return `
                <div class="mb-2">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[10px] font-bold text-[#1E7A6B] uppercase tracking-wide"><i class="fas fa-robot mr-1"></i> Ce que l'IA retient</span>
                        <span class="text-[9px] text-slate-400 italic">relisez / modifiez</span>
                    </div>
                    <textarea onchange="updateDBItem('${type}', ${i}, 'details', this.value)" rows="4" class="w-full text-xs text-slate-600 bg-[#F6FAF9] border border-[#CBE0DA] rounded p-2 outline-none focus:ring-1 focus:ring-[#1E7A6B] resize-y custom-scrollbar leading-relaxed">${escapeHtml(stripMarkdown(details))}</textarea>
                </div>`;
        }

        // Champ optionnel : la personne écrit spontanément ce qu'elle sait, l'IA part de là
        // au lieu de repartir de zéro (moins d'échanges, moins de tokens).
        function briefBlock(type, i, brief) {
            const ph = type === 'experiences'
                ? "Infos sur le poste (optionnel) : missions, contexte, réalisations… L'IA partira de là."
                : type === 'education'
                ? "Infos sur la formation (optionnel) : contenu, projets, ce que vous en retenez…"
                : "Infos sur cette activité (optionnel)…";
            return `
                <div class="mb-2">
                    <textarea onchange="updateDBItem('${type}', ${i}, 'brief', this.value)" rows="2" placeholder="${ph}" class="w-full text-xs text-slate-600 bg-white border border-dashed border-[#CBE0DA] rounded p-2 outline-none focus:ring-1 focus:ring-[#1E7A6B] resize-y custom-scrollbar leading-relaxed placeholder-slate-300">${escapeHtml(brief || '')}</textarea>
                </div>`;
        }

        function renderDB() {
            // Les infos personnelles ne sont plus saisies ici (confidentialité) : uniquement la consigne perso
            const noteInput = document.getElementById('user-note-input');
            if (noteInput) noteInput.value = db.userNote || '';
            // L'offre ou le poste visé est gardé avec le profil : il sert à la génération
            // et à l'atelier profil, même après un rechargement de la page.
            const offerInput = document.getElementById('job-offer-input');
            if (offerInput && !offerInput.value.trim()) offerInput.value = db.jobOffer || '';
            const genderSel = document.getElementById('cv-gender');
            if (genderSel) genderSel.value = db.gender || '';

            const expList = document.getElementById('db-experiences-list');
            expList.innerHTML = db.experiences.map((exp, i) => `
                <div class="bg-white border border-slate-200 rounded-lg p-3 shadow-sm relative group">
                    <button onclick="removeDBItem('experiences', ${i})" class="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><i class="fas fa-trash"></i></button>
                    <input type="text" autocomplete="off" placeholder="Titre (ex: Directeur)" value="${escapeHtml(exp.title)}" onchange="updateDBItem('experiences', ${i}, 'title', this.value)" class="w-full text-sm font-bold text-slate-800 border-none focus:ring-0 p-0 mb-1 outline-none bg-transparent placeholder-slate-300">
                    <div class="flex gap-2 mb-2">
                        <input type="text" autocomplete="off" placeholder="Entreprise" value="${escapeHtml(exp.company)}" onchange="updateDBItem('experiences', ${i}, 'company', this.value)" class="w-2/3 text-xs text-slate-600 border-none focus:ring-0 p-0 outline-none bg-transparent placeholder-slate-300">
                        <input type="text" autocomplete="off" placeholder="Dates (ex: 2020-2023)" value="${escapeHtml(exp.date)}" onchange="updateDBItem('experiences', ${i}, 'date', this.value)" class="w-1/3 text-xs text-slate-400 text-right border-none focus:ring-0 p-0 outline-none bg-transparent placeholder-slate-300">
                    </div>
                    ${briefBlock('experiences', i, exp.brief)}
                    ${detailsBlock('experiences', i, exp.details)}
                    <button onclick="openChatbot('experiences', ${i})" class="w-full text-xs font-bold bg-[#EAF3F0] border border-[#CBE0DA] text-[#1E7A6B] py-1.5 rounded hover:bg-[#d9ece6] transition shadow-sm">
                        <i class="fas fa-comment-dots mr-1"></i> ${detailBtnLabel(exp)}
                    </button>
                </div>
            `).join('');

            const eduList = document.getElementById('db-education-list');
            eduList.innerHTML = db.education.map((edu, i) => `
                <div class="bg-white border border-slate-200 rounded-lg p-3 shadow-sm relative group">
                    <button onclick="removeDBItem('education', ${i})" class="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><i class="fas fa-trash"></i></button>
                    <input type="text" autocomplete="off" placeholder="Diplôme (ex: Master RH)" value="${escapeHtml(edu.title)}" onchange="updateDBItem('education', ${i}, 'title', this.value)" class="w-full text-sm font-bold text-slate-800 border-none focus:ring-0 p-0 mb-1 outline-none bg-transparent placeholder-slate-300">
                    <div class="flex gap-2 mb-2">
                        <input type="text" autocomplete="off" placeholder="École" value="${escapeHtml(edu.school)}" onchange="updateDBItem('education', ${i}, 'school', this.value)" class="w-2/3 text-xs text-slate-600 border-none focus:ring-0 p-0 outline-none bg-transparent placeholder-slate-300">
                        <input type="text" autocomplete="off" placeholder="Année" value="${escapeHtml(edu.date)}" onchange="updateDBItem('education', ${i}, 'date', this.value)" class="w-1/3 text-xs text-slate-400 text-right border-none focus:ring-0 p-0 outline-none bg-transparent placeholder-slate-300">
                    </div>
                    ${briefBlock('education', i, edu.brief)}
                    ${detailsBlock('education', i, edu.details)}
                    <button onclick="openChatbot('education', ${i})" class="w-full text-xs font-bold bg-[#EAF3F0] border border-[#CBE0DA] text-[#1E7A6B] py-1.5 rounded hover:bg-[#d9ece6] transition shadow-sm">
                        <i class="fas fa-comment-dots mr-1"></i> ${detailBtnLabel(edu)}
                    </button>
                </div>
            `).join('');

            const intList = document.getElementById('db-interests-list');
            intList.innerHTML = db.interests.map((int, i) => `
                <div class="bg-white border border-slate-200 rounded-lg p-3 shadow-sm relative group">
                    <button onclick="removeDBItem('interests', ${i})" class="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><i class="fas fa-trash"></i></button>
                    <input type="text" autocomplete="off" placeholder="Activité (ex: Bénévolat associatif)" value="${escapeHtml(int.title)}" onchange="updateDBItem('interests', ${i}, 'title', this.value)" class="w-full text-sm font-bold text-slate-800 border-none focus:ring-0 p-0 mb-1 outline-none bg-transparent placeholder-slate-300">
                    ${briefBlock('interests', i, int.brief)}
                    ${detailsBlock('interests', i, int.details)}
                    <button onclick="openChatbot('interests', ${i})" class="w-full text-xs font-bold bg-[#EAF3F0] border border-[#CBE0DA] text-[#1E7A6B] py-1.5 rounded hover:bg-[#d9ece6] transition shadow-sm">
                        <i class="fas fa-comment-dots mr-1"></i> ${detailBtnLabel(int)}
                    </button>
                </div>
            `).join('');

            const langList = document.getElementById('db-languages-list');
            if (langList) langList.innerHTML = (db.languages || []).map((lg, i) => `
                <div class="bg-white border border-slate-200 rounded-lg p-3 shadow-sm relative group">
                    <button onclick="removeDBItem('languages', ${i})" class="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><i class="fas fa-trash"></i></button>
                    <input type="text" autocomplete="off" placeholder="Langue (ex : Anglais)" value="${escapeHtml(lg.title)}" onchange="updateDBItem('languages', ${i}, 'title', this.value)" class="w-full text-sm font-bold text-slate-800 border-none focus:ring-0 p-0 mb-1 outline-none bg-transparent placeholder-slate-300">
                    <input type="text" autocomplete="off" placeholder="Affichage du niveau (ex : Courant, Notions)" value="${escapeHtml(lg.level || '')}" onchange="updateDBItem('languages', ${i}, 'level', this.value)" class="w-full text-xs text-slate-600 border-none focus:ring-0 p-0 mb-2 outline-none bg-transparent placeholder-slate-300">
                    ${detailsBlock('languages', i, lg.details)}
                    <button onclick="openChatbot('languages', ${i})" class="w-full text-xs font-bold bg-[#EAF3F0] border border-[#CBE0DA] text-[#1E7A6B] py-1.5 rounded hover:bg-[#d9ece6] transition shadow-sm">
                        <i class="fas fa-comment-dots mr-1"></i> ${lg.details ? "Revoir le niveau" : "Faire le point sur mon niveau ✨"}
                    </button>
                </div>
            `).join('');

            const toolsList = document.getElementById('db-tools-list');
            if (toolsList) toolsList.innerHTML = (db.tools || []).map((tl, i) => `
                <div class="bg-white border border-slate-200 rounded-lg p-3 shadow-sm relative group flex items-center">
                    <input type="text" autocomplete="off" placeholder="Outil (ex : Excel, Canva, logiciel de caisse…)" value="${escapeHtml(tl.title)}" onchange="updateDBItem('tools', ${i}, 'title', this.value)" class="w-full text-sm text-slate-800 border-none focus:ring-0 p-0 pr-6 outline-none bg-transparent placeholder-slate-300">
                    <button onclick="removeDBItem('tools', ${i})" class="absolute top-1/2 -translate-y-1/2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');
        }

        // --- MULTI-PROFILS + SAUVEGARDE LOCALE ---
        // Chaque personne accompagnée a son propre profil : données brutes (db)
        // + CV généré (cvData), stockés séparément dans le navigateur. On peut
        // basculer, créer, renommer, supprimer, exporter et importer un profil.
        const PROFILES_KEY = 'iamoncv_profiles_v2';
        const profileKey = (id) => 'iamoncv_profile_' + id;

        // --- ENREGISTREMENT SUR LE COMPTE ---
        // Les profils (données + CV) sont enregistrés sur le compte IAMONJOB, via
        // /api/cv-workspace, et plus dans le navigateur. On retrouve donc son CV
        // sur n'importe quel ordinateur ou téléphone, et rien ne reste sur un poste
        // partagé (médiathèque). L'enregistrement est automatique, une ou deux
        // secondes après chaque modification ; un témoin en haut de page le montre.
        const Cloud = {
            ready: false,
            role: null,
            meta: null,
            profiles: {},
            dirtyMeta: false,
            dirtyProfiles: new Set(),
            timer: null,
            saving: false,
            retryDelay: 5000,
        };
        const CLOUD_DEBOUNCE_MS = 1500;

        function setSaveStatus(state, text) {
            const el = document.getElementById('save-status');
            if (!el) return;
            const icons = { ok: 'fa-cloud', saving: 'fa-rotate fa-spin', error: 'fa-triangle-exclamation' };
            el.dataset.state = state;
            el.className = 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border ' +
                (state === 'error' ? 'bg-[#EE6E5E] border-[#EE6E5E] text-white' : 'bg-white/10 border-white/20 text-white');
            el.innerHTML = `<i class="fas ${icons[state] || 'fa-cloud'}"></i><span>${escapeHtml(text)}</span>`;
        }

        // Le cadre /cv renouvelle la session IAMONJOB à la demande : le jeton de
        // connexion ne dure qu'une heure, une séance de CV peut durer plus.
        function askParentToRefreshSession() {
            return new Promise((resolve) => {
                if (window.parent === window) return resolve(false);
                let done = false;
                const onMsg = (ev) => {
                    if (ev.origin !== location.origin || !ev.data || ev.data.type !== 'iamoncv-session-refreshed') return;
                    done = true;
                    window.removeEventListener('message', onMsg);
                    resolve(!!ev.data.ok);
                };
                window.addEventListener('message', onMsg);
                window.parent.postMessage({ type: 'iamoncv-refresh-session' }, location.origin);
                setTimeout(() => { if (!done) { window.removeEventListener('message', onMsg); resolve(false); } }, 8000);
            });
        }

        async function cloudFetch(url, options, retried) {
            const res = await fetch(url, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, options || {}));
            if (res.status === 401 && !retried && await askParentToRefreshSession()) {
                return cloudFetch(url, options, true);
            }
            return res;
        }

        function scheduleCloudSave() {
            if (!Cloud.ready) return;
            setSaveStatus('saving', 'Enregistrement…');
            clearTimeout(Cloud.timer);
            Cloud.timer = setTimeout(flushCloudSave, CLOUD_DEBOUNCE_MS);
        }

        function buildCloudPayload() {
            const payload = { profiles: {} };
            if (Cloud.dirtyMeta) payload.meta = Cloud.meta;
            Cloud.dirtyProfiles.forEach(id => { payload.profiles[id] = Cloud.profiles[id] || null; });
            return payload;
        }

        async function flushCloudSave(opts) {
            clearTimeout(Cloud.timer);
            if (!Cloud.ready || (!Cloud.dirtyMeta && !Cloud.dirtyProfiles.size)) return true;
            if (Cloud.saving) { Cloud.timer = setTimeout(flushCloudSave, 500); return false; }
            Cloud.saving = true;
            // Filet de sécurité : une photo trop lourde (ancien CV, fichier
            // importé) est réduite avant l'envoi plutôt que refusée.
            for (const id of Cloud.dirtyProfiles) {
                const p = Cloud.profiles[id];
                if (p && p.cv && typeof p.cv.image === 'string' && p.cv.image.length > 400000) {
                    p.cv.image = await shrinkPhoto(p.cv.image);
                    if (cvData && cvData.image && cvData.image.length > 400000 && getProfilesMeta()?.active === id) cvData.image = p.cv.image;
                }
            }
            // On retire les marques AVANT l'envoi : une modification faite pendant
            // l'envoi sera reprise au prochain tour au lieu d'être perdue.
            const payload = buildCloudPayload();
            const sentMeta = Cloud.dirtyMeta;
            const sentIds = Array.from(Cloud.dirtyProfiles);
            Cloud.dirtyMeta = false;
            Cloud.dirtyProfiles.clear();
            try {
                const body = JSON.stringify(payload);
                const res = await cloudFetch('/api/cv-workspace', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                    keepalive: !!(opts && opts.keepalive) && body.length < 60000,
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    const err = new Error(data.error || 'Enregistrement impossible.');
                    err.status = res.status;
                    throw err;
                }
                Cloud.retryDelay = 5000;
                const t = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                setSaveStatus('ok', 'Enregistré sur votre compte · ' + t);
                return true;
            } catch (e) {
                if (sentMeta) Cloud.dirtyMeta = true;
                sentIds.forEach(id => Cloud.dirtyProfiles.add(id));
                if (e.status === 413) {
                    setSaveStatus('error', 'Non enregistré : photo trop lourde');
                    alert(e.message);
                } else if (e.status === 401) {
                    setSaveStatus('error', 'Non enregistré : reconnectez-vous');
                } else {
                    setSaveStatus('error', 'Non enregistré, nouvel essai…');
                    Cloud.timer = setTimeout(flushCloudSave, Cloud.retryDelay);
                    Cloud.retryDelay = Math.min(Cloud.retryDelay * 2, 60000);
                }
                return false;
            } finally {
                Cloud.saving = false;
            }
        }

        // Fermeture de l'onglet : on tente d'envoyer ce qui reste.
        window.addEventListener('pagehide', () => { flushCloudSave({ keepalive: true }); });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') flushCloudSave({ keepalive: true });
        });
        window.addEventListener('beforeunload', (e) => {
            if (Cloud.ready && (Cloud.dirtyMeta || Cloud.dirtyProfiles.size || Cloud.saving)) {
                flushCloudSave({ keepalive: true });
                e.preventDefault();
                e.returnValue = '';
            }
        });

        // Ancienne sauvegarde dans le navigateur (avant l'enregistrement sur le
        // compte). Renvoie les profils non vides trouvés sur cet ordinateur.
        function readLegacyLocalProfiles() {
            const found = [];
            try {
                const rawMeta = localStorage.getItem(PROFILES_KEY);
                const meta = rawMeta ? JSON.parse(rawMeta) : null;
                (meta && Array.isArray(meta.list) ? meta.list : []).forEach(p => {
                    try {
                        const raw = localStorage.getItem(profileKey(p.id));
                        const data = raw ? JSON.parse(raw) : null;
                        if (data && (!dbIsEmpty(data.db) || (data.cv && (data.cv.experiences || []).length))) {
                            found.push({ name: String(p.name || 'Profil'), data });
                        }
                    } catch (e) {}
                });
                if (!found.length) {
                    const old = localStorage.getItem('iamoncv_db');
                    const legacyDb = old ? JSON.parse(old) : null;
                    if (legacyDb && !dbIsEmpty(legacyDb)) found.push({ name: 'Profil 1', data: { db: legacyDb, cv: emptyCV() } });
                }
            } catch (e) {}
            return found;
        }

        function clearLegacyLocalProfiles() {
            try {
                const rawMeta = localStorage.getItem(PROFILES_KEY);
                const meta = rawMeta ? JSON.parse(rawMeta) : null;
                (meta && Array.isArray(meta.list) ? meta.list : []).forEach(p => localStorage.removeItem(profileKey(p.id)));
                localStorage.removeItem(PROFILES_KEY);
                localStorage.removeItem('iamoncv_db');
            } catch (e) {}
        }

        // Fenêtre simple, deux gros boutons : « Oui, c'est mon CV » / « Non ».
        function askLegacyImport(found) {
            return new Promise((resolve) => {
                const names = found.map(f => '« ' + escapeHtml(f.name) + ' »').join(', ');
                const wrap = document.createElement('div');
                wrap.className = 'fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4';
                wrap.innerHTML = `
                    <div role="dialog" aria-modal="true" aria-labelledby="legacy-title" class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h2 id="legacy-title" class="text-lg font-bold text-[#123F39] mb-2">Un CV est enregistré sur cet ordinateur</h2>
                        <p class="text-sm text-slate-700 mb-1">Nous avons trouvé ${found.length > 1 ? found.length + ' CV' : 'un CV'} sur cet ordinateur : ${names}.</p>
                        <p class="text-sm text-slate-700 mb-5">Si c'est le vôtre, nous le gardons sur votre compte : vous le retrouverez partout. Si ce n'est pas le vôtre (ordinateur partagé), répondez non.</p>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <button data-a="yes" class="flex-1 bg-[#1E7A6B] text-white font-bold rounded-xl px-4 py-3 hover:bg-[#123F39]">Oui, c'est mon CV</button>
                            <button data-a="no" class="flex-1 bg-white border-2 border-slate-300 text-slate-700 font-bold rounded-xl px-4 py-3 hover:bg-slate-50">Non, ce n'est pas le mien</button>
                        </div>
                    </div>`;
                wrap.addEventListener('click', (ev) => {
                    const b = ev.target.closest('button[data-a]');
                    if (!b) return;
                    wrap.remove();
                    resolve(b.dataset.a === 'yes');
                });
                document.body.appendChild(wrap);
                const first = wrap.querySelector('button[data-a="yes"]');
                if (first) first.focus();
            });
        }

        function showCloudBootError(message) {
            const ov = document.getElementById('cloud-boot');
            if (!ov) { alert(message); return; }
            ov.innerHTML = `
                <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center">
                    <i class="fas fa-triangle-exclamation text-3xl text-[#EE6E5E] mb-3"></i>
                    <p class="text-slate-800 font-semibold mb-4">${escapeHtml(message)}</p>
                    <button onclick="location.reload()" class="bg-[#1E7A6B] text-white font-bold rounded-xl px-5 py-3 hover:bg-[#123F39]">Réessayer</button>
                </div>`;
        }

        // Démarrage : charge l'espace du compte, propose de récupérer un ancien
        // CV resté dans ce navigateur, puis affiche le profil actif.
        async function cloudBoot() {
            let data;
            try {
                const res = await cloudFetch('/api/cv-workspace');
                if (res.status === 401) throw Object.assign(new Error('Votre session a expiré. Reconnectez-vous à IAMONJOB, puis rouvrez « Créer mon CV ».'), { fatal: true });
                if (!res.ok) throw new Error('Impossible de charger vos CV pour le moment. Vérifiez votre connexion internet.');
                data = await res.json();
            } catch (e) {
                showCloudBootError(e.fatal ? e.message : (e.message || 'Impossible de charger vos CV.'));
                return false;
            }

            Cloud.role = data.role || null;
            Cloud.who = data.who || '';
            Cloud.meta = data.meta && Array.isArray(data.meta.list) && data.meta.list.length ? data.meta : null;
            Cloud.profiles = data.profiles || {};
            // Profils listés mais absents (écriture interrompue) : on les retire.
            if (Cloud.meta) {
                Cloud.meta.list = Cloud.meta.list.filter(p => Cloud.profiles[p.id]);
                if (!Cloud.meta.list.length) Cloud.meta = null;
                else if (!Cloud.meta.list.some(p => p.id === Cloud.meta.active)) Cloud.meta.active = Cloud.meta.list[0].id;
            }
            Cloud.ready = true;

            // Compteur de consommation : utile au conseiller, pas à la personne.
            const meter = document.getElementById('token-meter');
            if (meter && Cloud.role !== 'conseiller') meter.style.display = 'none';
            const ctools = document.getElementById('conseiller-cv-tools');
            if (ctools && Cloud.role === 'conseiller') ctools.classList.remove('hidden');

            // Ancien CV resté dans ce navigateur ?
            const declinedKey = 'iamoncv_legacy_declined_' + Cloud.who;
            let declined = false;
            try { declined = localStorage.getItem(declinedKey) === '1'; } catch (e) {}
            const legacy = declined ? [] : readLegacyLocalProfiles();
            if (legacy.length) {
                const ov = document.getElementById('cloud-boot');
                if (ov) ov.style.display = 'none';
                const yes = await askLegacyImport(legacy);
                if (yes) {
                    const meta = Cloud.meta || { active: null, list: [] };
                    // Profil actif encore vierge : le CV retrouvé passe devant.
                    const activeData = meta.active ? Cloud.profiles[meta.active] : null;
                    const activeIsBlank = !activeData || (dbIsEmpty(activeData.db) && !((activeData.cv || {}).experiences || []).length);
                    let firstId = null;
                    legacy.forEach(f => {
                        const id = genProfileId();
                        if (!firstId) firstId = id;
                        meta.list.push({ id, name: f.name });
                        writeProfile(id, { db: Object.assign(emptyDB(), f.data.db || {}), cv: Object.assign(emptyCV(), f.data.cv || {}) });
                    });
                    if (activeIsBlank) meta.active = firstId;
                    setProfilesMeta(meta);
                    const ok = await flushCloudSave();
                    if (ok) clearLegacyLocalProfiles();
                } else {
                    // Pas le sien (poste partagé) : on ne le récupère pas, mais on
                    // ne l'efface pas non plus. Son auteur pourra le récupérer en
                    // se connectant sur cet ordinateur. On ne repose pas la question.
                    try { localStorage.setItem(declinedKey, '1'); } catch (e) {}
                }
            }

            const ov = document.getElementById('cloud-boot');
            if (ov) ov.remove();
            if (!Cloud.dirtyMeta && !Cloud.dirtyProfiles.size) setSaveStatus('ok', 'Enregistré sur votre compte');
            return true;
        }

        function emptyDB() {
            return { name: "", contact: "", gender: "", experiences: [], education: [], interests: [], languages: [], tools: [] };
        }

        // Directive d'accord en genre, injectée dans les prompts IA.
        // Le choix est obligatoire avant génération, donc la chaîne vide ne devrait pas circuler.
        function genderDirective() {
            const g = (db.gender || '').trim();
            if (g === 'feminin') return "ACCORD EN GENRE (impératif) : la personne est une FEMME. Accorde systématiquement au FÉMININ tous les adjectifs et participes passés (ex. « diplômée », « expérimentée », « autonome et rigoureuse », « chargée de »). Ne laisse aucun accord au masculin par défaut.";
            if (g === 'masculin') return "ACCORD EN GENRE (impératif) : la personne est un HOMME. Accorde systématiquement au MASCULIN.";
            return "";
        }
        function emptyCV() {
            return { name: "", job: "", contact: "", profile: "", image: null, showPhoto: true, imgPos: { x: 50, y: 25, zoom: 1 }, skills: [], interests: [], experiences: [], education: [], languages: [], tools: [], license: "Permis B", showLicense: false, labels: {} };
        }
        function genProfileId() {
            return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        }

        // Les profils vivent désormais sur le compte (voir « ENREGISTREMENT SUR
        // LE COMPTE » plus bas). Ces fonctions lisent et écrivent la copie en
        // mémoire ; chaque écriture programme un enregistrement automatique.
        function getProfilesMeta() {
            return Cloud.meta ? JSON.parse(JSON.stringify(Cloud.meta)) : null;
        }
        function setProfilesMeta(meta) {
            Cloud.meta = JSON.parse(JSON.stringify(meta));
            Cloud.dirtyMeta = true;
            scheduleCloudSave();
        }
        function readProfile(id) {
            const p = Cloud.profiles[id];
            return p ? JSON.parse(JSON.stringify(p)) : null;
        }
        function writeProfile(id, data) {
            Cloud.profiles[id] = JSON.parse(JSON.stringify(data));
            Cloud.dirtyProfiles.add(id);
            scheduleCloudSave();
        }
        function removeProfile(id) {
            delete Cloud.profiles[id];
            Cloud.dirtyProfiles.add(id);
            scheduleCloudSave();
        }

        // Première ouverture : crée un profil par défaut et récupère d'éventuelles
        // données de l'ancienne version (clé unique iamoncv_db).
        function ensureProfiles() {
            let meta = getProfilesMeta();
            if (meta && meta.list && meta.list.length) return meta;

            const id = genProfileId();
            meta = { active: id, list: [{ id, name: Cloud.role === 'conseiller' ? "Profil 1" : "Mon CV" }] };
            writeProfile(id, { db: emptyDB(), cv: emptyCV() });
            setProfilesMeta(meta);
            return meta;
        }

        // Sauvegarde le profil actif (données brutes + CV) dans le navigateur.
        function persistActive() {
            const meta = getProfilesMeta();
            if (!meta || !meta.active) return;
            writeProfile(meta.active, { db: db, cv: cvData });
        }
        // Compat : les anciens appels sauvegardent désormais tout le profil actif.
        function saveDB() { persistActive(); }
        function saveCV() { persistActive(); }

        // Charge le profil actif en mémoire.
        function loadActiveProfile() {
            const meta = ensureProfiles();
            let data = readProfile(meta.active);
            if (!data) data = { db: emptyDB(), cv: emptyCV() };
            db = Object.assign(emptyDB(), data.db || {});
            cvData = Object.assign(emptyCV(), data.cv || {});
            // Nouveau CV affiché = compteur de consommation remis à zéro.
            tokenUsage = { input: 0, output: 0, total: 0, calls: 0 };
            updateTokenMeter();
        }
        // Compat avec l'ancien nom d'appel.
        function loadDB() { loadActiveProfile(); }

        // Applique le profil actif à l'écran : colonne données, CV, photo, sélecteur.
        function applyActiveProfileToUI() {
            // Changement de personne : son offre visée remplace celle de la précédente.
            const offerInput = document.getElementById('job-offer-input');
            if (offerInput) offerInput.value = db.jobOffer || '';
            renderDB();
            renderCV();
            applyPhoto();
            renderProfileSelector();
        }

        function renderProfileSelector() {
            const sel = document.getElementById('profile-select');
            if (!sel) return;
            const meta = getProfilesMeta() || { active: '', list: [] };
            sel.innerHTML = meta.list.map(p =>
                `<option value="${p.id}" ${p.id === meta.active ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
            ).join('');
        }

        function switchProfile(id) {
            persistActive();
            const meta = getProfilesMeta();
            if (!meta) return;
            meta.active = id;
            setProfilesMeta(meta);
            loadActiveProfile();
            applyActiveProfileToUI();
        }

        function createProfile() {
            const name = (prompt("Nom du nouveau profil (ex : la personne accompagnée) :", "") || "").trim();
            if (!name) return;
            persistActive();
            const meta = getProfilesMeta() || { active: '', list: [] };
            const id = genProfileId();
            meta.list.push({ id, name });
            meta.active = id;
            setProfilesMeta(meta);
            writeProfile(id, { db: emptyDB(), cv: emptyCV() });
            loadActiveProfile();
            applyActiveProfileToUI();
        }

        function renameProfile() {
            const meta = getProfilesMeta();
            if (!meta) return;
            const cur = meta.list.find(p => p.id === meta.active);
            const name = (prompt("Renommer le profil :", cur ? cur.name : "") || "").trim();
            if (!name) return;
            if (cur) cur.name = name;
            setProfilesMeta(meta);
            renderProfileSelector();
        }

        function deleteProfile() {
            const meta = getProfilesMeta();
            if (!meta) return;
            if (meta.list.length <= 1) {
                alert("Impossible de supprimer le dernier profil. Créez-en un autre d'abord.");
                return;
            }
            const cur = meta.list.find(p => p.id === meta.active);
            if (!confirm(`Supprimer définitivement le profil « ${cur ? cur.name : ''} » ? Cette action est irréversible.`)) return;
            removeProfile(meta.active);
            meta.list = meta.list.filter(p => p.id !== meta.active);
            meta.active = meta.list[0].id;
            setProfilesMeta(meta);
            loadActiveProfile();
            applyActiveProfileToUI();
        }

        // Exporte le profil actif en fichier .json (partage, sauvegarde).
        function exportActiveProfile() {
            persistActive();
            const meta = getProfilesMeta();
            const cur = meta ? meta.list.find(p => p.id === meta.active) : null;
            const payload = {
                app: "IAMONCV",
                version: 1,
                exportedAt: new Date().toISOString(),
                name: cur ? cur.name : "Profil",
                db: db,
                cv: cvData
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const safeName = (cur ? cur.name : "profil").replace(/[^\w\-]+/g, '_');
            a.href = url;
            a.download = `iamoncv_${safeName}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function triggerImport() {
            const inp = document.getElementById('profile-import');
            if (inp) { inp.value = ''; inp.click(); }
        }

        // Importe un profil depuis un fichier .json : crée un nouveau profil.
        function importProfileFromFile(file) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                let payload;
                try { payload = JSON.parse(e.target.result); }
                catch (err) { alert("Fichier illisible : ce n'est pas un profil IAMONCV valide."); return; }
                const importedDb = payload.db || (payload.experiences ? payload : null);
                if (!importedDb) { alert("Ce fichier ne contient pas de profil IAMONCV."); return; }
                persistActive();
                const meta = getProfilesMeta() || { active: '', list: [] };
                const id = genProfileId();
                const name = (payload.name || "Profil importé").toString().trim() || "Profil importé";
                meta.list.push({ id, name });
                meta.active = id;
                setProfilesMeta(meta);
                writeProfile(id, {
                    db: Object.assign(emptyDB(), importedDb),
                    cv: Object.assign(emptyCV(), payload.cv || {})
                });
                loadActiveProfile();
                applyActiveProfileToUI();
                alert(`Profil « ${name} » importé.`);
            };
            reader.onerror = function() { alert("Impossible de lire ce fichier."); };
            reader.readAsText(file);
        }

        // --- REPRISE DU CV CHARGÉ DANS IAMONJOB ---
        // La personne a déjà chargé (et anonymisé) son CV à l'étape 1 d'IAMONJOB.
        // On le récupère via /api/cv-source (même session), l'IA le range dans
        // la base (expériences, formations, langues, outils, centres d'intérêt)
        // et la personne n'a plus qu'à vérifier puis enrichir par les entretiens.
        // Le contenu de chaque poste va dans « brief » (infos de départ), pas
        // dans « details » : les entretiens partent de là au lieu de repartir de zéro.
        function dbIsEmpty(d) {
            return !d || (
                !(d.experiences || []).length && !(d.education || []).length &&
                !(d.interests || []).length && !(d.languages || []).length && !(d.tools || []).length
            );
        }

        async function fetchIamonjobCv() {
            const res = await fetch('/api/cv-source', { credentials: 'same-origin', cache: 'no-store' });
            if (res.status === 401) {
                const e = new Error("Session IAMONJOB expirée. Reconnectez-vous, puis rouvrez cette page.");
                e.isAuth = true;
                throw e;
            }
            if (!res.ok) throw new Error("Impossible de récupérer le CV depuis IAMONJOB.");
            const data = await res.json();
            return (data && data.cvText) ? data : null;
        }

        function asText(v) {
            if (Array.isArray(v)) return v.map(x => String(x || '').trim()).filter(Boolean).map(x => '- ' + x.replace(/^[-•]\s*/, '')).join('\n');
            return String(v || '').trim();
        }

        async function importFromIamonjob() {
            let source;
            try {
                source = await fetchIamonjobCv();
            } catch (err) {
                alert(err.message);
                return;
            }
            if (!source) {
                alert("Aucun CV trouvé dans IAMONJOB.\n\nChargez d'abord votre CV à l'étape 1 d'IAMONJOB (et anonymisez-le si besoin), puis revenez ici.");
                return;
            }

            // Ne jamais écraser un travail en cours : profil non vide = nouveau profil.
            const createNew = !dbIsEmpty(db);
            if (createNew && !confirm("Ce profil contient déjà des données.\n\nLe CV d'IAMONJOB sera repris dans un NOUVEAU profil « Mon CV IAMONJOB ». Continuer ?")) return;

            const overlay = document.getElementById('generation-overlay');
            overlay.classList.remove('hidden');
            setOverlayMessage('Reprise de votre CV IAMONJOB', "L'IA range votre parcours dans la base…");

            const sysPrompt = `Tu reçois le texte brut d'un CV (extrait d'un PDF, parfois désordonné, déjà anonymisé : les mentions [retiré] remplacent des données personnelles).
            Ta tâche : le RANGER dans une base de données structurée, sans rien rédiger ni embellir.

            RÈGLES ABSOLUES :
            - N'invente rien : ni poste, ni employeur, ni date, ni diplôme, ni chiffre. Reprends fidèlement ce qui est écrit.
            - Ne cherche jamais à reconstituer une donnée [retiré]. Ignore nom, adresse, e-mail, téléphone, âge, photo, permis.
            - Si un employeur ou une école a été retiré, laisse le champ vide.
            - Dates : garde le format du CV (ex. « 2019-2023 », « Depuis mars 2021 »). Champ vide si absente.
            - "tasks" : missions, réalisations et résultats du poste, tels qu'écrits (une entrée par puce, phrases courtes).
            - Les compétences listées à part dans le CV (savoir-faire, savoir-être) : rattache-les dans "tasks" du poste où elles s'exercent le plus clairement ; sinon mets-les dans "otherSkills".
            - "tools" : uniquement logiciels, outils, machines, engins (pas les compétences générales). Un libellé court par outil (ex. « 16PF », « PerformanSe », pas de longue phrase).
            - Expériences et formations de la plus récente à la plus ancienne.

            Réponds STRICTEMENT en JSON valide, sans texte autour, au format :
            {
              "experiences": [{"title": "", "company": "", "date": "", "tasks": [""]}],
              "education": [{"title": "", "school": "", "date": "", "content": ""}],
              "languages": [{"title": "", "level": ""}],
              "tools": [""],
              "interests": [""],
              "otherSkills": [""]
            }`;

            let parsed;
            try {
                const raw = await callAssistantAPI("Voici le CV à ranger :\n\n" + source.cvText.slice(0, 30000), sysPrompt);
                parsed = parseCvJson(raw);
            } catch (err) {
                showGenerationError(escapeHtml(err.message || "L'IA n'a pas pu lire ce CV."));
                return;
            }

            const imported = emptyDB();
            imported.experiences = (parsed.experiences || []).filter(e => e && (e.title || e.company)).map(e => ({
                title: String(e.title || '').trim(),
                company: String(e.company || '').trim(),
                date: String(e.date || '').trim(),
                brief: asText(e.tasks),
                details: ''
            }));
            imported.education = (parsed.education || []).filter(e => e && (e.title || e.school)).map(e => ({
                title: String(e.title || '').trim(),
                school: String(e.school || '').trim(),
                date: String(e.date || '').trim(),
                brief: asText(e.content),
                details: ''
            }));
            imported.languages = (parsed.languages || []).map(l =>
                typeof l === 'string' ? { title: l, level: '', details: '' } : { title: String(l.title || l.name || '').trim(), level: String(l.level || '').trim(), details: '' }
            ).filter(l => l.title);
            imported.tools = (parsed.tools || []).map(t => ({ title: String(typeof t === 'string' ? t : (t && t.title) || '').trim() })).filter(t => t.title);
            imported.interests = (parsed.interests || []).map(t => ({ title: String(typeof t === 'string' ? t : (t && t.title) || '').trim(), details: '' })).filter(t => t.title);
            // Compétences orphelines : versées dans la consigne libre, pour que l'IA les voie à la génération.
            const others = (parsed.otherSkills || []).map(s => String(s || '').trim()).filter(Boolean);
            if (others.length) imported.userNote = "Compétences mentionnées dans mon CV : " + others.join(', ') + '.';
            imported.importedFromIamonjob = new Date().toISOString();

            if (!imported.experiences.length && !imported.education.length) {
                showGenerationError("Le CV d'IAMONJOB n'a pas pu être découpé en expériences et formations. Vérifiez à l'étape 1 que le texte extrait est lisible.");
                return;
            }

            if (createNew) {
                persistActive();
                const meta = getProfilesMeta() || { active: '', list: [] };
                const id = genProfileId();
                meta.list.push({ id, name: "Mon CV IAMONJOB" });
                meta.active = id;
                setProfilesMeta(meta);
                writeProfile(id, { db: imported, cv: emptyCV() });
                loadActiveProfile();
            } else {
                // Profil vide : on garde l'accord en genre éventuellement déjà choisi.
                imported.gender = db.gender || '';
                db = imported;
                persistActive();
            }

            resetGenerationOverlay();
            applyActiveProfileToUI();
            hideIamonjobBanner();

            const nE = imported.experiences.length, nF = imported.education.length;
            alert(`CV IAMONJOB repris : ${nE} expérience${nE > 1 ? 's' : ''} et ${nF} formation${nF > 1 ? 's' : ''}.\n\nRelisez la colonne de gauche, choisissez l'accord (féminin ou masculin), puis enrichissez chaque poste avec « Détailler avec IAMONCV ».`);
        }

        function hideIamonjobBanner() {
            const b = document.getElementById('iamonjob-import-banner');
            if (b) b.classList.add('hidden');
        }

        // À l'ouverture : si le profil actif est vide et qu'un CV existe dans
        // IAMONJOB, on propose la reprise d'un clic (aucun appel IA à ce stade).
        async function suggestIamonjobImport() {
            if (!dbIsEmpty(db)) return;
            try {
                const source = await fetchIamonjobCv();
                if (source) {
                    const b = document.getElementById('iamonjob-import-banner');
                    if (b) b.classList.remove('hidden');
                }
            } catch (e) { /* silencieux : page ouverte hors session, etc. */ }
        }

        // --- GESTION DU CHATBOT UNIVERSEL ---
        // --- DICTÉE VOCALE (transcription voix -> texte, native au navigateur, sans coût IA) ---
        let recognition = null;
        let dictating = false;
        let dictBase = '';   // texte déjà présent avant de dicter
        let dictFinal = '';  // transcription validée cumulée

        function speechSupported() {
            return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
        }

        function createRecognition() {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) return null;
            const rec = new SR();
            rec.lang = 'fr-FR';
            rec.continuous = true;
            rec.interimResults = true;
            rec.onresult = (event) => {
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const res = event.results[i];
                    if (res.isFinal) dictFinal += res[0].transcript + ' ';
                    else interim += res[0].transcript;
                }
                const input = document.getElementById('chat-input');
                if (input) input.value = (dictBase + dictFinal + interim).replace(/\s+/g, ' ').trimStart();
            };
            rec.onerror = (e) => {
                console.warn('Dictée vocale:', e.error);
                if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                    alert("Le micro n'est pas autorisé. Autorisez l'accès au microphone dans votre navigateur, puis réessayez.");
                }
                stopDictation();
            };
            // Le navigateur coupe parfois l'écoute : on relance tant que l'utilisateur enregistre.
            rec.onend = () => { if (dictating) { try { rec.start(); } catch (e) {} } };
            return rec;
        }

        function toggleDictation() {
            if (!speechSupported()) {
                alert("La dictée vocale n'est pas disponible dans ce navigateur. Elle fonctionne dans Google Chrome (ou Edge).");
                return;
            }
            if (!recognition) recognition = createRecognition();
            if (dictating) stopDictation();
            else startDictation();
        }

        function startDictation() {
            const input = document.getElementById('chat-input');
            dictBase = input && input.value ? input.value.trim() + ' ' : '';
            dictFinal = '';
            dictating = true;
            updateMicUI(true);
            try { recognition.start(); } catch (e) { /* déjà démarré */ }
        }

        function stopDictation() {
            if (!dictating && recognition) { try { recognition.stop(); } catch (e) {} }
            dictating = false;
            updateMicUI(false);
            try { recognition && recognition.stop(); } catch (e) {}
        }

        function updateMicUI(on) {
            const btn = document.getElementById('btn-mic');
            const hint = document.getElementById('dictation-hint');
            if (hint) hint.classList.toggle('hidden', !on);
            if (!btn) return;
            if (on) {
                btn.classList.add('bg-red-500', 'text-white', 'animate-pulse');
                btn.classList.remove('bg-white', 'text-[#1E7A6B]', 'hover:bg-[#EAF3F0]');
                btn.title = "Arrêter la dictée";
            } else {
                btn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
                btn.classList.add('bg-white', 'text-[#1E7A6B]', 'hover:bg-[#EAF3F0]');
                btn.title = "Dicter votre réponse (transcription vocale)";
            }
        }

        // Nombre maximum de réponses de la personne par mini-chat
        const MAX_ANSWERS = 10;
        let chatLocked = false;

        function chatAnswerCount() {
            return (chatState.history || []).filter(m => m.role === 'user').length;
        }

        // Sauvegarde l'historique du chat dans l'élément concerné (repris à la réouverture)
        function persistChatHistory() {
            if (!chatState.active) return;
            if (chatState.type === 'profile') {
                db.profileChat = JSON.parse(JSON.stringify(chatState.history));
            } else {
                db[chatState.type][chatState.index].chatHistory = JSON.parse(JSON.stringify(chatState.history));
            }
            saveDB();
        }

        function updateChatProgress() {
            const el = document.getElementById('chat-progress');
            if (el) el.textContent = `(${chatAnswerCount()}/${MAX_ANSWERS})`;
        }

        function lockChatInput() {
            chatLocked = true;
            const input = document.getElementById('chat-input');
            const send = document.getElementById('btn-send');
            const mic = document.getElementById('btn-mic');
            if (input) { input.disabled = true; input.placeholder = "Limite atteinte — cliquez sur « Terminer l'interview »."; }
            if (send) { send.disabled = true; send.classList.add('opacity-50', 'cursor-not-allowed'); }
            if (mic) { mic.disabled = true; mic.classList.add('opacity-50', 'cursor-not-allowed'); }
            if (!document.getElementById('chat-limit-note')) {
                const note = document.createElement('div');
                note.id = 'chat-limit-note';
                note.className = 'flex justify-start msg-animate';
                note.innerHTML = `<div class="max-w-[80%] p-3 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl rounded-tl-sm">On a fait le tour de cette partie. Cliquez sur « Terminer l'interview » pour que je récapitule.</div>`;
                const box = document.getElementById('chat-messages');
                box.appendChild(note);
                box.scrollTop = box.scrollHeight;
            }
        }

        function unlockChatInput() {
            chatLocked = false;
            const input = document.getElementById('chat-input');
            const send = document.getElementById('btn-send');
            const mic = document.getElementById('btn-mic');
            if (input) { input.disabled = false; input.placeholder = "Répondez ici, ou dictez à voix haute…"; }
            if (send) { send.disabled = false; send.classList.remove('opacity-50', 'cursor-not-allowed'); }
            if (mic) { mic.disabled = false; mic.classList.remove('opacity-50', 'cursor-not-allowed'); }
            const n = document.getElementById('chat-limit-note');
            if (n) n.remove();
        }

        function openChatbot(type, index) {
            if(!ensureApiKey()) return;
            const item = db[type][index];
            const title = item.title;

            if(!title || title.trim() === "") {
                alert("Veuillez d'abord saisir un Titre (le nom du poste, du diplôme ou de l'activité).");
                return;
            }

            chatState = { active: true, type, index, history: [] };
            setChatFinishLabel(type);

            // Personnalisation du sous-titre
            let subtitle = "";
            if(type === 'experiences') subtitle = `Expérience : ${title} ${item.company ? '('+item.company+')' : ''}`;
            if(type === 'education') subtitle = `Formation : ${title} ${item.school ? '('+item.school+')' : ''}`;
            if(type === 'interests') subtitle = `Centre d'intérêt : ${title}`;
            if(type === 'languages') subtitle = `Langue : ${title}`;
            document.getElementById('chat-modal-subtitle').innerText = subtitle;

            const chatBox = document.getElementById('chat-messages');
            chatBox.innerHTML = '';
            document.getElementById('chat-modal').classList.remove('hidden');
            unlockChatInput();

            if (item.chatHistory && item.chatHistory.length) {
                // Reprise de la conversation là où on s'était arrêté
                chatState.history = JSON.parse(JSON.stringify(item.chatHistory));
                chatState.history.forEach(m => addMessageToUI(m.role === 'user' ? 'user' : 'model', m.parts[0].text));
                if (chatAnswerCount() >= MAX_ANSWERS) lockChatInput();
            } else {
                // Message d'accueil : simple et concret, comme une vraie conversation
                let initMsg = "";
                const known = (item.details || "").trim();
                const brief = (item.brief || "").trim();
                if (known) {
                    // Des informations sont déjà enregistrées : on les prend en compte et on va plus loin
                    initMsg = `On a déjà noté quelques éléments sur **${title}**. On va compléter, sans répéter ce qui est déjà là. \nUn exemple précis, un moment marquant ou un résultat concret dont vous vous souvenez ?`;
                } else if (brief) {
                    // La personne a déjà écrit quelques infos : on part de là au lieu de repartir de zéro
                    initMsg = `Vous avez déjà noté quelques infos sur **${title}**, c'est un bon début. On va creuser à partir de là. \nRacontez-moi un moment précis ou un résultat concret dont vous vous souvenez ?`;
                } else if (type === 'experiences') {
                    initMsg = `Parlons de votre poste de **${title}**${item.company ? ' chez ' + item.company : ''}. \nRacontez-moi : c'était quoi votre travail, au quotidien ?`;
                } else if (type === 'education') {
                    initMsg = `Parlons de votre formation, **${title}**. \nQu'est-ce que vous y avez appris, concrètement ?`;
                } else if (type === 'interests') {
                    initMsg = `Parlons de **${title}**. \nQu'est-ce que vous faites, exactement ?`;
                } else if (type === 'languages') {
                    initMsg = `Parlons de votre **${title}**. \nDans quelles situations vous en servez-vous : au travail, en voyage, à l'écrit, à l'oral ?`;
                }
                addMessageToUI('model', initMsg);
                chatState.history.push({ role: 'model', parts: [{ text: initMsg }] });
                persistChatHistory();
            }
            updateChatProgress();
        }

        // ─── ATELIER PROFIL ────────────────────────────────────────────────────
        // L'accroche en haut du CV est la partie la plus difficile à écrire seul.
        // Même principe que pour les expériences : un échange court avec l'IA pour
        // préciser la cible, les compétences à mettre en avant et les mots que la
        // personne accepte (ou refuse). L'IA propose ensuite trois versions ; la
        // personne en choisit une, qu'elle peut retoucher directement sur le CV.
        // Ce qui a été dit est gardé (db.profileBrief) et sert aux générations
        // suivantes du CV.

        function profilePlaceholder(t) {
            const v = (t || '').trim();
            return !v || v === 'Profil...' || v.startsWith('Ce profil sera rédigé');
        }

        // Poste visé déjà saisi : champ « Offre d'emploi ou objectif cible », sinon
        // l'offre gardée avec le profil, sinon le titre affiché sur le CV généré.
        function currentTarget() {
            const field = (document.getElementById('job-offer-input')?.value || '').trim();
            if (field) return field;
            if ((db.jobOffer || '').trim()) return db.jobOffer.trim();
            const title = (cvData.job || '').trim();
            return title && !/^Titre( du poste)? visé$/i.test(title) ? title : '';
        }

        // Contexte transmis à l'IA : parcours (sans nom ni coordonnées), cible, profil actuel.
        function profileContextBlock() {
            const target = currentTarget().slice(0, 3000);
            const current = profilePlaceholder(cvData.profile) ? '' : String(cvData.profile).trim();
            const exps = (db.experiences || []).slice(0, 12).map(e => {
                const notes = (e.details || e.brief || '').trim().slice(0, 500);
                return `- ${e.title || ''}${e.company ? ' (' + e.company + ')' : ''}${e.date ? ', ' + e.date : ''}${notes ? ' : ' + notes : ''}`;
            }).join('\n');
            const edus = (db.education || []).slice(0, 8).map(e => `- ${e.title || ''}${e.school ? ' (' + e.school + ')' : ''}${e.date ? ', ' + e.date : ''}`).join('\n');
            const skills = (cvData.skills || []).filter(Boolean).slice(0, 12).join(', ');
            const note = (db.userNote || '').trim().slice(0, 600);
            const brief = (db.profileBrief || '').trim();
            return [
                `POSTE OU OFFRE VISÉE (déjà renseigné par la personne, ne le redemande pas) :\n"""${target}"""`,
                current ? `PROFIL ACTUELLEMENT SUR LE CV :\n"""${current}"""` : '',
                exps ? `EXPÉRIENCES :\n${exps}` : '',
                edus ? `FORMATIONS :\n${edus}` : '',
                skills ? `COMPÉTENCES AFFICHÉES : ${skills}` : '',
                note ? `CONSIGNE DÉJÀ DONNÉE PAR LA PERSONNE : ${note}` : '',
                brief ? `CE QUI A DÉJÀ ÉTÉ DÉCIDÉ LORS D'UN ÉCHANGE PRÉCÉDENT :\n${brief}` : '',
            ].filter(Boolean).join('\n\n');
        }

        function setChatFinishLabel(type) {
            const btn = document.getElementById('btn-chat-finish');
            if (!btn) return;
            btn.innerHTML = type === 'profile'
                ? "<i class='fas fa-wand-magic-sparkles mr-1'></i> Proposer mon profil"
                : "<i class='fas fa-check mr-1'></i> Terminer l'interview";
        }

        function openProfileCoach() {
            if (!ensureApiKey()) return;
            if (!currentTarget()) {
                alert("Indiquez d'abord le poste visé ou collez l'offre dans le champ « Offre d'emploi ou objectif cible » : le profil s'écrit pour ce poste.");
                const f = document.getElementById('job-offer-input');
                if (f) { f.focus(); f.classList.add('ring-2', 'ring-[#EE6E5E]'); setTimeout(() => f.classList.remove('ring-2', 'ring-[#EE6E5E]'), 2500); }
                return;
            }
            if (!(db.experiences || []).length && !(db.education || []).length) {
                alert("Ajoutez d'abord au moins une expérience ou une formation dans la colonne de gauche : l'IA s'appuie dessus pour écrire votre profil.");
                return;
            }
            chatState = { active: true, type: 'profile', index: null, history: [] };
            document.getElementById('chat-modal-subtitle').innerText = "Votre profil : les 3 ou 4 lignes en haut du CV";
            const chatBox = document.getElementById('chat-messages');
            chatBox.innerHTML = '';
            document.getElementById('chat-modal').classList.remove('hidden');
            setChatFinishLabel('profile');
            unlockChatInput();

            if (db.profileChat && db.profileChat.length) {
                chatState.history = JSON.parse(JSON.stringify(db.profileChat));
                chatState.history.forEach(m => addMessageToUI(m.role === 'user' ? 'user' : 'model', m.parts[0].text));
                if (chatAnswerCount() >= MAX_ANSWERS) lockChatInput();
            } else {
                const current = profilePlaceholder(cvData.profile) ? '' : String(cvData.profile).trim();
                let initMsg;
                if (current) {
                    initMsg = `Voici le profil actuellement sur votre CV :\n« ${current} »\n\nQu'est-ce qui ne vous ressemble pas, ou qui manque ? Dites-le avec vos mots, même en vrac.`;
                } else {
                    initMsg = "On va écrire ensemble les quelques lignes du haut de votre CV, celles qu'un recruteur lit en premier.\nPour ce poste, qu'aimeriez-vous qu'il retienne de vous en dix secondes ?";
                }
                addMessageToUI('model', initMsg);
                chatState.history.push({ role: 'model', parts: [{ text: initMsg }] });
                persistChatHistory();
            }
            updateChatProgress();
        }

        // Repart de zéro (nouvel échange), sans effacer le profil du CV.
        function resetProfileCoach() {
            db.profileChat = [];
            saveDB();
            openProfileCoach();
        }

        function profileCoachSystemPrompt() {
            return `Tu aides une personne à écrire le PROFIL de son CV (l'accroche de 3 à 4 lignes en haut de la page). Tu mènes un court échange pour savoir ce qu'elle veut mettre en avant, puis tu rédigeras.

${profileContextBlock()}

${genderDirective()}

Le poste visé est connu (voir plus haut) : ne le redemande jamais, pars de lui.

CE QUE TU CHERCHES À SAVOIR, une chose à la fois, dans l'ordre qui vient naturellement :
- les 2 ou 3 compétences ou savoir-faire qu'elle veut voir en premier, et sur quoi ils s'appuient dans son parcours ;
- ce qui la distingue : un secteur, un public, une façon de travailler, un résultat dont elle est fière ;
- les mots qu'elle aime, et ceux qu'elle refuse (beaucoup de gens détestent « dynamique », « passionné », « polyvalent ») ;
- le ton souhaité : sobre et factuel, ou un peu plus personnel ;
- ce qu'elle préfère ne pas afficher (nombre d'années d'expérience, une période, une reconversion…). Ne pousse jamais à afficher l'âge.

RÈGLES IMPÉRATIVES :
- UNE SEULE question à la fois, courte et concrète. Rebondis sur sa réponse.
- Si elle te demande une proposition ou un exemple de formulation, donne-en une ou deux, courtes, puis demande ce qu'elle en pense.
- N'invente rien qui ne figure pas dans son parcours ou dans ce qu'elle dit.
- Reste sobre : pas de « génial », « bravo », « excellent ». Un simple « d'accord », « je vois » suffit.
- Mots simples, phrases courtes, pas de jargon RH.
- TEXTE SIMPLE uniquement : aucun markdown, pas d'astérisques, pas de dièses, pas de puces.`;
        }

        // Fin de l'atelier : synthèse des choix + trois versions du profil.
        async function proposeProfileVersions(btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Rédaction...";
            btn.disabled = true;
            const convoText = chatState.history.map(m => `${m.role === 'user' ? 'Candidat' : 'Coach'}: ${m.parts[0].text}`).join('\n\n');
            const sysPrompt = `Tu rédiges le PROFIL d'un CV (accroche de 3 à 4 lignes, 350 à 450 caractères) à partir du parcours et d'un échange avec la personne.

${profileContextBlock()}

${genderDirective()}

RÈGLES :
- N'invente aucune expérience, aucun diplôme, aucun chiffre. Appuie-toi sur le parcours et sur ce que la personne a dit.
- Respecte les mots qu'elle a choisis, bannis ceux qu'elle refuse, respecte ce qu'elle ne veut pas afficher.
- Ton sobre et concret, sans superlatifs : bannis « profil idéal », « passionné(e) », « dynamique et motivé(e) », « atout majeur », « excellence ».
- Écris pour le poste visé ; si c'est une offre complète, reprends ses mots-clés quand c'est justifié (lecture par les logiciels de tri).
- Écris des phrases complètes, avec un sujet et un verbe conjugué (« Peintre en bâtiment pendant quinze ans, j'ai… », « Agent d'escale expérimenté, habitué à… »). Jamais de liste de verbes à l'infinitif (« Appliquer les procédures… ») : un profil n'est pas une fiche de poste.
- Trois versions réellement différentes : 1) sobre et factuelle, 2) centrée sur les compétences et le savoir-faire, 3) un peu plus personnelle (ce qui l'anime, sa façon de travailler), toujours professionnelle.

RÉPONDS STRICTEMENT avec un objet JSON valide, sans texte autour, sans vrai retour à la ligne dans les valeurs :
{"brief": "5 à 8 lignes : cible, compétences à mettre en avant, mots à employer, mots à éviter, ton, ce qu'il ne faut pas afficher", "versions": ["version 1", "version 2", "version 3"]}`;
            try {
                const response = await callAssistantAPI("Rédige la synthèse et les trois versions du profil.", sysPrompt + "\n\nÉCHANGE :\n" + convoText);
                const data = parseCvJson(response);
                const versions = (Array.isArray(data.versions) ? data.versions : []).map(v => stripMarkdown(String(v || ''))).filter(Boolean).slice(0, 3);
                if (!versions.length) throw new Error('Réponse vide');
                if (data.brief) { db.profileBrief = stripMarkdown(String(data.brief)).slice(0, 2000); saveDB(); }
                showProfileChoices(versions);
            } catch (e) {
                alert("La rédaction n'a pas abouti. Réessayez dans un instant.");
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }

        function showProfileChoices(versions) {
            const box = document.getElementById('chat-messages');
            const old = document.getElementById('profile-choices');
            if (old) old.remove();
            const wrap = document.createElement('div');
            wrap.id = 'profile-choices';
            wrap.className = 'msg-animate space-y-2';
            const labels = ['Sobre et factuel', 'Compétences en avant', 'Plus personnel'];
            wrap.innerHTML = `<div class="text-xs font-bold text-[#123F39] uppercase tracking-wider">Choisissez une version (vous pourrez la retoucher sur le CV)</div>` +
                versions.map((v, i) => `
                <div class="bg-white border border-[#CBE0DA] rounded-xl p-3">
                    <div class="text-[11px] font-bold text-[#1E7A6B] mb-1">${escapeHtml(labels[i] || 'Version ' + (i + 1))}</div>
                    <p class="text-sm text-slate-700 leading-relaxed">${escapeHtml(v)}</p>
                    <div class="mt-2 flex gap-2">
                        <button data-i="${i}" class="pc-use text-xs font-bold bg-[#1E7A6B] hover:bg-[#17594E] text-white px-3 py-1.5 rounded-lg"><i class="fas fa-check mr-1"></i> Utiliser celle-ci</button>
                        <button data-i="${i}" class="pc-tweak text-xs font-bold bg-white border border-[#CBE0DA] text-[#1E7A6B] hover:bg-[#EAF3F0] px-3 py-1.5 rounded-lg">La retravailler</button>
                    </div>
                </div>`).join('') +
                `<p class="text-[11px] text-slate-500 italic">Vos choix (mots, ton, compétences) sont gardés : la prochaine génération du CV s'en servira.</p>`;
            box.appendChild(wrap);
            box.scrollTop = box.scrollHeight;
            wrap.querySelectorAll('.pc-use').forEach(b => b.addEventListener('click', () => {
                const v = versions[Number(b.dataset.i)];
                cvData.profile = v;
                db.profileChoisi = v;
                saveDB();
                renderCV();
                saveCV();
                if (typeof updateOnePageStatus === 'function') updateOnePageStatus();
                closeChatModal();
            }));
            wrap.querySelectorAll('.pc-tweak').forEach(b => b.addEventListener('click', () => {
                const v = versions[Number(b.dataset.i)];
                const input = document.getElementById('chat-input');
                if (chatAnswerCount() >= MAX_ANSWERS) {
                    // Échange plein : on repart d'un nouvel échange centré sur cette version.
                    db.profileChat = [];
                    cvData.profile = v;
                    saveCV();
                    renderCV();
                    openProfileCoach();
                    return;
                }
                input.value = `Je pars de cette version : « ${v} ». J'aimerais changer : `;
                input.focus();
            }));
        }

        function closeChatModal() { stopDictation(); document.getElementById('chat-modal').classList.add('hidden'); chatState.active = false; setChatFinishLabel(null); }

        // Retire tout balisage markdown et renvoie du TEXTE BRUT lisible.
        // Utilisé pour les zones de texte (synthèses) où le markdown ne doit jamais apparaître.
        function stripMarkdown(raw) {
            let t = (raw == null ? '' : String(raw));
            t = t.replace(/```+/g, '');                    // clôtures de blocs de code
            t = t.replace(/^\s{0,3}#{1,6}\s*/gm, '');       // titres #, ## … (même sans espace)
            t = t.replace(/^\s{0,3}>\s?/gm, '');            // citations >
            t = t.replace(/\*\*(.+?)\*\*/g, '$1')           // **gras**
                 .replace(/__(.+?)__/g, '$1')               // __gras__
                 .replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, '$1$2') // *italique*
                 .replace(/`([^`]+)`/g, '$1');              // `code`
            t = t.replace(/^\s{0,3}[-*•]\s+/gm, '');         // puces - * •
            t = t.replace(/^\s{0,3}\d+[.)]\s+/gm, '');       // listes 1. 2)
            t = t.replace(/\*/g, '');                        // astérisques résiduels
            t = t.replace(/[ \t]{2,}/g, ' ');                // espaces multiples
            return t.trim();
        }

        // Nettoie le texte d'un message de chat : échappe le HTML, garde le gras, retire le reste du markdown.
        function formatChatText(raw) {
            let t = (raw == null ? '' : String(raw));
            // 1) échapper le HTML
            t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            // 2) protéger le **gras** avec des marqueurs temporaires
            t = t.replace(/\*\*(.+?)\*\*/g, '\u0001$1\u0002');
            // 3) retirer tout le markdown restant (titres, puces, astérisques…)
            t = stripMarkdown(t);
            // 4) restaurer le gras en HTML propre
            t = t.replace(/\u0001/g, '<strong>').replace(/\u0002/g, '</strong>');
            // 5) sauts de ligne
            t = t.replace(/\n/g, '<br>');
            return t;
        }

        function addMessageToUI(sender, text) {
            const chatBox = document.getElementById('chat-messages');
            const div = document.createElement('div');
            div.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} msg-animate`;

            let bubbleCls = sender === 'user'
                ? 'bg-[#1E7A6B] text-white rounded-2xl rounded-tr-sm'
                : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-2xl rounded-tl-sm';

            div.innerHTML = `
                <div class="max-w-[80%] p-3 text-sm ${bubbleCls}">
                    ${formatChatText(text)}
                </div>
            `;
            chatBox.appendChild(div);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        async function sendChatMessage() {
            stopDictation();
            if (chatLocked || chatAnswerCount() >= MAX_ANSWERS) { lockChatInput(); return; }
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if(!text) return;

            addMessageToUI('user', text);
            input.value = '';
            chatState.history.push({ role: 'user', parts: [{ text }] });
            persistChatHistory();
            updateChatProgress();

            document.getElementById('chat-typing').classList.remove('hidden');

            if (chatState.type === 'profile') {
                const remainingP = MAX_ANSWERS - chatAnswerCount();
                const noteP = remainingP <= 2
                    ? `\n\nIMPORTANT : l'échange touche à sa fin. Pose une dernière question simple, ou invite la personne à cliquer sur « Proposer mon profil ».`
                    : "";
                try {
                    const response = await callAssistantAPI(text, profileCoachSystemPrompt() + noteP, chatState.history.slice(0, -1));
                    addMessageToUI('model', response);
                    chatState.history.push({ role: 'model', parts: [{ text: response }] });
                    persistChatHistory();
                } catch (e) {
                    addMessageToUI('model', "⚠️ Désolé, un problème réseau est survenu. Pouvez-vous répéter ?");
                } finally {
                    document.getElementById('chat-typing').classList.add('hidden');
                    if (chatAnswerCount() >= MAX_ANSWERS) lockChatInput();
                }
                return;
            }

            const item = db[chatState.type][chatState.index];
            
            // Contexte factuel de l'élément en cours (sans jargon)
            let contextDesc = "";
            if(chatState.type === 'experiences') contextDesc = `La personne parle de son poste "${item.title}"${item.company ? ' chez ' + item.company : ''}.`;
            if(chatState.type === 'education') contextDesc = `La personne parle de sa formation "${item.title}"${item.school ? ' à ' + item.school : ''}.`;
            if(chatState.type === 'interests') contextDesc = `La personne parle de son activité "${item.title}".`;
            if(chatState.type === 'languages') contextDesc = `La personne parle de son usage de la langue "${item.title}".`;

            // Informations DÉJÀ enregistrées pour cet élément : l'IA doit s'appuyer dessus et ne pas les redemander
            const known = (item.details || "").trim();
            const knownBlock = known
                ? `\n\nCE QUI EST DÉJÀ NOTÉ SUR CET ÉLÉMENT (tiens-en compte, ne repose pas de questions dont la réponse figure ci-dessous, et sers-t'en pour creuser un point NOUVEAU) :\n"""${known}"""`
                : "";

            // Infos que la personne a saisies spontanément : point de départ, à ne pas redemander.
            const brief = (item.brief || "").trim();
            const briefBlockTxt = brief
                ? `\n\nCE QUE LA PERSONNE A ÉCRIT ELLE-MÊME AU DÉPART (sers-t'en comme point de départ, ne redemande pas ce qui y figure déjà, et creuse plus loin pour obtenir un exemple concret ou un résultat) :\n"""${brief}"""`
                : "";

            let sysPrompt;
            if (chatState.type === 'languages') {
                sysPrompt = `Tu aides une personne à décrire son niveau dans une langue, pour son CV. ${contextDesc}${knownBlock}${briefBlockTxt}

            ${genderDirective()}

            Parle-lui SIMPLEMENT, comme dans une vraie conversation. Ton naturel et posé.

            RÈGLES IMPÉRATIVES :
            - Pose UNE SEULE question à la fois, courte et concrète, sur son usage réel de la langue : où et quand elle s'en sert, à l'oral ou à l'écrit, si elle a vécu ou travaillé dans un pays où on la parle, si elle comprend un film, si elle peut tenir une conversation, écrire un mail, etc.
            - Ne lui fais JAMAIS passer un test et ne lui demande pas de s'auto-noter avec un score. Tu cherches des situations concrètes, pas une note.
            - Reste sobre : pas de "wow", "génial", "formidable", "bravo". Un simple "d'accord", "je vois" suffit.
            - Rappelle-toi qu'un vrai niveau de langue ne se juge pas en deux ou trois questions. Ne certifie jamais un niveau officiel (A1, B2, C1…) : tu proposeras seulement une façon prudente de l'afficher.
            - Emploie des mots simples et des phrases courtes. Pas de listes à puces, pas de jargon.
            - Écris en TEXTE SIMPLE uniquement : aucun formatage markdown, pas d'astérisques (*), pas de dièses (#), pas de puces, pas de gras. Juste des phrases normales.`;
            } else {
                sysPrompt = `Tu discutes avec une personne pour l'aider à se rappeler ce qu'elle a fait, afin de préparer son CV. ${contextDesc}${knownBlock}${briefBlockTxt}

            ${genderDirective()}

            Parle-lui SIMPLEMENT, comme dans une vraie conversation entre deux personnes. Ton naturel et posé.

            RÈGLES IMPÉRATIVES :
            - Pose UNE SEULE question à la fois, courte et concrète, sur ce qu'elle faisait vraiment : le quotidien, un exemple précis, avec qui elle travaillait, comment elle s'y prenait, ce qui marchait bien, ce qui était compliqué, ce dont elle est contente.
            - Ne lui demande JAMAIS de nommer ses qualités, ses "soft skills", ses "compétences" ou "ce que ça lui a apporté". C'est TON travail à toi de les repérer plus tard, pas le sien. Elle, elle raconte juste des faits.
            - Reste sobre : pas de "wow", "génial", "formidable", "bravo". Un simple "d'accord", "je vois", "et ensuite ?" suffit.
            - Rebondis sur ce qu'elle vient de dire pour creuser un détail concret (un chiffre, un exemple, un résultat) quand ça vient naturellement, sans forcer.
            - Emploie des mots simples et des phrases courtes. Pas de listes à puces, pas de jargon RH.
            - Écris en TEXTE SIMPLE uniquement : aucun formatage markdown, pas d'astérisques (*), pas de dièses (#), pas de puces, pas de gras. Juste des phrases normales.`;
            }

            // Vers la fin de l'entretien : inviter en douceur à conclure
            const remaining = MAX_ANSWERS - chatAnswerCount();
            const limitNote = remaining <= 2
                ? `\n\nIMPORTANT : l'entretien touche à sa fin. Pose une toute dernière question simple, ou invite gentiment la personne à conclure en cliquant sur « Terminer l'interview ».`
                : "";

            try {
                const response = await callAssistantAPI(text, sysPrompt + limitNote, chatState.history.slice(0, -1));
                addMessageToUI('model', response);
                chatState.history.push({ role: 'model', parts: [{ text: response }] });
                persistChatHistory();
            } catch (e) {
                addMessageToUI('model', "⚠️ Désolé, un problème réseau est survenu. Pouvez-vous répéter ?");
            } finally {
                document.getElementById('chat-typing').classList.add('hidden');
                if (chatAnswerCount() >= MAX_ANSWERS) lockChatInput();
            }
        }

        async function summarizeAndCloseChat() {
            const btn = event.currentTarget;
            if (chatState.type === 'profile') return proposeProfileVersions(btn);
            const originalText = btn.innerHTML;
            btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Extraction...";
            btn.disabled = true;

            let sysPrompt;
            if (chatState.type === 'languages') {
                sysPrompt = `Voici une conversation où une personne a décrit son usage réel d'une langue.
            À partir de ces FAITS, propose une façon PRUDENTE et honnête d'afficher son niveau sur un CV.
            Écris deux ou trois phrases maximum :
            1. Une formulation d'affichage possible, en mots simples (par exemple : "Courant à l'oral, correct à l'écrit", "Notions", "Usage professionnel courant", "Langue maternelle"). Évite les niveaux officiels type A2, B1, C1 sauf si la personne a mentionné un diplôme ou un test précis.
            2. Un mot de nuance rappelant que ce conseil se base sur quelques questions et ne remplace pas une évaluation réelle.
            N'invente aucun élément non dit dans la conversation. Ne t'adresse pas directement à la personne, donne juste le conseil.

            FORMAT : TEXTE SIMPLE uniquement. Aucun markdown : pas de dièses (#), pas d'astérisques (*), pas de gras, pas de puces. Pas de phrase d'introduction type "Voici".`;
            } else {
                sysPrompt = `Tu es un expert en bilan professionnel. Voici une conversation où une personne a raconté, avec ses mots simples, ce qu'elle a fait.
            À partir de ces FAITS, produis une synthèse utile pour rédiger un CV :
            1. Les faits concrets : missions, tâches, réalisations, résultats ou chiffres cités, outils/méthodes employés.
            2. Les compétences que TU DÉDUIS de ces faits, sans qu'elle ait eu à les nommer : compétences techniques (hard skills) ET qualités humaines / savoir-être (soft skills) réellement démontrés par ce qu'elle raconte.
            Si une synthèse précédente est fournie, CONSOLIDE-LA avec les nouveaux éléments (fusionne, ne perds rien d'important, ne duplique pas).

            ${genderDirective()}
            Sois factuel et concis. N'invente rien qui ne soit pas soutenu par la conversation. Ne t'adresse pas à la personne, fournis uniquement la synthèse.

            FORMAT : écris en TEXTE SIMPLE uniquement. Aucun markdown : pas de dièses (#), pas d'astérisques (*), pas de gras, pas de titres numérotés type "### 1.", pas de puces markdown. Sépare tes idées par des phrases ou des retours à la ligne normaux. Ne mets aucune phrase d'introduction du genre "Voici la synthèse".`;
            }

            const priorDetails = (db[chatState.type][chatState.index].details || "").trim();
            const priorBlock = priorDetails ? `\n\nSYNTHÈSE PRÉCÉDENTE (à consolider) :\n${priorDetails}` : "";
            let convoText = chatState.history.map(m => `${m.role === 'user' ? 'Candidat' : 'Coach'}: ${m.parts[0].text}`).join('\n\n');

            try {
                const summary = await callAssistantAPI("Produis la synthèse consolidée de cet élément.", sysPrompt + priorBlock + "\n\nCONVERSATION:\n" + convoText);
                db[chatState.type][chatState.index].details = stripMarkdown(summary);
                saveDB();
                renderDB();
                closeChatModal();
            } catch (e) {
                alert("Erreur lors de la synthèse. Réessayez.");
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }

        // --- GESTION DE L'OVERLAY D'ERREUR ---
        function resetGenerationOverlay() {
            document.getElementById('generation-overlay-content').innerHTML = `
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#1E7A6B] border-t-transparent mb-4"></div>
                <p id="overlay-title" class="text-[#123F39] font-bold text-lg loading-dots">Analyse et Synthèse en cours</p>
                <p id="overlay-sub" class="text-sm text-slate-500 mt-2">L'IA rédige votre CV sur mesure...</p>
            `;
            document.getElementById('generation-overlay').classList.add('hidden');
        }

        function showGenerationError(errorMsg) {
            document.getElementById('generation-overlay-content').innerHTML = `
                <div class="flex flex-col items-center max-w-sm text-center">
                    <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                    <p class="text-red-700 font-bold mb-2">Un problème est survenu</p>
                    <p class="text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded border border-slate-200">${errorMsg}</p>
                    <button onclick="resetGenerationOverlay()" class="bg-red-100 hover:bg-red-200 transition text-red-700 px-6 py-2 rounded-lg font-bold shadow-sm">
                        Fermer et modifier l'offre
                    </button>
                </div>
            `;
        }

        // --- ESPACE 1 : CONSEILS DE L'IA AVANT DE RÉDIGER ---
        // But : orienter le candidat vers les mini-chats d'enrichissement les plus utiles pour l'offre.
        async function getCoachingTips() {
            if (!ensureApiKey()) return;
            const targetJob = document.getElementById('job-offer-input').value.trim();
            if (!targetJob) { alert("Colle d'abord l'offre ou l'objectif visé pour recevoir des conseils."); return; }
            if (db.experiences.length === 0 && db.education.length === 0) {
                alert("Ajoute d'abord au moins une expérience ou une formation dans la base de données.");
                return;
            }

            const btn = document.getElementById('btn-coach');
            const orig = btn.innerHTML;
            btn.innerHTML = "<i class='fas fa-spinner fa-spin mr-2'></i> Analyse de l'offre...";
            btn.disabled = true;
            const box = document.getElementById('coach-box');

            // On envoie seulement les titres + l'état (déjà détaillé ou non) : léger et suffisant pour orienter.
            const items = [];
            db.experiences.forEach(e => items.push(`Expérience : "${e.title || 'sans titre'}"${e.company ? ' chez ' + e.company : ''}${e.date ? ' (' + e.date + ')' : ''} — ${e.details ? 'déjà détaillée' : 'PAS ENCORE détaillée'}`));
            db.education.forEach(e => items.push(`Formation : "${e.title || 'sans titre'}"${e.school ? ' à ' + e.school : ''} — ${e.details ? 'déjà détaillée' : 'PAS ENCORE détaillée'}`));
            db.interests.forEach(e => items.push(`Intérêt : "${e.title || 'sans titre'}"`));

            const sysPrompt = `Tu es un conseiller emploi posé et direct. Tu tutoies le candidat.
Il s'apprête à générer un CV ciblé sur une offre. Avant ça, aide-le à rassembler la bonne matière.
À partir de l'offre et de la liste de SES expériences/formations, écris un message court : 3 à 5 phrases, en texte suivi, SANS listes à puces.
Fais exactement ceci :
1. Nomme en une phrase le poste visé et l'enjeu principal.
2. Repère 1 à 3 éléments de SA liste les plus pertinents pour cette offre et invite-le à cliquer sur "Détailler avec IAMONCV" à côté de chacun pour les enrichir. Priorise ceux marqués "PAS ENCORE détaillée".
3. Termine par 1 ou 2 infos à ne pas oublier de mentionner (résultats chiffrés, outils, compétence clé du domaine).

TON (impératif) : reste sobre et factuel. Pas de superlatifs ni de flatterie. Bannis les mots comme « formidable », « génial », « parfait », « parfaitement adapté », « excellent », « idéal », « atout majeur », « incroyable », « super ». N'évalue pas la valeur du candidat ni son adéquation avec l'offre : tu orientes la préparation, tu ne juges pas. Dis simplement quoi détailler et pourquoi, avec des mots neutres. Tu ne rédiges pas le CV, tu donnes le cap.

${genderDirective()}`;

            const userPrompt = `Offre visée :\n${targetJob}\n\nMes expériences, formations et intérêts :\n${items.join('\n')}`;

            try {
                const tips = await callAssistantAPI(userPrompt, sysPrompt);
                box.innerHTML = formatChatText(tips);
                box.classList.remove('hidden');
            } catch (e) {
                if (e.isKeyError) {
                    showAiAccessError(e);
                } else {
                    box.innerHTML = "⚠️ Impossible d'obtenir les conseils pour l'instant. Réessaie dans un moment.";
                    box.classList.remove('hidden');
                }
            } finally {
                btn.innerHTML = orig;
                btn.disabled = false;
            }
        }

        // --- OUTILS PARTAGÉS ---
        // Extrait l'année la plus récente d'une chaîne de date (ex: "2020-2023" -> 2023)
        function extractYear(dateString) {
            if (!dateString) return 0;
            const matches = String(dateString).match(/\b(19|20)\d{2}\b/g);
            if (matches && matches.length > 0) return Math.max(...matches.map(Number));
            return 0;
        }
        function sortByDateDesc(arr) {
            return (arr || []).slice().sort((a, b) => extractYear(b.date) - extractYear(a.date));
        }

        // Extraction robuste du JSON renvoyé par l'IA
        function parseCvJson(response) {
            const match = response.match(/\{[\s\S]*\}/);
            if (!match) throw new Error("L'IA n'a pas renvoyé le format attendu.");
            let jsonStr = match[0];
            try {
                return JSON.parse(jsonStr);
            } catch (parseErr) {
                const cleanedStr = jsonStr.replace(/\n/g, " ").replace(/\r/g, "");
                return JSON.parse(cleanedStr);
            }
        }

        // --- AJUSTEMENT "UNE PAGE" ---
        // Principe : d'abord resserrer LÉGÈREMENT la mise en page (aucune perte de contenu).
        // L'IA n'intervient que si le dépassement reste trop important même resserré au maximum.

        // Constantes de mise en page (DOIVENT rester synchronisées avec le bloc @media print).
        const CVL = { pad: 13, sec: 1.7, exp: 1.05, h2: 0.85, line: 1.45, side: 2 };

        // Marge de sécurité : on vise à remplir ~96% de la page, jamais 100%,
        // pour absorber les petits écarts entre la mesure et le rendu réel de l'impression
        // (sinon une dernière ligne peut déborder d'un cheveu sur une 2e page).
        const FIT_TARGET = 0.96;

        // Niveaux de resserrement, du plus léger au plus dense. space = marges verticales, line = interligne.
        const COMPACTION_STEPS = [
            { s: 1.00, l: 1.00 },
            { s: 0.96, l: 1.00 },
            { s: 0.92, l: 0.99 },
            { s: 0.88, l: 0.98 },
            { s: 0.84, l: 0.97 },
            { s: 0.80, l: 0.96 },
            { s: 0.75, l: 0.95 },
            { s: 0.70, l: 0.94 },
            { s: 0.64, l: 0.93 },
            { s: 0.58, l: 0.92 }
        ];
        let appliedSpace = 1, appliedLine = 1;

        // Mesure le rapport hauteur/A4 en simulant l'impression au niveau de resserrement donné.
        // Renvoie la colonne la plus haute (c'est elle qui fait déborder la page).
        function measureRatio(space, line) {
            return measureColumns(space, line).ratio;
        }

        // Mesure chaque colonne séparément : la gauche (sidebar) et la droite (contenu)
        // ne se raccourcissent pas de la même façon, il faut savoir laquelle déborde.
        function measureColumns(space, line) {
            const src = document.getElementById('cv-content');
            if (!src) return { ratio: 1, side: 1, main: 1 };
            const clone = src.cloneNode(true);
            clone.removeAttribute('id');
            clone.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); // éviter tout doublon d'id (ex: profile-upload)
            clone.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));
            // Mesurer comme à l'impression : retirer les éléments d'écran (boutons « Ajouter »,
            // rubriques vides, masquées) qui ne figurent PAS sur le PDF final. Sinon on surestime
            // la hauteur et on affiche un « dépassement » alors qu'il reste de la place.
            clone.querySelectorAll('.no-print, .empty-section, .hidden').forEach(e => e.remove());
            const sb = clone.querySelector('.sidebar');
            const mc = clone.querySelector('.main-content');
            if (sb) { sb.classList.remove('md:w-1/3', 'w-full', 'p-6', 'md:p-8'); sb.style.cssText += `;width:33%;padding:${CVL.pad * space}mm 8mm;`; }
            if (mc) { mc.classList.remove('md:w-2/3', 'w-full', 'p-6', 'md:p-10'); mc.style.cssText += `;width:67%;padding:${CVL.pad * space}mm 11mm;`; }
            clone.style.cssText += ';width:210mm;min-height:0;display:flex;flex-direction:row;align-items:flex-start;box-shadow:none;margin:0;max-width:none;';
            clone.querySelectorAll('section').forEach(s => s.style.marginBottom = (CVL.sec * space) + 'rem');
            clone.querySelectorAll('.experience-item').forEach(s => s.style.marginBottom = (CVL.exp * space) + 'rem');
            clone.querySelectorAll('h2').forEach(s => s.style.marginBottom = (CVL.h2 * space) + 'rem');
            clone.querySelectorAll('.sidebar > .mb-8').forEach(s => s.style.marginBottom = (CVL.side * space) + 'rem');
            clone.querySelectorAll('p, li').forEach(s => s.style.lineHeight = (CVL.line * line));
            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:#fff;';
            wrap.appendChild(clone);
            document.body.appendChild(wrap);
            const pxPerMm = clone.offsetWidth / 210;
            const pageH = 297 * pxPerMm;
            // align-items:flex-start : chaque colonne prend sa hauteur naturelle.
            const side = sb ? sb.offsetHeight / pageH : 0;
            const main = mc ? mc.offsetHeight / pageH : 0;
            const ratio = Math.max(side, main, sb || mc ? 0 : clone.scrollHeight / pageH);
            document.body.removeChild(wrap);
            return { ratio, side, main };
        }

        // Applique un niveau de resserrement au CV réel (variables CSS lues à l'impression).
        function applyCompaction(space, line) {
            const el = document.getElementById('cv-content');
            if (!el) return;
            el.style.setProperty('--cvspace', space);
            el.style.setProperty('--cvline', line);
            appliedSpace = space;
            appliedLine = line;
        }

        // Cherche le resserrement le plus LÉGER qui fait tenir le CV sur une page (avec marge de sécurité).
        function findFittingCompaction() {
            for (const st of COMPACTION_STEPS) {
                if (measureRatio(st.s, st.l) <= FIT_TARGET) return st;
            }
            return null;
        }

        // Message affiché dans l'overlay pendant les traitements
        function setOverlayMessage(title, sub) {
            const t = document.getElementById('overlay-title');
            const s = document.getElementById('overlay-sub');
            if (t) t.textContent = title;
            if (s) s.textContent = sub || '';
        }

        // Un passage de condensation IA : on demande de raccourcir LE MINIMUM nécessaire.
        async function condensePass(overflowPct) {
            const current = {
                profile: cvData.profile,
                skills: cvData.skills,
                experiences: (cvData.experiences || []).map(e => ({ title: e.title, company: e.company, date: e.date, tasks: e.tasks || [] })),
                education: (cvData.education || []).map(e => ({ title: e.title, school: e.school, date: e.date })),
                interests: cvData.interests || []
            };
            const pct = overflowPct || 12;

            const sys = `Tu es un expert CV. Le CV (JSON) ci-dessous dépasse une page A4 d'environ ${pct}%, MALGRÉ une mise en page déjà resserrée au maximum.
            Objectif : raccourcir LE STRICT MINIMUM nécessaire pour qu'il tienne sur UNE page, tout en la gardant BIEN REMPLIE. Ne laisse jamais la page à moitié vide. Retire le moins de choses possible.
            Applique ces retouches dans l'ordre et ARRÊTE-TOI dès que c'est suffisant (vise à retirer environ ${pct}% de matière, pas plus) :
            1. Raccourcis les formulations les plus longues (profil trop bavard, puces verbeuses) sans perdre le sens ni les mots-clés de l'offre.
            2. Retire 1 puce parmi les moins utiles des expériences les MOINS pertinentes.
            3. Seulement si le dépassement dépasse ~20% : regroupe les postes les plus anciens et mineurs en une seule entrée synthétique (title "Expériences antérieures", company vide, date couvrant la plage d'années, 1 puce de résumé).
            Ne supprime AUCUNE expérience pertinente pour l'offre. Conserve titres, entreprises, écoles et dates. Ne réintroduis aucune donnée personnelle (nom, contact). Garde l'ordre anti-chronologique.
            Réponds STRICTEMENT en JSON valide, même structure {profile, skills, experiences[{title,company,date,tasks}], education[{title,school,date}], interests}, sans texte autour, avec "\\n" pour tout retour à la ligne.`;

            const user = `CV actuel (JSON) :\n${JSON.stringify(current)}\n\nCe CV dépasse d'environ ${pct}% une fois resserré. Raccourcis-le juste assez pour qu'il tienne, en gardant la page bien remplie.`;

            const resp = await callAssistantAPI(user, sys);
            const data = parseCvJson(resp);
            if (!data) return false;
            cvData.profile = (data.profile != null) ? data.profile : cvData.profile;
            cvData.skills = data.skills || cvData.skills;
            cvData.experiences = sortByDateDesc(data.experiences || cvData.experiences);
            cvData.education = sortByDateDesc(data.education || cvData.education);
            cvData.interests = data.interests || cvData.interests;
            return true;
        }

        // Condensation de la colonne de GAUCHE (compétences, outils, centres d'intérêt).
        // Raccourcir les expériences ne sert à rien quand c'est la colonne de gauche qui déborde.
        async function condenseSidebarPass(overflowPct) {
            const current = {
                skills: cvData.skills || [],
                tools: cvData.tools || [],
                interests: cvData.interests || []
            };
            const pct = overflowPct || 12;
            const sys = `Tu es un expert CV. La colonne latérale (étroite, environ un tiers de la page) d'un CV dépasse d'environ ${pct}% la hauteur d'une page A4.
            Raccourcis-la LE STRICT MINIMUM pour qu'elle tienne, sans rien inventer :
            1. Libellés courts : 2 à 5 mots par compétence ou outil. Supprime les parenthèses explicatives longues.
            2. Regroupe les outils de même nature en une seule entrée (ex. « Tests de personnalité (16PF, PerformanSe) », « Pack Office »).
            3. Si ça ne suffit pas : garde au plus 6 compétences et 8 outils, en retirant les moins utiles.
            4. Centres d'intérêt : 3 au plus, une ligne courte chacun.
            Ne réintroduis aucune donnée personnelle.
            Réponds STRICTEMENT en JSON valide, sans texte autour : {"skills": [""], "tools": [""], "interests": [""]}`;
            const user = `Colonne latérale actuelle (JSON) :\n${JSON.stringify(current)}\n\nElle dépasse d'environ ${pct}%. Raccourcis-la juste assez.`;
            const resp = await callAssistantAPI(user, sys);
            const data = parseCvJson(resp);
            if (!data) return false;
            const clean = (arr, fallback) => Array.isArray(arr) ? arr.map(x => String(x || '').trim()).filter(Boolean) : fallback;
            cvData.skills = clean(data.skills, cvData.skills);
            cvData.tools = clean(data.tools, cvData.tools);
            cvData.interests = clean(data.interests, cvData.interests);
            return true;
        }

        // Ajustement complet : resserrement d'abord, condensation IA seulement si nécessaire.
        // maxAiPasses = 0 : ne jamais appeler l'IA (resserrement pur).
        async function fitToOnePage(maxAiPasses) {
            // 1) Peut-on tenir en resserrant simplement la mise en page ?
            let step = findFittingCompaction();
            if (step) { applyCompaction(step.s, step.l); return true; }

            // 2) Toujours trop long même au resserrement maximal : on demande à l'IA de raccourcir un peu.
            const maxStep = COMPACTION_STEPS[COMPACTION_STEPS.length - 1];
            for (let p = 0; p < (maxAiPasses || 0); p++) {
                // Dépassement résiduel une fois resserré au max, colonne par colonne :
                // on raccourcit la colonne qui déborde, pas l'autre.
                const cols = measureColumns(maxStep.s, maxStep.l);
                const sideFirst = cols.side > FIT_TARGET && cols.side >= cols.main;
                const ratioTight = sideFirst ? cols.side : cols.main;
                const overflowPct = Math.max(5, Math.round((ratioTight - FIT_TARGET) * 100));
                setOverlayMessage('Ajustement sur 1 page…', sideFirst
                    ? `La colonne de gauche est un peu longue (~${overflowPct}%). L'IA raccourcit les libellés.`
                    : `Le CV reste un peu long (~${overflowPct}%). L'IA raccourcit le minimum nécessaire.`);
                const ok = sideFirst ? await condenseSidebarPass(overflowPct) : await condensePass(overflowPct);
                if (!ok) break;
                renderCV();
                step = findFittingCompaction();
                if (step) { applyCompaction(step.s, step.l); return true; }
            }

            // 3) Dernier recours : resserrement maximal (peut légèrement déborder, l'utilisateur ajustera).
            const last = COMPACTION_STEPS[COMPACTION_STEPS.length - 1];
            applyCompaction(last.s, last.l);
            return measureRatio(last.s, last.l) <= 1.0;
        }

        // Badge sous le CV : état réel après ajustement.
        function updateOnePageStatus() {
            const box = document.getElementById('onepage-status');
            if (!box) return;
            if ((!cvData.experiences || !cvData.experiences.length) && !cvData.profile) { box.innerHTML = ''; return; }
            const ratio = measureRatio(appliedSpace, appliedLine);
            if (ratio <= FIT_TARGET + 0.025) {
                const tight = appliedSpace < 0.999;
                box.innerHTML = `<span class="inline-flex items-center gap-1 text-[#1E7A6B] font-semibold"><i class="fas fa-circle-check"></i> Ce CV tient sur une page${tight ? ' (mise en page resserrée)' : ''}.</span>`;
            } else {
                const pct = Math.round((ratio - 1) * 100);
                box.innerHTML = `<span class="inline-flex items-center gap-2 flex-wrap justify-center">
                        <span class="text-amber-600 font-semibold"><i class="fas fa-triangle-exclamation"></i> Le CV dépasse encore d'environ ${pct}%.</span>
                        <button onclick="condenseToOnePage()" class="bg-[#EE6E5E] hover:bg-[#e0563f] text-white font-bold px-3 py-1 rounded-lg text-xs transition"><i class="fas fa-compress mr-1"></i> Raccourcir avec l'IA</button>
                    </span>`;
            }
        }

        // Bouton manuel : resserre puis, si besoin, demande à l'IA de raccourcir jusqu'à tenir.
        async function condenseToOnePage() {
            if (!ensureApiKey()) return;
            if (!cvData.experiences || (!cvData.experiences.length && !cvData.profile)) return;
            const overlay = document.getElementById('generation-overlay');
            overlay.classList.remove('hidden');
            setOverlayMessage('Ajustement sur 1 page…', "Optimisation de la mise en page…");
            try {
                await fitToOnePage(2);
            } catch (e) {
                if (e.isKeyError) { showAiAccessError(e); }
            }
            renderCV();
            resetGenerationOverlay();
            updateOnePageStatus();
        }

        // --- GÉNÉRATION DU CV FINALE (LE CŒUR DE L'IA) ---
        async function generateCV() {
            if(!ensureApiKey()) return;
            const targetJob = document.getElementById('job-offer-input').value.trim();
            if(!targetJob) { alert("Veuillez coller l'offre d'emploi ou indiquer l'objectif cible pour permettre à l'IA d'adapter le CV."); return; }
            if (db.jobOffer !== targetJob) { db.jobOffer = targetJob; saveDB(); }
            if(db.experiences.length === 0 && db.education.length === 0) { alert("Veuillez ajouter au moins une expérience ou une formation dans la base de données."); return; }
            if(!db.gender) {
                alert("Veuillez d'abord indiquer l'accord du CV (féminin ou masculin) dans la colonne de gauche, pour que l'IA rédige au bon genre.");
                const sel = document.getElementById('cv-gender');
                if (sel) { sel.focus(); sel.classList.add('ring-2','ring-[#EE6E5E]'); setTimeout(function(){ sel.classList.remove('ring-2','ring-[#EE6E5E]'); }, 2500); }
                return;
            }

            const overlay = document.getElementById('generation-overlay');
            overlay.classList.remove('hidden');
            setOverlayMessage('Analyse et Synthèse en cours', "L'IA rédige votre CV sur mesure…");

            // Trier les données DB *avant* de les envoyer à l'IA pour l'influencer dans le bon ordre
            let sortedDb = JSON.parse(JSON.stringify(db)); // Copie profonde
            sortedDb.experiences = sortByDateDesc(sortedDb.experiences);
            sortedDb.education = sortByDateDesc(sortedDb.education);

            // CONFIDENTIALITÉ : on n'envoie à l'IA que le parcours, jamais le nom ni les coordonnées.
            const aiPayload = {
                experiences: sortedDb.experiences || [],
                education: sortedDb.education || [],
                interests: sortedDb.interests || [],
                languages: sortedDb.languages || [],
                tools: sortedDb.tools || []
            };

            const safeTargetJob = JSON.stringify(targetJob);
            const safeDbJson = JSON.stringify(aiPayload);

            const userNote = (document.getElementById('user-note-input').value || '').trim();
            const safeUserNote = JSON.stringify(userNote);

            const sysPrompt = `Tu es à la fois un concepteur de CV expert et un spécialiste du recrutement qui connaît les attentes des employeurs et le fonctionnement des logiciels ATS.

            RÈGLE LÉGALE ABSOLUE : n'invente JAMAIS d'expérience, de diplôme, de date ni de résultat chiffré. Utilise EXCLUSIVEMENT la base de données fournie. Tu peux reformuler, synthétiser et mettre en valeur ce qui existe, jamais fabriquer ce qui n'existe pas.

            MÉTHODE D'ANALYSE (à appliquer avant de rédiger) :
            1. Lis l'offre et repère les vraies attentes : missions, compétences, savoir-être, outils et mots-clés importants.
            2. Passe en revue CHAQUE expérience et formation du candidat et cherche activement ce qui répond à ces attentes, même quand le lien n'est pas évident au premier abord (compétences transférables).
            3. Pour chaque élément pertinent, reformule avec un verbe d'action fort et, quand l'information existe déjà dans la base, un résultat concret ou chiffré.
            4. Réemploie le vocabulaire exact de l'offre quand c'est justifié : c'est ce qui rend le CV lisible par les ATS.

            CONTRAINTE ABSOLUE : LE CV DOIT TENIR SUR UNE SEULE PAGE A4.
            C'est la règle la plus importante. Mieux vaut un CV court et percutant qu'un CV complet qui déborde. Pour cela :
            - "profile" : accroche de 3 à 4 lignes, taillée pour ce poste précis, qui met en avant l'adéquation du candidat avec l'offre.
            - Expériences pertinentes pour l'offre : 2 à 4 'tasks' fortes, orientées résultat et alignées sur les attentes de l'offre.
            - Expériences anciennes ou hors sujet : 0 ou 1 'task' maximum.
            - Si le parcours est long, REGROUPE les postes anciens, courts ou peu pertinents en une seule entrée synthétique (ex. title "Expériences antérieures", company vide, date couvrant la plage d'années, 1 puce résumant). Sélectionne l'essentiel, ne cherche pas à tout caser.
            - "skills" : 4 à 8 compétences tirées de l'ensemble du parcours et réellement en lien avec l'offre. Priorise les compétences nommées dans l'annonce. Libellés courts (2 à 5 mots) : ils s'affichent dans une colonne étroite.
            - "languages" : reprends les langues fournies. Pour chaque langue, "name" = la langue, "level" = l'affichage du niveau. Si le champ "level" fourni est rempli, reprends-le tel quel ; sinon déduis un affichage prudent à partir des notes ("details") sans inventer de niveau officiel. Si aucune langue n'est fournie, renvoie un tableau vide.
            - "tools" : reprends les outils numériques fournis (titres), sans en inventer. Renvoie un tableau de chaînes. Vide si rien n'est fourni. Libellés courts (2 à 4 mots, sans longue parenthèse) ; regroupe les outils de même nature ; 8 au maximum, les plus utiles pour l'offre.
            - "interests" : 3 au maximum, une ligne courte chacun.
            - Conserve les titres, entreprises, écoles et dates d'origine sans les modifier (sauf regroupement explicite ci-dessus).

            FORME DU PROFIL (impératif) : phrases complètes avec verbe conjugué, jamais une liste de verbes à l'infinitif façon fiche de poste.
            TON (impératif) : rédige sobrement, sans autopromotion excessive ni superlatifs. Bannis « parfaitement adapté », « profil idéal », « candidat parfait », « atout majeur », « excellence », « passionné(e) par », « dynamique et motivé(e) ». L'accroche décrit des faits et un savoir-faire, elle ne se vante pas. Préfère des formulations neutres et concrètes.

            CONSIGNE DU CANDIDAT : si une consigne personnelle est fournie plus bas, respecte-la en priorité (sans jamais enfreindre la règle légale ci-dessus).

            RÈGLES DE FORMATAGE JSON OBLIGATOIRES :
            1. RÉPONDS STRICTEMENT AVEC UN OBJET JSON VALIDE ET RIEN D'AUTRE (ni texte avant, ni texte après, pas de markdown).
            2. INTERDICTION ABSOLUE D'UTILISER DES VRAIS SAUTS DE LIGNE à l'intérieur des valeurs texte. Si tu dois sauter une ligne, utilise obligatoirement les caractères "\\n" (backslash n).

            STRUCTURE JSON ATTENDUE :
            {
                "profile": "Accroche sur mesure sans retour à la ligne réel...",
                "skills": ["Compétence 1", "Compétence 2"],
                "experiences": [
                    {"title": "Garde LE TITRE ORIGINAL", "company": "...", "date": "...", "tasks": ["Action 1", "Action 2"]}
                ],
                "education": [{"title": "...", "school": "...", "date": "..."}],
                "interests": ["Intérêt 1", "Intérêt 2"],
                "languages": [{"name": "Anglais", "level": "Courant"}],
                "tools": ["Excel", "Canva"]
            }`;

            // Choix faits dans l'atelier profil : ils guident l'accroche.
            const profileBrief = (db.profileBrief || '').trim();
            const profileChoisi = (db.profileChoisi || '').trim();
            const profileBlock = (profileBrief || profileChoisi)
                ? `Pour le champ "profile", le candidat a précisé ses attentes lors d'un échange (à respecter en priorité : mots choisis, mots refusés, ton, ce qu'il ne veut pas afficher) :\n${JSON.stringify(profileBrief)}\n${profileChoisi ? `Accroche qu'il avait validée (pars de celle-ci et ajuste-la seulement à l'offre) :\n${JSON.stringify(profileChoisi)}\n` : ''}\n`
                : '';

            const userPrompt = `Base de données brute :\n${safeDbJson}\n\nOffre ou cible visée :\n${safeTargetJob}\n\n${userNote ? `Consigne personnelle du candidat (à respecter en priorité) :\n${safeUserNote}\n\n` : ''}${profileBlock}${genderDirective()}\n\nGénère le CV JSON conforme aux règles.`;

            try {
                const response = await callAssistantAPI(userPrompt, sysPrompt);
                const generatedData = parseCvJson(response);

                // Infos perso : jamais issues de l'IA. On garde ce que l'utilisateur a saisi
                // directement dans le CV (sinon on laisse un texte d'invite à compléter).
                if (!cvData.name) cvData.name = "Prénom Nom";
                if (!cvData.contact) cvData.contact = "Vos coordonnées (cliquez pour compléter)";
                cvData.job = targetJob.split('\n')[0].substring(0,50); // Titre court basé sur l'offre
                cvData.profile = generatedData.profile || "";
                cvData.skills = generatedData.skills || [];

                // Assurer le tri anti-chronologique des résultats renvoyés par l'IA
                cvData.experiences = sortByDateDesc(generatedData.experiences || []);
                cvData.education = sortByDateDesc(generatedData.education || sortedDb.education);
                cvData.interests = generatedData.interests || db.interests.map(i=>i.title);
                cvData.languages = (generatedData.languages || db.languages.map(l => ({ name: l.title, level: l.level || '' })))
                    .filter(l => l && (l.name || l.level));
                cvData.tools = (generatedData.tools || db.tools.map(t => t.title)).filter(t => t && String(t).trim());

                renderCV();

                // FORCER 1 PAGE : si le CV déborde, l'IA le condense automatiquement (jusqu'à 2 passes).
                await fitToOnePage(2);

                renderCV();
                saveCV();
                resetGenerationOverlay();
                updateOnePageStatus();
            } catch (e) {
                console.error("Erreur de génération :", e);
                if (e.isKeyError) {
                    resetGenerationOverlay();
                    showAiAccessError(e);
                } else {
                    showGenerationError("Le texte de l'offre copiée contient des éléments qui ont perturbé l'analyse (ou l'IA est surchargée). Essayez de copier uniquement le texte principal de l'offre (sans les menus ou boutons du site).");
                }
            }
        }

        // --- AFFICHAGE ET ÉDITION MANUELLE DU CV ---
        function updateCVField(field, value) { cvData[field] = value; saveCV(); }
        function updateCVExp(i, field, value) { cvData.experiences[i][field] = value; saveCV(); }
        function updateCVTask(ei, ti, value) { cvData.experiences[ei].tasks[ti] = value; saveCV(); }
        function updateCVEdu(i, field, value) { cvData.education[i][field] = value; saveCV(); }
        function updateCVSkill(i, value) { if (cvData.skills[i] !== undefined) { cvData.skills[i] = value; saveCV(); } }
        function updateCVInterest(i, value) { if (cvData.interests[i] !== undefined) { cvData.interests[i] = value; saveCV(); } }

        // Ajout / retrait d'éléments directement sur le CV généré (colonne droite).
        // On revalide toujours l'édition en cours pour ne pas perdre une saisie non enregistrée.
        function commitPendingEdit() {
            const a = document.activeElement;
            if (a && a.isContentEditable && typeof a.blur === 'function') a.blur();
        }
        function refreshCV() { renderCV(); saveCV(); if (typeof updateOnePageStatus === 'function') updateOnePageStatus(); }

        // Coller depuis Word, un PDF ou une page web : on ne garde que le texte brut,
        // sinon la mise en forme d'origine (polices, couleurs, blocs) casse le CV.
        // Tout tient sur une ligne, sauf le profil qui accepte plusieurs paragraphes.
        function pastePlainText(e) {
            let el = e.target;
            if (el && el.nodeType === 3) el = el.parentElement;
            el = el && el.closest ? el.closest('[contenteditable="true"]') : null;
            if (!el || !e.clipboardData) return;
            e.preventDefault();
            let text = (e.clipboardData.getData('text/plain') || '')
                .replace(/\r\n?/g, '\n')
                .replace(/[\t  ]+/g, ' ')
                .replace(/^[ ]*[•●▪◦‣■□➢✓\-–—*][ ]+/gm, '');
            text = el.id === 'cv-profile'
                ? text.replace(/[ ]*\n[ ]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
                : text.replace(/\s*\n\s*/g, ' ').replace(/ {2,}/g, ' ').trim();
            document.execCommand('insertText', false, text);
        }
        document.addEventListener('paste', pastePlainText);

        function addCVSkill() { commitPendingEdit(); cvData.skills = cvData.skills || []; cvData.skills.push('Nouvelle compétence'); refreshCV(); }
        function removeCVSkill(i) { commitPendingEdit(); cvData.skills.splice(i, 1); refreshCV(); }
        // Les compétences arrivent dans l'ordre choisi par l'IA : la personne peut le changer.
        function moveCVSkill(i, dir) {
            commitPendingEdit();
            const s = cvData.skills, j = i + dir;
            if (!s || j < 0 || j >= s.length) return;
            [s[i], s[j]] = [s[j], s[i]];
            refreshCV();
        }
        function skillMoveButtons(i, n) {
            const btn = (dir, icon, title) => `<button onclick="moveCVSkill(${i}, ${dir})" title="${title}" class="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white text-[8px] leading-none"><i class="fas fa-arrow-${icon}"></i></button>`;
            return `<span class="no-print absolute top-1/2 -translate-y-1/2 right-5 flex gap-0.5 th-bg-avatar pl-1 opacity-0 group-hover/sk:opacity-100 transition">${i > 0 ? btn(-1, 'up', 'Monter') : ''}${i < n - 1 ? btn(1, 'down', 'Descendre') : ''}</span>`;
        }

        function addCVInterest() { commitPendingEdit(); cvData.interests = cvData.interests || []; cvData.interests.push('Nouveau centre d\'intérêt'); refreshCV(); }
        function removeCVInterest(i) { commitPendingEdit(); cvData.interests.splice(i, 1); refreshCV(); }

        function addCVExp() { commitPendingEdit(); cvData.experiences = cvData.experiences || []; cvData.experiences.push({ title: 'Intitulé du poste', company: 'Entreprise', date: '', tasks: ['À compléter'] }); refreshCV(); }
        function removeCVExp(i) { commitPendingEdit(); cvData.experiences.splice(i, 1); refreshCV(); }
        function addCVTask(ei) { commitPendingEdit(); cvData.experiences[ei].tasks = cvData.experiences[ei].tasks || []; cvData.experiences[ei].tasks.push('À compléter'); refreshCV(); }
        function removeCVTask(ei, ti) { commitPendingEdit(); cvData.experiences[ei].tasks.splice(ti, 1); refreshCV(); }

        function addCVEdu() { commitPendingEdit(); cvData.education = cvData.education || []; cvData.education.push({ title: 'Diplôme / Formation', school: 'Établissement', date: '' }); refreshCV(); }
        function removeCVEdu(i) { commitPendingEdit(); cvData.education.splice(i, 1); refreshCV(); }

        // Intitulés de rubrique personnalisables (ex. « Expérience » au singulier).
        function updateCVLabel(key, value) { cvData.labels = cvData.labels || {}; cvData.labels[key] = value; saveCV(); }
        function cvLabel(key, fallback) { return (cvData.labels && cvData.labels[key]) ? cvData.labels[key] : fallback; }

        // Langues (colonne droite)
        function updateCVLang(i, field, value) { if (cvData.languages[i]) { cvData.languages[i][field] = value; saveCV(); } }
        function addCVLang() { commitPendingEdit(); cvData.languages = cvData.languages || []; cvData.languages.push({ name: 'Langue', level: '' }); refreshCV(); }
        function removeCVLang(i) { commitPendingEdit(); cvData.languages.splice(i, 1); refreshCV(); }

        // Outils numériques (colonne droite)
        function updateCVTool(i, value) { if (cvData.tools[i] !== undefined) { cvData.tools[i] = value; saveCV(); } }
        function addCVTool() { commitPendingEdit(); cvData.tools = cvData.tools || []; cvData.tools.push('Nouvel outil'); refreshCV(); }
        function removeCVTool(i) { commitPendingEdit(); cvData.tools.splice(i, 1); refreshCV(); }

        // Permis de conduire
        function toggleLicense(show) { cvData.showLicense = !!show; if (show && !cvData.license) cvData.license = 'Permis B'; refreshCV(); }
        function updateCVLicense(value) { cvData.license = value; saveCV(); }

        function renderCV() {
            document.getElementById('cv-name').innerText = cvData.name || "Prénom Nom";
            document.getElementById('cv-job').innerText = cvData.job || "Titre visé";
            document.getElementById('cv-contact-display').innerText = cvData.contact || "Contact";
            document.getElementById('cv-profile').innerText = cvData.profile || "Profil...";
            
            const skillAdd = `<button onclick="addCVSkill()" title="Ajouter une compétence" class="no-print bg-white/10 border border-dashed th-border-avatar th-text-sidebar text-xs px-2 py-1 rounded w-fit opacity-70 hover:opacity-100 transition"><i class="fas fa-plus mr-1"></i>Ajouter</button>`;
            const skillCount = (cvData.skills || []).length;
            document.getElementById('cv-skills').innerHTML = (cvData.skills || []).map((s, i) =>
                `<span class="relative group/sk th-bg-avatar px-2 py-1 pr-5 rounded th-text-sidebar text-xs transition-colors duration-500 w-fit"><span contenteditable="true" onblur="updateCVSkill(${i}, this.innerText)">${s}</span>${skillMoveButtons(i, skillCount)}<button onclick="removeCVSkill(${i})" title="Retirer" class="no-print absolute top-1/2 -translate-y-1/2 right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-white text-[9px] leading-none opacity-0 group-hover/sk:opacity-100 transition"><i class="fas fa-times"></i></button></span>`
            ).join('') + skillAdd;

            // Intitulés de rubrique (éditables : ex. « Expérience » au singulier)
            setLabel('cvh-experiences', cvLabel('experiences', 'Expériences'));
            setLabel('cvh-education', cvLabel('education', 'Formations'));
            setLabel('cvh-interests', cvLabel('interests', "Centres d'intérêt"));
            setLabel('cvh-languages', cvLabel('languages', 'Langues'));
            setLabel('cvh-tools', cvLabel('tools', 'Outils numériques'));

            // Rubriques optionnelles : entièrement masquées si vides (écran + impression).
            // Une barre en bas de la sidebar permet de les rajouter au besoin.
            const optionalAdders = [];

            // Centres d'intérêt
            const intContainer = document.getElementById('cv-interests-container');
            const intList = document.getElementById('cv-interests');
            const hasInterests = (cvData.interests || []).length > 0;
            intContainer.classList.toggle('hidden', !hasInterests);
            if (!hasInterests) optionalAdders.push({ label: cvLabel('interests', "Centres d'intérêt"), fn: 'addCVInterest' });
            const intAdd = `<li class="list-none -ml-4 mt-1 no-print"><button onclick="addCVInterest()" class="th-text-lighter text-[11px] italic opacity-70 hover:opacity-100 transition"><i class="fas fa-plus mr-1"></i>Ajouter</button></li>`;
            intList.innerHTML = (cvData.interests || []).map((s, i) =>
                `<li class="text-xs relative group/int pr-4"><span contenteditable="true" onblur="updateCVInterest(${i}, this.innerText)">${s}</span><button onclick="removeCVInterest(${i})" title="Retirer" class="no-print absolute top-0 right-0 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-white text-[9px] leading-none opacity-0 group-hover/int:opacity-100 transition"><i class="fas fa-times"></i></button></li>`
            ).join('') + intAdd;

            // Langues
            const langContainer = document.getElementById('cv-languages-container');
            const langList = document.getElementById('cv-languages');
            const hasLang = (cvData.languages || []).length > 0;
            langContainer.classList.toggle('hidden', !hasLang);
            if (!hasLang) optionalAdders.push({ label: cvLabel('languages', 'Langues'), fn: 'addCVLang' });
            const langAdd = `<li class="list-none mt-1 no-print"><button onclick="addCVLang()" class="th-text-lighter text-[11px] italic opacity-70 hover:opacity-100 transition"><i class="fas fa-plus mr-1"></i>Ajouter</button></li>`;
            langList.innerHTML = (cvData.languages || []).map((lg, i) =>
                `<li class="text-xs relative group/lg pr-4 flex flex-wrap gap-x-1"><span contenteditable="true" class="font-semibold" onblur="updateCVLang(${i}, 'name', this.innerText)">${lg.name || ''}</span><span contenteditable="true" data-ph="niveau ?" onblur="updateCVLang(${i}, 'level', this.innerText)">${lg.level || ''}</span><button onclick="removeCVLang(${i})" title="Retirer" class="no-print absolute top-0 right-0 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-white text-[9px] leading-none opacity-0 group-hover/lg:opacity-100 transition"><i class="fas fa-times"></i></button></li>`
            ).join('') + langAdd;

            // Outils numériques
            const toolsContainer = document.getElementById('cv-tools-container');
            const toolsBox = document.getElementById('cv-tools');
            const hasTools = (cvData.tools || []).length > 0;
            toolsContainer.classList.toggle('hidden', !hasTools);
            if (!hasTools) optionalAdders.push({ label: cvLabel('tools', 'Outils numériques'), fn: 'addCVTool' });
            const toolAdd = `<button onclick="addCVTool()" title="Ajouter un outil" class="no-print bg-white/10 border border-dashed th-border-avatar th-text-sidebar text-xs px-2 py-1 rounded w-fit opacity-70 hover:opacity-100 transition"><i class="fas fa-plus mr-1"></i>Ajouter</button>`;
            toolsBox.innerHTML = (cvData.tools || []).map((t, i) =>
                `<span class="relative group/tl th-bg-avatar px-2 py-1 pr-5 rounded th-text-sidebar text-xs transition-colors duration-500 w-fit"><span contenteditable="true" onblur="updateCVTool(${i}, this.innerText)">${t}</span><button onclick="removeCVTool(${i})" title="Retirer" class="no-print absolute top-1/2 -translate-y-1/2 right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-white text-[9px] leading-none opacity-0 group-hover/tl:opacity-100 transition"><i class="fas fa-times"></i></button></span>`
            ).join('') + toolAdd;

            // Barre « rajouter une rubrique » : n'affiche que les rubriques actuellement vides
            const addSections = document.getElementById('cv-add-sections');
            if (addSections) {
                addSections.innerHTML = optionalAdders.length
                    ? optionalAdders.map(a =>
                        `<button onclick="${a.fn}()" class="th-text-lighter text-[11px] border border-dashed th-border-avatar rounded px-2 py-1 opacity-70 hover:opacity-100 transition"><i class="fas fa-plus mr-1"></i>${a.label}</button>`
                      ).join('')
                    : '';
            }

            // Permis de conduire
            const licContainer = document.getElementById('cv-license-container');
            const licList = document.getElementById('cv-license');
            const licToggle = document.getElementById('toggle-license');
            if (licToggle) licToggle.checked = cvData.showLicense === true;
            licContainer.classList.toggle('empty-section', cvData.showLicense !== true);
            licList.innerHTML = cvData.showLicense === true
                ? `<li class="flex items-center"><i class="fas fa-id-card w-6 th-text-accent transition-colors duration-500"></i> <span contenteditable="true" onblur="updateCVLicense(this.innerText)">${cvData.license || 'Permis B'}</span></li>`
                : '';

            const expAdd = `<button onclick="addCVExp()" class="no-print w-full text-xs font-semibold text-[#1E7A6B] border border-dashed border-[#CBE0DA] rounded py-1.5 hover:bg-[#EAF3F0] transition"><i class="fas fa-plus mr-1"></i>Ajouter une expérience</button>`;
            document.getElementById('cv-experiences').innerHTML = (cvData.experiences || []).map((exp, i) => `
                <div class="experience-item mb-5 text-slate-900 relative group/exp">
                    <button onclick="removeCVExp(${i})" title="Retirer cette expérience" class="no-print absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white text-[10px] opacity-0 group-hover/exp:opacity-100 transition"><i class="fas fa-trash"></i></button>
                    <div class="flex justify-between font-bold text-slate-800 uppercase text-xs tracking-wide pr-6">
                        <h3 contenteditable="true" onblur="updateCVExp(${i}, 'title', this.innerText)">${exp.title}</h3>
                        <span contenteditable="true" data-ph="+ dates" onblur="updateCVExp(${i}, 'date', this.innerText)">${exp.date || ''}</span>
                    </div>
                    <p class="text-sm th-text-main italic mb-1 font-semibold transition-colors duration-500" contenteditable="true" onblur="updateCVExp(${i}, 'company', this.innerText)">${exp.company}</p>
                    <ul class="list-disc pl-4 space-y-1 opacity-90">
                        ${(exp.tasks || []).map((t, ti) => `<li class="text-slate-700 text-sm pl-1 relative group/task pr-5"><span contenteditable="true" onblur="updateCVTask(${i}, ${ti}, this.innerText)">${t}</span><button onclick="removeCVTask(${i}, ${ti})" title="Retirer cette ligne" class="no-print absolute top-0 right-0 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-slate-200 hover:bg-red-500 text-slate-500 hover:text-white text-[9px] leading-none opacity-0 group-hover/task:opacity-100 transition"><i class="fas fa-times"></i></button></li>`).join('')}
                    </ul>
                    <button onclick="addCVTask(${i})" class="no-print text-[11px] text-[#1E7A6B] italic mt-1 ml-4 opacity-70 hover:opacity-100 transition"><i class="fas fa-plus mr-1"></i>Ajouter une ligne</button>
                </div>
            `).join('') + expAdd;

            const eduAdd = `<button onclick="addCVEdu()" class="no-print w-full text-xs font-semibold text-[#1E7A6B] border border-dashed border-[#CBE0DA] rounded py-1.5 mt-2 hover:bg-[#EAF3F0] transition"><i class="fas fa-plus mr-1"></i>Ajouter une formation</button>`;
            document.getElementById('cv-education').innerHTML = (cvData.education || []).map((edu, i) => `
                <div class="experience-item flex items-start mb-3 text-slate-900 relative group/edu pr-6">
                    <button onclick="removeCVEdu(${i})" title="Retirer cette formation" class="no-print absolute -top-1 right-0 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white text-[10px] opacity-0 group-hover/edu:opacity-100 transition"><i class="fas fa-trash"></i></button>
                    <i class="fas fa-graduation-cap th-text-main mt-1 mr-4 transition-colors duration-500"></i>
                    <div>
                        <h3 class="font-bold text-slate-800 text-sm" contenteditable="true" onblur="updateCVEdu(${i}, 'title', this.innerText)">${edu.title}</h3>
                        <p class="text-sm text-slate-500"><span contenteditable="true" onblur="updateCVEdu(${i}, 'school', this.innerText)">${edu.school}</span> | <span contenteditable="true" data-ph="+ année" onblur="updateCVEdu(${i}, 'date', this.innerText)">${edu.date || ''}</span></p>
                    </div>
                </div>
            `).join('') + eduAdd;

            applyPhoto();
        }

        // Petit utilitaire : écrit un intitulé de rubrique sans écraser le focus si l'utilisateur édite.
        function setLabel(id, text) {
            const el = document.getElementById(id);
            if (el && document.activeElement !== el) el.innerText = text;
        }

        // --- ÉCHANGES AVEC L'ESPACE D'UNE PERSONNE (conseiller) ---
        // Le CV préparé ici part dans l'espace IAMONCV de la personne (nouveau
        // profil qu'elle peut modifier), ou revient d'elle après ses retouches.
        // Fini le fichier « version éditable » qui circule par clé USB.
        function prenomLocal(code) {
            // Prénoms du fichier des codes, si le conseiller a choisi de les garder
            // sur cet ordinateur (tableau de bord). Jamais envoyés au serveur.
            try {
                const m = JSON.parse(localStorage.getItem('iamj_prenoms_' + Cloud.who) || '{}');
                return m[code] || '';
            } catch (e) { return ''; }
        }

        function closePicker() { const el = document.getElementById('person-picker'); if (el) el.remove(); }

        function showPicker(title, bodyHtml) {
            closePicker();
            const wrap = document.createElement('div');
            wrap.id = 'person-picker';
            wrap.className = 'fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4';
            wrap.innerHTML = `<div role="dialog" aria-modal="true" class="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-5">
                <div class="flex items-start justify-between gap-2 mb-3"><h2 class="text-base font-bold text-[#123F39]">${escapeHtml(title)}</h2>
                <button onclick="closePicker()" class="text-slate-400 hover:text-slate-700" aria-label="Fermer"><i class="fas fa-times"></i></button></div>
                <div id="person-picker-body">${bodyHtml}</div></div>`;
            wrap.addEventListener('click', (e) => { if (e.target === wrap) closePicker(); });
            document.body.appendChild(wrap);
        }

        async function openPersonPicker(mode) {
            persistActive();
            showPicker(mode === 'envoyer' ? 'Envoyer ce CV à…' : 'Récupérer le CV de…', '<p class="text-sm text-slate-500"><i class="fas fa-spinner fa-spin mr-1"></i> Chargement…</p>');
            try {
                const r = await cloudFetch('/api/conseiller/beneficiaires');
                const d = await r.json();
                if (!r.ok) throw new Error(d.error || 'Liste indisponible.');
                const list = (d.beneficiaires || []).filter(b => b.status === 'active');
                const body = document.getElementById('person-picker-body');
                if (!body) return;
                if (!list.length) { body.innerHTML = '<p class="text-sm text-slate-600">Aucune personne avec un accès activé.</p>'; return; }
                const meta = getProfilesMeta();
                const cur = meta ? meta.list.find(p => p.id === meta.active) : null;
                body.innerHTML = (mode === 'envoyer'
                    ? `<p class="text-xs text-slate-600 mb-3">Le CV « ${escapeHtml(cur ? cur.name : 'actif')} » sera déposé dans l'espace IAMONCV de la personne. Elle le retrouvera et pourra le modifier.</p>`
                    : `<p class="text-xs text-slate-600 mb-3">Choisissez la personne, puis le CV à reprendre ici, comme nouveau profil.</p>`)
                    + `<input id="pp-filter" placeholder="Code ou prénom…" class="w-full mb-2 text-sm border border-[#CBE0DA] rounded-lg px-2 py-1.5" oninput="filterPicker(this.value)">`
                    + '<ul class="space-y-1">' + list.map(b => {
                        const pr = prenomLocal(b.code);
                        return `<li data-k="${escapeHtml((b.code + ' ' + pr).toLowerCase())}"><button onclick="${mode === 'envoyer' ? 'sendCvTo' : 'listCvOf'}('${b.id}', '${escapeHtml(b.code)}')" class="w-full text-left text-sm px-3 py-2 rounded-lg border border-[#CBE0DA] hover:bg-[#EAF3F0]"><span class="font-mono font-bold text-[#123F39]">${escapeHtml(b.code)}</span>${pr ? ` <span class="text-[#B83B5E] font-semibold">· ${escapeHtml(pr)}</span>` : ''}</button></li>`;
                    }).join('') + '</ul>';
            } catch (e) {
                const body = document.getElementById('person-picker-body');
                if (body) body.innerHTML = `<p class="text-sm text-red-600">${escapeHtml(e.message)}</p>`;
            }
        }

        function filterPicker(q) {
            const k = String(q || '').toLowerCase().trim();
            document.querySelectorAll('#person-picker li[data-k]').forEach(li => { li.style.display = !k || li.dataset.k.includes(k) ? '' : 'none'; });
        }

        async function sendCvTo(benId, code) {
            if (!confirm(`Envoyer ce CV dans l'espace de ${code} ?`)) return;
            try {
                const data = JSON.parse(JSON.stringify({ db: db, cv: cvData }));
                if (data.cv && typeof data.cv.image === 'string' && data.cv.image.length > 400000) data.cv.image = await shrinkPhoto(data.cv.image);
                const r = await cloudFetch(`/api/conseiller/beneficiaires/${encodeURIComponent(benId)}/cv`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: `CV préparé avec votre conseiller (${new Date().toLocaleDateString('fr-FR')})`, data }),
                });
                const d = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(d.error || 'Envoi impossible.');
                closePicker();
                alert(`CV envoyé. ${code} le trouvera dans « Créer mon CV », sous le nom « CV préparé avec votre conseiller ».`);
            } catch (e) { alert(e.message); }
        }

        async function listCvOf(benId, code) {
            const body = document.getElementById('person-picker-body');
            if (body) body.innerHTML = '<p class="text-sm text-slate-500"><i class="fas fa-spinner fa-spin mr-1"></i> Chargement…</p>';
            try {
                const r = await cloudFetch(`/api/conseiller/beneficiaires/${encodeURIComponent(benId)}/cv`);
                const d = await r.json();
                if (!r.ok) throw new Error(d.error || 'Lecture impossible.');
                if (!body) return;
                if (!(d.profils || []).length) { body.innerHTML = `<p class="text-sm text-slate-600">${escapeHtml(code)} n'a pas encore de CV dans IAMONCV.</p>`; return; }
                body.innerHTML = `<p class="text-xs text-slate-600 mb-2">CV de <span class="font-mono font-bold">${escapeHtml(code)}</span> :</p><ul class="space-y-1">`
                    + d.profils.map(p => `<li><button onclick="takeCvFrom('${benId}', '${escapeHtml(code)}', '${p.id}', this)" class="w-full text-left text-sm px-3 py-2 rounded-lg border border-[#CBE0DA] hover:bg-[#EAF3F0]">${escapeHtml(p.name)}${p.updatedAt ? ` <span class="text-xs text-slate-500">· modifié le ${new Date(p.updatedAt).toLocaleDateString('fr-FR')}</span>` : ''}</button></li>`).join('')
                    + '</ul>';
            } catch (e) { if (body) body.innerHTML = `<p class="text-sm text-red-600">${escapeHtml(e.message)}</p>`; }
        }

        async function takeCvFrom(benId, code, profilId, btn) {
            if (btn) btn.disabled = true;
            try {
                const r = await cloudFetch(`/api/conseiller/beneficiaires/${encodeURIComponent(benId)}/cv?profil=${encodeURIComponent(profilId)}`);
                const d = await r.json();
                if (!r.ok) throw new Error(d.error || 'Lecture impossible.');
                persistActive();
                const meta = getProfilesMeta() || { active: '', list: [] };
                const id = genProfileId();
                meta.list.push({ id, name: `${code} (repris le ${new Date().toLocaleDateString('fr-FR')})` });
                meta.active = id;
                writeProfile(id, { db: Object.assign(emptyDB(), (d.data && d.data.db) || {}), cv: Object.assign(emptyCV(), (d.data && d.data.cv) || {}) });
                setProfilesMeta(meta);
                loadActiveProfile();
                applyActiveProfileToUI();
                closePicker();
            } catch (e) { alert(e.message); if (btn) btn.disabled = false; }
        }

        // --- PDF LISIBLE PAR LES LOGICIELS DE TRI (en un clic) ---
        // Fabrique directement un PDF texte, sur une colonne, sans photo ni
        // décor : c'est la forme que les logiciels de tri des candidatures lisent
        // le mieux. Pas de fenêtre d'impression, pas de réglage de marges.
        // La version mise en page (couleurs, photo) reste disponible par
        // « Imprimer la mise en page ».
        function loadJsPdf() {
            if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
            return new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'vendor/jspdf.umd.min.js?v=2.5.2';
                s.onload = () => (window.jspdf && window.jspdf.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF absent')));
                s.onerror = () => reject(new Error('Chargement du module PDF impossible.'));
                document.head.appendChild(s);
            });
        }

        // Les polices standard du PDF couvrent le français, pas certains signes
        // typographiques : on les remplace par leur équivalent simple.
        function pdfSafe(t) {
            return String(t == null ? '' : t)
                .replace(/[‘’ʼ]/g, "'")
                .replace(/[“”«»]/g, '"')
                .replace(/[–—]/g, '-')
                .replace(/…/g, '...')
                .replace(/œ/g, 'oe').replace(/Œ/g, 'OE')
                .replace(/[  ]/g, ' ')
                .replace(/[•●]/g, '-')
                .replace(/€/g, 'EUR')
                .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, '')
                .replace(/\*\*/g, '')
                .trim();
        }

        function buildAtsPdf(JsPDF, cv) {
            const doc = new JsPDF({ unit: 'mm', format: 'a4' });
            const M = 18, W = 210 - 2 * M, BOTTOM = 297 - 16;
            let y = 20;
            const ensure = (h) => { if (y + h > BOTTOM) { doc.addPage(); y = 18; } };
            const text = (str, size, style, opts = {}) => {
                const t = pdfSafe(str);
                if (!t) return;
                doc.setFont('helvetica', style || 'normal');
                doc.setFontSize(size);
                const lh = size * 0.42;
                const lines = doc.splitTextToSize(t, opts.width || W - (opts.indent || 0));
                lines.forEach((ln) => {
                    ensure(lh);
                    doc.text(ln, M + (opts.indent || 0), y);
                    y += lh;
                });
                y += opts.after != null ? opts.after : 1;
            };
            const section = (title) => {
                ensure(14);
                y += 3;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(18, 63, 57);
                doc.text(pdfSafe(title).toUpperCase(), M, y);
                y += 1.6;
                doc.setDrawColor(30, 122, 107);
                doc.setLineWidth(0.3);
                doc.line(M, y, M + W, y);
                y += 5;
                doc.setTextColor(30, 30, 30);
            };
            const bullets = (items) => items.forEach((it) => {
                const t = pdfSafe(it);
                if (!t) return;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                const lines = doc.splitTextToSize(t, W - 5);
                lines.forEach((ln, i) => {
                    ensure(4.3);
                    if (i === 0) doc.text('-', M + 1, y);
                    doc.text(ln, M + 5, y);
                    y += 4.3;
                });
                y += 0.6;
            });
            const lbl = (k, f) => (cv.labels && cv.labels[k]) ? cv.labels[k] : f;

            doc.setTextColor(18, 63, 57);
            text(cv.name || '', 20, 'bold', { after: 1.5 });
            doc.setTextColor(30, 122, 107);
            text(cv.job || '', 13, 'bold', { after: 1.5 });
            doc.setTextColor(60, 60, 60);
            text(String(cv.contact || '').replace(/\s*\n\s*/g, ' | '), 10, 'normal', { after: 2 });
            doc.setTextColor(30, 30, 30);

            if (cv.profile) { section('Profil'); text(cv.profile, 10.5, 'normal'); }
            const skills = (cv.skills || []).map(pdfSafe).filter(Boolean);
            if (skills.length) { section('Compétences'); bullets(skills); }

            const exps = cv.experiences || [];
            if (exps.length) {
                section(lbl('experiences', 'Expériences'));
                exps.forEach((e) => {
                    ensure(10);
                    const head = [e.title, e.company].map(pdfSafe).filter(Boolean).join(' - ');
                    const date = pdfSafe(e.date);
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
                    const dateW = date ? doc.getTextWidth(date) + 4 : 0;
                    const lines = doc.splitTextToSize(head, W - dateW);
                    lines.forEach((ln, i) => {
                        ensure(4.8);
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
                        doc.text(ln, M, y);
                        if (i === 0 && date) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(date, M + W, y, { align: 'right' }); }
                        y += 4.8;
                    });
                    y += 0.5;
                    bullets(e.tasks || []);
                    y += 1.5;
                });
            }
            const edus = cv.education || [];
            if (edus.length) {
                section(lbl('education', 'Formations'));
                edus.forEach((e) => {
                    const head = [e.title, e.school].map(pdfSafe).filter(Boolean).join(' - ');
                    const date = pdfSafe(e.date);
                    text(head + (date ? ` (${date})` : ''), 10.5, 'normal', { after: 1.2 });
                });
            }
            const langs = (cv.languages || []).map((l) => [l.name, l.level].map(pdfSafe).filter(Boolean).join(' : ')).filter(Boolean);
            if (langs.length) { section(lbl('languages', 'Langues')); bullets(langs); }
            const tools = (cv.tools || []).map(pdfSafe).filter(Boolean);
            if (tools.length) { section(lbl('tools', 'Outils numériques')); text(tools.join(', '), 10.5, 'normal'); }
            if (cv.showLicense && cv.license) { section('Permis'); text(cv.license, 10.5, 'normal'); }
            const ints = (cv.interests || []).map(pdfSafe).filter(Boolean);
            if (ints.length) { section(lbl('interests', "Centres d'intérêt")); text(ints.join(', '), 10.5, 'normal'); }

            doc.setProperties({ title: pdfSafe(`CV ${cv.name || ''} ${cv.job || ''}`).trim(), subject: 'Curriculum vitae', creator: 'IAMONJOB' });
            return doc;
        }

        async function downloadAtsPdf() {
            if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
            const btn = document.getElementById('btn-pdf-ats');
            const old = btn ? btn.innerHTML : '';
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> PDF…'; }
            try {
                const JsPDF = await loadJsPdf();
                const doc = buildAtsPdf(JsPDF, cvData);
                const base = (pdfSafe(cvData.name || 'cv').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) || 'cv';
                doc.save(`cv-${base}.pdf`);
            } catch (e) {
                alert("Le PDF n'a pas pu être fabriqué. Utilisez « Imprimer la mise en page » en attendant.");
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = old; }
            }
        }

        // --- IMPRESSION DE LA MISE EN PAGE (couleurs, photo), via le navigateur ---
        document.getElementById('btn-print-native').addEventListener('click', function() {
            // Valider une éventuelle édition en cours avant d'imprimer
            if (document.activeElement && typeof document.activeElement.blur === 'function') {
                document.activeElement.blur();
            }
            // Laisser le temps au rendu de se stabiliser, puis ouvrir la boîte d'impression
            setTimeout(() => window.print(), 100);
        });


        // ==========================================================================
        // EXPORT « VERSION ÉDITABLE » : un fichier HTML autonome, sans IA,
        // que le demandeur d'emploi rouvre chez lui pour retravailler son CV.
        // Le fichier embarque son propre éditeur (portableMain) et son propre
        // constructeur (buildEditableCvHtml), donc il peut se régénérer lui-même.
        // ==========================================================================

        // Éditeur embarqué dans le fichier exporté. S'exécute chez le demandeur.
        function portableMain() {
            const CVKEYS = ['--th-sidebar','--th-avatar','--th-avatar-border','--th-text-light','--th-text-lighter','--th-text-accent','--th-main','--th-sidebar-text','--th-sidebar-text-muted'];
            const dataEl = document.getElementById('cv-data');
            let embed = {};
            try { embed = JSON.parse(dataEl.textContent || '{}'); } catch (e) { embed = {}; }
            const LSKEY = 'iamoncv_edit_' + (embed.__id || 'default');
            let cvData = embed;
            try {
                const saved = localStorage.getItem(LSKEY);
                if (saved) { const s = JSON.parse(saved); if ((s.__ts || 0) >= (embed.__ts || 0)) cvData = s; }
            } catch (e) {}
            if (!cvData.imgPos) cvData.imgPos = { x: 50, y: 25, zoom: 1 };

            function updateSavedHint() {
                const h = document.getElementById('saved-hint');
                if (h) h.textContent = 'Modifications enregistrées ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            }
            function saveCV() {
                cvData.__ts = Date.now();
                try { localStorage.setItem(LSKEY, JSON.stringify(cvData)); } catch (e) {}
                try { dataEl.textContent = JSON.stringify(cvData); } catch (e) {}
                updateSavedHint();
            }
            function commitPendingEdit() { const a = document.activeElement; if (a && a.isContentEditable && a.blur) a.blur(); }
            function refreshCV() { renderCV(); saveCV(); }

            function updateCVField(f, v) { cvData[f] = v; saveCV(); }
            function updateCVExp(i, f, v) { cvData.experiences[i][f] = v; saveCV(); }
            function updateCVTask(ei, ti, v) { cvData.experiences[ei].tasks[ti] = v; saveCV(); }
            function updateCVEdu(i, f, v) { cvData.education[i][f] = v; saveCV(); }
            function updateCVSkill(i, v) { if (cvData.skills[i] !== undefined) { cvData.skills[i] = v; saveCV(); } }
            function updateCVInterest(i, v) { if (cvData.interests[i] !== undefined) { cvData.interests[i] = v; saveCV(); } }
            function addCVSkill() { commitPendingEdit(); cvData.skills = cvData.skills || []; cvData.skills.push('Nouvelle compétence'); refreshCV(); }
            function removeCVSkill(i) { commitPendingEdit(); cvData.skills.splice(i, 1); refreshCV(); }
            function moveCVSkill(i, dir) {
                commitPendingEdit();
                const s = cvData.skills, j = i + dir;
                if (!s || j < 0 || j >= s.length) return;
                const tmp = s[i]; s[i] = s[j]; s[j] = tmp;
                refreshCV();
            }
            function skillMoveButtons(i, n) {
                function btn(dir, icon, title) { return '<button onclick="moveCVSkill(' + i + ', ' + dir + ')" title="' + title + '" class="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white text-[8px] leading-none"><i class="fas fa-arrow-' + icon + '"></i></button>'; }
                return '<span class="no-print absolute top-1/2 -translate-y-1/2 right-5 flex gap-0.5 th-bg-avatar pl-1 opacity-0 group-hover/sk:opacity-100 transition">' + (i > 0 ? btn(-1, 'up', 'Monter') : '') + (i < n - 1 ? btn(1, 'down', 'Descendre') : '') + '</span>';
            }
            // Même règle que dans l'application : on colle du texte brut uniquement.
            function pastePlainText(e) {
                let el = e.target;
                if (el && el.nodeType === 3) el = el.parentElement;
                el = el && el.closest ? el.closest('[contenteditable="true"]') : null;
                if (!el || !e.clipboardData) return;
                e.preventDefault();
                let text = (e.clipboardData.getData('text/plain') || '')
                    .replace(/\r\n?/g, '\n')
                    .replace(/[\t  ]+/g, ' ')
                    .replace(/^[ ]*[•●▪◦‣■□➢✓\-–—*][ ]+/gm, '');
                text = el.id === 'cv-profile'
                    ? text.replace(/[ ]*\n[ ]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
                    : text.replace(/\s*\n\s*/g, ' ').replace(/ {2,}/g, ' ').trim();
                document.execCommand('insertText', false, text);
            }
            function addCVInterest() { commitPendingEdit(); cvData.interests = cvData.interests || []; cvData.interests.push('Nouveau centre d\'intérêt'); refreshCV(); }
            function removeCVInterest(i) { commitPendingEdit(); cvData.interests.splice(i, 1); refreshCV(); }
            function addCVExp() { commitPendingEdit(); cvData.experiences = cvData.experiences || []; cvData.experiences.push({ title: 'Intitulé du poste', company: 'Entreprise', date: '', tasks: ['À compléter'] }); refreshCV(); }
            function removeCVExp(i) { commitPendingEdit(); cvData.experiences.splice(i, 1); refreshCV(); }
            function addCVTask(ei) { commitPendingEdit(); cvData.experiences[ei].tasks = cvData.experiences[ei].tasks || []; cvData.experiences[ei].tasks.push('À compléter'); refreshCV(); }
            function removeCVTask(ei, ti) { commitPendingEdit(); cvData.experiences[ei].tasks.splice(ti, 1); refreshCV(); }
            function addCVEdu() { commitPendingEdit(); cvData.education = cvData.education || []; cvData.education.push({ title: 'Diplôme / Formation', school: 'Établissement', date: '' }); refreshCV(); }
            function removeCVEdu(i) { commitPendingEdit(); cvData.education.splice(i, 1); refreshCV(); }
            function updateCVLabel(key, value) { cvData.labels = cvData.labels || {}; cvData.labels[key] = value; saveCV(); }
            function cvLabel(key, fallback) { return (cvData.labels && cvData.labels[key]) ? cvData.labels[key] : fallback; }
            function setLabel(id, text) { const el = document.getElementById(id); if (el && document.activeElement !== el) el.innerText = text; }
            function updateCVLang(i, f, v) { if (cvData.languages[i]) { cvData.languages[i][f] = v; saveCV(); } }
            function addCVLang() { commitPendingEdit(); cvData.languages = cvData.languages || []; cvData.languages.push({ name: 'Langue', level: '' }); refreshCV(); }
            function removeCVLang(i) { commitPendingEdit(); cvData.languages.splice(i, 1); refreshCV(); }
            function updateCVTool(i, v) { if (cvData.tools[i] !== undefined) { cvData.tools[i] = v; saveCV(); } }
            function addCVTool() { commitPendingEdit(); cvData.tools = cvData.tools || []; cvData.tools.push('Nouvel outil'); refreshCV(); }
            function removeCVTool(i) { commitPendingEdit(); cvData.tools.splice(i, 1); refreshCV(); }
            function toggleLicense(show) { cvData.showLicense = !!show; if (show && !cvData.license) cvData.license = 'Permis B'; refreshCV(); }
            function updateCVLicense(v) { cvData.license = v; saveCV(); }

            function openPhotoPicker() { const inp = document.getElementById('profile-upload'); if (!inp) return; inp.value = ''; inp.click(); }
            function handleProfileUpload(event) {
                const file = event.target.files && event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function (e) {
                    cvData.image = e.target.result;
                    cvData.imgPos = { x: 50, y: 25, zoom: 1 };
                    cvData.showPhoto = true;
                    const t = document.getElementById('toggle-photo'); if (t) t.checked = true;
                    applyPhoto(); saveCV();
                };
                reader.onerror = function () { alert('Impossible de lire cette image. Essayez un autre fichier (JPG ou PNG).'); };
                reader.readAsDataURL(file);
            }
            function applyPhoto() {
                const block = document.getElementById('cv-avatar-block');
                const container = document.getElementById('cv-avatar-container');
                const icon = document.getElementById('cv-avatar-icon');
                const tools = document.getElementById('avatar-tools');
                const toggle = document.getElementById('toggle-photo');
                const zoomInput = document.getElementById('avatar-zoom');
                const show = cvData.showPhoto !== false;
                if (toggle) toggle.checked = show;
                if (block) block.style.display = show ? '' : 'none';
                if (!show) return;
                const pos = cvData.imgPos || (cvData.imgPos = { x: 50, y: 25, zoom: 1 });
                if (cvData.image) {
                    if (container) {
                        container.style.backgroundImage = 'url("' + cvData.image + '")';
                        container.style.backgroundRepeat = 'no-repeat';
                        container.style.backgroundSize = (pos.zoom * 100) + '%';
                        container.style.backgroundPosition = pos.x + '% ' + pos.y + '%';
                    }
                    if (icon) icon.classList.add('hidden');
                    if (tools) tools.classList.remove('hidden');
                    if (zoomInput) zoomInput.value = pos.zoom;
                } else {
                    if (container) { container.style.backgroundImage = ''; container.style.backgroundSize = ''; container.style.backgroundPosition = ''; }
                    if (icon) icon.classList.remove('hidden');
                    if (tools) tools.classList.add('hidden');
                }
            }
            function toggleShowPhoto(show) { cvData.showPhoto = !!show; applyPhoto(); saveCV(); }
            function setAvatarZoom(value, save) {
                const z = parseFloat(value) || 1;
                cvData.imgPos = Object.assign({ x: 50, y: 25, zoom: 1 }, cvData.imgPos, { zoom: z });
                const c = document.getElementById('cv-avatar-container');
                if (c) c.style.backgroundSize = (z * 100) + '%';
                if (save) saveCV();
            }
            function initAvatarDrag() {
                const container = document.getElementById('cv-avatar-container');
                if (!container || container._dragInit) return;
                container._dragInit = true;
                let drag = null;
                container.addEventListener('pointerdown', function (e) {
                    if (!cvData.image || cvData.showPhoto === false) return;
                    const p = cvData.imgPos || { x: 50, y: 25, zoom: 1 };
                    drag = { sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y };
                    try { container.setPointerCapture(e.pointerId); } catch (err) {}
                    container.style.cursor = 'grabbing'; e.preventDefault();
                });
                container.addEventListener('pointermove', function (e) {
                    if (!drag) return;
                    let nx = drag.ox - (e.clientX - drag.sx) * 0.35;
                    let ny = drag.oy - (e.clientY - drag.sy) * 0.35;
                    nx = Math.max(0, Math.min(100, nx)); ny = Math.max(0, Math.min(100, ny));
                    cvData.imgPos = Object.assign({ x: 50, y: 25, zoom: 1 }, cvData.imgPos, { x: nx, y: ny });
                    container.style.backgroundPosition = nx + '% ' + ny + '%';
                });
                const end = function () { if (!drag) return; drag = null; container.style.cursor = 'grab'; saveCV(); };
                container.addEventListener('pointerup', end);
                container.addEventListener('pointercancel', end);
            }

            function renderCV() {
                document.getElementById('cv-name').innerText = cvData.name || 'Prénom Nom';
                document.getElementById('cv-job').innerText = cvData.job || 'Titre visé';
                document.getElementById('cv-contact-display').innerText = cvData.contact || 'Téléphone / Email';
                document.getElementById('cv-profile').innerText = cvData.profile || 'Profil...';

                const skillAdd = '<button onclick="addCVSkill()" title="Ajouter une compétence" class="no-print bg-white/10 border border-dashed th-border-avatar th-text-sidebar text-xs px-2 py-1 rounded w-fit opacity-70 hover:opacity-100 transition"><i class="fas fa-plus mr-1"></i>Ajouter</button>';
                const skillCount = (cvData.skills || []).length;
                document.getElementById('cv-skills').innerHTML = (cvData.skills || []).map(function (s, i) {
                    return '<span class="relative group/sk th-bg-avatar px-2 py-1 pr-5 rounded th-text-sidebar text-xs w-fit"><span contenteditable="true" onblur="updateCVSkill(' + i + ', this.innerText)">' + s + '</span>' + skillMoveButtons(i, skillCount) + '<button onclick="removeCVSkill(' + i + ')" title="Retirer" class="no-print absolute top-1/2 -translate-y-1/2 right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-white text-[9px] leading-none opacity-0 group-hover/sk:opacity-100 transition"><i class="fas fa-times"></i></button></span>';
                }).join('') + skillAdd;

                setLabel('cvh-experiences', cvLabel('experiences', 'Expériences'));
                setLabel('cvh-education', cvLabel('education', 'Formations'));
                setLabel('cvh-interests', cvLabel('interests', "Centres d'intérêt"));
                setLabel('cvh-languages', cvLabel('languages', 'Langues'));
                setLabel('cvh-tools', cvLabel('tools', 'Outils numériques'));

                const optionalAdders = [];

                const intContainer = document.getElementById('cv-interests-container');
                const intList = document.getElementById('cv-interests');
                const hasInt = (cvData.interests || []).length > 0;
                intContainer.classList.toggle('hidden', !hasInt);
                if (!hasInt) optionalAdders.push({ label: cvLabel('interests', 'Centres d\'intérêt'), fn: 'addCVInterest' });
                const intAdd = '<li class="list-none -ml-4 mt-1 no-print"><button onclick="addCVInterest()" class="th-text-lighter text-[11px] italic opacity-70 hover:opacity-100 transition"><i class="fas fa-plus mr-1"></i>Ajouter</button></li>';
                intList.innerHTML = (cvData.interests || []).map(function (s, i) {
                    return '<li class="text-xs relative group/int pr-4"><span contenteditable="true" onblur="updateCVInterest(' + i + ', this.innerText)">' + s + '</span><button onclick="removeCVInterest(' + i + ')" title="Retirer" class="no-print absolute top-0 right-0 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-white text-[9px] leading-none opacity-0 group-hover/int:opacity-100 transition"><i class="fas fa-times"></i></button></li>';
                }).join('') + intAdd;

                const langContainer = document.getElementById('cv-languages-container');
                const langList = document.getElementById('cv-languages');
                if (langContainer && langList) {
                    const hasLang = (cvData.languages || []).length > 0;
                    langContainer.classList.toggle('hidden', !hasLang);
                    if (!hasLang) optionalAdders.push({ label: cvLabel('languages', 'Langues'), fn: 'addCVLang' });
                    const langAdd = '<li class="list-none mt-1 no-print"><button onclick="addCVLang()" class="th-text-lighter text-[11px] italic opacity-70 hover:opacity-100 transition"><i class="fas fa-plus mr-1"></i>Ajouter</button></li>';
                    langList.innerHTML = (cvData.languages || []).map(function (lg, i) {
                        return '<li class="text-xs relative group/lg pr-4 flex flex-wrap gap-x-1"><span contenteditable="true" class="font-semibold" onblur="updateCVLang(' + i + ', \'name\', this.innerText)">' + (lg.name || '') + '</span><span contenteditable="true" data-ph="niveau ?" onblur="updateCVLang(' + i + ', \'level\', this.innerText)">' + (lg.level || '') + '</span><button onclick="removeCVLang(' + i + ')" title="Retirer" class="no-print absolute top-0 right-0 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-white text-[9px] leading-none opacity-0 group-hover/lg:opacity-100 transition"><i class="fas fa-times"></i></button></li>';
                    }).join('') + langAdd;
                }

                const toolsContainer = document.getElementById('cv-tools-container');
                const toolsBox = document.getElementById('cv-tools');
                if (toolsContainer && toolsBox) {
                    const hasTools = (cvData.tools || []).length > 0;
                    toolsContainer.classList.toggle('hidden', !hasTools);
                    if (!hasTools) optionalAdders.push({ label: cvLabel('tools', 'Outils numériques'), fn: 'addCVTool' });
                    const toolAdd = '<button onclick="addCVTool()" title="Ajouter un outil" class="no-print bg-white/10 border border-dashed th-border-avatar th-text-sidebar text-xs px-2 py-1 rounded w-fit opacity-70 hover:opacity-100 transition"><i class="fas fa-plus mr-1"></i>Ajouter</button>';
                    toolsBox.innerHTML = (cvData.tools || []).map(function (t, i) {
                        return '<span class="relative group/tl th-bg-avatar px-2 py-1 pr-5 rounded th-text-sidebar text-xs w-fit"><span contenteditable="true" onblur="updateCVTool(' + i + ', this.innerText)">' + t + '</span><button onclick="removeCVTool(' + i + ')" title="Retirer" class="no-print absolute top-1/2 -translate-y-1/2 right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-white text-[9px] leading-none opacity-0 group-hover/tl:opacity-100 transition"><i class="fas fa-times"></i></button></span>';
                    }).join('') + toolAdd;
                }

                const addSections = document.getElementById('cv-add-sections');
                if (addSections) {
                    addSections.innerHTML = optionalAdders.length
                        ? optionalAdders.map(function (a) {
                            return '<button onclick="' + a.fn + '()" class="th-text-lighter text-[11px] border border-dashed th-border-avatar rounded px-2 py-1 opacity-70 hover:opacity-100 transition"><i class="fas fa-plus mr-1"></i>' + a.label + '</button>';
                        }).join('')
                        : '';
                }

                const licContainer = document.getElementById('cv-license-container');
                const licList = document.getElementById('cv-license');
                const licToggle = document.getElementById('toggle-license');
                if (licContainer && licList) {
                    if (licToggle) licToggle.checked = cvData.showLicense === true;
                    licContainer.classList.toggle('empty-section', cvData.showLicense !== true);
                    licList.innerHTML = cvData.showLicense === true
                        ? '<li class="flex items-center"><i class="fas fa-id-card w-6 th-text-accent"></i> <span contenteditable="true" onblur="updateCVLicense(this.innerText)">' + (cvData.license || 'Permis B') + '</span></li>'
                        : '';
                }

                const expAdd = '<button onclick="addCVExp()" class="no-print w-full text-xs font-semibold text-[#1E7A6B] border border-dashed border-[#CBE0DA] rounded py-1.5 hover:bg-[#EAF3F0] transition"><i class="fas fa-plus mr-1"></i>Ajouter une expérience</button>';
                document.getElementById('cv-experiences').innerHTML = (cvData.experiences || []).map(function (exp, i) {
                    const tasks = (exp.tasks || []).map(function (t, ti) {
                        return '<li class="text-slate-700 text-sm pl-1 relative group/task pr-5"><span contenteditable="true" onblur="updateCVTask(' + i + ', ' + ti + ', this.innerText)">' + t + '</span><button onclick="removeCVTask(' + i + ', ' + ti + ')" title="Retirer cette ligne" class="no-print absolute top-0 right-0 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-slate-200 hover:bg-red-500 text-slate-500 hover:text-white text-[9px] leading-none opacity-0 group-hover/task:opacity-100 transition"><i class="fas fa-times"></i></button></li>';
                    }).join('');
                    return '<div class="experience-item mb-5 text-slate-900 relative group/exp">' +
                        '<button onclick="removeCVExp(' + i + ')" title="Retirer cette expérience" class="no-print absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white text-[10px] opacity-0 group-hover/exp:opacity-100 transition"><i class="fas fa-trash"></i></button>' +
                        '<div class="flex justify-between font-bold text-slate-800 uppercase text-xs tracking-wide pr-6"><h3 contenteditable="true" onblur="updateCVExp(' + i + ', \'title\', this.innerText)">' + exp.title + '</h3><span contenteditable="true" data-ph="+ dates" onblur="updateCVExp(' + i + ', \'date\', this.innerText)">' + (exp.date || '') + '</span></div>' +
                        '<p class="text-sm th-text-main italic mb-1 font-semibold" contenteditable="true" onblur="updateCVExp(' + i + ', \'company\', this.innerText)">' + (exp.company || '') + '</p>' +
                        '<ul class="list-disc pl-4 space-y-1 opacity-90">' + tasks + '</ul>' +
                        '<button onclick="addCVTask(' + i + ')" class="no-print text-[11px] text-[#1E7A6B] italic mt-1 ml-4 opacity-70 hover:opacity-100 transition"><i class="fas fa-plus mr-1"></i>Ajouter une ligne</button>' +
                        '</div>';
                }).join('') + expAdd;

                const eduAdd = '<button onclick="addCVEdu()" class="no-print w-full text-xs font-semibold text-[#1E7A6B] border border-dashed border-[#CBE0DA] rounded py-1.5 mt-2 hover:bg-[#EAF3F0] transition"><i class="fas fa-plus mr-1"></i>Ajouter une formation</button>';
                document.getElementById('cv-education').innerHTML = (cvData.education || []).map(function (edu, i) {
                    return '<div class="experience-item flex items-start mb-3 text-slate-900 relative group/edu pr-6">' +
                        '<button onclick="removeCVEdu(' + i + ')" title="Retirer cette formation" class="no-print absolute -top-1 right-0 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white text-[10px] opacity-0 group-hover/edu:opacity-100 transition"><i class="fas fa-trash"></i></button>' +
                        '<i class="fas fa-graduation-cap th-text-main mt-1 mr-4"></i>' +
                        '<div><h3 class="font-bold text-slate-800 text-sm" contenteditable="true" onblur="updateCVEdu(' + i + ', \'title\', this.innerText)">' + edu.title + '</h3>' +
                        '<p class="text-sm text-slate-500"><span contenteditable="true" onblur="updateCVEdu(' + i + ', \'school\', this.innerText)">' + (edu.school || '') + '</span> | <span contenteditable="true" data-ph="+ année" onblur="updateCVEdu(' + i + ', \'date\', this.innerText)">' + (edu.date || '') + '</span></p></div>' +
                        '</div>';
                }).join('') + eduAdd;

                applyPhoto();
            }

            function readThemeVars() {
                const cs = getComputedStyle(document.documentElement);
                const tv = {};
                CVKEYS.forEach(function (k) { tv[k] = (cs.getPropertyValue(k) || '').trim(); });
                return tv;
            }
            function downloadUpdated() {
                commitPendingEdit();
                cvData.__ts = Date.now();
                const html = buildEditableCvHtml(cvData, readThemeVars());
                const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                const a = document.createElement('a');
                const nm = (cvData.name || 'CV').replace(/[^0-9A-Za-zÀ-ÿ]+/g, '-').replace(/^-+|-+$/g, '') || 'CV';
                a.href = URL.createObjectURL(blob);
                a.download = 'IAMONCV-' + nm + '-editable.html';
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
            }

            // Exposer les fonctions utilisées par les attributs onclick / onblur du CV.
            Object.assign(window, {
                updateCVField: updateCVField, updateCVExp: updateCVExp, updateCVTask: updateCVTask,
                updateCVEdu: updateCVEdu, updateCVSkill: updateCVSkill, updateCVInterest: updateCVInterest,
                addCVSkill: addCVSkill, removeCVSkill: removeCVSkill, moveCVSkill: moveCVSkill, addCVInterest: addCVInterest,
                removeCVInterest: removeCVInterest, addCVExp: addCVExp, removeCVExp: removeCVExp,
                addCVTask: addCVTask, removeCVTask: removeCVTask, addCVEdu: addCVEdu, removeCVEdu: removeCVEdu,
                updateCVLabel: updateCVLabel, updateCVLang: updateCVLang, addCVLang: addCVLang, removeCVLang: removeCVLang,
                updateCVTool: updateCVTool, addCVTool: addCVTool, removeCVTool: removeCVTool,
                toggleLicense: toggleLicense, updateCVLicense: updateCVLicense,
                toggleShowPhoto: toggleShowPhoto, setAvatarZoom: setAvatarZoom, openPhotoPicker: openPhotoPicker,
                handleProfileUpload: handleProfileUpload
            });

            const up = document.getElementById('profile-upload');
            if (up) up.addEventListener('change', handleProfileUpload);
            const bp = document.getElementById('btn-print');
            if (bp) bp.addEventListener('click', function () { commitPendingEdit(); setTimeout(function () { window.print(); }, 80); });
            const bd = document.getElementById('btn-download');
            if (bd) bd.addEventListener('click', downloadUpdated);
            document.addEventListener('paste', pastePlainText);

            renderCV();
            initAvatarDrag();
            updateSavedHint();
        }

        // Construit le fichier HTML autonome (utilisé par l'app ET par le fichier exporté lui-même).
        function buildEditableCvHtml(cvData, themeVars) {
            const varsBlock = Object.keys(themeVars).map(function (k) { return '            ' + k + ': ' + themeVars[k] + ';'; }).join('\n');
            const css = ''
                + '.th-bg-sidebar{background-color:var(--th-sidebar)!important}'
                + '.th-bg-avatar{background-color:var(--th-avatar)!important}'
                + '.th-border-avatar{border-color:var(--th-avatar-border)!important}'
                + '.th-text-light{color:var(--th-text-light)!important}'
                + '.th-text-lighter{color:var(--th-text-lighter)!important}'
                + '.th-text-accent{color:var(--th-text-accent)!important}'
                + '.th-border-main{border-color:var(--th-main)!important}'
                + '.th-text-main{color:var(--th-main)!important}'
                + '.th-text-sidebar{color:var(--th-sidebar-text)!important}'
                + '.th-text-sidebar-muted{color:var(--th-sidebar-text-muted)!important}'
                + '.th-marker li::marker{color:var(--th-text-accent)!important}'
                + '[contenteditable="true"]:hover{background-color:rgba(30,122,107,.06);outline:1px dashed #1E7A6B;cursor:text}'
                + '.sidebar [contenteditable="true"]:hover{background-color:rgba(255,255,255,.1);outline:1px dashed rgba(255,255,255,.3)}'
                + '[contenteditable="true"]:focus{background-color:rgba(30,122,107,.1);outline:2px solid #1E7A6B;border-radius:4px}'
                + '[contenteditable][data-ph]:empty:before{content:attr(data-ph);opacity:.45;font-style:italic;font-weight:400}'
                + '[contenteditable][data-ph]:empty{min-width:3.5em;display:inline-block}'
                + '.empty-section{opacity:.55}'
                + '@media print{'
                + '@page{size:A4;margin:0}'
                + 'html,body{height:auto!important;overflow:visible!important;background:#fff!important;margin:0!important;padding:0!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}'
                + '.no-print{display:none!important}'
                + '#cv-content{display:flex!important;flex-direction:row!important;width:210mm!important;min-height:297mm!important;margin:0!important;box-shadow:none!important;border:none!important;border-radius:0!important;max-width:none!important}'
                + '.sidebar{width:33%!important;background-color:var(--th-sidebar)!important;color:var(--th-sidebar-text)!important;padding:13mm 8mm!important}'
                + '.main-content{width:67%!important;padding:13mm 11mm!important;background:#fff!important}'
                + '#cv-content i,#cv-content svg{display:none!important}'
                + '#cv-content,#cv-content *{font-family:Arial,Helvetica,sans-serif!important}'
                + 'h2,h3,li,.experience-item{page-break-inside:avoid!important}'
                + '.empty-section{display:none!important}'
                + '[data-ph]:empty:before{content:\'\'!important}'
                + '}';

            const scaffold = ''
                + '<div class="no-print sticky top-0 z-20 bg-[#123F39] text-white px-4 py-3 flex flex-wrap items-center gap-3 shadow-md">'
                +   '<div class="flex items-center gap-2 mr-auto"><i class="fas fa-file-pen text-[#EE6E5E] text-lg"></i>'
                +     '<div class="leading-tight"><div class="font-black tracking-tight">Mon CV, à retravailler</div>'
                +     '<div class="text-[11px] text-[#8FD4C4]">Cliquez sur un texte pour le modifier. Vos changements sont gardés sur cet ordinateur.</div></div></div>'
                +   '<span id="saved-hint" class="text-[11px] text-[#8FD4C4]"></span>'
                +   '<button id="btn-download" class="bg-white/10 border border-white/20 px-3 py-2 rounded-lg text-sm font-bold hover:bg-white/20 transition" title="Télécharger un fichier à jour, à garder ou à ouvrir sur un autre ordinateur."><i class="fas fa-download mr-2 text-[#EE6E5E]"></i>Télécharger ma version</button>'
                +   '<button id="btn-print" class="bg-white text-[#123F39] px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-[#EAF3F0] transition"><i class="fas fa-file-pdf mr-2 text-[#EE6E5E]"></i>Exporter en PDF</button>'
                + '</div>'
                + '<div class="p-4 md:p-8 flex justify-center bg-[#ECE6DB]/60 min-h-screen">'
                +   '<div id="cv-wrapper" class="relative w-full max-w-[210mm]">'
                +     '<p class="no-print text-center text-xs text-slate-500 italic mb-3"><i class="fas fa-lightbulb text-[#EE6E5E] mr-1"></i>Gardez le CV sur une seule page : si ça déborde, raccourcissez ou retirez des lignes.</p>'
                +     '<div id="cv-content" class="bg-white shadow-2xl rounded-lg overflow-hidden flex flex-col md:flex-row w-full min-h-[297mm]">'
                +       '<div class="sidebar w-full md:w-1/3 th-bg-sidebar th-text-sidebar p-6 md:p-8">'
                +         '<div class="text-center mb-8">'
                +           '<div class="no-print flex items-center justify-center mb-3"><label class="inline-flex items-center gap-1.5 cursor-pointer select-none text-[11px] th-text-lighter"><input type="checkbox" id="toggle-photo" checked onchange="toggleShowPhoto(this.checked)" class="accent-[#1E7A6B] w-3.5 h-3.5"><span><i class="fas fa-image mr-1"></i>Afficher la photo</span></label></div>'
                +           '<div id="cv-avatar-block">'
                +             '<div class="relative w-28 h-28 mx-auto mb-2 group">'
                +               '<div class="w-full h-full th-bg-avatar rounded-full flex items-center justify-center text-4xl border-4 th-border-avatar shadow-inner overflow-hidden bg-center bg-cover cursor-grab select-none" id="cv-avatar-container" title="Glissez pour recadrer la photo"><i id="cv-avatar-icon" class="fas fa-camera th-text-light"></i></div>'
                +               '<button type="button" onclick="openPhotoPicker()" title="Choisir une photo" class="no-print absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#1E7A6B] text-white shadow-lg flex items-center justify-center hover:bg-[#17594E] transition"><i class="fas fa-camera text-xs"></i></button>'
                +               '<input type="file" id="profile-upload" class="hidden" accept="image/png, image/jpeg, image/webp">'
                +             '</div>'
                +             '<div id="avatar-tools" class="no-print hidden mb-4 px-2"><div class="flex items-center gap-2 justify-center"><i class="fas fa-search-minus th-text-lighter text-[10px]"></i><input type="range" id="avatar-zoom" min="1" max="2.6" step="0.05" value="1" oninput="setAvatarZoom(this.value, false)" onchange="setAvatarZoom(this.value, true)" class="w-28 accent-[#1E7A6B] cursor-pointer"><i class="fas fa-search-plus th-text-lighter text-[10px]"></i></div><p class="text-[10px] th-text-lighter italic text-center mt-1">Glissez la photo pour la recadrer</p></div>'
                +             '<div class="mb-4"></div>'
                +           '</div>'
                +           '<h1 id="cv-name" class="text-xl font-black uppercase tracking-tight th-text-sidebar leading-none break-words" contenteditable="true" onblur="updateCVField(\'name\', this.innerText)">Prénom Nom</h1>'
                +           '<p id="cv-job" class="th-text-light font-medium italic mt-2" contenteditable="true" onblur="updateCVField(\'job\', this.innerText)">Titre du poste visé</p>'
                +         '</div>'
                +         '<div class="mb-8"><h2 class="text-xs font-semibold uppercase tracking-widest border-b th-border-avatar pb-2 mb-4 th-text-lighter">Contact</h2><ul class="text-sm space-y-2 th-text-sidebar-muted"><li class="flex items-center"><i class="fas fa-address-card w-6 th-text-accent"></i> <span id="cv-contact-display" contenteditable="true" onblur="updateCVField(\'contact\', this.innerText)">Téléphone / Email</span></li></ul></div>'
                +         '<div class="mb-8"><h2 class="text-xs font-semibold uppercase tracking-widest border-b th-border-avatar pb-2 mb-4 th-text-lighter">Compétences clés</h2><div id="cv-skills" class="flex flex-col gap-1.5 text-sm"></div></div>'
                +         '<div id="cv-interests-container" class="mb-8"><h2 id="cvh-interests" contenteditable="true" onblur="updateCVLabel(\'interests\', this.innerText)" class="text-xs font-semibold uppercase tracking-widest border-b th-border-avatar pb-2 mb-4 th-text-lighter">Centres d\'intérêt</h2><ul id="cv-interests" class="text-sm space-y-1 th-text-sidebar-muted list-disc pl-4 th-marker"></ul></div>'
                +         '<div id="cv-languages-container" class="mb-8"><h2 id="cvh-languages" contenteditable="true" onblur="updateCVLabel(\'languages\', this.innerText)" class="text-xs font-semibold uppercase tracking-widest border-b th-border-avatar pb-2 mb-4 th-text-lighter">Langues</h2><ul id="cv-languages" class="text-sm space-y-1 th-text-sidebar-muted"></ul></div>'
                +         '<div id="cv-tools-container" class="mb-8"><h2 id="cvh-tools" contenteditable="true" onblur="updateCVLabel(\'tools\', this.innerText)" class="text-xs font-semibold uppercase tracking-widest border-b th-border-avatar pb-2 mb-4 th-text-lighter">Outils numériques</h2><div id="cv-tools" class="flex flex-wrap gap-1.5 text-sm"></div></div>'
                +         '<div id="cv-license-container"><div class="no-print flex items-center mb-2"><label class="inline-flex items-center gap-1.5 cursor-pointer select-none text-[11px] th-text-lighter"><input type="checkbox" id="toggle-license" onchange="toggleLicense(this.checked)" class="accent-[#1E7A6B] w-3.5 h-3.5"><span><i class="fas fa-id-card mr-1"></i>Afficher le permis</span></label></div><ul id="cv-license" class="text-sm th-text-sidebar-muted"></ul></div>'
                +         '<div id="cv-add-sections" class="no-print flex flex-wrap gap-1.5 mt-4"></div>'
                +       '</div>'
                +       '<div class="main-content w-full md:w-2/3 p-6 md:p-10 bg-white">'
                +         '<section class="mb-8"><h2 class="text-lg font-bold text-slate-800 border-l-4 th-border-main pl-4 mb-4 uppercase tracking-wider">Profil</h2><div id="cv-profile" class="text-slate-600 text-sm leading-relaxed italic" contenteditable="true" onblur="updateCVField(\'profile\', this.innerText)"></div></section>'
                +         '<section class="mb-8"><h2 id="cvh-experiences" contenteditable="true" onblur="updateCVLabel(\'experiences\', this.innerText)" class="text-lg font-bold text-slate-800 border-l-4 th-border-main pl-4 mb-6 uppercase tracking-wider">Expériences</h2><div id="cv-experiences" class="space-y-6 text-sm text-slate-700"></div></section>'
                +         '<section><h2 id="cvh-education" contenteditable="true" onblur="updateCVLabel(\'education\', this.innerText)" class="text-lg font-bold text-slate-800 border-l-4 th-border-main pl-4 mb-6 uppercase tracking-wider">Formations</h2><div id="cv-education" class="space-y-4 text-sm text-gray-700"></div></section>'
                +       '</div>'
                +     '</div>'
                +   '</div>'
                + '</div>';

            const jsonSafe = JSON.stringify(cvData).replace(/</g, '\\u003c');
            const OPEN = '<' + 'script';
            const CLOSE = '<' + '/script>';
            const twTag = OPEN + ' src="https://cdn.tailwindcss.com">' + CLOSE;
            const dataTag = OPEN + ' id="cv-data" type="application/json">' + jsonSafe + CLOSE;
            const appTag = OPEN + '>\n' + portableMain.toString() + '\n' + buildEditableCvHtml.toString() + '\nportableMain();\n' + CLOSE;

            return '<!DOCTYPE html>\n'
                + '<html lang="fr">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
                + '<title>Mon CV - IAMONCV</title>\n'
                + twTag + '\n'
                + '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\n'
                + '<style>\n:root{\n' + varsBlock + '\n}\n' + css + '\n</style>\n</head>\n'
                + '<body class="bg-[#F7F3EC] font-sans text-slate-900">\n'
                + scaffold + '\n'
                + dataTag + '\n'
                + appTag + '\n'
                + '</body>\n</html>';
        }

        // Déclenché par le bouton « Version éditable » de l'app.
        function exportEditableCV() {
            commitPendingEdit();
            if ((!cvData.experiences || !cvData.experiences.length) && !cvData.profile && (!cvData.skills || !cvData.skills.length)) {
                alert("Générez ou complétez d'abord un CV avant d'en exporter une version éditable.");
                return;
            }
            const data = JSON.parse(JSON.stringify(cvData));
            data.__id = data.__id || ('cv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
            data.__ts = Date.now();
            const keys = ['--th-sidebar','--th-avatar','--th-avatar-border','--th-text-light','--th-text-lighter','--th-text-accent','--th-main','--th-sidebar-text','--th-sidebar-text-muted'];
            const cs = getComputedStyle(document.documentElement);
            const tv = {};
            keys.forEach(function (k) { tv[k] = (cs.getPropertyValue(k) || '').trim(); });
            const html = buildEditableCvHtml(data, tv);
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const a = document.createElement('a');
            const nm = (data.name || 'CV').replace(/[^0-9A-Za-zÀ-ÿ]+/g, '-').replace(/^-+|-+$/g, '') || 'CV';
            a.href = URL.createObjectURL(blob);
            a.download = 'IAMONCV-' + nm + '-editable.html';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        }

        // ==========================================================================
        // RÉINTÉGRATION D'UN CV RENVOYÉ : le demandeur a modifié le fichier éditable
        // chez lui et l'a renvoyé à son conseiller. On relit le bloc JSON embarqué
        // (id="cv-data") pour recharger ses modifications dans l'app.
        // ==========================================================================

        function triggerEditedImport() {
            const inp = document.getElementById('edited-cv-import');
            if (!inp) return;
            inp.value = '';
            inp.click();
        }

        // Extrait l'objet cvData d'un fichier éditable (.html) ou d'un .json exporté.
        function extractCvDataFromEditedFile(text) {
            if (!text) return null;
            // 1) Fichier HTML éditable : on récupère le bloc JSON marqué id="cv-data".
            let m = text.match(/id=["']cv-data["'][^>]*>([\s\S]*?)<\/script>/i);
            let jsonStr = m ? m[1] : null;
            // 2) Sinon, fichier .json direct
            if (!jsonStr) {
                const t = text.trim();
                if (t.startsWith('{')) jsonStr = t;
            }
            if (!jsonStr) return null;
            try {
                let data = JSON.parse(jsonStr.trim());
                // Un export de profil complet ({db, cv}) : on prend la partie cv.
                if (data && data.cv && (data.cv.experiences || data.cv.profile)) data = data.cv;
                return data;
            } catch (e) {
                // Le JSON embarqué échappe parfois "<" en < : on retente après remise en état.
                try { return JSON.parse(jsonStr.trim().replace(/\\u003c/g, '<')); } catch (e2) { return null; }
            }
        }

        function looksLikeCv(d) {
            return d && typeof d === 'object' &&
                (Array.isArray(d.experiences) || Array.isArray(d.skills) || typeof d.profile === 'string');
        }

        // Remplit la colonne de gauche (la base) à partir d'un CV importé, pour
        // pouvoir le modifier puis le régénérer avec l'IA. Les « tâches » de chaque
        // expérience deviennent le « détail » retenu côté base.
        function fillDbFromCv(cv) {
            if (!cv) return;
            db.name = cv.name || db.name || "";
            db.contact = cv.contact || db.contact || "";
            if (cv.gender) db.gender = cv.gender;

            db.experiences = (cv.experiences || []).map(e => ({
                title: e.title || '',
                company: e.company || '',
                date: e.date || '',
                details: Array.isArray(e.tasks) ? e.tasks.filter(Boolean).join('\n') : (e.details || ''),
                brief: ''
            }));
            db.education = (cv.education || []).map(ed => ({
                title: ed.title || '',
                school: ed.school || '',
                date: ed.date || '',
                details: '',
                brief: ''
            }));
            db.interests = (cv.interests || []).map(it =>
                typeof it === 'string' ? { title: it, details: '' } : { title: it.title || '', details: it.details || '' }
            );
            db.languages = (cv.languages || []).map(l =>
                typeof l === 'string'
                    ? { title: l, level: '', details: '' }
                    : { title: l.name || l.title || '', level: l.level || '', details: '' }
            );
            db.tools = (cv.tools || []).map(t =>
                typeof t === 'string' ? { title: t } : { title: t.title || '' }
            );

            saveDB();
            renderDB();
        }

        function importEditedCvFile(file) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (e) {
                const parsed = extractCvDataFromEditedFile(String(e.target.result || ''));
                if (!looksLikeCv(parsed)) {
                    alert("Ce fichier ne contient pas de CV IAMONCV lisible.\n\nEnvoyez le fichier « ...-editable.html » que le demandeur a rouvert et modifié, puis renvoyé.");
                    return;
                }
                const nbExp = (parsed.experiences || []).length;
                const ok = confirm(
                    "Réintégrer le CV renvoyé dans le profil courant ?\n\n" +
                    "Le CV affiché à droite sera remplacé par la version modifiée par le demandeur (" +
                    nbExp + " expérience" + (nbExp > 1 ? "s" : "") + "). " +
                    "La colonne de gauche sera aussi remplie à partir de ce CV, pour pouvoir le modifier et le régénérer avec l'IA."
                );
                if (!ok) return;

                // On conserve l'identité éventuellement déjà saisie côté conseiller si le fichier ne la porte pas.
                const merged = Object.assign(emptyCV(), parsed);
                delete merged.__ts; // horodatage propre au fichier éditable
                cvData = merged;
                renderCV();
                saveCV();
                if (typeof updateOnePageStatus === 'function') updateOnePageStatus();

                // Remplir la colonne de gauche à partir du CV importé, pour que la
                // personne puisse le modifier et le régénérer. Si la base contient
                // déjà des données, on demande avant de les remplacer.
                const dbHasContent =
                    (db.experiences || []).length || (db.education || []).length ||
                    (db.interests || []).length || (db.languages || []).length ||
                    (db.tools || []).length;
                if (!dbHasContent || confirm(
                    "La colonne de gauche contient déjà des données. Les remplacer par le contenu de ce CV ?\n\n" +
                    "(Nécessaire pour modifier ce CV et le régénérer avec l'IA.)"
                )) {
                    fillDbFromCv(merged);
                }

                // Proposer une relecture IA facultative (harmonisation, sans rien inventer).
                if (hasApiKey()) {
                    if (confirm("CV réintégré. \n\nVoulez-vous que l'IA le relise pour harmoniser la formulation et corriger les fautes, sans rien inventer ni ajouter ?")) {
                        harmonizeImportedCV();
                    }
                } else {
                    alert("CV réintégré. Vous pouvez le relire, l'imprimer en PDF ou le ré-exporter.");
                }
            };
            reader.onerror = function () { alert("Impossible de lire ce fichier. Réessayez avec le fichier .html renvoyé."); };
            reader.readAsText(file);
        }

        // Relecture IA du CV importé : corrige et harmonise SANS inventer ni ajouter de contenu.
        async function harmonizeImportedCV() {
            if (!ensureApiKey()) return;
            const overlay = document.getElementById('generation-overlay');
            overlay.classList.remove('hidden');
            setOverlayMessage('Relecture en cours', "L'IA harmonise le CV renvoyé…");

            const payload = {
                profile: cvData.profile || "",
                skills: cvData.skills || [],
                experiences: cvData.experiences || [],
                education: cvData.education || [],
                interests: cvData.interests || [],
                languages: cvData.languages || [],
                tools: cvData.tools || []
            };

            const sysPrompt = `Tu es un relecteur de CV. On te donne un CV DÉJÀ RÉDIGÉ (modifié à la main par la personne). Ton rôle est UNIQUEMENT de le relire, pas de le refaire.

            RÈGLE ABSOLUE : n'ajoute AUCUN contenu, n'invente AUCUNE expérience, date, chiffre, diplôme, compétence ou langue. Tu ne supprimes rien non plus. Tu gardes exactement les mêmes rubriques et le même nombre d'éléments.
            CE QUE TU PEUX FAIRE : corriger l'orthographe et la grammaire, harmoniser les temps et la ponctuation, uniformiser la casse et les puces, fluidifier une tournure maladroite en gardant le sens et les faits.
            ${genderDirective()}
            TON : sobre et factuel, sans superlatifs ni autopromotion.

            RÉPONDS STRICTEMENT AVEC LE MÊME OBJET JSON, corrigé, et RIEN D'AUTRE (pas de markdown, pas de texte autour). Interdiction des vrais sauts de ligne dans les valeurs : utilise "\\n".
            STRUCTURE (identique à l'entrée) :
            {"profile":"...","skills":["..."],"experiences":[{"title":"...","company":"...","date":"...","tasks":["..."]}],"education":[{"title":"...","school":"...","date":"..."}],"interests":["..."],"languages":[{"name":"...","level":"..."}],"tools":["..."]}`;

            const userPrompt = `CV à relire (JSON) :\n${JSON.stringify(payload)}\n\nRenvoie le même JSON corrigé.`;

            try {
                const response = await callAssistantAPI(userPrompt, sysPrompt);
                const fixed = parseCvJson(response);
                if (fixed.profile !== undefined) cvData.profile = fixed.profile;
                if (Array.isArray(fixed.skills)) cvData.skills = fixed.skills;
                if (Array.isArray(fixed.experiences)) cvData.experiences = fixed.experiences;
                if (Array.isArray(fixed.education)) cvData.education = fixed.education;
                if (Array.isArray(fixed.interests)) cvData.interests = fixed.interests;
                if (Array.isArray(fixed.languages)) cvData.languages = fixed.languages;
                if (Array.isArray(fixed.tools)) cvData.tools = fixed.tools;
                renderCV();
                await fitToOnePage(2);
                renderCV();
                saveCV();
                resetGenerationOverlay();
                updateOnePageStatus();
            } catch (e) {
                console.error("Erreur de relecture :", e);
                if (e.isKeyError) {
                    resetGenerationOverlay();
                    showAiAccessError(e);
                } else {
                    resetGenerationOverlay();
                    alert("La relecture IA a échoué, mais le CV renvoyé reste bien réintégré. Vous pouvez le relire à la main.");
                }
            }
        }

        // --- APPEL À L'ASSISTANT IA ---
        // Intégré à IAMONJOB : l'IA passe par le backend Mistral (France), via la
        // route /api/cv-assistant, sans aucune clé côté navigateur. L'authentification
        // se fait par le cookie de session IAMONJOB (envoyé automatiquement, même origine). On conserve la même
        // signature (query, sysInstruction, history) pour ne rien changer ailleurs.
        async function callAssistantAPI(query, sysInstruction, history = []) {
            const delays = [1000, 2000, 4000];

            const payload = {
                query,
                systemInstruction: sysInstruction,
                history: history || [],
            };

            for (let i = 0; i <= delays.length; i++) {
                try {
                    const res = await fetch('/api/cv-assistant', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        // Session expirée / non connecté : inutile de réessayer.
                        if (res.status === 401) {
                            const authErr = new Error("Session IAMONJOB expirée. Reconnectez-vous, puis rouvrez cette page.");
                            authErr.isKeyError = true;
                            throw authErr;
                        }
                        // Quota atteint : message clair, pas de retry silencieux.
                        if (res.status === 429) {
                            const quotaErr = new Error(errData.error || "Trop de requêtes. Patientez un instant.");
                            quotaErr.isKeyError = true;
                            throw quotaErr;
                        }
                        throw new Error(errData.error || `Erreur serveur (${res.status})`);
                    }

                    const data = await res.json();
                    // Suivi de la consommation : on remappe l'usage Mistral sur la
                    // forme attendue par le compteur ci-dessus.
                    if (data.usage) {
                        recordUsage({
                            promptTokenCount: data.usage.promptTokens || 0,
                            candidatesTokenCount: data.usage.completionTokens || 0,
                            totalTokenCount: data.usage.totalTokens || 0,
                        });
                    }
                    return data.text || '';
                } catch (err) {
                    if (err.isKeyError) throw err; // pas de retry (auth / quota)
                    if (i === delays.length) throw err;
                    await new Promise(r => setTimeout(r, delays[i]));
                }
            }
        }

        // --- REDIMENSIONNEMENT DE LA COLONNE DE GAUCHE ---
        (function initColumnResizer() {
            const resizer = document.getElementById('col-resizer');
            const root = document.documentElement;
            const MIN = 320, MAX = 760;
            if (!resizer) return;

            // Restaurer la largeur mémorisée
            try {
                const saved = localStorage.getItem('iamoncv_db_w');
                if (saved) root.style.setProperty('--db-w', saved.trim());
            } catch (e) {}

            let dragging = false;
            const onMove = (clientX) => {
                const main = document.querySelector('main');
                if (!main) return;
                const left = main.getBoundingClientRect().left;
                let w = clientX - left;
                w = Math.max(MIN, Math.min(MAX, w));
                root.style.setProperty('--db-w', w + 'px');
            };

            resizer.addEventListener('pointerdown', (e) => {
                dragging = true;
                document.body.classList.add('col-resizing');
                try { resizer.setPointerCapture(e.pointerId); } catch (err) {}
            });
            resizer.addEventListener('pointermove', (e) => { if (dragging) onMove(e.clientX); });
            const endDrag = () => {
                if (!dragging) return;
                dragging = false;
                document.body.classList.remove('col-resizing');
                try { localStorage.setItem('iamoncv_db_w', getComputedStyle(root).getPropertyValue('--db-w').trim() || '440px'); } catch (e) {}
            };
            resizer.addEventListener('pointerup', endDrag);
            resizer.addEventListener('pointercancel', endDrag);
            // Double-clic : réinitialiser la largeur par défaut
            resizer.addEventListener('dblclick', () => {
                root.style.setProperty('--db-w', '440px');
                try { localStorage.setItem('iamoncv_db_w', '440px'); } catch (e) {}
            });
        })();

        // Dictée vocale indisponible (Safari ancien, Firefox…) : on masque le bouton micro
        if (!speechSupported()) {
            const micBtn = document.getElementById('btn-mic');
            if (micBtn) micBtn.style.display = 'none';
        }

        // Init
        changeTheme('iamonjob');
        updateTokenMeter();
        initAvatarDrag();
        cloudBoot().then((ok) => {
            if (!ok) return;
            loadActiveProfile();
            applyActiveProfileToUI();
            suggestIamonjobImport();
        });
