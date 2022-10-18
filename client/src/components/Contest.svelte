<script>
    // data
    export let contest;

</script>

<li id="{contest.id}">
    <small>{contest.id}</small>
    <h3>{contest.title}</h3>
    <p><a href="/contests/?scope={contest.scope}">{contest.scope}</a></p>
    {#if contest.sub_title !== null }
        <h4>{contest.sub_title}</h4>
    {/if}
</li>
