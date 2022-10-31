<script>
    // settings
    import {settings} from './../settings.js';
    let showFooter = settings.showFooter;

    // data
	import { electionData, pollInfo } from './../stores.js';
    import { apDate} from './../data/formatting.js';

</script>

<style>
   .m-dashboard-footer {
        border-top: 1px solid #5e6e76;
        padding-top: 0.5em;
        text-align: left;
        color: #5e6e76;
        font-size: var(--scale-2);
        line-height: 1.3;
        display: inline-block;
    }
    .m-dashboard-footer p {
        margin-bottom: 0.75em;
    }
</style>

{#if showFooter === true}
    {#await $electionData}
        <p>loading...</p>
    {:then $electionData}
        <footer class="m-dashboard-footer">
            <p>Updated data was last received from the Minnesota Secretary of State's office {apDate($electionData.updated, true, true)} We last checked for updated information {apDate($electionData.scraped, true, true)}, and this page last reloaded {apDate($pollInfo.lastModified, true, true)} During election night, the Minnesota Secretary of State's office updates results approximately every ten minutes.</p>
            <p>The geographical boundaries, though received from official sources and queried from our <a href="https://represent-minnesota.herokuapp.com" target="_blank">boundary service</a>, may not represent the exact, offical area for a contest, race, or election. It is also possible that for a given location the contests may not display accurately, or at all, due to data quality with multiple agencies. Please refer to your local and state election officials to know exactly what contests happen for a given location.</p>
            <p>Some map data © OpenStreetMap contributors; licensed under the <a href="http://www.openstreetmap.org/copyright" target="_blank">Open Data Commons Open Database License</a>. Some map design © MapBox; licensed according to the <a href="http://mapbox.com/tos/" target="_blank">MapBox Terms of Service</a>. Location geocoding provided by <a href="http://www.mapquest.com/" target="_blank">Mapquest</a> and is not guaranteed to be accurate.</p>
        </footer>
    {:catch error}
        <p style="color: red">{error.message}</p>
    {/await}
{/if}
