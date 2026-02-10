const api = {
    baseUrl: '/api',
    
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Só adiciona o token se ele existir e não for uma requisição de login (skipAuth)
        // Também valida se o token não tem caracteres inválidos que causam "The string did not match the expected pattern"
        if (token && !options.skipAuth) {
            try {
                headers['Authorization'] = `Bearer ${token}`;
            } catch (e) {
                console.warn('Token inválido no localStorage, ignorando.', e);
                localStorage.removeItem('authToken');
            }
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        // Se o token for inválido/expirado, pode-se forçar logout aqui se desejar
        if (response.status === 401 || response.status === 403) {
            console.warn('Sessão expirada ou inválida');
        }

        return data;
    },

    async login(password) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ password }),
            skipAuth: true // Importante: Não enviar token antigo/inválido ao tentar logar
        });
    },

    async getSiteData() {
        // Retorna null se der erro, para o frontend tratar
        try {
            const data = await this.request('/site-data');
            return data.error ? null : data;
        } catch (e) {
            return null;
        }
    },

    async updateSiteData(data) {
        const res = await this.request('/site-data', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (res.error) throw new Error(res.error);
        return res;
    }
};

// Expor para o escopo global
window.api = api;