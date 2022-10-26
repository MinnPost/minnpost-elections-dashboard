<script>
    // settings
    import {settings} from './../settings.js';
    let showFooter = settings.showFooter;
    // data
	import { electionData } from './../stores.js';
    import { pollInfo } from './../stores.js';
    import { apDate} from './../data/formatting.js';

    // svelte behavior
    import { onMount } from "svelte";
    onMount(async () => {
		electionData.fetchAll()
	});

</script>

<style>
   small.a-election-status {
        border-top: 1px solid #5e6e76;
        padding-top: 0.5em;
        text-align: left;
        color: #5e6e76;
        font-size: var(--scale-2);
        line-height: 1.3;
        display: inline-block;
    }
</style>

{#if showFooter === true}
    {#await $electionData}
        <p>loading...</p>
    {:then electionData}
        <footer class="m-dashboard-footer">
            <small class="a-election-status">Updated data was last received from the Secretary of State {apDate(electionData.updated, true, true)} We last checked for updated information {apDate(electionData.scraped, true, true)}, and this page last reloaded {apDate($pollInfo.lastModified, true, true)} During election night, the Secretary of State updates results approximately every ten minutes.</small>
        </footer>
    {:catch error}
        <p style="color: red">{error.message}</p>
    {/await}
{/if}
