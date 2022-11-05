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
    .o-table-contest-results {
        margin-bottom: 0;
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
    .o-map-wrapper {
        height: 300px;
    }
    :global(.m-map-container) {
        height: 100%;
        margin-top: 1.5em;
        padding: 0.5em;
        border: 1px solid #d6d6da;
        border-radius: 4px;
    }

    .o-result-contest-detail {
        display: grid;
        column-gap: 1em;
        grid-template-columns: repeat(auto-fit, minmax(20em, 1fr));
        align-items: start;
    }

    .a-show-ballot-question  {
        padding: 0;
        color: #135b7e;
    }
    .a-show-ballot-question:hover, .a-show-ballot-question:focus {
        text-decoration: underline;
    }
    :global(.a-button-text-link) {
        background: none;
        line-height: inherit;
        border: none;
        box-shadow: unset;
    }

</style>
<script>
    // settings
    import {settings} from './../settings.js';

    // routing
    import {link, location, querystring} from 'svelte-spa-router';

    // data handling
    //import {isEmpty} from './../data/handling.js';

    import { onMount } from 'svelte';

    // formatting
    import { isContestDetailView, showingVoteCount, isWinner, contestHasMap } from './../data/formatting.js';

    // data
    export let contest;
    export let label;
    export let contestCount;

    // components
    import ContestMenu from './ContestMenu.svelte';

    // display settings
    let contestDetailView = isContestDetailView($location, $querystring);
    let showVoteCount = showingVoteCount($location);
    let mapAvailable = contestHasMap(contest);
    if (contestCount === 1) {
        contestDetailView = true;
    }

    // ballot question
    let showBallotQuestion = settings.showBallotQuestion;
    if (contestDetailView === true) {
        showBallotQuestion = true;
    }

    // map
    let Map;
    let showMap = settings.showMap;
    if (contestDetailView === false || mapAvailable === false) {
        showMap = false;
    }
    const mapDelay = 300;
    const sleep = ms => new Promise(f => setTimeout(f, ms));
	onMount(async () => {
        if (showMap === true && mapAvailable === true) {
		    await sleep(mapDelay); // simulate network delay
		    Map = (await import('./Map.svelte')).default;
        }
	});
    
    // set class based on dashboard or not
    function setResultClass(result, contest) {
        let resultClass = '';
        if (contest.primary === true && result.party_id != '') {
            resultClass = result.party_id.toLowerCase();
        }
        return resultClass;
    }
    let contestClass = 'o-result-contest';
    if (contestDetailView === true) {
        contestClass += ' o-result-contest-detail';
    }
</script>

<li class="{contestClass}" id="{contest.id}">
    <div class="o-result-contest-content">
        {#if contestDetailView === false}
            <h3 class="a-entry-title"><a href="/contest/?id={contest.id}" use:link>{contest.title}</a></h3>
        {:else}
            <h3 class="a-entry-title">{contest.title}</h3>
        {/if}
        {#if contest.sub_title !== null || contest.question_body }
            <div class="m-ballot-question">
                <blockquote>
                {#if contest.sub_title !== null }
                    <h4>{contest.sub_title}</h4>
                {/if}
                {#if settings.showBallotQuestion === false}
                    <button class="a-show-ballot-question a-button-text-link" on:click={() => (showBallotQuestion = !showBallotQuestion)}>{#if showBallotQuestion === true}Hide Ballot Question{:else}Show Ballot Question{/if}</button>
                {/if}
                {#if showBallotQuestion === true}
                    {#if contest.question_body}
                        <p class="a-question-body">{contest.question_body}</p>
                    {/if}
                {/if}
                </blockquote>
            </div>
        {/if}
        <table class="o-table-striped o-table-striped-start-light o-table-contest-results">
            <thead>
                <tr>
                    <th class="winner-column">&nbsp;</th>
                    <th class="candidate-column">Candidate</th>
                    {#if contest.partisan && contest.show_party === true}
                        <th class="party-column">
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
                    {#if contest.partisan && contest.show_party === true}
                        <th class="party-column">{contest.precincts_reporting} of {contest.total_effected_precincts} precincts reporting.{#if contest.seats > 1} Choosing {contest.seats}.{/if}</th>
                    {:else}
                        <th class="party-column">{contest.precincts_reporting} of {contest.total_effected_precincts} precincts reporting.{#if contest.seats > 1} Choosing {contest.seats}.{/if}</th>
                    {/if}
                    {#if contest.ranked_choice == true}
                        <th class="first-choice-column first-choice-heading">1st choice</th>
                        <th class="second-choice-column second-choice-heading">2nd choice</th>
                        <th class="third-choice-column third-choice-heading">3rd choice</th>
                        <th class="final-column"></th>
                    {:else}
                        <th class="percentage"></th>
                    {/if}
                    {#if (showVoteCount === true)}
                        <th class="votes"></th>
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
        {#if (contestDetailView === true)}
            <ContestMenu contest="{contest}" contestDetailView="{contestDetailView}" mapAvailable="{mapAvailable}" label="{label}"/>
        {/if}
    </div>
    {#if (showMap === true && contestDetailView === true)}
        <div class="o-map-wrapper">
            <div class="m-map-container">
                <svelte:component this={Map} boundary_slug={contest.boundary}>
                </svelte:component>
            </div>
        </div>
    {/if}
    {#if (contestDetailView === false)}
        <ContestMenu contest="{contest}" contestDetailView="{contestDetailView}" mapAvailable="{mapAvailable}" label="{label}"/>
    {/if}
</li>
