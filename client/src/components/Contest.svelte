<style>
    .o-result-contest {
        padding-left: 0.5em;
        padding-right: 0.5em;
    }

    h3 {
        margin-bottom: 0.25em;
    }

    .o-table-striped {

    }

    th, td {
        vertical-align: middle;
        padding: .5em;
    }

    tr:not(:last-child) th {
        padding-bottom: 0;
    }

    tr:last-child th {
        padding-top: 0;
        border-bottom: 2px solid #d6d6da;
        font-style: italic;
    }

    tr:last-child th, td {
        border-bottom: 1px solid #d6d6da;
        font-weight: 300;
        font-size: 0.85em;
    }

    .o-table-striped-start-light tbody tr:nth-child(odd) {
        background-color: #efeff0;
    }

    .o-table-striped-start-dark {
        
    }

    .m-map-container {
        height: 100%;
        margin-top: 1.5em;
        padding: 0.5em;
        border: 1px solid #d6d6da;
        border-radius: 4px;
    }

    .o-result-contest-detail {
        display: grid;
        gap: 1em;
        grid-template-columns: repeat(auto-fit, minmax(20em, 1fr));
    }

</style>
<script>
    import { onMount } from 'svelte';

    // routing
    import {link} from 'svelte-spa-router';
    export let params = {};

    import {isEmpty} from './../data/handling.js';

    // data
    export let contest;

    // map
    import Map from "./Map.svelte";
    let showMap = false;
    if ( contest.boundary === "" || ! contest.boundary ) {
        showMap = false;
    }

    // formatting
    import {isWinner} from './../data/formatting.js';
    export let label;
    
    function setResultClass(result, contest) {
        let resultClass = '';
        if (contest.primary === true && result.party_id != '') {
            resultClass = result.party_id.toLowerCase();
        }
        return resultClass;
    }
    let contestClass = 'o-result-contest';
    if ( params ) {
        contestClass += ' o-result-contest-detail';
    }
    
	onMount(async () => {
        const el = document.querySelector('.a-election-status');
		if (!el) return;
        el.scrollIntoView({
            behavior: 'smooth'
        });
	});
</script>

<li class="{contestClass}" id="{contest.id}">
    <div class="o-result-contest-content">
        <h3>{contest.title}</h3>
        {#if contest.sub_title !== null }
            <h4>{contest.sub_title}</h4>
        {/if}

        <table class="o-table-striped o-table-striped-start-light">
            <thead>
                <tr>
                    <th class="winner-column">&nbsp;</th>
                    <th>Candidate</th>
                    {#if contest.partisan && contest.show_party === true}
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
                        {#if isEmpty(params)}
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
                {#if contest.partisan && contest.show_party === true}
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
                {#if ! isEmpty(params)}
                    <th></th>
                {/if}
                </tr>
            </thead>
            <tbody>
                {#each contest.results as r, key}

                    <tr id="{r.id}" class="{setResultClass(contest, r)}">
                        <td class="winner-column">{#if isWinner(r, contest, key) === true}<span class="fa fa-check"></span>{/if}</td>
                        <td class="candidate-column">{r.candidate}</td>
                        {#if contest.partisan && contest.show_party === true}
                            <td>
                                {#if (['WI', 'NP'].indexOf(r.party_id) === -1)}
                                <span class="party-label bg-color-political-{r.party_id.toLowerCase()}">{r.party_id}</span>
                                {/if}
                            </td>
                        {/if}
                        {#if contest.ranked_choice !== true}
                            <td class="percentage">{r.percentage}%</td>
                            {#if ! isEmpty(params)}
                                <td class="votes">{r.votes_candidate}</td>
                            {/if}
                        {/if}
                    </tr>

                {/each}

            </tbody>
        </table>
    {#if isEmpty(params)}
        <a href="/contest/?id={contest.id}" use:link>Full results for this {label}</a>
    {:else}
        <a href="/" use:link>return to dashboard</a>
    {/if}
    </div>
    {#if ! isEmpty(params)}
        {#if showMap}
            <div class="m-map-container">
                <Map boundary_slug={contest.boundary}/>
            </div>
        {/if}
    {/if}
</li>
