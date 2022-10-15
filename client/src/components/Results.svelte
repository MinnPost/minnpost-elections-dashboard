<style>
    .o-results {
        display: grid;
        gap: 1em;
        grid-template-columns: repeat(auto-fit, minmax(10em, 25em));
        list-style: none;
    }
</style>

<script>
    // data
    export let promise;
    export let pattern;
    
    import { resultStore } from './../stores.js';

    // behavior
    import { fade } from 'svelte/transition';

    // layout components
	import Contest from "./Contest.svelte";
    import Advertisement from './Advertisement.svelte';
</script>

{#await promise}
	<p>Loading contests</p>
{:then}
{#key $resultStore}
    <p>Showing {$resultStore.length} races</p>
    <ul
        in:fade={{duration: 500, delay: 500}}
        out:fade={{duration: 20}
        } class="o-results">
        {#each $resultStore as contest}
            <Contest contest="{contest}" pattern="{pattern}"/>
        {/each}
    </ul>
{/key}
<!--<Advertisement adCodeId="x100" />-->
{:catch error}
    <p>Something went wrong: {error.message}</p>
{/await}
