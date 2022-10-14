<script>
    // data
    export let pattern;
    export let contest;
    
    // formatting
    import './data/formatting.js';
    
    function setResultClass(result, contest) {
        let resultClass = '';
        if (contest.primary === true && result.party_id != '') {
            resultClass = result.party_id.toLowerCase();
        }
        return resultClass;
    }

    
</script>

<li id="{contest.id}">
    <h3>{contest.title}</h3>
    {#if contest.sub_title !== null }
        <h4>{contest.sub_title}</h4>
    {/if}

    <table class="o-table-striped">
        <thead>
            <tr>
                <th class="winner-column"></th>
                <th>Candidate</th>
                {#if contest.partisan && contest.show_party === undefined}
                    <th>
                        <span class="large-table-label">Party</span>
                        <span class="small-table-label"></span>
                    </th>
                {/if}
                {#if contest.ranked_choice == true}
                    <th class="first-choice-column">Results</th>
                    <th class="second-choice-column"></th>
                    <th class="third-choice-column"></th>
                    <th class="final-column">Final</th>
                {:else}
                    {#if pattern('/')}
                        <th class="percentage">Results</th>
                    {:else}
                        <th class="percentage">
                            <span class="large-table-label">Percentage</span>
                            <span class="small-table-label">%</span>
                        </th>
                        <th class="votes">Votes</th>
                    {/if}
                {/if}
            </tr>
            <tr class="table-second-heading">
                <th class="winner-column"></th>
                <th>{contest.precincts_reporting} of {contest.total_effected_precincts} precincts reporting.{#if contest.seats > 1} Choosing {contest.seats}.{/if}</th>
            {#if contest.partisan && contest.show_party === undefined}
                <th></th>
            {/if}
            {#if contest.ranked_choice == true}
                <th class="first-choice-column first-choice-heading">1st choice</th>
                <th class="second-choice-column second-choice-heading">2nd choice</th>
                <th class="third-choice-column third-choice-heading">3rd choice</th>
                <th class="final-column"></th>
            {:else}
            <th></th>
            {/if}
            {#if ! pattern('/')}
                <th></th>
            {/if}
            </tr>
        </thead>
        <tbody>
            {#each contest.results as r, key}
                
                <tr id="{r.id}" class="{setResultClass(contest, r)}">
                    winner? {isWinner(r, contest, key)}
                </tr>

            {/each}


            

            

        </tbody>
    </table>









    {contest.precincts_reporting} of {contest.total_effected_precincts} precincts reporting.
    <ul>
    {#each contest.results as result}
        <li>{result.candidate}</li>
        <li>{result.percentage}%</li>
        <li>{result.votes_candidate} votes</li>
    {/each}
    </ul>
</li>
