<script>
    export let contest;
    export let label;
    export let showVoteCount;
    export let mapAvailable;
    export let showMap;
    
    import {link} from 'svelte-spa-router';
</script>

<nav class="m-subnav-navigation m-topics-navigation m-menu-contest-groups">
    <ul>
        {#if (showVoteCount === false)}
            <li><a href="/contest/?id={contest.id}" use:link>Full results for this {label}</a></li>
        {:else}
            <li><a href="/contest/?id={contest.id}" use:link>Show only this {label}</a></li>
        {/if}
        {#if (mapAvailable === true && showMap === false)}
            <li><a href="/contest/?id={contest.id}" use:link>Show map for this {label}</a></li>
        {/if}
    </ul>
</nav>
