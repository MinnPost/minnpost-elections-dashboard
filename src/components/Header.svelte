<style>
    .a-election-status {
        text-align: center;
        color: #5e6e76;
        font-size: inherit;
    }
</style>

<script>
    // data
    import { electionData, pollInfo, resultStore, apiData, currentTo, currentOffset, isPaginated } from './../stores.js';
    import { apDate, pluralize, isTestElection} from './../data/formatting.js';

    // routing
    import { querystring, location } from 'svelte-spa-router';
    import { navigationContext } from '../data/navigationContext.js';
    
    let label = 'contest';

    let showing = '';
    function showingData(resultStore) {
        let context = navigationContext(resultStore, {}, $isPaginated, $location, $querystring);
        let contextLabel = "";
        let suffix = "";
        if (context && context.label) {
            contextLabel = context.label;
        } else {
            let searchParams = new URLSearchParams($querystring);
            if (searchParams.get('q') !== null) {
                suffix = ' for ' + decodeURIComponent(searchParams.get('q'));
            }
            if (searchParams.get('address') !== null) {
                suffix = ' near ' + decodeURIComponent(searchParams.get('address'));
            }
        }
        if ($isPaginated === true) {
            let pluralized = pluralize($apiData.total_count, label, contextLabel + ' ');
            showing = 'Showing ' + $currentOffset + '-' + $currentTo + ' of ' + pluralized + suffix;
        } else {
            showing = 'Showing ' + resultStore.length + ' of ' + pluralize(resultStore.length, label, contextLabel + ' ') + suffix;
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
