<script>
	import { electionMeta } from './stores.js';
    import { onMount } from "svelte";
    onMount(async () => {
		electionMeta.fetchAll()
	});

</script>

{#await $electionMeta}
    <p>loading...</p>
{:then electionMeta}
    <header class="m-dashboard-header">
        <h2 class="a-election-status">Showing {electionMeta.date} {#if electionMeta.primary == "true"}primary{:else}general{/if} election results. Last updated on {electionMeta.updated}</h2>
        <p><small>(last value was  Last updated on 2022-08-04 11:13:28.05614-05)</small></p>
    </header>
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}
