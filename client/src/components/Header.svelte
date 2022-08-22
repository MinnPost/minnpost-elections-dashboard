<script>
    // data
	import { electionData } from './../stores.js';

    // svelte behavior
    import { onMount } from "svelte";
    onMount(async () => {
		electionData.fetchAll()
	});

</script>

{#await $electionData}
    <p>loading...</p>
{:then electionData}
    <header class="m-dashboard-header">
        <h2 class="a-election-status">Showing {electionData.date} {#if electionData.primary == "true"}primary{:else}general{/if} election results. Last updated on {electionData.updated}</h2>
        <p><small>(last value was  Last updated on 2022-08-04 11:13:28.05614-05)</small></p>
    </header>
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}
