<script>
    // data
    export let contest;

</script>

<li id="{contest.id}">
    <small>{contest.id}</small>
    <h3>{contest.title}</h3>
    {#if contest.sub_title !== "None" }
        <h4>{contest.sub_title}</h4>
    {/if}
</li>
