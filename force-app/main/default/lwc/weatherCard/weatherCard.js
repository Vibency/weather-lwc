import { LightningElement, api } from 'lwc';

const CONDITION_CONFIG = {
    Sunny:      { icon: 'utility:daylight',    badge: 'badge-sunny' },
    Cloudy:     { icon: 'utility:cloudy',       badge: 'badge-cloudy' },
    Rainy:      { icon: 'utility:rain',         badge: 'badge-rainy' },
    Stormy:     { icon: 'utility:thunder',      badge: 'badge-stormy' },
    Snowy:      { icon: 'utility:snowy',        badge: 'badge-snowy' },
    Foggy:      { icon: 'utility:visibilityoff',badge: 'badge-foggy' },
    Windy:      { icon: 'utility:wind',         badge: 'badge-windy' },
    'Partly Cloudy': { icon: 'utility:cloudy',  badge: 'badge-partly-cloudy' },
};

export default class WeatherCard extends LightningElement {
    @api city;
    @api country;
    @api temperature;
    @api feelsLike;
    @api condition;
    @api humidity;
    @api windSpeed;
    @api high;
    @api low;
    @api uvIndex;
    @api localTime;
    @api lastUpdated;
    @api theme = 'default'; // 'warm' | 'cool' | 'storm' | 'default'

    get weatherIcon() {
        return CONDITION_CONFIG[this.condition]?.icon ?? 'utility:weather';
    }

    get badgeClass() {
        return CONDITION_CONFIG[this.condition]?.badge ?? '';
    }

    get cardClass() {
        return `slds-card weather-card weather-card_${this.theme}`;
    }

    get uvPercent() {
        return Math.min((this.uvIndex / 11) * 100, 100);
    }

    get uvBarStyle() {
        return `width: ${this.uvPercent}%`;
    }

    get uvBarClass() {
        const uv = this.uvIndex;
        if (uv <= 2) return 'slds-progress-bar__value uv-low';
        if (uv <= 5) return 'slds-progress-bar__value uv-moderate';
        if (uv <= 7) return 'slds-progress-bar__value uv-high';
        return 'slds-progress-bar__value uv-very-high';
    }
}
