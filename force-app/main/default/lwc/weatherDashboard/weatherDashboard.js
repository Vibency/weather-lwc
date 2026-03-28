import { LightningElement, track } from 'lwc';

export default class WeatherDashboard extends LightningElement {
    @track isLoading = true;
    @track localTime = '';
    @track headerIcon = 'utility:light_bulb';
    @track footerIcon = 'utility:clock';

    connectedCallback() {
        const sfDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
        const hour = sfDate.getHours();
        const isDay = hour >= 6 && hour < 20;

        this.headerIcon = isDay ? 'utility:light_bulb' : 'utility:favorite';
        this.localTime = sfDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });

        // Resolve after current microtask queue — gives skeleton one render cycle
        Promise.resolve().then(() => {
            this.isLoading = false;
        });
    }
}
