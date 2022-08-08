<script>
    export let promise;
    import { contestStore } from './stores.js';
</script>

{#await promise}
	<p>Loading contests</p>
{:then}
    <ul>
        {#each $contestStore as contest}
            <li>
                {contest.id}: {contest.title}
            </li>
        {/each}
    </ul>
{:catch error}
    <p>Something went wrong: {error.message}</p>
{/await}
