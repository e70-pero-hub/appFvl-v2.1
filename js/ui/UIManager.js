class UIManager {
    constructor(dataManager) {
        this.dm = dataManager;
        this.currentRole = 'admin';
        this.contentArea = document.getElementById('content-area');
        this.sectionTitle = document.getElementById('section-title');
        this.modal = document.getElementById('modal-container');
        this.html5QrcodeScanner = null;

        this.initLogin();
        this.initEventListeners();
        this.checkSession();
        this.setupActivityTracker();
    }

    checkSession() {
        if (this.dm.restoreSession()) {
            this.currentRole = this.dm.currentUser.role;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'flex';
            const nameStr = this.dm.currentUser.full_name || this.dm.currentUser.username || '?';
            const initial = nameStr.split(' ').filter(n => n).map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const avatarBtn = document.getElementById('user-avatar');
            if (avatarBtn) avatarBtn.textContent = initial;
            this.updateRoleUI();
        }
    }

    setupActivityTracker() {
        const updateActivity = () => {
            if (this.dm.currentUser) {
                localStorage.setItem('ft_last_activity', Date.now());
            }
        };
        ['click', 'touchstart', 'keypress', 'scroll'].forEach(evt => {
            document.addEventListener(evt, updateActivity, { passive: true });
        });

        // Proverava svake minute da li je isteklo
        setInterval(() => {
            if (this.dm.currentUser) {
                const lastAct = parseInt(localStorage.getItem('ft_last_activity') || '0', 10);
                if (Date.now() - lastAct > 5 * 60 * 1000) {
                    this.dm.logout();
                    alert("Sesija je istekla zbog neaktivnosti od 5 minuta.");
                    location.reload();
                }
            }
        }, 60000);
    }

    initLogin() {
        const loginForm = document.getElementById('login-form');
        const loginError = document.getElementById('login-error');

        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value;
            const pass = document.getElementById('password').value;

            const result = await this.dm.login(user, pass);
            if (result.success) {
                this.currentRole = this.dm.currentUser.role;
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('main-app').style.display = 'flex';

                const nameStr = this.dm.currentUser.full_name || this.dm.currentUser.username || '?';
                const initial = nameStr.split(' ').filter(n => n).map(n => n[0]).join('').substring(0, 2).toUpperCase();
                const avatarBtn = document.getElementById('user-avatar');
                if (avatarBtn) avatarBtn.textContent = initial;

                this.updateRoleUI();
            } else {
                loginError.textContent = result.message;
                loginError.classList.add('show');
            }
        };
    }

    initEventListeners() {
        document.querySelector('.nav-links').addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (li) {
                const section = li.dataset.section;
                this.setActiveNav(li);
                this.renderSection(section);
            }
        });

        document.getElementById('add-fuel-btn').addEventListener('click', () => {
            this.showFuelForm();
        });

        document.querySelector('.close-modal').addEventListener('click', async () => {
            this.modal.classList.add('hidden');
            if (this.html5QrcodeScanner) {
                try {
                    await this.html5QrcodeScanner.stop();
                } catch (e) { }
                this.html5QrcodeScanner = null;
            }
            const qrEl = document.getElementById('qr-reader');
            qrEl.style.display = 'none';
            qrEl.innerHTML = '';
        });

        document.getElementById('role-toggle').addEventListener('click', () => {
            if (confirm('Da li ste sigurni da želite da se odjavite?')) {
                this.dm.logout();
                location.reload();
            }
        });
    }

    updateRoleUI() {
        const navUsers = document.getElementById('nav-users');
        const navReports = document.getElementById('nav-reports');
        const addFuelBtn = document.getElementById('add-fuel-btn');

        if (this.currentRole === 'admin') {
            if (navUsers) navUsers.classList.remove('hidden');
            if (navReports) navReports.classList.remove('hidden');
            addFuelBtn.classList.remove('hidden');
            this.renderSection('dashboard');
            this.setActiveNav(document.querySelector('[data-section="dashboard"]'));
        } else {
            if (navUsers) navUsers.classList.add('hidden');
            if (navReports) navReports.classList.add('hidden');
            addFuelBtn.classList.remove('hidden');
            this.renderSection('fuel');
            this.setActiveNav(document.querySelector('[data-section="fuel"]'));
        }
    }

    setActiveNav(element) {
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
        if (element) element.classList.add('active');
    }

    async renderSection(section) {
        this.contentArea.innerHTML = '<div class="loading-shimmer" style="padding:2rem;text-align:center;">Učitavam...</div>';

        switch (section) {
            case 'dashboard':
                await this.renderDashboard();
                break;
            case 'vehicles':
                await this.renderVehicles();
                break;
            case 'employees':
                await this.renderUsers();
                break;
            case 'reports':
                await this.renderReports();
                break;
            case 'fuel':
                await this.renderFuelLogs();
                break;
        }
    }

    async renderDashboard() {
        this.sectionTitle.textContent = 'Početna (Nadzorna Tabla)';
        const [vehicles, fuelResult] = await Promise.all([
            this.dm.getData('vehicles'),
            this.dm.getData('fuel_logs', { limit: 5, offset: 0 })
        ]);

        // Paginirani odgovor: { items: [...], total: N }
        const logs = fuelResult.items || fuelResult;
        const totalLogs = fuelResult.total || (Array.isArray(fuelResult) ? fuelResult.length : 0);

        let summaryHtml = `
            <div class="summary-cards">
                <div class="summary-card">
                    <h3>Ukupno Vozila</h3>
                    <div class="value">${vehicles.length}</div>
                </div>
                <div class="summary-card">
                    <h3>Broj Točenja</h3>
                    <div class="value">${totalLogs}</div>
                </div>
            </div>
            
            <h3 style="margin-bottom:1rem; font-size:1.1rem;">Nedavna Točenja</h3>
        `;

        if (logs.length === 0) {
            summaryHtml += `<p style="color:var(--text-dim); text-align:center;">Nema podataka.</p>`;
        } else {
            summaryHtml += logs.map(log => {
                const vehicle = vehicles.find(v => v.id === log.vehicleId);
                const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : `Vozilo ID: ${log.vehicleId}`;
                const isLink = log.qrData && log.qrData.startsWith('http');
                const hasQr = log.qrData ? (isLink ? `
                    <a href="${log.qrData}" target="_blank" class="card-badge" style="background: rgba(40, 167, 69, 0.15); color: #28a745; border: 1px solid rgba(40, 167, 69, 0.3); font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; text-transform: uppercase; text-decoration: none; cursor: pointer; transition: all 0.2s ease;" title="Klikni za proveru računa u Poreskoj Upravi">
                        <i class="fas fa-qrcode"></i> QR
                    </a>` : `
                    <span class="card-badge" style="background: rgba(40, 167, 69, 0.15); color: #28a745; border: 1px solid rgba(40, 167, 69, 0.3); font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; text-transform: uppercase;">
                        <i class="fas fa-qrcode"></i> QR
                    </span>`) : '';
                return `
                    <div class="data-card">
                        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span class="card-title">${vehicleName}</span>
                                ${hasQr}
                            </div>
                            <span style="font-size: 0.8rem; color:var(--text-dim); white-space: nowrap;">${new Date(log.date).toLocaleDateString()}</span>
                        </div>
                        <div class="card-body">
                            <div>Kilometraža: <strong>${log.km} km</strong></div>
                            <div>Količina: <strong style="color:var(--accent)">${log.liters} L</strong></div>
                            <div style="grid-column: span 2;">Cena: <strong>${(log.price * log.liters).toFixed(2)} RSD</strong></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        this.contentArea.innerHTML = summaryHtml;
    }

    async renderVehicles() {
        this.sectionTitle.textContent = 'Vozila';
        const [vehicles, users] = await Promise.all([
            this.dm.getData('vehicles'),
            this.dm.getData('users')
        ]);

        let html = ``;
        if (this.currentRole === 'admin') {
            html += `<button class="btn btn-primary" onclick="window.ui.showVehicleForm()" style="margin-bottom: 1rem;"><i class="fas fa-plus"></i> Dodaj Vozilo</button>`;
        }

        if (vehicles.length === 0) {
            html += `<p style="color:var(--text-dim); text-align:center;">Nema vozila.</p>`;
        } else {
            html += vehicles.map(v => {
                const u = users.find(usr => usr.id === v.userId);
                const userName = u ? u.full_name : 'Nije dodeljeno';

                const getStatus = (dateString) => {
                    const date = new Date(dateString);
                    const daysLeft = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
                    if (daysLeft < 0) return { text: 'Isteklo', badge: 'background: var(--danger);' };
                    if (daysLeft <= 30) return { text: 'Uskoro (<30d)', badge: 'background: var(--warning);' };
                    return { text: 'OK', badge: 'background: var(--accent);' };
                };
                const regStatus = getStatus(v.regExp);

                return `
                    <div class="data-card">
                        <div class="card-header">
                            <span class="card-title">${v.brand} ${v.model} (${v.plate})</span>
                            <span class="card-badge" style="color:#fff; ${regStatus.badge}">${regStatus.text}</span>
                        </div>
                        <div class="card-body">
                            <div>Zadužen: <strong>${userName}</strong></div>
                            <div>Reg: <strong>${new Date(v.regExp).toLocaleDateString()}</strong></div>
                            <div>Servis: <strong>${new Date(v.service).toLocaleDateString()}</strong></div>
                            <div>Gume: <strong>${new Date(v.tires).toLocaleDateString()}</strong></div>
                        </div>
                        ${this.currentRole === 'admin' ? `
                        <div class="card-actions">
                            <button class="btn btn-secondary" onclick="window.ui.showVehicleForm(${v.id})" style="padding: 0.5rem;"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger" onclick="window.ui.deleteVehicle(${v.id})" style="padding: 0.5rem;"><i class="fas fa-trash"></i></button>
                        </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }

        this.contentArea.innerHTML = html;
    }

    async renderUsers() {
        this.sectionTitle.textContent = 'Korisnici Sistem';
        const users = await this.dm.getData('users');

        let html = `<button class="btn btn-primary" onclick="window.ui.showUserForm()" style="margin-bottom: 1rem;"><i class="fas fa-plus"></i> Novi Korisnik</button>`;

        if (users.length === 0) {
            html += `<p style="color:var(--text-dim); text-align:center;">Nema korisnika.</p>`;
        } else {
            html += users.map(u => {
                const roleBadge = u.role === 'admin' ? '<span style="color:var(--warning)"><i class="fas fa-star"></i> Admin</span>' : 'Korisnik';
                return `
                    <div class="data-card">
                        <div class="card-header">
                            <span class="card-title">${u.full_name}</span>
                            <span style="font-size:0.8rem;">${roleBadge}</span>
                        </div>
                        <div class="card-body">
                            <div>Username: <strong>${u.username}</strong></div>
                        </div>
                        <div class="card-actions">
                            <button class="btn btn-secondary" onclick="window.ui.showUserForm(${u.id})" style="padding: 0.5rem;"><i class="fas fa-edit"></i></button>
                            ${u.id !== this.dm.currentUser.id ? `<button class="btn btn-danger" onclick="window.ui.deleteUser(${u.id})" style="padding: 0.5rem;"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
        this.contentArea.innerHTML = html;
    }

    async renderFuelLogs(filters = null, appendMode = false) {
        this.sectionTitle.textContent = 'Istorija Točenja';

        if (filters === null) {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            filters = { month_year: currentMonth };
        }
        this.currentFuelFilters = filters;

        // Paginacija
        const PAGE_SIZE = 50;
        if (!appendMode) {
            this.fuelOffset = 0;
            this.fuelLoadedLogs = [];
        }

        const [fuelResult, vehicles] = await Promise.all([
            this.dm.getData('fuel_logs', { limit: PAGE_SIZE, offset: this.fuelOffset }),
            this.dm.getData('vehicles')
        ]);

        // Paginirani odgovor
        const allLogs = fuelResult.items || fuelResult;
        const totalCount = fuelResult.total || 0;

        // Filtriranje na klijentskoj strani (mesec i tablice)
        let logs = allLogs;
        if (filters.month_year) {
            logs = logs.filter(log => {
                const logDate = new Date(log.date);
                const logMonthStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
                return logMonthStr === filters.month_year;
            });
        }
        if (filters.plate) {
            const vMatched = vehicles.filter(veh => veh.plate.toLowerCase().includes(filters.plate.toLowerCase()));
            const vIds = vMatched.map(v => v.id);
            logs = logs.filter(log => vIds.includes(log.vehicleId));
        }

        // Dodaj na listu učitanih logova
        this.fuelLoadedLogs = appendMode ? [...this.fuelLoadedLogs, ...logs] : logs;
        this.fuelOffset += PAGE_SIZE;

        let html = `
            <div class="data-card" style="margin-bottom: 1rem;">
                <div class="card-body" style="grid-template-columns: 1fr; gap: 0.5rem;">
                    <input type="${filters.month_year ? 'month' : 'text'}" onfocus="this.type='month'" onblur="if(!this.value){this.type='text'}" id="fuel-filter-month" value="${filters.month_year || ''}" placeholder="Izaberite period (mesec/godina)" style="padding: 0.5rem; background: var(--surface-light); border: 1px solid var(--border-color); color: var(--text-main); border-radius: 8px;">
                    
                    <input type="text" id="fuel-filter-plate" list="fuel-plates-list" value="${filters.plate || ''}" placeholder="Pretraga po tablicama..." style="padding: 0.5rem; background: var(--surface-light); border: 1px solid var(--border-color); color: var(--text-main); border-radius: 8px;">
                    <datalist id="fuel-plates-list">
                        ${vehicles.map(v => `<option value="${v.plate}">${v.brand} ${v.model}</option>`).join('')}
                    </datalist>

                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                        <button class="btn btn-primary" onclick="window.ui.applyFuelFilters()" style="flex: 1;"><i class="fas fa-search"></i> Primeni</button>
                        <button class="btn btn-primary" onclick="window.ui.clearFuelFilters()" style="flex: 1;"><i class="fas fa-times"></i> Očisti</button>
                    </div>
                </div>
            </div>
        `;

        if (this.fuelLoadedLogs.length === 0) {
            html += `<p style="color:var(--text-dim); text-align:center;">Nema točenja za izabrane filtere.</p>`;
        } else {
            // Sortiranje po datumu opadajuće (najnovija prva)
            this.fuelLoadedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

            html += this.fuelLoadedLogs.map(log => {
                const v = vehicles.find(veh => veh.id === log.vehicleId);
                const vehicleName = v ? `${v.brand} ${v.model}` : `Vozilo ID: ${log.vehicleId}`;
                const isLink = log.qrData && log.qrData.startsWith('http');
                const hasQr = log.qrData ? (isLink ? `
                    <a href="${log.qrData}" target="_blank" class="card-badge" style="background: rgba(40, 167, 69, 0.15); color: #28a745; border: 1px solid rgba(40, 167, 69, 0.3); font-size: 0.75rem; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; text-decoration: none; cursor: pointer; transition: all 0.2s ease;" title="Klikni za proveru računa u Poreskoj Upravi">
                        <i class="fas fa-qrcode"></i> QR Kod Sačuvan
                    </a>` : `
                    <span class="card-badge" style="background: rgba(40, 167, 69, 0.15); color: #28a745; border: 1px solid rgba(40, 167, 69, 0.3); font-size: 0.75rem; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">
                        <i class="fas fa-qrcode"></i> QR Kod Sačuvan
                    </span>`) : '';
                const hasImg = log.image ? `
                    <a href="${log.image}" target="_blank" class="card-badge" style="background: rgba(255, 152, 0, 0.15); color: #ff9800; border: 1px solid rgba(255, 152, 0, 0.3); font-size: 0.75rem; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; text-decoration: none; text-transform: uppercase; letter-spacing: 0.3px; transition: all 0.2s ease;">
                        <i class="fas fa-receipt"></i> Slika Računa
                    </a>` : '';

                return `
                    <div class="data-card">
                        <div class="card-header">
                            <span class="card-title">${vehicleName} <span style="font-size:0.8rem;color:var(--text-dim)">(${v ? v.plate : ''})</span></span>
                            <span style="font-size: 0.8rem; color:var(--text-dim);">${new Date(log.date).toLocaleDateString()}</span>
                        </div>
                        <div class="card-body">
                            <div>Kilometraža: <strong>${log.km.toLocaleString()} km</strong></div>
                            <div>Cena: <strong>${log.price} RSD</strong></div>
                            <div style="grid-column: span 2;">
                                Količina i iznos: <strong style="color:var(--accent)">${log.liters} L (${(log.liters * log.price).toLocaleString()} RSD)</strong>
                            </div>
                            <div style="grid-column: span 2; display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
                                ${hasQr} ${hasImg}
                            </div>
                        </div>
                        ${this.currentRole === 'admin' ? `
                        <div class="card-actions">
                            <button class="btn btn-danger" onclick="window.ui.deleteFuel(${log.id})" style="padding: 0.5rem;"><i class="fas fa-trash"></i></button>
                        </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            // Dugme "Učitaj starija točenja" ako ima još podataka
            if (this.fuelOffset < totalCount) {
                html += `
                    <button class="btn btn-secondary" onclick="window.ui.loadMoreFuelLogs()" style="width: 100%; margin-top: 1rem; padding: 0.8rem;">
                        <i class="fas fa-chevron-down"></i> Učitaj starija točenja (${this.fuelLoadedLogs.length}/${totalCount})
                    </button>
                `;
            }
        }
        this.contentArea.innerHTML = html;
    }

    async loadMoreFuelLogs() {
        await this.renderFuelLogs(this.currentFuelFilters, true);
    }

    async renderReports(filters = null, activeTab = 'fuel') {
        this.sectionTitle.textContent = 'Menadžerski Izveštaji';

        if (filters === null) {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            filters = { month_year: currentMonth };
        }
        this.currentReportFilters = filters;

        // Tabs
        let tabsHtml = `
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                <button class="btn ${activeTab === 'fuel' ? 'btn-primary' : 'btn-secondary'}" style="flex:1;" onclick="window.ui.renderReports(window.ui.currentReportFilters, 'fuel')">Gorivo i Potrošnja</button>
                <button class="btn ${activeTab === 'warnings' ? 'btn-primary' : 'btn-secondary'}" style="flex:1;" onclick="window.ui.renderReports(window.ui.currentReportFilters, 'warnings')">Isteci i Upozorenja</button>
            </div>
        `;

        if (activeTab === 'fuel') {
            const [vehicles, users, data] = await Promise.all([
                this.dm.getData('vehicles'),
                this.dm.getData('users'),
                this.dm.getReports(filters)
            ]);
            this.currentReportLogs = data.logs;

            let filterHtml = `
                <div class="data-card" style="margin-bottom: 1rem;">
                    <div class="card-body" style="grid-template-columns: 1fr; gap: 0.5rem;">
                        <input type="${filters.month_year ? 'month' : 'text'}" onfocus="this.type='month'" onblur="if(!this.value){this.type='text'}" id="filter-month" value="${filters.month_year || ''}" placeholder="Izaberite period (mesec/godina)" title="Odaberi mesec i godinu" style="padding: 0.5rem; background: var(--surface-light); border: 1px solid var(--border-color); color: var(--text-main); border-radius: 8px;">
                        
                        <input type="text" id="filter-plate" list="plates-list" value="${filters.plate || ''}" placeholder="Pretraga po tablicama..." style="padding: 0.5rem; background: var(--surface-light); border: 1px solid var(--border-color); color: var(--text-main); border-radius: 8px;">
                        <datalist id="plates-list">
                            ${vehicles.map(v => `<option value="${v.plate}">${v.brand} ${v.model}</option>`).join('')}
                        </datalist>

                        <input type="text" id="filter-user" list="users-list" value="${filters.username || ''}" placeholder="Pretraga po vozaču..." style="padding: 0.5rem; background: var(--surface-light); border: 1px solid var(--border-color); color: var(--text-main); border-radius: 8px;">
                        <datalist id="users-list">
                            ${users.map(u => `<option value="${u.username}">${u.full_name}</option>`).join('')}
                        </datalist>

                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                            <button class="btn btn-primary" onclick="window.ui.applyReportFilters()" style="flex: 1;"><i class="fas fa-search"></i> Primeni</button>
                            <button class="btn btn-primary" onclick="window.ui.clearReportFilters()" style="flex: 1;"><i class="fas fa-times"></i> Očisti filtere</button>
                        </div>
                        <button class="btn btn-secondary" onclick="window.ui.exportToCSV()" style="width: 100%; margin-top: 0.5rem; background: #28a745; color: #fff; border-color: #28a745;"><i class="fas fa-file-excel"></i> Export (CSV)</button>
                    </div>
                </div>
            `;

            let summaryHtml = `
                <div class="summary-cards" style="margin-bottom: 1rem;">
                    <div class="summary-card">
                        <h3>Ukupno Litara</h3>
                        <div class="value">${data.summary.total_liters || '0.00'} L</div>
                    </div>
                    <div class="summary-card">
                        <h3>Dato za Gorivo</h3>
                        <div class="value">${data.summary.total_price || '0.00'} RSD</div>
                    </div>
                    ${data.summary.avg_consumption ? `
                    <div class="summary-card" style="grid-column: span 2;">
                        <h3>Prosečna Potrošnja</h3>
                        <div class="value" style="color:var(--accent)">${data.summary.avg_consumption} L/100km</div>
                    </div>` : ''}
                </div>
            `;

            let listHtml = '';
            if (data.logs.length === 0) {
                listHtml = `<p style="color:var(--text-dim); text-align:center;">Nema rezultata za date filtere.</p>`;
            } else {
                // Grupisemo logove po tablici
                let grouped = {};
                data.logs.forEach(log => {
                    if (!grouped[log.plate]) grouped[log.plate] = [];
                    grouped[log.plate].push(log);
                });

                listHtml = Object.keys(grouped).map((plate, index) => {
                    let vLogs = grouped[plate];
                    let firstLog = vLogs[0];
                    let vTCount = vLogs.length;
                    let vTLiters = vLogs.reduce((acc, l) => acc + parseFloat(l.liters), 0);
                    let vTPrice = vLogs.reduce((acc, l) => acc + parseFloat(l.price * l.liters), 0);
                    let vAvg = firstLog.vehicle_avg;

                    let detailedLogsHtml = vLogs.map(log => {
                        const isLink = log.receipt_qr_data && log.receipt_qr_data.startsWith('http');
                        const hasQr = log.receipt_qr_data ? (isLink ? `
                            <a href="${log.receipt_qr_data}" target="_blank" class="card-badge" style="background: rgba(40, 167, 69, 0.15); color: #28a745; border: 1px solid rgba(40, 167, 69, 0.3); font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; text-transform: uppercase; text-decoration: none; cursor: pointer; transition: all 0.2s ease;" title="Klikni za proveru računa u Poreskoj Upravi">
                                <i class="fas fa-qrcode"></i> QR
                            </a>` : `
                            <span class="card-badge" style="background: rgba(40, 167, 69, 0.15); color: #28a745; border: 1px solid rgba(40, 167, 69, 0.3); font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; text-transform: uppercase;">
                                <i class="fas fa-qrcode"></i> QR
                            </span>`) : '';
                        const hasImg = log.receipt_image_path ? `
                            <a href="${log.receipt_image_path}" target="_blank" class="card-badge" style="background: rgba(255, 152, 0, 0.15); color: #ff9800; border: 1px solid rgba(255, 152, 0, 0.3); font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; text-decoration: none; text-transform: uppercase; cursor: pointer; transition: all 0.2s ease;">
                                <i class="fas fa-receipt"></i> Račun
                            </a>` : '';

                        return `
                            <div class="data-card" style="margin-top:0.5rem; background: var(--bg-main); border: 1px solid var(--border-color); box-shadow: none;">
                                <div class="card-header" style="border-bottom: 1px dashed var(--border-color); padding-bottom:0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                                    <span style="font-size: 0.8rem; color:var(--text-dim);"><i class="far fa-calendar-alt"></i> ${new Date(log.fuel_date).toLocaleDateString()}</span>
                                    <span style="font-size: 0.8rem;">Cena/L: <strong>${log.price}</strong> RSD</span>
                                </div>
                                <div class="card-body" style="padding-top:0.5rem;">
                                    <div>Kilometraža: <strong>${log.km.toLocaleString()} km</strong></div>
                                    <div>Količina: <strong style="color:var(--accent)">${log.liters} L</strong></div>
                                    <div style="grid-column: span 2;">Uplaćeno: <strong>${(log.liters * log.price).toLocaleString()} RSD</strong></div>
                                    <div style="grid-column: span 2; display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.25rem;">
                                        ${hasQr} ${hasImg}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');

                    return `
                        <div class="data-card" style="margin-bottom: 1rem; border: 2px solid var(--primary);">
                            <div class="card-header" style="cursor: pointer; background: var(--surface-light); border-radius: 8px; margin: -10px; padding: 10px; margin-bottom: 0px;" onclick="document.getElementById('tree-${index}').classList.toggle('hidden')">
                                <span class="card-title">🚗 ${firstLog.brand} ${firstLog.model} <span style="color:var(--text-dim); font-size:0.8rem;">(${plate})</span></span>
                                <span style="font-size: 0.8rem; color: var(--accent); background: var(--bg-main); padding: 5px 10px; border-radius: 12px;"><i class="fas fa-chevron-down"></i> Detalji (${vTCount})</span>
                            </div>
                            <div class="card-body" style="margin-top: 15px;">
                                <div style="grid-column: span 2;">Zadužen Vozač: <strong>${firstLog.full_name}</strong></div>
                                <div>Ukupno stalo: <strong>${vTLiters.toFixed(2)} L</strong></div>
                                <div>Odliv novca: <strong>${vTPrice.toLocaleString()} RSD</strong></div>
                                ${vAvg ? `<div style="grid-column: span 2;">Prosek u ovom bloku (Računajući KM): <strong style="color:var(--accent)">${vAvg} L/100km</strong></div>` : ''}
                            </div>
                            <div id="tree-${index}" class="hidden" style="padding-top: 1rem; border-top: 1px solid var(--border-color); margin-top: 1rem;">
                                <h4 style="margin-bottom: 0.5rem; color: var(--text-dim); font-size: 0.85rem;">Istorija Točenja za navedeni period:</h4>
                                ${detailedLogsHtml}
                            </div>
                        </div>
                    `;
                }).join('');
            }
            this.contentArea.innerHTML = tabsHtml + filterHtml + summaryHtml + listHtml;
        } else {
            // Tab za Upozorenja
            const [vehicles, users] = await Promise.all([
                this.dm.getData('vehicles'),
                this.dm.getData('users')
            ]);

            const getDaysLeft = (dString) => Math.ceil((new Date(dString) - new Date()) / (1000 * 60 * 60 * 24));

            let warnings = [];
            vehicles.forEach(v => {
                const userName = users.find(u => u.id === v.userId)?.full_name || 'Nedodeljeno';
                const events = [
                    { type: 'Registracija', days: getDaysLeft(v.regExp), date: v.regExp },
                    { type: 'Servis', days: getDaysLeft(v.service), date: v.service },
                    { type: 'Promena Guma', days: getDaysLeft(v.tires), date: v.tires }
                ];

                events.forEach(ev => {
                    if (ev.days <= 30) {
                        warnings.push({
                            vehicle: `${v.brand} ${v.model} (${v.plate})`,
                            user: userName,
                            type: ev.type,
                            days: ev.days,
                            date: ev.date,
                            vehicleId: v.id
                        });
                    }
                });
            });

            // Sortiranje po hitnosti
            warnings.sort((a, b) => a.days - b.days);

            let listHtml = '';
            if (warnings.length === 0) {
                listHtml = `<div class="data-card" style="text-align:center; padding: 2rem;"><p style="color:var(--success);">✅ Sva vozila su ažurna. Nema skorijih isteka registracija i servisa!</p></div>`;
            } else {
                listHtml = warnings.map(w => {
                    let badge = '';
                    if (w.days < 0) badge = `<span class="card-badge" style="background:var(--danger);color:#fff">Isteklo (${Math.abs(w.days)} dana)</span>`;
                    else if (w.days <= 15) badge = `<span class="card-badge" style="background:var(--danger);color:#fff">Kritično (${w.days} dana)</span>`;
                    else badge = `<span class="card-badge" style="background:var(--warning);color:#fff">Uskoro (${w.days} dana)</span>`;

                    return `
                        <div class="data-card" style="border-left: 4px solid ${w.days <= 15 ? 'var(--danger)' : 'var(--warning)'}; margin-bottom: 0.5rem;">
                            <div class="card-header">
                                <span class="card-title">${w.vehicle}</span>
                                ${badge}
                            </div>
                            <div class="card-body">
                                <div>Vozač: <strong>${w.user}</strong></div>
                                <div>Upozorenje: <strong><i class="fas fa-exclamation-triangle" style="color: ${w.days <= 15 ? 'var(--danger)' : 'var(--warning)'};"></i> ${w.type}</strong></div>
                                <div style="grid-column: span 2;">Datum isteka: <strong>${new Date(w.date).toLocaleDateString()}</strong></div>
                            </div>
                            <div class="card-actions" style="margin-top: 1rem; border-top: 1px dashed var(--border-color); padding-top: 1rem;">
                                <button class="btn btn-accent" style="width: 100%; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);" onclick="window.ui.resetVehicleDates(${w.vehicleId})">
                                    <i class="fas fa-sync"></i> Resetuj datume
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            this.contentArea.innerHTML = tabsHtml + listHtml;
        }
    }

    applyReportFilters() {
        const filters = {
            month_year: document.getElementById('filter-month').value,
            plate: document.getElementById('filter-plate').value,
            username: document.getElementById('filter-user').value
        };
        this.renderReports(filters, 'fuel');
    }

    clearReportFilters() {
        document.getElementById('filter-month').value = '';
        document.getElementById('filter-plate').value = '';
        document.getElementById('filter-user').value = '';
        this.renderReports({ month_year: '', plate: '', username: '' }, 'fuel');
    }

    applyFuelFilters() {
        const filters = {
            month_year: document.getElementById('fuel-filter-month').value,
            plate: document.getElementById('fuel-filter-plate').value
        };
        this.renderFuelLogs(filters);
    }

    clearFuelFilters() {
        document.getElementById('fuel-filter-month').value = '';
        document.getElementById('fuel-filter-plate').value = '';
        this.renderFuelLogs({ month_year: '', plate: '' });
    }

    exportToCSV() {
        if (!this.currentReportLogs || this.currentReportLogs.length === 0) {
            alert("Nema podataka za eksportovanje!");
            return;
        }

        const headers = ["Vozilo", "Tablice", "Vozac", "Datum Tocenja", "Kilometraza", "Litraza", "Cena po litri", "Ukupno Placeno", "QR PIB Prodavca", "QR PFR Datum", "QR Broj Racuna", "Provera u Poreskoj Upravi"];

        const lines = [headers.join(";")];
        this.currentReportLogs.forEach(log => {
            let pfrDate = '';
            let pfrId = '';
            let pfrPib = '';
            let proveraUrl = '';

            if (log.receipt_qr_data) {
                try {
                    let u = new URL(log.receipt_qr_data);
                    pfrDate = u.searchParams.get('d') || '';
                    pfrId = u.searchParams.get('i') || '';
                    pfrPib = u.searchParams.get('tin') || '';
                    proveraUrl = log.receipt_qr_data;
                } catch (e) {
                    pfrId = log.receipt_qr_data;
                }
            }

            const ukupanTrosak = (parseFloat(log.liters) * parseFloat(log.price)).toFixed(2);

            const row = [
                `"${log.brand} ${log.model}"`,
                `"${log.plate}"`,
                `"${log.full_name}"`,
                `"${new Date(log.fuel_date).toLocaleDateString()}"`,
                log.km,
                log.liters,
                log.price,
                ukupanTrosak,
                `"${pfrPib}"`,
                `"${pfrDate}"`,
                `"${pfrId}"`,
                `"${proveraUrl}"`
            ];
            lines.push(row.join(";"));
        });

        const csvContent = lines.join(String.fromCharCode(13, 10));
        const bom = String.fromCharCode(0xFEFF); // Omogućava UTF-8 enkodiranje u Excelu
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `izveštaj_goriva_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async deleteVehicle(id) { await this.dm.deleteItem('vehicles', id) && await this.renderSection('vehicles'); }
    async deleteUser(id) { await this.dm.deleteItem('users', id) && await this.renderSection('employees'); }
    async deleteFuel(id) { await this.dm.deleteItem('fuel_logs', id) && await this.renderSection('fuel'); }

    async showVehicleForm(id = null) {
        let vEdit = null;
        const users = await this.dm.getData('users');

        if (id) {
            const all = await this.dm.getData('vehicles');
            vEdit = all.find(v => v.id === id);
        }
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = vEdit ? 'Izmeni Vozilo' : 'Dodaj Novo Vozilo';
        document.getElementById('scan-qr-btn').classList.add('hidden');

        const fmtDate = (dString) => dString ? new Date(dString).toISOString().split('T')[0] : '';
        modalBody.innerHTML = `
            <form id="vehicle-form">
                <div class="form-group"><label>Marka</label><input type="text" id="v-brand" required value="${vEdit ? vEdit.brand : ''}"></div>
                <div class="form-group"><label>Model</label><input type="text" id="v-model" required value="${vEdit ? vEdit.model : ''}"></div>
                <div class="form-group"><label>Tablice</label><input type="text" id="v-plate" required value="${vEdit ? vEdit.plate : ''}"></div>
                <div class="form-group"><label>Registracija ističe</label><input type="date" id="v-regExp" required value="${fmtDate(vEdit ? vEdit.regExp : '')}"></div>
                <div class="form-group"><label>Sledeći Servis</label><input type="date" id="v-service" required value="${fmtDate(vEdit ? vEdit.service : '')}"></div>
                <div class="form-group"><label>Zamena Guma</label><input type="date" id="v-tires" required value="${fmtDate(vEdit ? vEdit.tires : '')}"></div>
                <div class="form-group"><label>Dodeli Korisniku</label>
                    <select id="v-user">
                        <option value="">Nije dodeljeno</option>
                        ${users.map(u => `<option value="${u.id}" ${vEdit && vEdit.userId === u.id ? 'selected' : ''}>${u.full_name}</option>`).join('')}
                    </select>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Sačuvaj</button>
            </form>
        `;

        this.modal.classList.remove('hidden');

        document.getElementById('vehicle-form').onsubmit = async (e) => {
            e.preventDefault();
            const vehicle = {
                brand: document.getElementById('v-brand').value,
                model: document.getElementById('v-model').value,
                plate: document.getElementById('v-plate').value,
                regExp: document.getElementById('v-regExp').value,
                service: document.getElementById('v-service').value,
                tires: document.getElementById('v-tires').value,
                userId: document.getElementById('v-user').value || null
            };

            if (vEdit) await this.dm.updateItem('vehicles', vEdit.id, vehicle);
            else await this.dm.addItem('vehicles', vehicle);

            this.modal.classList.add('hidden');
            await this.renderSection('vehicles');
        };
    }

    async showUserForm(id = null) {
        let uEdit = null;
        if (id) {
            const all = await this.dm.getData('users');
            uEdit = all.find(u => u.id === id);
        }
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = uEdit ? 'Izmeni Korisnika' : 'Dodaj Novog Korisnika';
        document.getElementById('scan-qr-btn').classList.add('hidden');

        modalBody.innerHTML = `
            <form id="user-form">
                <div class="form-group"><label>Puno Ime i Prezime</label><input type="text" id="u-fullname" required value="${uEdit ? uEdit.full_name : ''}"></div>
                <div class="form-group"><label>Korisničko Ime (Login)</label><input type="text" id="u-username" required value="${uEdit ? uEdit.username : ''}"></div>
                <div class="form-group"><label>${uEdit ? 'Nova Lozinka (ostavi prazno)' : 'Lozinka'}</label><input type="password" id="u-password" ${uEdit ? '' : 'required'}></div>
                <div class="form-group"><label>Rola</label>
                    <select id="u-role">
                        <option value="user" ${uEdit && uEdit.role === 'user' ? 'selected' : ''}>Korisnik (Vozač)</option>
                        <option value="admin" ${uEdit && uEdit.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Sačuvaj</button>
            </form>
        `;

        this.modal.classList.remove('hidden');

        document.getElementById('user-form').onsubmit = async (e) => {
            e.preventDefault();
            const user = {
                full_name: document.getElementById('u-fullname').value,
                username: document.getElementById('u-username').value,
                role: document.getElementById('u-role').value,
                password: document.getElementById('u-password').value || undefined
            };

            if (uEdit) await this.dm.updateItem('users', uEdit.id, user);
            else {
                const res = await this.dm.addItem('users', user);
                if (res.error) { alert(res.error); return; }
            }

            this.modal.classList.add('hidden');
            await this.renderSection('employees');
        };
    }

    async showFuelForm() {
        const vehicles = await this.dm.getData('vehicles');
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = 'Novo Točenje Goriva';

        // QR Btn setup
        const scanBtn = document.getElementById('scan-qr-btn');
        scanBtn.classList.remove('hidden');

        modalBody.innerHTML = `
            <form id="fuel-form">
                <input type="hidden" id="f-qrdata" value="">
                <input type="hidden" id="f-scanned-total" value="">
                <div class="form-group">
                    <label>Izaberi Vozilo</label>
                    <select id="f-vehicle" required>
                        ${vehicles.map(v => `<option value="${v.id}">${v.brand} ${v.plate}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Kilometraža vozila</label>
                    <input type="number" id="f-km" required>
                    <small id="f-km-helper" style="display: block; margin-top: 6px; color: var(--text-dim); font-size: 0.75rem; font-weight: 500; min-height: 15px;"></small>
                </div>
                <div style="display:flex; gap:10px;">
                    <div class="form-group" style="flex:1;">
                        <label>Litri (l)</label>
                        <input type="number" step="0.01" id="f-liters" required>
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label>Cena po L</label>
                        <input type="number" step="0.1" id="f-price" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Datum</label>
                    <input type="date" id="f-date" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label>Slika računa (Opciono)</label>
                    <input type="file" id="f-image" accept="image/*" capture="environment" style="background:transparent; border:none; padding:0;">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top:1rem;">Sačuvaj Unos</button>
            </form>
        `;

        this.modal.classList.remove('hidden');

        // Dinamičko preuzimanje i prikaz poslednje kilometraže vozila
        const vehicleSelect = document.getElementById('f-vehicle');
        const kmHelper = document.getElementById('f-km-helper');
        
        const updateLatestKm = async () => {
            const vehicleId = vehicleSelect.value;
            if (!vehicleId) {
                kmHelper.textContent = '';
                return;
            }
            kmHelper.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Učitavam poslednju kilometražu...`;
            try {
                const response = await fetch(`${this.dm.apiUrl}/vehicles/${vehicleId}/latest_km`, {
                    headers: this._authHeaders()
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.km > 0) {
                        kmHelper.innerHTML = `<i class="fas fa-tachometer-alt"></i> Poslednja kilometraža: <strong style="color:var(--accent)">${data.km.toLocaleString()} km</strong> (Unesite veću vrednost)`;
                        kmHelper.dataset.lastKm = data.km;
                    } else {
                        kmHelper.innerHTML = `<i class="fas fa-tachometer-alt"></i> Prvo točenje za ovo vozilo (Nema prethodnih unosa)`;
                        kmHelper.dataset.lastKm = 0;
                    }
                }
            } catch (e) {
                console.error("Greška pri dohvatanju zadnje kilometraže:", e);
                kmHelper.textContent = '';
            }
        };

        vehicleSelect.addEventListener('change', updateLatestKm);
        await updateLatestKm();

        // QR Skener Listener - direktan pristup kameri sa automatskim detektovanjem zadnje kamere i dinamičkim qrboxom
        scanBtn.onclick = async () => {
            // Unlocking AudioContext on user interaction to avoid autoplay restrictions
            let audioCtx = null;
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
            } catch (e) {
                console.warn("Failed to initialize AudioContext:", e);
            }

            const qrReader = document.getElementById('qr-reader');
            qrReader.style.display = 'block';
            qrReader.innerHTML = '';
            scanBtn.classList.add('hidden');

            // Zaustavi prethodni skener ako postoji
            if (this.html5QrcodeScanner) {
                try { await this.html5QrcodeScanner.stop(); } catch (e) { }
                this.html5QrcodeScanner = null;
            }

            this.html5QrcodeScanner = new Html5Qrcode("qr-reader", {
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            });

            // Pomoćna funkcija za parsiranje srpskih PFR formata datuma
            const parsePfrDate = (pfrDate) => {
                if (!pfrDate) return null;
                // 1. Format: YYYY-MM-DD... (npr. 2026-05-17T17:58:26)
                let match = pfrDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (match) return `${match[1]}-${match[2]}-${match[3]}`;
                
                // 2. Format: DD.MM.YYYY... (npr. 17.05.2026_17:58:26)
                match = pfrDate.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
                if (match) return `${match[3]}-${match[2]}-${match[1]}`;
                
                // 3. Format: YYYYMMDDHHmmss (npr. 20260517175826)
                match = pfrDate.match(/^(\d{4})(\d{2})(\d{2})/);
                if (match && parseInt(match[2]) <= 12 && parseInt(match[3]) <= 31) {
                    return `${match[1]}-${match[2]}-${match[3]}`;
                }
                return null;
            };

            const onScanSuccess = async (decodedText) => {
                // 1. Zvučni signal (Beep) i vibracija
                if (audioCtx) {
                    try {
                        const oscillator = audioCtx.createOscillator();
                        const gainNode = audioCtx.createGain();
                        oscillator.connect(gainNode);
                        gainNode.connect(audioCtx.destination);
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Čist i jasan bip (A5 nota)
                        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                        oscillator.start();
                        oscillator.stop(audioCtx.currentTime + 0.15);
                    } catch (e) {
                        console.warn("Nije moguće pustiti zvuk:", e);
                    }
                }

                if (navigator.vibrate) {
                    try {
                        navigator.vibrate(200); // Kratka vibracija od 200 milisekundi
                    } catch (e) {
                        console.warn("Vibracija nije podržana ili je blokirana:", e);
                    }
                }

                // 2. Odmah zaustavi i sakrij kameru/prikaz skenera da se video ugasi pre nego što iskoči alert
                try { await this.html5QrcodeScanner.stop(); } catch (e) { }
                this.html5QrcodeScanner = null;
                qrReader.style.display = 'none';
                qrReader.innerHTML = '';
                scanBtn.classList.remove('hidden');

                // 3. Popuni podatke u formi i obavesti korisnika
                document.getElementById('f-qrdata').value = decodedText;

                let isPfr = false;
                let parsedTotal = false;
                let parsedDate = false;

                try {
                    const u = new URL(decodedText);
                    const pfrDate = u.searchParams.get('d');
                    const pfrTotal = u.searchParams.get('tc');

                    if (pfrDate) {
                        const formattedDate = parsePfrDate(pfrDate);
                        if (formattedDate) {
                            document.getElementById('f-date').value = formattedDate;
                            document.getElementById('f-date').style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
                            parsedDate = true;
                        }
                    }
                    if (pfrTotal) {
                        const totalVal = parseFloat(pfrTotal);
                        if (!isNaN(totalVal)) {
                            document.getElementById('f-scanned-total').value = totalVal;
                            document.getElementById('f-price').placeholder = `Sa računa: ${totalVal} RSD`;
                            const liters = parseFloat(document.getElementById('f-liters').value);
                            if (liters > 0) {
                                document.getElementById('f-price').value = (totalVal / liters).toFixed(2);
                                document.getElementById('f-price').style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
                            }
                            parsedTotal = true;
                        }
                    }
                    
                    // Detekcija zvaničnog srpskog PFR računa (purs.gov.rs domen ili ključni parametri)
                    if (decodedText.includes('purs.gov.rs') || u.searchParams.has('vl') || u.searchParams.has('tin')) {
                        isPfr = true;
                    }
                    
                    if (isPfr) {
                        if (parsedDate && parsedTotal) {
                            alert('Zvanični PFR račun uspešno prepoznat! Datum i iznos su automatski preuzeti.');
                        } else {
                            alert('Zvanični PFR račun je uspešno skeniran i sačuvan!\n\nMolimo unesite litražu i cenu ručno jer ovaj zvanični link ne sadrži te podatke u samom tekstu linka (već samo sigurnosni kod).');
                        }
                    } else {
                        alert('QR kod uspešno skeniran i sačuvan! Unesite detalje točenja ručno.');
                    }
                } catch (e) {
                    // Nije URL, sačuvaj sirovi tekst
                    alert('QR kod uspešno skeniran (Nije prepoznat kao zvanični PFR račun). Unesite detalje ručno.');
                }
            };

            // Konfiguracija skenera sa dinamičkim qrbox-om
            const scanConfig = {
                fps: 15,
                qrbox: (width, height) => {
                    const minEdge = Math.min(width, height);
                    const size = Math.floor(minEdge * 0.7);
                    return { width: size, height: size };
                },
                // Napomena: aspectRatio 1.0 forsira kvadratni viewport koji poboljšava čitljivost QR kodova
                aspectRatio: 1.0
            };

            // Strategija pokretanja kamere sa 3 nivoa fallback-a.
            // KRITIČNO: NE koristimo getCameras()+deviceId jer to IGNORIŠE videoConstraints
            // i pokreće kameru u niskoj rezoluciji (~480p) koja ne može da čita gusti QR sa papirnih računa.
            // Umesto toga koristimo facingMode UNUTAR videoConstraints kako bi se HD rezolucija i autofokus primenili.
            let started = false;

            // POKUŠAJ 1: HD rezolucija + kontinuirani autofokus (idealno za papirne račune)
            if (!started) {
                try {
                    await this.html5QrcodeScanner.start(
                        { facingMode: { exact: "environment" } },
                        {
                            ...scanConfig,
                            videoConstraints: {
                                facingMode: { exact: "environment" },
                                width: { min: 640, ideal: 1920, max: 2560 },
                                height: { min: 480, ideal: 1080, max: 1440 },
                                advanced: [
                                    { focusMode: "continuous" },
                                    { focusDistance: 0.15 }
                                ]
                            }
                        },
                        onScanSuccess,
                        () => { }
                    );
                    started = true;
                    console.log("QR Skener pokrenut: HD + Autofokus režim");
                } catch (e1) {
                    console.warn("HD+Autofokus pokretanje neuspešno, pokušavam sledeći nivo:", e1);
                }
            }

            // POKUŠAJ 2: HD rezolucija bez naprednog fokusa (za telefone koji ne podržavaju focusMode)
            if (!started) {
                try {
                    await this.html5QrcodeScanner.start(
                        { facingMode: { exact: "environment" } },
                        {
                            ...scanConfig,
                            videoConstraints: {
                                facingMode: { exact: "environment" },
                                width: { min: 640, ideal: 1280, max: 1920 },
                                height: { min: 480, ideal: 720, max: 1080 }
                            }
                        },
                        onScanSuccess,
                        () => { }
                    );
                    started = true;
                    console.log("QR Skener pokrenut: HD režim (bez naprednog fokusa)");
                } catch (e2) {
                    console.warn("HD pokretanje neuspešno, pokušavam osnovni režim:", e2);
                }
            }

            // POKUŠAJ 3: Osnovni režim sa facingMode (univerzalni fallback za starije uređaje)
            if (!started) {
                try {
                    await this.html5QrcodeScanner.start(
                        { facingMode: "environment" },
                        scanConfig,
                        onScanSuccess,
                        () => { }
                    );
                    started = true;
                    console.log("QR Skener pokrenut: Osnovni režim (fallback)");
                } catch (err) {
                    console.error('Greška pri pokretanju kamere (svi pokušaji neuspešni):', err);
                    alert('Nije moguće pristupiti kameri. Proverite dozvole za kameru u podešavanjima pregledača.');
                    qrReader.style.display = 'none';
                    qrReader.innerHTML = '';
                    scanBtn.classList.remove('hidden');
                }
            }

            // Nakon uspešnog pokretanja, pokušaj da primeniš kontinuirani autofokus na aktivni stream
            if (started) {
                try {
                    const videoElem = document.querySelector('#qr-reader video');
                    if (videoElem && videoElem.srcObject) {
                        const track = videoElem.srcObject.getVideoTracks()[0];
                        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
                        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                            await track.applyConstraints({
                                advanced: [{ focusMode: "continuous" }]
                            });
                            console.log("Kontinuirani autofokus uspešno primenjen na aktivni video stream.");
                        }
                        // Pokušaj postaviti torch (baterijsku lampu) ako je dostupna i ako je mračno
                        // (korisnik može i sam uključiti fleš iz nativne kamere, ali ovo pomaže za tamne pumpe)
                    }
                } catch (focusErr) {
                    console.warn("Primena autofokusa na aktivni stream nije uspela (nije kritično):", focusErr);
                }
            }
        };

        // Auto kalkulacija cene po litru preko QR iznosa
        document.getElementById('f-liters').addEventListener('input', function (e) {
            const total = document.getElementById('f-scanned-total').value;
            const liters = parseFloat(e.target.value);
            if (total && liters > 0) {
                document.getElementById('f-price').value = (parseFloat(total) / liters).toFixed(2);
                document.getElementById('f-price').style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
            } else {
                document.getElementById('f-price').style.backgroundColor = '';
            }
        });

        document.getElementById('fuel-form').onsubmit = async (e) => {
            e.preventDefault();
            
            const lastKm = parseInt(document.getElementById('f-km-helper').dataset.lastKm || '0');
            const newKm = parseInt(document.getElementById('f-km').value);
            if (lastKm > 0 && newKm <= lastKm) {
                alert(`Greška pri unosu: Kilometraža ne može biti manja ili jednaka poslednjoj zabeleženoj kilometraži (${lastKm.toLocaleString()} km)!`);
                return;
            }

            const log = {
                vehicleId: document.getElementById('f-vehicle').value,
                km: newKm,
                liters: parseFloat(document.getElementById('f-liters').value),
                price: parseFloat(document.getElementById('f-price').value),
                date: document.getElementById('f-date').value,
                qrData: document.getElementById('f-qrdata').value
            };
            const imageFile = document.getElementById('f-image').files[0];

            const result = await this.dm.addItem('fuel_logs', log, imageFile);
            if (result && result.error) {
                alert(result.error);
                return;
            }

            if (this.html5QrcodeScanner) {
                try {
                    await this.html5QrcodeScanner.stop();
                } catch (e) { }
                this.html5QrcodeScanner = null;
            }
            this.modal.classList.add('hidden');
            const qrEl = document.getElementById('qr-reader');
            qrEl.style.display = 'none';
            qrEl.innerHTML = '';
            document.getElementById('scan-qr-btn').classList.remove('hidden');
            await this.renderSection('fuel');
        };
    }

    async resetVehicleDates(vehicleId) {
        if (!confirm('Da li ste sigurni da želite da resetujete datume (Registracija +1 god, Servis +1 god, Gume +5 mes)?')) return;

        const vehicles = await this.dm.getData('vehicles');
        const v = vehicles.find(veh => veh.id === vehicleId);
        if (!v) return;

        const addMonths = (dateStr, months) => {
            const d = new Date(dateStr);
            d.setMonth(d.getMonth() + months);
            return d.toISOString().split('T')[0];
        };

        const updatedVehicle = {
            ...v,
            regExp: addMonths(v.regExp, 12),
            service: addMonths(v.service, 12),
            tires: addMonths(v.tires, 5)
        };

        const result = await this.dm.updateItem('vehicles', vehicleId, updatedVehicle);
        if (result.error) {
            alert(result.error);
        } else {
            await this.renderReports({}, 'warnings');
            alert('Datumi uspešno resetovani!');
        }
    }
}
