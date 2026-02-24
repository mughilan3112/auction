const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('token');
}

function headers(includeAuth = false) {
  const h = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

export const api = {
  async register(body) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },

  async login(body) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/users/me`, { headers: headers(true) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },

  async updateUser(body) {
    const res = await fetch(`${API_BASE}/users/me`, {
      method: 'PUT',
      headers: headers(true),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },


  async createSeller(body) {
    const res = await fetch(`${API_BASE}/sellers/create`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },

  async getSellerMe() {
    const res = await fetch(`${API_BASE}/sellers/me`, { headers: headers(true) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },

  async updateSeller(body) {
    const res = await fetch(`${API_BASE}/sellers/me`, {
      method: 'PUT',
      headers: headers(true),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },


  async listAuctions(q = '', categories = [], sorts = []) {
    let url = `${API_BASE}/auctions/?`;
    if (q) url += `q=${encodeURIComponent(q)}&`;

    if (Array.isArray(categories)) {
      categories.forEach(c => {
        if (c) url += `category=${encodeURIComponent(c)}&`;
      });
    } else if (categories) {
      url += `category=${encodeURIComponent(categories)}&`;
    }

    if (Array.isArray(sorts)) {
      sorts.forEach(s => {
        if (s) url += `sort=${encodeURIComponent(s)}&`;
      });
    } else if (sorts) {
      url += `sort=${encodeURIComponent(sorts)}&`;
    }

    const res = await fetch(url);




    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data: Array.isArray(data) ? data : [], status: res.status };
  },

  async listMyAuctions() {
    const res = await fetch(`${API_BASE}/auctions/my-auctions`, {
      headers: headers(true),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data: Array.isArray(data) ? data : [], status: res.status };
  },


  async getAuction(id) {
    const res = await fetch(`${API_BASE}/auctions/${id}`);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },

  async createAuction(formData) {
    const res = await fetch(`${API_BASE}/auctions/create`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },

  async updateAuction(id, formData) {
    const res = await fetch(`${API_BASE}/auctions/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },


  async deleteAuction(id) {
    const res = await fetch(`${API_BASE}/auctions/${id}`, {
      method: 'DELETE',
      headers: headers(true),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },


  async placeBid(auctionId, amount) {
    const res = await fetch(`${API_BASE}/bids/place`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ auction_id: auctionId, amount: Number(amount) }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },

  async getWinner(auctionId) {
    const res = await fetch(`${API_BASE}/winners/${auctionId}`, { headers: headers(true) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },

  async listNotifications() {
    const res = await fetch(`${API_BASE}/notifications/`, { headers: headers(true) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data: Array.isArray(data) ? data : [], status: res.status };
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: headers(true),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
  },
};

