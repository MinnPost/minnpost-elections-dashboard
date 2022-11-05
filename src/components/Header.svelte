<style>
    .a-election-status {
        text-align: center;
        color: #5e6e76;
        font-size: inherit;
    }
</style>

<script>
    // data
    import { electionData, pollInfo, resultStore, apiData } from './../stores.js';
    import { apDate, pluralize, isTestElection} from './../data/formatting.js';

    // settings
    import {settings} from './../settings.js';
    
    let label = 'contest';

    let showing = '';
    function showingData(resultStore) {
        if (settings.paginate === true) {
            showing = 'Showing ' + resultStore.length + ' of ' + pluralize($apiData.total_count, label) + ' for this group';
        } else {
            showing = 'Showing ' + pluralize(resultStore.length, label);
        }
        return showing;
    }
</script>

{#await $electionData}
    <p>loading...</p>
{:then $electionData}
    <header class="m-dashboard-header" data-last-updated="{$electionData.updated}" data-last-scraped-server="{$electionData.scraped}" data-last-loaded-client="{$pollInfo.lastModified}">
        <h2 class="a-election-status">Showing {apDate($electionData.date, false)} {#if $electionData.primary == true}primary{:else}general{/if} election{#if isTestElection($electionData.date)}&nbsp;<em>test</em>{/if} results. Last updated {apDate($electionData.updated, true, true)}</h2>
    </header>
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}

{#if $apiData && $resultStore}
    <h3 class="a-election-status">{showingData($resultStore)}</h3>
{:else}
    <p>loading...</p>
{/if}
