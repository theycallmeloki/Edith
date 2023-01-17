const app = Vue.createApp({
    data() {
        return {
            keys: {},
            lines: [],
            inpCon: '',
            options: [
                {"name": "SaaS","value": "appTypeSaas"},
                {"name": "Landing","value": "appTypeLanding"},
                {"name": "E-Commerce","value": "appTypeEcommerce"},
                {"name": "Web3","value": "appTypeWeb3"},
                {"name": "React","value": "frameworkReact"},
                {"name": "Next","value": "frameworkNext"},
                {"name": "Gatsby","value": "frameworkGatsby"},
                {"name": "Material UI","value": "uiKitMaterialUi"},
                {"name": "Bootstrap","value": "uiKitBootstrap"},
                {"name": "Bulma","value": "uiKitBulma"},
                {"name": "Tailwind","value": "uiKitTailwind"},
                {"name": "Firebase","value": "authFirebase"},
                {"name": "Supabase Auth","value": "authSupabaseAuth"},
                {"name": "Auth0","value": "authAuth0"},
                {"name": "Auth Other","value": "authOther"},
                {"name": "Auth None","value": "authNone"},
                {"name": "Firebase","value": "databaseFirebase"},
                {"name": "Supabase DB","value": "databaseSupabaseDb"},
                {"name": "Database Other","value": "databaseOther"},
                {"name": "Database None","value": "databaseNone"},
                {"name": "Stripe","value": "paymentStripe"},
                {"name": "Stripe Elements","value": "paymentStripeElements"},
                {"name": "Payment None","value": "paymentNone"},
                {"name": "Vercel","value": "hostingVercel"},
                {"name": "Netlify","value": "hostingNetlify"},
                {"name": "Hosting Other","value": "hostingOther"},
                {"name": "Mailchimp","value": "newsletterMailchimp"},
                {"name": "Convert Kit","value": "newsletterConvertkit"},
                {"name": "Newsletter Other","value": "newsletterOther"},
                {"name": "Formspree","value": "contactFormFormspree"},
                {"name": "Google Sheets","value": "contactFormGoogleSheets"},
                {"name": "Airtable","value": "contactFormAirtable"},
                {"name": "SES","value": "contactFormAmazonSes"},
                {"name": "Form Other","value": "contactFormOther"},
                {"name": "Google Analytics","value": "analyticsGoogleAnalytics"},
                {"name": "Mixpanel","value": "analyticsMixpanel"},
                {"name": "Amplitude","value": "analyticsAmplitude"},
                {"name": "Segment","value": "analyticsSegment"},
                {"name": "Simple Analytics","value": "analyticsSimpleAnalytics"},
                {"name": "Analytics None","value": "analyticsNone"},
                {"name": "Crisp","value": "chatCrisp"},
                {"name": "Intercom","value": "chatIntercom"},
                {"name": "Chat None","value": "chatNone"},
                {"name": "Starter Kit 1","value": "starterKit0"},
                {"name": "Starter Kit 2","value": "starterKit1"},
                {"name": "Starter Kit 3","value": "starterKit2"},
            ]
        }
    },
    methods: {
        async getDiff() {
            const fetchDiff = await fetch('http://192.168.1.2:5000/api/v1/keys');
            const diff = await fetchDiff.json();
            console.log(diff)
            const files = [];
            Object.keys(diff).forEach((key) => { files.push({key, value: diff[key]}) });
            // diff.forEach((key) => { this.keys[key] = { show: false } });
            console.log(files)
            this.keys = diff;
            this.lines = [];
        },
        toggleAccordian(key) {
            this.keys[key].show = !this.keys[key].show;
        },
        toggleLine(lineId, lineContent) {
            // console.log(lineId, lineContent)
            const line = document.getElementById(lineId);
            line.content = lineContent;
            line.checked = !line.checked;
            this.lines.push(line.content.slice(1));
        },
        toggleOption(option) {
            this.inpCon = option;
        },
        async copyToClipboard() {
            
            // this section is for code previous to the pastable region
            this.lines.unshift(`
{% if ${this.inpCon} %}
{% raw %}
            `)
            // pastable section top ends here
            
            // this section is for code after the pastable region
            this.lines.push(`
{% endraw %}
{% endif %}
            `)
            // pastable section bottom ends here
            const text = this.lines.join('\n');
            console.log(text)
            await unsecuredCopyToClipboard(text);
        }
    },
    watch: {
        lines (newVal) {
            console.log(newVal);
        }
    },
    beforeMount() {
        this.getDiff();
    }
});

app.mount('#app');