const app = Vue.createApp({
    template: `
    <div class="columns">
    <div class="column is-8">
    <div v-for="(value,key) in keys" :key="key" style="">
    <button @click="toggleAccordian(key)" class="button">{{ key }}</button>
    <div v-if="keys[key].show">
    <div v-for="(innerValue, innerKey) in value">
    <div v-for="(line, lineId) in innerValue['content']" style="margin: 10px; display: flex; align-items: center">
    <button style="margin-right: 10px" class="button" @click="toggleLine(lineId, line)">{{ lineId }}</button>
    <input type="checkbox" :id="lineId" :value="lineId">
    <span style="margin-left: 10px">
    <span v-if="line.startsWith('+')" style="background-color: #90EE90">
    {{ line }}
    </span>
    <span v-if="line.startsWith('-')" style="background-color: #FF6347">
    {{ line }}
    </span>
    <span v-if="!line.startsWith('+') && !line.startsWith('-')">
    {{ line }}
    </span>
    </span>
    </div>
    </div>
    </div>
    </div>
    </div>
    <div class="column">
    <button @click="getDiff()" class="button">Refresh</button>
    <button class="button" @click="copyToClipboard()" >Copy</button>
    <h3>Input condition</h3>
    <input type="text" placeholder="Enter condition">
    <div style="width: 100%">
    <div v-for="(value,key) in lines" :key="key" style="display: flex; align-items: center">
    <input type="checkbox" :id="key" :value="key">
    <label :for="key">{{ key }}</label>
    {{value}}
    </div>
    </div>
    </div>
    </div>
    `,
    data() {
        return {
            keys: {},
            lines: []
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
        },
        toggleAccordian(key) {
            this.keys[key].show = !this.keys[key].show;
        },
        toggleLine(lineId, lineContent) {
            console.log(lineId, lineContent)
            const line = document.getElementById(lineId);
            line.content = lineContent;
            line.checked = !line.checked;
            this.lines.push({checked: line.checked, content: line.content.slice(1)});
        }
    },
    watch: {
        lines: {
            handler: function (val, oldVal) {
                console.log(val);
            }
        }
    },
    beforeMount() {
        this.getDiff();
    }
});

app.mount('#app');