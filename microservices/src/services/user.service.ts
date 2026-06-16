import { config } from '../config/env';
export class UsersService {
  private readonly baseUrl = config.apiUrl;

  async getUsers() {
    const response = await fetch(`${this.baseUrl}/users`);
    if (!response.ok) throw new Error('Error getting users');
    return response.json();
  }

  async getUserById(id: string) {
    const response = await fetch(`${this.baseUrl}/users/${id}`);
    if (!response.ok) throw new Error(`User ${id} not found`);
    return response.json();
  }
}
