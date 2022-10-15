<script>
    // data
	import { electionData } from './../stores.js';
    import { pollInfo } from './../stores.js';

    // formatting
    import Dateline from 'dateline';
    function apDate(string, hasTime = false, showTime = false, relative = true) {
        let apDate = '';
        if (string) {
            //let dateObject = new Date(string + ' 00:00:00-0600');
            if (hasTime === false) {
                string = string + ' 00:00:00';
            }
            let dateObject = new Date(string);
            dateObject.toLocaleString('en-US', { timeZone: 'America/Chicago' });
            if (showTime === false) {
                apDate = Dateline(dateObject).getAPDate({includeYear: true});
            } else {
                if ( relative === false ) {
                    apDate = Dateline(dateObject).getAPDate({includeYear: true}) + ' ' + Dateline(dateObject).getAPTime();
                } else {
                    const now = new Date();
                    const nowWithoutTime = new Date(now.getTime());
                    const dateObjectWithoutTime = new Date(dateObject.getTime());

                    nowWithoutTime.setHours(0, 0, 0, 0);
                    dateObjectWithoutTime.setHours(0, 0, 0, 0);
                    nowWithoutTime.toLocaleString('en-US', { timeZone: 'America/Chicago' });
                    dateObjectWithoutTime.toLocaleString('en-US', { timeZone: 'America/Chicago' });
                    if (nowWithoutTime.getTime() === dateObjectWithoutTime.getTime()) {
                        apDate = 'at ' + Dateline(dateObject).getAPTime();
                    } else {
                        apDate = 'on ' + Dateline(dateObject).getAPDate({includeYear: true}) + ' at ' + Dateline(dateObject).getAPTime();
                    }
                }
                
            }
        }
        return apDate;
    }

    // svelte behavior
    import { onMount } from "svelte";
    onMount(async () => {
		electionData.fetchAll()
	});

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
{:then electionData}
    <header class="m-dashboard-header" data-last-updated="{electionData.updated}" data-last-scraped-server="{electionData.scraped}" data-last-loaded-client="{$pollInfo.lastModified}">
        <h2 class="a-election-status">Showing {apDate(electionData.date, false)} {#if electionData.primary == true}primary{:else}general{/if} election results. Last updated {apDate(electionData.updated, true, true)}</h2>
    </header>
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}
