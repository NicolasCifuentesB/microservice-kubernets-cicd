import {config} from '../config/env'
export class FlightService {

  private readonly baseUrl = config.apiUrl;

  async getFlight() {
    const response = await fetch(`${this.baseUrl}/flight`);
    if (!response.ok) throw new Error('Error getting flight');
    return response.json();
  }

  async getFlightById(id: string) {
    const response = await fetch(`${this.baseUrl}/flight/${id}`);
    if (!response.ok) throw new Error(`Flight ${id} not found`);
    return response.json();
  }
}