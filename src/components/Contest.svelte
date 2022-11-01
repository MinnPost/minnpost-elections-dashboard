<style>
    .o-result-contest {
        padding-left: 0.5em;
        padding-right: 0.5em;
    }

    h3 {
        margin-bottom: 0.25em;
    }
    .m-ballot-question {
        padding-top: 0.5em;
        font-size: var(--scale-1);
        
    }
    .m-ballot-question blockquote {
        padding: 1em;
        font-family: "ff-meta-web-pro", helvetica, arial, sans-serif;
        margin-bottom: 1em;
    }
    /*h4 {
        padding-top: 0.5em;
        margin-bottom: 0.25em;
    }
    .a-question-body {
        margin-bottom: 0.75em;
    }*/

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
    // settings
    import {settings} from './../settings.js';

    // routing
    import {location, querystring} from 'svelte-spa-router';

    // data handling
    //import {isEmpty} from './../data/handling.js';

    import { onMount } from 'svelte';

    // data
    export let contest;

    // showing vote count
    let showVoteCount = true;
    if ($location === "/") {
        showVoteCount = true;
    } else {
        showVoteCount = true;
    }

    // map
    let showMap = settings.showMap;
    let Map;
    let mapAvailable = true;
    const mapDelay = 300;
    const sleep = ms => new Promise(f => setTimeout(f, ms));
	onMount(async () => {
        let searchParams = new URLSearchParams($querystring);
        if ( ! $location.startsWith("/contest/") || searchParams.get('id') === null) {
            showMap = false;
        }
        if ( contest.boundary === "" || ! contest.boundary ) {
            showMap = false;
            mapAvailable = false;
        }
        if (showMap === true) {
		    await sleep(mapDelay); // simulate network delay
		    Map = (await import('./Map.svelte')).default;
        }
	});

    // formatting
    import { apDate, isWinner } from './../data/formatting.js';
    import ContestMenu from './ContestMenu.svelte';
    export let label;
    
    // set class based on dashboard or not
    function setResultClass(result, contest) {
        let resultClass = '';
        if (contest.primary === true && result.party_id != '') {
            resultClass = result.party_id.toLowerCase();
        }
        return resultClass;
    }
    let contestClass = 'o-result-contest';
    if ($location !== "/") {
        contestClass += ' o-result-contest-detail';
    }
</script>

<li class="{contestClass}" id="{contest.id}">
    <div class="o-result-contest-content">
        <h3>{contest.title}</h3>
        {#if contest.sub_title !== null || contest.question_body }
            <div class="m-ballot-question">
                <blockquote>
                {#if contest.sub_title !== null }
                    <h4>{contest.sub_title}</h4>
                {/if}
                {#if (showVoteCount === true)}
                    {#if contest.question_body}
                        <p class="a-question-body">{contest.question_body}</p>
                    {/if}
                {/if}
                </blockquote>
            </div>
        {/if}
        <table class="o-table-striped o-table-striped-start-light">
            <!--{#if (showVoteCount === true)}
                <caption>
                    <div class="last-updated">Last updated {apDate(contest.updated, true, true, true)}</div>
                </caption>
            {/if}-->
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
                        {#if (showVoteCount === false)}
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
                {#if (showVoteCount === true)}
                    <th></th>
                {/if}
                </tr>
            </thead>
            <tbody>
                {#each contest.results as r, key}
                    <tr id="{r.id}" class="{setResultClass(contest, r)}">
                        <td class="winner-column">{#if isWinner(contest, r, key) === true}<span class="fa fa-check"></span>{/if}</td>
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
                            {#if (showVoteCount === true)}
                                <td class="votes">{r.votes_candidate}</td>
                            {/if}
                        {/if}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    {#if (showMap === true)}
        <div class="o-map-wrapper">
            <div class="m-map-container">
                <svelte:component this={Map} boundary_slug={contest.boundary}>
                </svelte:component>
            </div>
        </div>
    {/if}
    <ContestMenu contest="{contest}" mapAvailable={mapAvailable} showMap={showMap} showVoteCount={showVoteCount} label="{label}"/> 
</li>
