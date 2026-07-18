/**
 * FuelTrack Mobile - Core Application Logic
 */
class DataManager {
    constructor() {
        this.apiUrl = '/api';
        this.currentUser = null;
        this.token = localStorage.getItem('ft_token') || null;
    }

    // Zajedničke opcije za sve fetch pozive sa JWT tokenom
    _authHeaders(extra = {}) {
        const headers = { ...extra };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    // Provera 401 odgovora - auto logout
    async _handleResponse(response) {
        if (response.status === 401) {
            this.logout();
            alert('Sesija je istekla. Molimo prijavite se ponovo.');
            location.reload();
            throw new Error('Unauthorized');
        }
        return response;
    }

    async login(username, password) {
        try {
            const response = await fetch(`${this.apiUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();
            if (result.success) {
                this.currentUser = result.user;
                this.token = result.token;
                localStorage.setItem('ft_user', JSON.stringify(result.user));
                localStorage.setItem('ft_token', result.token);
                localStorage.setItem('ft_last_activity', Date.now());
                return { success: true };
            }
            return { success: false, message: result.message };
        } catch (err) {
            console.error('Login error:', err);
            return { success: false, message: 'Greška pri povezivanju sa serverom' };
        }
    }

    async register(companyName, fullName, username, password) {
        try {
            const response = await fetch(`${this.apiUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_name: companyName, full_name: fullName, username, password })
            });

            const result = await response.json();
            if (result.success) {
                this.currentUser = result.user;
                this.token = result.token;
                localStorage.setItem('ft_user', JSON.stringify(result.user));
                localStorage.setItem('ft_token', result.token);
                localStorage.setItem('ft_last_activity', Date.now());
                return { success: true };
            }
            return { success: false, message: result.message };
        } catch (err) {
            console.error('Register error:', err);
            return { success: false, message: 'Greška pri povezivanju sa serverom' };
        }
    }

    async getAllData() {
        // Init
    }

    restoreSession() {
        const userStr = localStorage.getItem('ft_user');
        const tokenStr = localStorage.getItem('ft_token');
        const lastActStr = localStorage.getItem('ft_last_activity');
        if (userStr && tokenStr && lastActStr) {
            const lastAct = parseInt(lastActStr, 10);
            const now = Date.now();
            if (now - lastAct < 5 * 60 * 1000) {
                this.currentUser = JSON.parse(userStr);
                this.token = tokenStr;
                localStorage.setItem('ft_last_activity', now);
                return true;
            } else {
                this.logout();
            }
        }
        return false;
    }

    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('ft_user');
        localStorage.removeItem('ft_token');
        localStorage.removeItem('ft_last_activity');
    }

    async getData(key, extraParams = {}) {
        try {
            let url = `${this.apiUrl}/${key}`;
            const params = new URLSearchParams({ _t: Date.now(), ...extraParams });
            if (this.currentUser && this.currentUser.role !== 'admin' && key !== 'users') {
                params.set('user_id', this.currentUser.id);
            }
            url += `?${params.toString()}`;
            const response = await this._handleResponse(await fetch(url, {
                headers: this._authHeaders()
            }));
            if (!response.ok) throw new Error('Mreža nije dostupna');
            const data = await response.json();
            
            // Paginiran odgovor za fuel_logs
            if (key === 'fuel_logs' && data.rows) {
                return {
                    items: data.rows.map(item => this.mapFromDB(item, key)),
                    total: data.total
                };
            }
            return data.map(item => this.mapFromDB(item, key));
        } catch (err) {
            if (err.message === 'Unauthorized') return [];
            console.error('Greška pri čitanju podataka:', err);
            return [];
        }
    }

    async getReports(filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.month_year) params.append('month_year', filters.month_year);
            if (filters.plate) params.append('plate', filters.plate);
            if (filters.username) params.append('username', filters.username);

            const url = `${this.apiUrl}/reports?${params.toString()}`;
            const response = await this._handleResponse(await fetch(url, {
                headers: this._authHeaders()
            }));
            if (!response.ok) throw new Error('Greška u dohvatanju izveštaja');
            return await response.json();
        } catch (err) {
            if (err.message === 'Unauthorized') return { logs: [], summary: {} };
            console.error('Greška pri dohvatanju izveštaja:', err);
            return { logs: [], summary: {} };
        }
    }

    mapFromDB(item, key) {
        if (key === 'vehicles') {
            return {
                id: item.id,
                brand: item.brand,
                model: item.model,
                plate: item.plate,
                regExp: item.reg_exp,
                service: item.service,
                tires: item.tires,
                userId: item.user_id
            };
        }
        if (key === 'fuel_logs') {
            return {
                id: item.id,
                vehicleId: item.vehicle_id,
                km: item.km,
                liters: item.liters,
                price: item.price,
                date: item.date,
                qrData: item.receipt_qr_data,
                image: item.receipt_image_path
            };
        }
        return item; // users
    }

    async addItem(key, item, file = null) {
        try {
            let response;
            if (key === 'fuel_logs' && file) {
                const formData = new FormData();
                formData.append('vehicle_id', item.vehicleId);
                formData.append('km', item.km);
                formData.append('liters', item.liters);
                formData.append('price', item.price);
                formData.append('date', item.date);
                if (item.qrData) formData.append('receipt_qr_data', item.qrData);
                formData.append('receipt_image', file);

                response = await this._handleResponse(await fetch(`${this.apiUrl}/${key}`, {
                    method: 'POST',
                    headers: this._authHeaders(),
                    body: formData
                }));
            } else {
                const dbItem = this.mapToDB(item, key);
                response = await this._handleResponse(await fetch(`${this.apiUrl}/${key}`, {
                    method: 'POST',
                    headers: this._authHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(dbItem)
                }));
            }
            const data = await response.json();
            if (!response.ok) return { error: data.error };
            return data;
        } catch (err) {
            if (err.message === 'Unauthorized') return { error: 'Unauthorized' };
            console.error('Greška pri čuvanju:', err);
            alert('Greška pri čuvanju u bazu podataka!');
            return { error: err.message };
        }
    }

    mapToDB(item, key) {
        if (key === 'vehicles') {
            return {
                brand: item.brand,
                model: item.model,
                plate: item.plate,
                reg_exp: item.regExp,
                service: item.service,
                tires: item.tires,
                user_id: item.userId || null
            };
        }
        if (key === 'fuel_logs') {
            return {
                vehicle_id: item.vehicleId,
                km: item.km,
                liters: item.liters,
                price: item.price,
                date: item.date,
                receipt_qr_data: item.qrData || null
            };
        }
        if (key === 'users') {
            const obj = { full_name: item.full_name, role: item.role, username: item.username };
            if (item.password) obj.password = item.password;
            return obj;
        }
        return item;
    }

    async updateItem(key, id, item) {
        try {
            const dbItem = this.mapToDB(item, key);
            const response = await this._handleResponse(await fetch(`${this.apiUrl}/${key}/${id}`, {
                method: 'PUT',
                headers: this._authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(dbItem)
            }));
            const data = await response.json();
            if (!response.ok) return { error: data.error };
            return data;
        } catch (err) {
            if (err.message === 'Unauthorized') return { error: 'Unauthorized' };
            console.error('Greška pri ažuriranju:', err);
            alert('Greška pri ažuriranju u bazi podataka!');
            return { error: err.message };
        }
    }

    async deleteItem(key, id) {
        if (!confirm('Da li ste sigurni da želite da obrišete?')) return false;
        try {
            const response = await this._handleResponse(await fetch(`${this.apiUrl}/${key}/${id}`, {
                method: 'DELETE',
                headers: this._authHeaders()
            }));
            if (!response.ok) throw new Error('Brisanje nije uspelo');
            return true;
        } catch (err) {
            if (err.message === 'Unauthorized') return false;
            console.error('Greška pri brisanju:', err);
            alert('Greška pri brisanju iz baze podataka!');
            return false;
        }
    }
}
