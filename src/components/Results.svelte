<style>
    :root {
    --max-contest-columns: 2;
    }
    .o-results {
        display: grid;
        gap: 1.5em;
        grid-template-columns: repeat(auto-fit, minmax(20em, 1fr));
        list-style: none;
        align-content: flex-start;
        margin-left: 0;
    }
    @media screen and (min-width: 60em) {
        .o-results {
            grid-template-columns: repeat(auto-fit, minmax(calc(100% / var(--max-contest-columns) - 1em), 1fr));
        }
    }
</style>

<script>
    // data
    export let promise;
    
    import { resultStore } from './../stores.js';

    // layout components
	import Contest from "./Contest.svelte";
    //import Advertisement from './Advertisement.svelte';

    let label = 'contest';
</script>

{#await promise}
	<p>Loading contests</p>
{:then}
{#key $resultStore}
    <ul class="o-results">
        {#each $resultStore as contest}
            <Contest contest="{contest}" label="{label}" contestCount="{$resultStore.length}"/>
        {/each}
    </ul>
{/key}
<!--<Advertisement adCodeId="x100" />-->
{:catch error}
    <p>Something went wrong: {error.message}</p>
{/await}
