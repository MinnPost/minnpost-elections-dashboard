<script>
    // data
    import { electionData, pollInfo, resultStore } from './../stores.js';
    import { apDate, pluralize, isTestElection} from './../data/formatting.js';
    
    let label = 'contest';
</script>

<style>
    .a-election-status {
        text-align: center;
        color: #5e6e76;
        font-size: inherit;
    }
</style>

{#await $electionData}
    <p>loading...</p>
{:then $electionData}
    <header class="m-dashboard-header" data-last-updated="{$electionData.updated}" data-last-scraped-server="{$electionData.scraped}" data-last-loaded-client="{$pollInfo.lastModified}">
        <h2 class="a-election-status">Showing {apDate($electionData.date, false)} {#if $electionData.primary == true}primary{:else}general{/if} election{#if isTestElection($electionData.date)}&nbsp;<em>test</em>{/if} results. Last updated {apDate($electionData.updated, true, true)}</h2>
    </header>
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}

{#await $resultStore}
	<p>Loading contests</p>
{:then}
    <h3 class="a-election-status">Showing {pluralize($resultStore.length, label)}</h3>
{:catch error}
    <p>Something went wrong: {error.message}</p>
{/await}
