<script>
    // data
    export let pattern;
    export let contest;
</script>

<li id="{contest.id}">
    <h3>{contest.title}</h3>
    {#if contest.sub_title !== null }
        <h4>{contest.sub_title}</h4>
    {/if}
    <ul>
    {#each contest.results as result}
        <li>{result.candidate}</li>
    {/each}
    </ul>
</li>
