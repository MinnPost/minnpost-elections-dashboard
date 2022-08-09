<script>
    // data
    export let promise;
    import { resultStore } from './../stores.js';

    // layout components
	import Contest from "./Contest.svelte";
</script>

{#await promise}
	<p>Loading contests</p>
{:then}
    <ul>
        {#each $resultStore as contest}
            <Contest contest="{contest}"/>
        {/each}
    </ul>
{:catch error}
    <p>Something went wrong: {error.message}</p>
{/await}
