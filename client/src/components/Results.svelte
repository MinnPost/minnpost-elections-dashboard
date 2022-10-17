<style>
    :root {
    --max-contest-columns: 2;
    }
    .o-results {
        display: grid;
        gap: 1em;
        grid-template-columns: repeat(auto-fit, minmax(20em, 1fr));
        list-style: none;
    }
    .a-election-status {
        text-align: center;
        color: #5e6e76;
        font-size: var(--scale-1);
        margin-bottom: 1.5em;
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
	import { pattern } from 'svelte-pathfinder';
    
    import { resultStore } from './../stores.js';

    // behavior
    import { fade } from 'svelte/transition';

    // layout components
	import Contest from "./Contest.svelte";
    import Advertisement from './Advertisement.svelte';

    // language settings
    const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
    let label = 'contest';
</script>

{#await promise}
	<p>Loading contests</p>
{:then}
{#key $resultStore}
    <h3 class="a-election-status">Showing {pluralize($resultStore.length, label)}</h3>
    <ul
        in:fade={{duration: 20}}
        out:fade={{duration: 20}
        } class="o-results">
        {#each $resultStore as contest}
            <Contest contest="{contest}" pattern="{$pattern}" label="{label}"/>
        {/each}
    </ul>
{/key}
<!--<Advertisement adCodeId="x100" />-->
{:catch error}
    <p>Something went wrong: {error.message}</p>
{/await}
